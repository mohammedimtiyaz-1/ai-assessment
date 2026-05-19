import Tesseract from 'tesseract.js';
import { logger } from './logger';

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
 * Extract text content from an image file using OCR
 */
export async function extractImageContent(buffer: Buffer): Promise<string> {
  try {
    const result = await Tesseract.recognize(
      buffer,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.info({ progress: m.progress }, 'OCR progress');
          }
        }
      }
    );
    return result.data.text;
  } catch (error) {
    logger.error({ error }, 'Failed to extract image content');
    throw new Error('Failed to extract image content');
  }
}

/**
 * Extract content from a file based on its type
 */
export async function extractContentFromFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return await extractPDFContent(buffer);
    case 'image':
      return await extractImageContent(buffer);
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
      extractedContent = await extractContentFromFile(buffer, fileType);
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
