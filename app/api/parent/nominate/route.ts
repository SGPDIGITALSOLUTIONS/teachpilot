import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { parent_email, parent_name } = await request.json();

    if (!parent_email) {
      return NextResponse.json(
        { success: false, message: 'Parent email is required' },
        { status: 400 }
      );
    }

    // Check if there's already a pending or accepted nomination
    const existingCheck = await pool.query(
      'SELECT * FROM parent_nominations WHERE status IN ($1, $2) ORDER BY created_at DESC LIMIT 1',
      ['pending', 'accepted']
    );

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'A parent nomination already exists. Please wait for it to be accepted or declined.' },
        { status: 400 }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Create nomination (student_user_id is 1 for single user system)
    const result = await pool.query(
      `INSERT INTO parent_nominations (student_user_id, parent_email, parent_name, invitation_token, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [1, parent_email, parent_name || null, invitationToken]
    );

    // TODO: Send invitation email to parent with token
    // For now, we'll just return the token in development
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/parent/accept/${invitationToken}`;

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      invitationUrl: process.env.NODE_ENV === 'development' ? invitationUrl : undefined,
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create parent nomination' },
      { status: 500 }
    );
  }
}

