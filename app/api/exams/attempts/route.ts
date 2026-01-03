import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('exam_id');

    let query = `
      SELECT 
        ea.*,
        e.title as exam_title,
        e.topic_id,
        t.name as topic_name,
        s.name as subject_name
      FROM exam_attempts ea
      LEFT JOIN exams e ON ea.exam_id = e.id
      LEFT JOIN topics t ON e.topic_id = t.id
      LEFT JOIN subjects s ON t.subject_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (examId) {
      query += ` AND ea.exam_id = $${paramCount}`;
      params.push(parseInt(examId));
      paramCount++;
    }

    query += ' ORDER BY ea.completed_at DESC, ea.created_at DESC';

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch exam attempts' },
      { status: 500 }
    );
  }
}


