exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add fields for file type detection and content extraction
  pgm.addColumns('content', {
    file_type: { type: 'varchar(50)', default: null }, // pdf, image, text, etc.
    original_file_name: { type: 'varchar(500)', default: null }, // original uploaded file name
    file_size: { type: 'bigint', default: null }, // file size in bytes
    extracted_content: { type: 'text', default: null }, // extracted text content from files
    extraction_status: { type: 'varchar(50)', default: 'pending' }, // pending, completed, failed
    extraction_error: { type: 'text', default: null }, // error message if extraction failed
    mime_type: { type: 'varchar(100)', default: null }, // MIME type of the file
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('content', [
    'file_type',
    'original_file_name',
    'file_size',
    'extracted_content',
    'extraction_status',
    'extraction_error',
    'mime_type'
  ]);
};
