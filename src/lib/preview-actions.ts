'use server';

import { userExistsByName } from './data';
import { ParsedUserData } from '@/components/admin/CsvPreviewTable';

export async function previewCsvFile(formData: FormData): Promise<{
  success: boolean;
  message: string;
  data?: ParsedUserData[];
}> {
  const file = formData.get('csv-file') as File;

  if (!file || file.size === 0) {
    return { success: false, message: 'No file uploaded.' };
  }
  
  if (file.type !== 'text/csv') {
    return { success: false, message: 'Invalid file type. Please upload a CSV.' };
  }

  try {
    const text = await file.text();
    return await parseCsvContent(text);
  } catch (error) {
    console.error(error);
    return { 
      success: false, 
      message: 'Failed to process CSV file.' 
    };
  }
}

export async function previewCsvText(formData: FormData): Promise<{
  success: boolean;
  message: string;
  data?: ParsedUserData[];
}> {
  const csvText = formData.get('csv-text') as string;

  if (!csvText || csvText.trim() === '') {
    return { success: false, message: 'No CSV content provided.' };
  }

  try {
    return await parseCsvContent(csvText);
  } catch (error) {
    console.error(error);
    return { 
      success: false, 
      message: 'Failed to process CSV text.' 
    };
  }
}

async function parseCsvContent(content: string): Promise<{
  success: boolean;
  message: string;
  data?: ParsedUserData[];
}> {
  const rows = content.split('\n').filter(row => row.trim() !== '');
  const parsedData: ParsedUserData[] = [];
  const invalidRows: string[] = [];
  
  for (const [index, row] of rows.entries()) {
    const [name, mapsStr, killsStr, deathsStr, damageStr] = row.split(',').map(s => s.trim());
    
    if (!name || !mapsStr || !killsStr || !deathsStr || !damageStr) {
      invalidRows.push(`Row ${index + 1}: Missing required fields`);
      continue;
    }
    
    const stats = {
      totalMaps: parseInt(mapsStr, 10),
      totalKills: parseInt(killsStr, 10),
      totalDeaths: parseInt(deathsStr, 10),
      totalDamage: parseInt(damageStr, 10),
    };

    if (Object.values(stats).some(isNaN)) {
      invalidRows.push(`Row ${index + 1}: Contains invalid numeric values`);
      continue;
    }

    // Check if user exists
    const isExisting = await userExistsByName(name);
    
    parsedData.push({
      name,
      stats,
      isExisting
    });
  }

  // Build response message
  let message = '';
  if (parsedData.length > 0) {
    const updateCount = parsedData.filter(item => item.isExisting).length;
    const newCount = parsedData.length - updateCount;
    
    if (updateCount > 0) message += `${updateCount} existing user(s) will be updated. `;
    if (newCount > 0) message += `${newCount} new user(s) will be created. `;
  }
  
  if (invalidRows.length > 0) {
    message += `${invalidRows.length} row(s) contain invalid data and will be skipped.`;
  }
  
  if (parsedData.length === 0) {
    return {
      success: false,
      message: 'No valid data found in the CSV content.',
    };
  }
  
  return {
    success: true,
    message: message.trim(),
    data: parsedData
  };
}