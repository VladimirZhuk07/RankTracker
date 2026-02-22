'use server';

import { userExistsByName } from './storage/data';
import { ParsedUserData } from '@/components/admin/CsvPreviewTable';
import { processImageWithAI } from '@/lib/image-actions';

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
    return { success: false, message: 'Failed to process CSV file.' };
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
    return { success: false, message: 'Failed to process CSV text.' };
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

  const today = new Date().toISOString().slice(0, 10);

  for (const [index, row] of rows.entries()) {
    const [name, killsStr, deathsStr, damageStr, wonStr] = row.split(',').map(s => s.trim());

    if (!name || !killsStr || !deathsStr || !damageStr) {
      invalidRows.push(`Row ${index + 1}: Missing required fields`);
      continue;
    }

    const kills = parseInt(killsStr, 10);
    const deaths = parseInt(deathsStr, 10);
    const damage = parseInt(damageStr, 10);

    if (isNaN(kills) || isNaN(deaths) || isNaN(damage)) {
      invalidRows.push(`Row ${index + 1}: Contains invalid numeric values`);
      continue;
    }

    const won = wonStr === 'true' || wonStr === '1';
    const isExisting = await userExistsByName(name);

    parsedData.push({ name, kills, deaths, damage, won, mapIndex: 0, date: today, isExisting });
  }

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
    return { success: false, message: 'No valid data found in the CSV content.' };
  }

  return { success: true, message: message.trim(), data: parsedData };
}

export async function previewImageFile(formData: FormData): Promise<{
  success: boolean;
  message: string;
  data?: ParsedUserData[];
}> {
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

    return await parseCsvContent(result.csvData);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process image file.',
    };
  }
}
