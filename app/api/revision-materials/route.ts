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

    let extractedContent: string;
    let fileType: string;
    let fileName: string | null = null;

    if (file && file.size > 0) {
      // File upload mode
      try {
        const result = await extractTextFromFile(file);
        extractedContent = result.content;
        fileType = result.fileType;
        fileName = file.name;
      } catch (error: any) {
        console.error('File processing error:', error);
        return NextResponse.json(
          { success: false, message: error.message || 'Failed to process file' },
          { status: 400 }
        );
      }
    } else if (content) {
      // Text input mode
      extractedContent = content;
      fileType = 'text';
    } else {
      return NextResponse.json(
        { success: false, message: 'Either file or content is required' },
        { status: 400 }
      );
    }

    if (!extractedContent || extractedContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'No content extracted from file. Please ensure the file contains text.' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO revision_materials (topic_id, title, content, file_name, file_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [parseInt(topicId as string), title as string, extractedContent, fileName, fileType]
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
