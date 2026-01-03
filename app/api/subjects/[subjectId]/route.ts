import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  try {
    const subjectId = parseInt(params.subjectId);
    const result = await pool.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subjectId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subject' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const subjectId = parseInt(params.subjectId);
    
    // Verify subject exists
    const subjectResult = await client.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subjectId]
    );
    
    if (subjectResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, message: 'Subject not found' },
        { status: 404 }
      );
    }

    // Get all topics for this subject
    const topicsResult = await client.query(
      'SELECT id FROM topics WHERE subject_id = $1',
      [subjectId]
    );
    const topicIds = topicsResult.rows.map((row: any) => row.id);

    if (topicIds.length > 0) {
      // Delete revision materials (cascade will handle this, but being explicit)
      await client.query(
        'DELETE FROM revision_materials WHERE topic_id = ANY($1::int[])',
        [topicIds]
      );
    }

    // Delete tasks associated with topics (delete by topic_id to avoid subject_id column issues)
    if (topicIds.length > 0) {
      try {
        await client.query('DELETE FROM tasks WHERE topic_id = ANY($1::int[])', [topicIds]);
      } catch (error: any) {
        // If topic_id column doesn't exist, try subject_id (if it exists)
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          try {
            await client.query('DELETE FROM tasks WHERE subject_id = $1', [subjectId]);
          } catch (e) {
            // Ignore if subject_id also doesn't exist
            console.warn('Could not delete tasks - column may not exist');
          }
        }
      }
    }

    // Delete revision sessions associated with topics
    if (topicIds.length > 0) {
      try {
        await client.query('DELETE FROM revision_sessions WHERE topic_id = ANY($1::int[])', [topicIds]);
      } catch (error: any) {
        // If topic_id column doesn't exist, try subject_id (if it exists)
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          try {
            await client.query('DELETE FROM revision_sessions WHERE subject_id = $1', [subjectId]);
          } catch (e) {
            // Ignore if subject_id also doesn't exist
            console.warn('Could not delete revision sessions - column may not exist');
          }
        }
      }
    }

    // Delete topics
    // This will cascade delete:
    // - revision_materials (already deleted above)
    // - exams (ON DELETE CASCADE)
    // - exam_attempts (ON DELETE CASCADE from exams)
    // 
    // But will preserve (due to ON DELETE SET NULL):
    // - performance_scores (exam_id, exam_attempt_id, topic_id, subject_id set to NULL)
    // - confidence_tracking (topic_id, exam_id, exam_attempt_id set to NULL)
    await client.query('DELETE FROM topics WHERE subject_id = $1', [subjectId]);

    // Delete the subject
    await client.query('DELETE FROM subjects WHERE id = $1', [subjectId]);

    // Note: We intentionally keep:
    // - exams (topic_id set to NULL, but exams preserved)
    // - exam_attempts (keep all exam attempts)
    // - performance_scores (keep all performance scores)
    // - confidence_tracking (keep all confidence tracking)

    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      message: 'Subject and all associated topics and materials deleted. Exam scores have been preserved.' 
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete subject' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

