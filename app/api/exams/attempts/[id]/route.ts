import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attemptId = parseInt(params.id);
    
    // Verify attempt exists
    const attemptResult = await pool.query(
      'SELECT * FROM exam_attempts WHERE id = $1',
      [attemptId]
    );
    
    if (attemptResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Exam attempt not found' },
        { status: 404 }
      );
    }

    // Delete associated performance scores first (if any)
    await pool.query(
      'DELETE FROM performance_scores WHERE exam_attempt_id = $1',
      [attemptId]
    );

    // Delete the exam attempt
    await pool.query('DELETE FROM exam_attempts WHERE id = $1', [attemptId]);

    return NextResponse.json({ 
      success: true, 
      message: 'Exam attempt deleted successfully' 
    });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete exam attempt' },
      { status: 500 }
    );
  }
}


