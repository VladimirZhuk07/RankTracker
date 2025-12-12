'use server';

// @ts-ignore - Package needs to be installed: npm install @google/generative-ai
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Define schemas server-side only
const ImageStatsInputSchema = z.object({
  imageData: z.string().describe('Base64 encoded image data'),
  mimeType: z.string().describe('MIME type of the image (e.g., image/jpeg, image/png)'),
});

const ImageStatsOutputSchema = z.object({
  csvData: z.string().describe('CSV formatted data with columns: name, maps (always 1), kills, deaths, damage'),
});

export type ImageStatsInput = z.infer<typeof ImageStatsInputSchema>;
export type ImageStatsOutput = z.infer<typeof ImageStatsOutputSchema>;

// Rate limiting storage (in-memory for simplicity)
let lastApiCall = 0;
const RATE_LIMIT_MS = 60000; // 60 seconds (free tier limit is ~15 requests per minute)

// Helper function to extract retry delay from error
function extractRetryDelay(error: any): number {
  try {
    if (error?.errorDetails) {
      for (const detail of error.errorDetails) {
        if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && detail.retryDelay) {
          // Convert retry delay to milliseconds
          const delayStr = detail.retryDelay;
          const seconds = parseFloat(delayStr.replace('s', ''));
          return Math.ceil(seconds * 1000);
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return 60000; // Default to 60 seconds
}

export async function processImageWithAI(input: ImageStatsInput): Promise<ImageStatsOutput> {
  // Check rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastCall;
    throw new Error(`Rate limit: Please wait ${Math.ceil(waitTime / 1000)} seconds before making another request.`);
  }
  
  lastApiCall = now;

  // Use Google Generative AI SDK directly for image processing
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `Это рейтинг CS2, прочитай из таблицы имя игрока, дальше колонка убийства, смерти, потом пропусти две колонки и последняя это урон. 
Оставь только результаты в формате CSV без  дополнительного текста что ты сделал:
name, maps (всегда 1), kills, deaths, damage`;

  // Convert base64 to the format expected by Gemini
  const imagePart = {
    inlineData: {
      data: input.imageData,
      mimeType: input.mimeType
    }
  };

  try {
    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    // Parse the CSV response and validate with schema
    const csvData = text.trim();
    
    // Validate output matches schema
    const validated = ImageStatsOutputSchema.parse({ csvData });
    
    return validated;
  } catch (error: any) {
    // Handle rate limit errors (429)
    if (error?.status === 429 || error?.statusText === 'Too Many Requests') {
      const retryDelay = extractRetryDelay(error);
      const waitSeconds = Math.ceil(retryDelay / 1000);
      
      // Update lastApiCall to prevent immediate retry
      lastApiCall = Date.now() + retryDelay;
      
      throw new Error(
        `API rate limit exceeded. Please wait ${waitSeconds} seconds before trying again. ` +
        `Free tier limits: ~15 requests per minute.`
      );
    }
    
    // Re-throw other errors
    throw error;
  }
}
