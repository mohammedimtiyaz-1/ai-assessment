import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabase, getSupabaseAdmin } from "@/lib/db";
import { randomUUID } from "crypto";
import { generateQuestions } from "@/lib/ai";
import { logger } from "@/lib/logger";
import { processUploadedFile } from "@/lib/content-extraction";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const supabaseAdmin = getSupabaseAdmin();

  if (id) {
    const { data: content, error } = await supabaseAdmin
      .from('content')
      .select('id, title, type, storage_ref, created_at, extracted_content, extraction_status')
      .eq('id', id)
      .eq('owner_user_id', userId)
      .single();
    
    if (error) {
      logger.error({ error, id }, "Error fetching content");
      return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    }
    
    return NextResponse.json({ content: [content] });
  }

  const { data: content, error } = await supabaseAdmin
    .from('content')
    .select('id, title, type, storage_ref, created_at')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error({ error, userId }, "Error fetching content list");
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
  
  return NextResponse.json({ content: content || [] });
});

export const POST = withAuth(async (req: NextRequest, user) => {
  const userId = user.id;

  try {
    const { data: userCheck, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userCheckError || !userCheck) {
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

    const supabaseAdmin = getSupabaseAdmin();
    const { error: insertError } = await supabaseAdmin
      .from('content')
      .insert({
        id: contentId,
        owner_user_id: userId,
        title,
        type: uploadType,
        storage_ref: textContent,
        file_type: fileType,
        original_file_name: originalFileName,
        file_size: fileSize,
        extracted_content: extractedContent,
        extraction_status: extractionStatus,
        extraction_error: extractionError,
        mime_type: mimeType
      } as any);

    if (insertError) {
      logger.error({ error: insertError, contentId }, "Error inserting content");
      return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
    }

    logger.info({ contentId, userId: user.id, title, fileType, extractionStatus }, "Content created successfully");

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
