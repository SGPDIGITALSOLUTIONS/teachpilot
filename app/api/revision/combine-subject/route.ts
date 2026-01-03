import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { subject_id } = await request.json();

    if (!subject_id) {
      return NextResponse.json(
        { success: false, message: 'Subject ID is required' },
        { status: 400 }
      );
    }

    // Get subject information
    const subjectResult = await pool.query(
      'SELECT * FROM subjects WHERE id = $1',
      [subject_id]
    );

    if (subjectResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Subject not found' },
        { status: 404 }
      );
    }

    const subject = subjectResult.rows[0];

    // Get all topics for this subject
    const topicsResult = await pool.query(
      'SELECT * FROM topics WHERE subject_id = $1 ORDER BY created_at ASC',
      [subject_id]
    );

    if (topicsResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No topics found for this subject' },
        { status: 400 }
      );
    }

    const topics = topicsResult.rows;
    const topicIds = topics.map((t: any) => t.id);

    // Fetch all revision materials for all topics in this subject
    const materialsResult = await pool.query(
      'SELECT * FROM revision_materials WHERE topic_id = ANY($1::int[]) ORDER BY topic_id, uploaded_at ASC',
      [topicIds]
    );

    if (materialsResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No revision materials found for this subject' },
        { status: 400 }
      );
    }

    const materials = materialsResult.rows;

    // Organize materials by topic
    const materialsByTopic: Record<number, any[]> = {};
    topics.forEach((topic: any) => {
      materialsByTopic[topic.id] = materials.filter((m: any) => m.topic_id === topic.id);
    });

    // Build combined content with topic organization
    let combinedContent = '';
    topics.forEach((topic: any) => {
      const topicMaterials = materialsByTopic[topic.id];
      if (topicMaterials.length > 0) {
        combinedContent += `\n\n=== TOPIC: ${topic.name} ===\n`;
        if (topic.description) {
          combinedContent += `Description: ${topic.description}\n\n`;
        }
        topicMaterials.forEach((m: any, index: number) => {
          combinedContent += `--- Material ${index + 1}: ${m.title} ---\n${m.content}\n\n`;
        });
      }
    });

    // Generate combined revision material using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant helping a 15-year-old student revise. Combine and synthesize information from multiple topics and revision materials into a comprehensive, well-organized revision guide for the entire subject. Use age-appropriate language and highlight important concepts.'
        },
        {
          role: 'user',
          content: `Combine and synthesize the following revision materials for the subject "${subject.name}" into a comprehensive revision guide covering all topics.

${subject.description ? `Subject Description: ${subject.description}\n\n` : ''}Topics and Materials:
${combinedContent}

Requirements:
- Combine all information from all topics into a coherent, well-organized revision guide
- Organize by topic with clear section headings
- Remove redundancy and merge related concepts across topics
- Show connections between topics where relevant
- Use age-appropriate language for a 15-year-old student
- Highlight key concepts and important points
- Include examples where relevant
- Format the output as structured notes with headings and bullet points
- Ensure all important information from all materials is included
- Create a comprehensive overview that covers all aspects of the subject
- Make it easy to navigate between different topics`
        }
      ],
      max_tokens: 6000,
      temperature: 0.7,
    });

    const combinedMaterial = completion.choices[0]?.message?.content || 'Unable to generate combined revision material.';

    // Get the first topic ID to save the material (or we could create a special "subject-level" material)
    // For now, we'll save it to the first topic
    const firstTopicId = topics[0].id;

    // Save the combined material as a new revision material
    const result = await pool.query(
      `INSERT INTO revision_materials (topic_id, title, content, file_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        firstTopicId,
        `Combined Revision Guide - ${subject.name} (All Topics)`,
        combinedMaterial,
        'text'
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        material: result.rows[0],
        materials_combined: materials.length,
        topics_combined: topics.length,
        subject: subject
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

