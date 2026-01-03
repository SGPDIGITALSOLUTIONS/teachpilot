import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { subjectId: string } }
) {
  try {
    const subjectId = parseInt(params.subjectId);

    // Get all topics for this subject
    const topicsResult = await pool.query(
      'SELECT id FROM topics WHERE subject_id = $1',
      [subjectId]
    );

    if (topicsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          average_confidence: null,
          topic_count: 0,
          topics_with_confidence: 0
        }
      });
    }

    const topicIds = topicsResult.rows.map((row: any) => row.id);

    // Get latest confidence for each topic
    const confidenceResult = await pool.query(
      `SELECT DISTINCT ON (topic_id) 
       topic_id, confidence_level, tracked_at
       FROM confidence_tracking
       WHERE topic_id = ANY($1::int[])
       ORDER BY topic_id, tracked_at DESC`,
      [topicIds]
    );

    if (confidenceResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          average_confidence: null,
          topic_count: topicIds.length,
          topics_with_confidence: 0
        }
      });
    }

    const totalConfidence = confidenceResult.rows.reduce(
      (sum: number, row: any) => sum + row.confidence_level,
      0
    );
    const averageConfidence = totalConfidence / confidenceResult.rows.length;

    return NextResponse.json({
      success: true,
      data: {
        average_confidence: Math.round(averageConfidence * 10) / 10, // Round to 1 decimal
        topic_count: topicIds.length,
        topics_with_confidence: confidenceResult.rows.length
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to calculate average confidence' },
      { status: 500 }
    );
  }
}


