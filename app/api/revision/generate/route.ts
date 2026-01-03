import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { material_id, topic_id } = await request.json();

    if (!material_id) {
      return NextResponse.json(
        { success: false, message: 'Material ID is required' },
        { status: 400 }
      );
    }

    // Fetch material content
    const materialResult = await pool.query(
      'SELECT * FROM revision_materials WHERE id = $1',
      [material_id]
    );

    if (materialResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Material not found' },
        { status: 404 }
      );
    }

    const material = materialResult.rows[0];
    const materialContent = material.content;

    // Generate revision summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant helping a 15-year-old student revise. Create clear, organized revision summaries with key points, headings, and bullet points. Use age-appropriate language and highlight important concepts.'
        },
        {
          role: 'user',
          content: `Based on the following revision material, create a clear, organized revision summary.

Revision Material:
${materialContent}

Requirements:
- Create key points and summaries
- Organize information logically
- Use age-appropriate language
- Highlight important concepts
- Include examples where relevant
- Format the output as structured notes with headings and bullet points`
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const revisionSummary = completion.choices[0]?.message?.content || 'Unable to generate revision summary.';

    return NextResponse.json({
      success: true,
      data: {
        revision_summary: revisionSummary,
        material_id: material_id,
        topic_id: topic_id,
      }
    });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Check if it's a network/connectivity error
    const isNetworkError = error?.code === 'ECONNREFUSED' || 
                           error?.code === 'ENOTFOUND' || 
                           error?.message?.includes('fetch failed') ||
                           error?.message?.includes('network') ||
                           error?.cause?.code === 'ECONNREFUSED';
    
    return NextResponse.json(
      { 
        success: false, 
        message: isNetworkError 
          ? 'Unable to connect to AI service. Please check your internet connection and try again.'
          : error?.message?.includes('API key')
            ? 'OpenAI API key is not configured. Please check your environment variables.'
            : 'Failed to generate revision summary. Please try again.'
      },
      { status: 500 }
    );
  }
}


