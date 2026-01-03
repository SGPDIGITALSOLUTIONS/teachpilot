import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [params.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { task_type, subject_id, topic_id, title, description, start_date, deadline, status, importance, notes } = await request.json();

    if (!task_type || !title) {
      return NextResponse.json(
        { success: false, message: 'Task type and title are required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `UPDATE tasks 
       SET task_type = $1, subject_id = $2, topic_id = $3, title = $4, description = $5, 
           start_date = $6, deadline = $7, status = $8, importance = $9, notes = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [task_type, subject_id || null, topic_id || null, title, description || null, start_date || null, deadline || null, status || 'pending', importance || 3, notes || null, params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete task' },
      { status: 500 }
    );
  }
}


