import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY created_at DESC');
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received POST request to /api/subjects with body:', body);
    
    const { name, category, description, color } = body;

    if (!name || name.trim() === '') {
      console.log('Validation failed: name is required');
      return NextResponse.json(
        { success: false, message: 'Subject name is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to insert into database...');
    const result = await pool.query(
      `INSERT INTO subjects (name, category, description, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), category?.trim() || null, description?.trim() || null, color || null]
    );

    console.log('Subject created successfully:', result.rows[0]);
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to create subject. Please check the database connection.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
