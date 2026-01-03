import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { extractTextFromFile } from '@/lib/file-processor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topic_id');

    let query = 'SELECT * FROM revision_materials WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (topicId) {
      query += ` AND topic_id = $${paramCount}`;
      params.push(parseInt(topicId));
      paramCount++;
    }

    query += ' ORDER BY uploaded_at DESC';

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const topicId = formData.get('topic_id');
    const title = formData.get('title');
    const file = formData.get('file') as File | null;
    const content = formData.get('content') as string | null;

    if (!topicId || !title) {
      return NextResponse.json(
        { success: false, message: 'Topic ID and title are required' },
        { status: 400 }
      );
    }

    let extractedContent: string | null = null;
    let fileType: string;
    let fileName: string | null = null;
    let fileData: Buffer | null = null;

    if (file && file.size > 0) {
      // File upload mode - save the file and optionally extract text
      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      fileData = Buffer.from(arrayBuffer);
      
      // Determine file type from extension
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      fileType = fileExtension;
      
      // Try to extract text for preview, but don't fail if it doesn't work
      // The actual parsing will happen via OpenAI when revision/exam is requested
      try {
        const result = await extractTextFromFile(file);
        extractedContent = result.content;
        fileType = result.fileType;
      } catch (error: any) {
        console.log('Text extraction failed, but saving file for OpenAI parsing later:', error.message);
        // Continue - we'll save the file and use OpenAI to parse it later
        extractedContent = null;
      }
    } else if (content) {
      // Text input mode
      extractedContent = content;
      fileType = 'text';
      fileData = null;
    } else {
      return NextResponse.json(
        { success: false, message: 'Either file or content is required' },
        { status: 400 }
      );
    }

    // Save the material - content may be null if file parsing failed (will use OpenAI later)
    const result = await pool.query(
      `INSERT INTO revision_materials (topic_id, title, content, file_data, file_name, file_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        parseInt(topicId as string), 
        title as string, 
        extractedContent, 
        fileData, 
        fileName, 
        fileType
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create material' },
      { status: 500 }
    );
  }
}
