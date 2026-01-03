import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { topic_id } = await request.json();

    if (!topic_id) {
      return NextResponse.json(
        { success: false, message: 'Topic ID is required' },
        { status: 400 }
      );
    }

    // Get topic information
    const topicResult = await pool.query(
      'SELECT * FROM topics WHERE id = $1',
      [topic_id]
    );

    if (topicResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Topic not found' },
        { status: 404 }
      );
    }

    const topic = topicResult.rows[0];

    // Fetch all revision materials for this topic
    const materialsResult = await pool.query(
      'SELECT * FROM revision_materials WHERE topic_id = $1 ORDER BY uploaded_at ASC',
      [topic_id]
    );

    if (materialsResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No revision materials found for this topic' },
        { status: 400 }
      );
    }

    const materials = materialsResult.rows;

    // Combine all material content
    const combinedContent = materials.map((m: any, index: number) => 
      `--- Material ${index + 1}: ${m.title} ---\n${m.content}\n`
    ).join('\n\n');

    // Generate combined revision material using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant helping a 15-year-old student revise. Combine and synthesize information from multiple revision materials into a comprehensive, well-organized revision guide. Use age-appropriate language and highlight important concepts.'
        },
        {
          role: 'user',
          content: `Combine and synthesize the following revision materials for the topic "${topic.name}" into a comprehensive revision guide.

${topic.description ? `Topic Description: ${topic.description}\n\n` : ''}Revision Materials:
${combinedContent}

Requirements:
- Combine all information into a coherent, well-organized revision guide
- Remove redundancy and merge related concepts
- Organize information logically with clear headings and sections
- Use age-appropriate language for a 15-year-old student
- Highlight key concepts and important points
- Include examples where relevant
- Format the output as structured notes with headings and bullet points
- Ensure all important information from the materials is included
- Create a comprehensive overview that covers all aspects of the topic`
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const combinedMaterial = completion.choices[0]?.message?.content || 'Unable to generate combined revision material.';

    // Save the combined material as a new revision material
    const result = await pool.query(
      `INSERT INTO revision_materials (topic_id, title, content, file_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        topic_id,
        `Combined Revision Guide - ${topic.name}`,
        combinedMaterial,
        'text'
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        material: result.rows[0],
        materials_combined: materials.length,
        topic: topic
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
            : error.message || 'Failed to combine revision materials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

