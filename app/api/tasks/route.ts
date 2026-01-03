import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { task_type, subject_id, topic_id, title, description, start_date, deadline, status, importance, notes } = await request.json();

    if (!task_type || !title) {
      return NextResponse.json(
        { success: false, message: 'Task type and title are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO tasks (task_type, subject_id, topic_id, title, description, start_date, deadline, status, importance, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [task_type, subject_id || null, topic_id || null, title, description || null, start_date || null, deadline || null, status || 'pending', importance || 3, notes || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create task' },
      { status: 500 }
    );
  }
}


