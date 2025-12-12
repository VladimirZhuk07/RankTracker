'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createHash } from 'crypto';
import { addUser, updateUserAvatar, updateUserStats, deleteUserById, getUserById, userExistsByName } from './data';
import { User, UserStatsData } from './definitions';
import { calculateStats } from './calculations';
import type { ParsedUserData } from '@/components/admin/CsvPreviewTable';
import { processImageWithAI } from '@/lib/image-actions';

type AuthState = string | undefined;

// SHA-256 hash of "admin" password
const ADMIN_PASSWORD_HASH = 'cadf7a05c69a6c2a561960455804ff1e40305a04ae6699caa923963a01872407';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export async function authenticate(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  try {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const passwordHash = hashPassword(password);

    if (username === 'admin' && passwordHash === ADMIN_PASSWORD_HASH) {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const cookieStore = await cookies();
      cookieStore.set('session', 'loggedIn', { expires, httpOnly: true });
    } else {
      return 'Invalid username or password.';
    }
  } catch (error) {
    if (error instanceof Error) {
        if ((error as any).code === 'NEXT_REDIRECT') {
          throw error;
        }
        return 'Authentication failed.';
    }
    throw error;
  }
  redirect('/admin/dashboard');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/');
}

type CreateUserResult = {
  message: string;
  user?: User | null;
  error?: boolean;
};

export async function createUser(prevState: any, formData: FormData): Promise<CreateUserResult> {
  const name = formData.get('name') as string;
  const rawData = {
    totalMaps: formData.get('totalMaps') as string,
    totalKills: formData.get('totalKills') as string,
    totalDeaths: formData.get('totalDeaths') as string,
    totalDamage: formData.get('totalDamage') as string,
  };

  if (!name || !rawData.totalMaps || !rawData.totalKills || !rawData.totalDeaths || !rawData.totalDamage) {
    return { message: 'All fields are required.', error: true };
  }
  
  const stats = {
    totalMaps: parseInt(rawData.totalMaps, 10),
    totalKills: parseInt(rawData.totalKills, 10),
    totalDeaths: parseInt(rawData.totalDeaths, 10),
    totalDamage: parseInt(rawData.totalDamage, 10),
  };

  if (Object.values(stats).some(isNaN)) {
    return { message: 'All stats must be valid numbers.', error: true };
  }
  
  try {
    const exists = await userExistsByName(name);
    if (exists) {
        return { message: `User with name "${name}" already exists.`, error: true };
    }

    const newUser = await addUser(name, stats);
    revalidatePath('/');
    revalidatePath('/admin/dashboard');
    return { message: `User created: ${newUser.name}`, user: newUser, error: false };
  } catch (error) {
    console.error(error);
    return { message: 'Failed to create user.', error: true };
  }
}

export async function deleteUser(userId: string): Promise<{success: boolean, message: string}> {
    if (!userId) {
        return { success: false, message: 'User ID is required.' };
    }

    try {
        const deleted = await deleteUserById(userId);
        if (!deleted) {
             return { success: false, message: 'User not found.' };
        }
        revalidatePath('/');
        revalidatePath('/admin/dashboard');
        return { success: true, message: 'User deleted successfully.' };
    } catch (error) {
        return { success: false, message: 'Failed to delete user.' };
    }
}


type CsvUploadResult = {
    success: boolean;
    message: string;
    users?: User[];
}

// Helper function to parse CSV row into user data entry
function parseCsvRow(row: string): { name: string; stats: UserStatsData } | null {
    const [name, mapsStr, killsStr, deathsStr, damageStr] = row.split(',').map(s => s.trim());
    
    if (!name || !mapsStr || !killsStr || !deathsStr || !damageStr) {
        return null;
    }
    
    const stats = {
        totalMaps: parseInt(mapsStr, 10),
        totalKills: parseInt(killsStr, 10),
        totalDeaths: parseInt(deathsStr, 10),
        totalDamage: parseInt(damageStr, 10),
    };
    
    if (Object.values(stats).some(isNaN)) {
        return null; // Skip malformed rows
    }
    
    return { name, stats };
}

// Shared helper function to process user data entries
async function processUserDataEntries(entries: Array<{ name: string; stats: UserStatsData }>): Promise<{ updatedCount: number; newCount: number }> {
    let updatedCount = 0;
    let newCount = 0;

    for (const entry of entries) {
        const { name, stats } = entry;
        
        if (!name || !stats) {
            continue; // Skip invalid entries
        }

        // Validate stats are numbers
        if (Object.values(stats).some(isNaN)) {
            continue; // Skip malformed entries
        }

        const userExisted = await userExistsByName(name);
        await updateUserStats(name, stats, false, true); // Accumulate stats
        if(userExisted) {
            updatedCount++;
        } else {
            newCount++;
        }
    }

    return { updatedCount, newCount };
}

// Helper to build success message
function buildUpdateMessage(updatedCount: number, newCount: number, defaultMessage: string): string {
    let message = '';
    if (updatedCount > 0) message += `${updatedCount} existing user(s) updated. `;
    if (newCount > 0) message += `${newCount} new user(s) created.`;
    if (message === '') message = defaultMessage;
    return message;
}

export async function updateRatingsFromCSV(prevState: any, formData: FormData): Promise<CsvUploadResult> {
    const file = formData.get('csv-file') as File;

    if (!file || file.size === 0) {
        return { success: false, message: 'No file uploaded.' };
    }
    if (file.type !== 'text/csv') {
        return { success: false, message: 'Invalid file type. Please upload a CSV.' };
    }

    try {
        const text = await file.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const entries = rows.map(parseCsvRow).filter((entry): entry is { name: string; stats: UserStatsData } => entry !== null);
        
        if (entries.length === 0) {
            return { success: false, message: 'No valid data found in the CSV file.' };
        }

        const { updatedCount, newCount } = await processUserDataEntries(entries);
        
        revalidatePath('/');
        revalidatePath('/admin/dashboard');
        
        const message = buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the CSV.');
        
        return { success: true, message };

    } catch (error) {
        return { success: false, message: 'Failed to process CSV file.' };
    }
}

export async function updateRatingsFromCsvText(prevState: any, formData: FormData): Promise<CsvUploadResult> {
    const csvText = formData.get('csv-text') as string;

    if (!csvText || csvText.trim() === '') {
        return { success: false, message: 'No CSV content provided.' };
    }

    try {
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        const entries = rows.map(parseCsvRow).filter((entry): entry is { name: string; stats: UserStatsData } => entry !== null);
        
        if (entries.length === 0) {
            return { success: false, message: 'No valid data found in the CSV content.' };
        }

        const { updatedCount, newCount } = await processUserDataEntries(entries);
        
        revalidatePath('/');
        revalidatePath('/admin/dashboard');
        
        const message = buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the CSV.');
        
        return { success: true, message };

    } catch (error) {
        return { success: false, message: 'Failed to process CSV text.' };
    }
}

export async function checkUserExists(name: string): Promise<boolean> {
    if (!name || name.trim() === '') {
        return false;
    }
    return await userExistsByName(name.trim());
}

export async function updateRatingsFromParsedData(data: ParsedUserData[]): Promise<CsvUploadResult> {
    if (!data || data.length === 0) {
        return { success: false, message: 'No data provided.' };
    }

    try {
        const entries = data.map(item => ({ name: item.name, stats: item.stats }));
        const { updatedCount, newCount } = await processUserDataEntries(entries);
        
        revalidatePath('/');
        revalidatePath('/admin/dashboard');
        
        const message = buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the data.');
        
        return { success: true, message };

    } catch (error) {
        console.error(error);
        return { success: false, message: 'Failed to process data.' };
    }
}

type UpdateUserResult = {
  success: boolean;
  message: string;
  user?: User | null;
}

export async function updateUser(prevState: any, formData: FormData): Promise<UpdateUserResult> {
    const userId = formData.get('userId') as string;
    const avatarFile = formData.get('avatar') as File | null;
    const rawData = {
        totalMaps: formData.get('totalMaps') as string,
        totalKills: formData.get('totalKills') as string,
        totalDeaths: formData.get('totalDeaths') as string,
        totalDamage: formData.get('totalDamage') as string,
    };

    if (!userId) {
        return { success: false, message: 'User ID is required.' };
    }

    try {
        const currentUser = await getUserById(userId);
        if (!currentUser) {
            return { success: false, message: 'User not found.' };
        }
        
        let updatedUser: User = { ...currentUser };

        const newStats = {
            totalMaps: parseInt(rawData.totalMaps, 10),
            totalKills: parseInt(rawData.totalKills, 10),
            totalDeaths: parseInt(rawData.totalDeaths, 10),
            totalDamage: parseInt(rawData.totalDamage, 10),
        };
        
        if (Object.values(newStats).some(isNaN)) {
            return { success: false, message: 'All stats must be valid numbers.' };
        }

        const userWithNewStats = await updateUserStats(userId, newStats, true); // Overwrite stats
        if(userWithNewStats) updatedUser = userWithNewStats;
        
        if (avatarFile && avatarFile.size > 0) {
            if (!avatarFile.type.startsWith('image/')) {
                return { success: false, message: 'Invalid file type. Please upload an image.' };
            }
            const buffer = Buffer.from(await avatarFile.arrayBuffer());
            const dataUri = `data:${avatarFile.type};base64,${buffer.toString('base64')}`;
            const userWithAvatar = await updateUserAvatar(userId, dataUri);
            if (userWithAvatar) {
                updatedUser = { ...updatedUser, ...userWithAvatar };
            }
        }

        revalidatePath('/');
        revalidatePath('/admin/dashboard');
        return { success: true, message: 'User updated.', user: updatedUser };
    } catch (error) {
        console.error(error)
        return { success: false, message: 'Failed to update user.' };
    }
}

export async function getRatingsCSV(users: (User & { rating: number; rank: number; kdRatio: number; averageDamage: number; })[]): Promise<string> {
    const headers = ['Rank', 'Player', 'Rating', 'K/D Ratio', 'Avg Damage', 'Total Kills', 'Total Deaths', 'Total Damage', 'Total Maps'];
    
    const rows = users.map(user => {
        return [
            user.rank,
            user.name,
            user.rating.toFixed(2),
            user.kdRatio.toFixed(2),
            user.averageDamage.toFixed(2),
            user.totalKills,
            user.totalDeaths,
            user.totalDamage,
            user.totalMaps
        ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}

export async function updateRatingsFromImage(prevState: any, formData: FormData): Promise<CsvUploadResult> {
    const file = formData.get('image-file') as File;

    if (!file || file.size === 0) {
        return { success: false, message: 'No image file uploaded.' };
    }

    // Check if it's an image file
    if (!file.type.startsWith('image/')) {
        return { success: false, message: 'Invalid file type. Please upload an image file.' };
    }

    try {
        // Convert image to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        
        // Analyze image with Gemini AI
        const result = await processImageWithAI({
            imageData: base64Data,
            mimeType: file.type,
        });

        // Process the CSV data using existing function
        const csvText = result.csvData;
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        const entries = rows.map(parseCsvRow).filter((entry): entry is { name: string; stats: UserStatsData } => entry !== null);
        
        if (entries.length === 0) {
            return { success: false, message: 'No valid data found in the image analysis.' };
        }

        const { updatedCount, newCount } = await processUserDataEntries(entries);
        
        revalidatePath('/');
        revalidatePath('/admin/dashboard');
        
        const message = buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the image analysis.');
        
        return { success: true, message };

    } catch (error) {
        console.error('Image processing error:', error);
        return { 
            success: false, 
            message: error instanceof Error ? error.message : 'Failed to process image file.' 
        };
    }
}
