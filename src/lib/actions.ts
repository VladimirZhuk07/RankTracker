'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createHash } from 'crypto';
import {
  addUser,
  updateUserAvatar,
  updateUserName,
  deleteUserById,
  getUserById,
  getUserByName,
  userExistsByName,
  addMatchRecord,
  updateMatchRecord,
  deleteMatchRecord,
  addSession,
  updateSessionFields,
  deleteSessionWithMatches,
} from './storage/data';
import type { User, UserStatsData } from './storage/definitions';
import type { ParsedUserData } from '@/components/admin/CsvPreviewTable';
import { processImageWithAI } from '@/lib/image-actions';

type AuthState = string | undefined;

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
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
  const name = (formData.get('name') as string)?.trim();

  if (!name) {
    return { message: 'Player name is required.', error: true };
  }

  try {
    const exists = await userExistsByName(name);
    if (exists) {
      return { message: `User with name "${name}" already exists.`, error: true };
    }

    const newUser = await addUser(name);
    revalidatePath('/');
    revalidatePath('/admin/dashboard');
    return { message: `User created: ${newUser.name}`, user: newUser, error: false };
  } catch (error) {
    return { message: 'Failed to create user.', error: true };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
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

type UpdateUserResult = {
  success: boolean;
  message: string;
  user?: User | null;
};

export async function updateUser(prevState: any, formData: FormData): Promise<UpdateUserResult> {
  const userId = formData.get('userId') as string;
  const name = (formData.get('name') as string)?.trim();
  const avatarFile = formData.get('avatar') as File | null;

  if (!userId) {
    return { success: false, message: 'User ID is required.' };
  }

  try {
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      return { success: false, message: 'User not found.' };
    }

    let updatedUser: User = { ...currentUser };

    if (name && name !== currentUser.name) {
      const userWithNewName = await updateUserName(userId, name);
      if (userWithNewName) updatedUser = userWithNewName;
    }

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
    return { success: false, message: 'Failed to update user.' };
  }
}

type CsvUploadResult = {
  success: boolean;
  message: string;
  users?: User[];
};

function parseCsvRow(row: string): { name: string; kills: number; deaths: number; damage: number; won: boolean } | null {
  const [name, killsStr, deathsStr, damageStr, wonStr] = row.split(',').map(s => s.trim());

  if (!name || !killsStr || !deathsStr || !damageStr) {
    return null;
  }

  const kills = parseInt(killsStr, 10);
  const deaths = parseInt(deathsStr, 10);
  const damage = parseInt(damageStr, 10);

  if (isNaN(kills) || isNaN(deaths) || isNaN(damage)) {
    return null;
  }

  const won = wonStr === 'true' || wonStr === '1';

  return { name, kills, deaths, damage, won };
}

async function processUserDataEntries(
  entries: Array<{ name: string; kills: number; deaths: number; damage: number; won: boolean; mapIndex: number; date?: string }>
): Promise<{ updatedCount: number; newCount: number }> {
  let updatedCount = 0;
  let newCount = 0;

  const sessionId = crypto.randomUUID();
  const firstEntry = entries[0];
  await addSession(sessionId, firstEntry?.mapIndex ?? 0, firstEntry?.date);

  for (const entry of entries) {
    const { name, kills, deaths, damage, won, date } = entry;

    if (!name) continue;

    const userExisted = await userExistsByName(name);
    let user = await getUserByName(name);

    if (!user) {
      user = await addUser(name);
    }

    await addMatchRecord(user.id, user.name, { kills, deaths, damage, won, date, sessionId });

    if (userExisted) {
      updatedCount++;
    } else {
      newCount++;
    }
  }

  return { updatedCount, newCount };
}

function buildUpdateMessage(updatedCount: number, newCount: number, defaultMessage: string): string {
  let message = '';
  if (updatedCount > 0) message += `${updatedCount} existing user(s) updated. `;
  if (newCount > 0) message += `${newCount} new user(s) created.`;
  if (message === '') message = defaultMessage;
  return message;
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
    const entries = data.map(item => ({
      name: item.name,
      kills: item.kills,
      deaths: item.deaths,
      damage: item.damage,
      won: item.won,
      mapIndex: item.mapIndex,
      date: item.date,
    }));
    const { updatedCount, newCount } = await processUserDataEntries(entries);

    revalidatePath('/');
    revalidatePath('/admin/dashboard');

    const message = buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the data.');

    return { success: true, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process data.';
    return { success: false, message };
  }
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
    const entries = rows
      .map(parseCsvRow)
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .map(e => ({ ...e, won: false, mapIndex: 0 }));

    if (entries.length === 0) {
      return { success: false, message: 'No valid data found in the CSV file.' };
    }

    const { updatedCount, newCount } = await processUserDataEntries(entries);

    revalidatePath('/');
    revalidatePath('/admin/dashboard');

    return { success: true, message: buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the CSV.') };
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
    const entries = rows
      .map(parseCsvRow)
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .map(e => ({ ...e, won: false, mapIndex: 0 }));

    if (entries.length === 0) {
      return { success: false, message: 'No valid data found in the CSV content.' };
    }

    const { updatedCount, newCount } = await processUserDataEntries(entries);

    revalidatePath('/');
    revalidatePath('/admin/dashboard');

    return { success: true, message: buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the CSV.') };
  } catch (error) {
    return { success: false, message: 'Failed to process CSV text.' };
  }
}

export async function updateRatingsFromImage(prevState: any, formData: FormData): Promise<CsvUploadResult> {
  const file = formData.get('image-file') as File;

  if (!file || file.size === 0) {
    return { success: false, message: 'No image file uploaded.' };
  }

  if (!file.type.startsWith('image/')) {
    return { success: false, message: 'Invalid file type. Please upload an image file.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const result = await processImageWithAI({
      imageData: base64Data,
      mimeType: file.type,
    });

    const csvText = result.csvData;
    const rows = csvText.split('\n').filter(row => row.trim() !== '');
    const entries = rows
      .map(parseCsvRow)
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .map(e => ({ ...e, won: false, mapIndex: 0 }));

    if (entries.length === 0) {
      return { success: false, message: 'No valid data found in the image analysis.' };
    }

    const { updatedCount, newCount } = await processUserDataEntries(entries);

    revalidatePath('/');
    revalidatePath('/admin/dashboard');

    return { success: true, message: buildUpdateMessage(updatedCount, newCount, 'No users were updated or created from the image analysis.') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process image file.',
    };
  }
}

type MatchUpdateResult = { success: boolean; message: string };

export async function updateMatch(
  matchId: string,
  data: { kills: number; deaths: number; damage: number; won: boolean }
): Promise<MatchUpdateResult> {
  if (!matchId) {
    return { success: false, message: 'Match ID is required.' };
  }

  try {
    await updateMatchRecord(matchId, data);
    revalidatePath('/');
    revalidatePath('/admin/dashboard');
    return { success: true, message: 'Match updated.' };
  } catch (error) {
    return { success: false, message: 'Failed to update match.' };
  }
}

export async function deleteSession(sessionId: string): Promise<MatchUpdateResult> {
  if (!sessionId) {
    return { success: false, message: 'Session ID is required.' };
  }

  try {
    await deleteSessionWithMatches(sessionId);
    revalidatePath('/');
    revalidatePath('/admin/dashboard');
    return { success: true, message: 'Session deleted.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete session.';
    return { success: false, message };
  }
}

export async function updateSession(
  sessionId: string,
  mapIndex: number | undefined,
  date: string | undefined
): Promise<MatchUpdateResult> {
  if (!sessionId) {
    return { success: false, message: 'Session ID is required.' };
  }

  try {
    await updateSessionFields(sessionId, { mapIndex, date });
    revalidatePath('/admin/dashboard');
    return { success: true, message: 'Session updated.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update session.';
    return { success: false, message };
  }
}

export async function deleteMatch(matchId: string): Promise<MatchUpdateResult> {
  if (!matchId) {
    return { success: false, message: 'Match ID is required.' };
  }

  try {
    await deleteMatchRecord(matchId);
    revalidatePath('/');
    revalidatePath('/admin/dashboard');
    return { success: true, message: 'Match deleted.' };
  } catch (error) {
    return { success: false, message: 'Failed to delete match.' };
  }
}

export async function getRatingsCSV(
  users: (User & UserStatsData & { rating: number; rank: number; kdRatio: number; averageDamage: number })[]
): Promise<string> {
  const headers = ['Rank', 'Player', 'Rating', 'K/D Ratio', 'Avg Damage', 'Total Kills', 'Total Deaths', 'Total Damage', 'Total Maps'];

  const rows = users.map(user => [
    user.rank,
    user.name,
    user.rating.toFixed(2),
    user.kdRatio.toFixed(2),
    user.averageDamage.toFixed(2),
    user.totalKills,
    user.totalDeaths,
    user.totalDamage,
    user.totalMaps,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}
