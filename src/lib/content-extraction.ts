import Tesseract from 'tesseract.js';
import { logger } from './logger';
import { getOpenAIClient } from './ai';

// Dynamic import for pdf-parse to avoid import issues
const pdf = require('pdf-parse');

export interface FileExtractionResult {
  file_type: string;
  extracted_content: string | null;
  extraction_status: 'completed' | 'failed';
  extraction_error: string | null;
  mime_type: string;
}

export interface FileMetadata {
  original_file_name: string;
  file_size: number;
  mime_type: string;
}

/**
 * Detect file type from MIME type or file extension
 */
export function detectFileType(mimeType: string, fileName: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType.startsWith('text/')) {
    return 'text';
  }
  
  // Fallback to file extension
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
  if (['txt', 'md', 'html'].includes(ext || '')) return 'text';
  
  return 'unknown';
}

/**
 * Extract text content from a PDF file
 */
export async function extractPDFContent(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    logger.error({ error }, 'Failed to extract PDF content');
    throw new Error('Failed to extract PDF content');
  }
}

/**
 * Extract text content from an image file using OpenAI GPT-4o Vision
 * This extracts both text and describes visual elements (diagrams, charts, etc.)
 */
export async function extractImageContent(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    logger.info({ mimeType }, 'Extracting image content using OpenAI Vision');
    
    const base64Image = buffer.toString('base64');
    
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this image for educational purposes. Extract all visible text exactly as it appears. Additionally, describe any diagrams, charts, graphs, or visual concepts in detail so that a student can understand them. If the image is just a picture, describe what it depicts. The output should be a comprehensive textual representation of the image suitable for generating study questions." 
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI Vision");
    }

    return content;
  } catch (error) {
    logger.error({ error }, 'Failed to extract image content using OpenAI Vision');
    
    // Fallback to Tesseract if OpenAI fails
    try {
      logger.info('Falling back to Tesseract OCR');
      const result = await Tesseract.recognize(
        buffer,
        'eng'
      );
      return result.data.text;
    } catch (fallbackError) {
      logger.error({ fallbackError }, 'Tesseract fallback also failed');
      throw new Error('Failed to extract image content');
    }
  }
}

/**
 * Extract content from a file based on its type
 */
export async function extractContentFromFile(
  buffer: Buffer,
  fileType: string,
  mimeType: string
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return await extractPDFContent(buffer);
    case 'image':
      return await extractImageContent(buffer, mimeType);
    case 'text':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Process uploaded file and extract content
 */
export async function processUploadedFile(
  file: File,
  metadata: FileMetadata
): Promise<FileExtractionResult> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileType = detectFileType(metadata.mime_type, metadata.original_file_name);
    
    logger.info({ 
      fileName: metadata.original_file_name, 
      fileType, 
      mimeType: metadata.mime_type 
    }, 'Processing uploaded file');

    let extractedContent: string | null = null;
    let extractionStatus: 'completed' | 'failed' = 'completed';
    let extractionError: string | null = null;

    try {
      extractedContent = await extractContentFromFile(buffer, fileType, metadata.mime_type);
      logger.info({ 
        fileName: metadata.original_file_name, 
        contentLength: extractedContent?.length 
      }, 'Content extracted successfully');
    } catch (error) {
      extractionStatus = 'failed';
      extractionError = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ 
        fileName: metadata.original_file_name, 
        error: extractionError 
      }, 'Content extraction failed');
    }

    return {
      file_type: fileType,
      extracted_content: extractedContent,
      extraction_status: extractionStatus,
      extraction_error: extractionError,
      mime_type: metadata.mime_type
    };
  } catch (error) {
    logger.error({ error, fileName: metadata.original_file_name }, 'File processing failed');
    return {
      file_type: 'unknown',
      extracted_content: null,
      extraction_status: 'failed',
      extraction_error: error instanceof Error ? error.message : 'Unknown error',
      mime_type: metadata.mime_type
    };
  }
}
