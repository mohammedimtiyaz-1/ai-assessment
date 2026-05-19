import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";
import { generateQuestions } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { processUploadedFile } from "@/lib/content-extraction";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const result = await query(
      "SELECT id, title, type, storage_ref, created_at FROM content WHERE id = $1 AND owner_user_id = $2",
      [id, userId]
    );
    return NextResponse.json({ content: result.rows });
  }

  const result = await query(
    "SELECT id, title, type, storage_ref, created_at FROM content WHERE owner_user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return NextResponse.json({ content: result.rows });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;

  try {
    const userCheck = await query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return NextResponse.json({ error: "User not found. Please log out and log in again." }, { status: 400 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const uploadType = formData.get("type") as string;
    const file = formData.get("file") as File | null;
    const textContent = formData.get("textContent") as string | null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const contentId = randomUUID();
    
    // Initialize content extraction fields
    let fileType = uploadType;
    let originalFileName = null;
    let fileSize = null;
    let extractedContent = textContent;
    let extractionStatus = 'completed';
    let extractionError = null;
    let mimeType = uploadType === 'text' ? 'text/plain' : null;

    // Process file uploads with content extraction
    if (uploadType === 'file' && file) {
      originalFileName = file.name;
      fileSize = file.size;
      mimeType = file.type;

      try {
        logger.info({ fileName: file.name, mimeType: file.type }, 'Starting file processing');
        
        const extractionResult = await processUploadedFile(file, {
          original_file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        });

        fileType = extractionResult.file_type;
        extractedContent = extractionResult.extracted_content;
        extractionStatus = extractionResult.extraction_status;
        extractionError = extractionResult.extraction_error;
        mimeType = extractionResult.mime_type;

        logger.info({ 
          contentId, 
          fileType, 
          extractionStatus, 
          contentLength: extractedContent?.length 
        }, 'File processing completed');
      } catch (error) {
        logger.error({ error, fileName: file.name }, 'File processing failed');
        extractionStatus = 'failed';
        extractionError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    await query(
      `INSERT INTO content (id, owner_user_id, title, type, storage_ref, file_type, original_file_name, file_size, extracted_content, extraction_status, extraction_error, mime_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [contentId, user.id, title, uploadType, textContent, fileType, originalFileName, fileSize, extractedContent, extractionStatus, extractionError, mimeType]
    );

    logger.info({ contentId, userId: user.id, title, fileType, extractionStatus }, "Content created successfully");

    // Removed automatic question generation - questions will be generated on-demand via the quiz generation API

    return NextResponse.json({
      id: contentId,
      title,
      type: uploadType,
      fileType,
      extractionStatus,
    });
  } catch (error) {
    logger.error({ userId: user.id, error }, "Error creating content");
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
});
