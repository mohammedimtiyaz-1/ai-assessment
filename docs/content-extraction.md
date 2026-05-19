# Content Extraction Feature

## Overview

The content extraction feature automatically identifies file types (PDF, images, text) and extracts text content from uploaded files. This extracted content is then used for quiz generation and AI-powered analysis.

## Supported File Types

### PDF Files
- **File Types**: `.pdf`
- **MIME Type**: `application/pdf`
- **Extraction Method**: Text extraction using pdf-parse library
- **Process**: 
  1. Upload PDF file
  2. System detects file type as PDF
  3. Extracts text content from all pages
  4. Stores extracted text in database
  5. Uses extracted content for quiz generation

### Image Files
- **File Types**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
- **MIME Types**: `image/jpeg`, `image/png`, `image/gif`, `image/bmp`, `image/webp`
- **Extraction Method**: OCR (Optical Character Recognition) using Tesseract.js
- **Process**:
  1. Upload image file
  2. System detects file type as image
  3. Performs OCR to extract text from image
  4. Stores extracted text in database
  5. Uses extracted content for quiz generation

### Text Files
- **File Types**: `.txt`, `.md`, `.html`
- **MIME Types**: `text/plain`, `text/markdown`, `text/html`
- **Extraction Method**: Direct text extraction
- **Process**:
  1. Upload text file or paste text content
  2. System detects file type as text
  3. Extracts text content directly
  4. Stores text content in database
  5. Uses content for quiz generation

## Database Schema

The `content` table has been enhanced with the following fields:

```sql
file_type varchar(50)              -- pdf, image, text, unknown
original_file_name varchar(500)    -- Original uploaded file name
file_size bigint                   -- File size in bytes
extracted_content text             -- Extracted text content
extraction_status varchar(50)      -- pending, completed, failed
extraction_error text              -- Error message if extraction failed
mime_type varchar(100)             -- MIME type of the file
```

## API Changes

### Upload API (`POST /api/student/content`)

The upload API now automatically processes files:

1. **File Type Detection**: Automatically detects file type based on MIME type and file extension
2. **Content Extraction**: Extracts text content from PDF and image files
3. **Metadata Storage**: Stores file metadata (name, size, type)
4. **Extraction Status**: Tracks extraction status (pending, completed, failed)

**Request**:
```typescript
// File upload
{
  title: "Study Material",
  type: "file",
  file: File object
}

// Text upload
{
  title: "Study Material",
  type: "text",
  textContent: "Text content here"
}
```

**Response**:
```typescript
{
  id: "content-id",
  title: "Study Material",
  type: "file",
  fileType: "pdf",
  extractionStatus: "completed"
}
```

## Content Extraction Service

The content extraction service (`src/lib/content-extraction.ts`) provides:

### File Type Detection
```typescript
detectFileType(mimeType: string, fileName: string): string
```
Detects file type based on MIME type and file extension.

### PDF Content Extraction
```typescript
extractPDFContent(buffer: Buffer): Promise<string>
```
Extracts text content from PDF files using pdf-parse library.

### Image Content Extraction
```typescript
extractImageContent(buffer: Buffer): Promise<string>
```
Extracts text from images using OCR (Tesseract.js).

### File Processing
```typescript
processUploadedFile(file: File, metadata: FileMetadata): Promise<FileExtractionResult>
```
Main function that processes uploaded files and extracts content.

## Upload Flow Changes

### Previous Flow
1. User uploads content
2. System stores content
3. User redirected to quiz page
4. Quiz generated from content

### New Flow
1. User uploads content
2. System detects file type
3. System extracts content (if PDF or image)
4. System stores content with extracted text
5. User redirected to content page (not quiz page)
6. User can generate quiz from content page

## Performance Considerations

### PDF Extraction
- Fast extraction for small to medium PDFs
- Large PDFs may take longer to process
- Extracted text is stored for reuse

### Image OCR
- OCR processing can be slow for large images
- Image quality affects extraction accuracy
- Progress logging during OCR process
- Extracted text is stored for reuse

### Error Handling
- Failed extractions are marked with status 'failed'
- Error messages are stored for debugging
- Original file is still stored even if extraction fails
- User can retry extraction if needed

## Usage Example

### Upload a PDF
```typescript
// User uploads PDF through UI
// System automatically:
// 1. Detects it's a PDF
// 2. Extracts text content
// 3. Stores metadata and extracted content
// 4. Returns extraction status
```

### Upload an Image
```typescript
// User uploads image through UI
// System automatically:
// 1. Detects it's an image
// 2. Performs OCR to extract text
// 3. Stores metadata and extracted content
// 4. Returns extraction status
```

### Paste Text
```typescript
// User pastes text content
// System automatically:
// 1. Detects it's text
// 2. Stores text content directly
// 3. No extraction needed
// 4. Returns completion status
```

## Dependencies

New packages added:
- `pdf-parse`: PDF text extraction
- `tesseract.js`: OCR for image text extraction
- `@types/pdf-parse`: TypeScript types for pdf-parse

## Migration

Database migration: `1779184729000_add_content_extraction_fields.js`

Adds content extraction fields to the content table.

## Future Enhancements

Potential improvements:
- Support for more file types (DOCX, PPTX, etc.)
- Batch processing for multiple files
- Progress indicators for long extractions
- Retry mechanism for failed extractions
- Content preview before quiz generation
- Content editing after extraction
