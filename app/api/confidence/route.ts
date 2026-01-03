import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { topic_id, exam_attempt_id, confidence_level, notes } = await request.json();

    if (!topic_id || !confidence_level) {
      return NextResponse.json(
        { success: false, message: 'Topic ID and confidence level are required' },
        { status: 400 }
      );
    }

    if (confidence_level < 1 || confidence_level > 5) {
      return NextResponse.json(
        { success: false, message: 'Confidence level must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get previous confidence for comparison
    const previousResult = await pool.query(
      `SELECT confidence_level, tracked_at 
       FROM confidence_tracking 
       WHERE topic_id = $1 
       ORDER BY tracked_at DESC 
       LIMIT 1`,
      [topic_id]
    );

    const previousConfidence = previousResult.rows[0] || null;

    // Store new confidence
    const result = await pool.query(
      `INSERT INTO confidence_tracking 
       (topic_id, exam_attempt_id, confidence_level, previous_confidence_level, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        topic_id,
        exam_attempt_id || null,
        confidence_level,
        previousConfidence?.confidence_level || null,
        notes || null
      ]
    );

    // Build comparison message
    let comparison = '';
    if (previousConfidence) {
      const diff = confidence_level - previousConfidence.confidence_level;
      const prevDate = new Date(previousConfidence.tracked_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      if (diff > 0) {
        comparison = `You are now more confident than you were on ${prevDate}`;
      } else if (diff < 0) {
        comparison = `You feel less confident than on ${prevDate}. That's okay! Keep practicing and you'll build confidence again.`;
      } else {
        comparison = `Your confidence level is the same as on ${prevDate}`;
      }
    } else {
      comparison = 'This is your first confidence check for this topic!';
    }

    return NextResponse.json({
      success: true,
      data: {
        confidence: result.rows[0],
        current_confidence: confidence_level,
        previous_confidence: previousConfidence ? {
          level: previousConfidence.confidence_level,
          date: previousConfidence.tracked_at,
          exists: true
        } : { exists: false },
        comparison: comparison
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save confidence' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topic_id');

    let query = 'SELECT * FROM confidence_tracking WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (topicId) {
      query += ` AND topic_id = $${paramCount}`;
      params.push(parseInt(topicId));
      paramCount++;
    }

    query += ' ORDER BY tracked_at DESC';

    const result = await pool.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch confidence history' },
      { status: 500 }
    );
  }
}


