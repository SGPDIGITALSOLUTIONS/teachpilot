import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { material_id, topic_id, num_questions, additional_instructions } = await request.json();

    if (!material_id || !num_questions) {
      return NextResponse.json(
        { success: false, message: 'Material ID and number of questions are required' },
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

    if (!materialContent || materialContent.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Material content is empty. Please ensure the material has content.' },
        { status: 400 }
      );
    }

    // Check for existing exams from this material to determine version number
    const existingExamsResult = await pool.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM exams WHERE revision_material_id = $1',
      [material_id]
    );
    const maxVersion = existingExamsResult.rows[0]?.max_version ?? 0;
    const versionNumber = maxVersion + 1;

    // Build the prompt with additional instructions if provided
    let userPrompt = `Based on the following revision material, generate exactly ${num_questions} exam questions.

Revision Material:
${materialContent}

Requirements:
- Mix of question types: multiple choice, short answer, and true/false
- Questions should test understanding, not just memorization
- Include answer key with explanations
- Age-appropriate language for a 15-year-old student`;

    if (additional_instructions && additional_instructions.trim().length > 0) {
      userPrompt += `\n\nAdditional Instructions:\n${additional_instructions.trim()}`;
    }

    userPrompt += `\n\nReturn questions in JSON format:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "..."
    }
  ]
}`;

    // Generate exam questions using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant creating practice exam questions for a 15-year-old student. Generate questions that test understanding, not just memorization. Return valid JSON only.'
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    
    let examData;
    try {
      examData = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent);
      return NextResponse.json(
        { success: false, message: 'Failed to parse exam questions. Please try again.' },
        { status: 500 }
      );
    }

    const questions = examData.questions || [];

    if (questions.length === 0) {
      console.error('No questions generated. OpenAI response:', responseContent);
      return NextResponse.json(
        { success: false, message: 'Failed to generate questions. Please try again.' },
        { status: 500 }
      );
    }

    // Validate question structure
    const validQuestions = questions.filter((q: any) => 
      q.id && q.type && q.question && q.correct_answer
    );

    if (validQuestions.length === 0) {
      console.error('No valid questions found. Questions:', questions);
      return NextResponse.json(
        { success: false, message: 'Generated questions are invalid. Please try again.' },
        { status: 500 }
      );
    }

    // Store exam in database using a transaction to handle potential race conditions
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Re-check version number within transaction to avoid race conditions
      const versionCheckResult = await client.query(
        'SELECT COALESCE(MAX(version_number), 0) as max_version FROM exams WHERE revision_material_id = $1',
        [material_id]
      );
      const finalVersionNumber = (versionCheckResult.rows[0]?.max_version ?? 0) + 1;
      
      const examResult = await client.query(
        `INSERT INTO exams (revision_material_id, topic_id, version_number, title, questions, total_questions)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          material_id,
          topic_id,
          finalVersionNumber,
          `Exam - ${material.title} (v${finalVersionNumber})`,
          JSON.stringify(validQuestions),
          validQuestions.length
        ]
      );
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        success: true,
        data: {
          exam: examResult.rows[0],
          questions: validQuestions
        }
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // If it's a unique constraint violation, try with next version number
      if (error.code === '23505' && error.constraint === 'exams_revision_material_id_version_number_key') {
        try {
          const retryVersionResult = await pool.query(
            'SELECT COALESCE(MAX(version_number), 0) as max_version FROM exams WHERE revision_material_id = $1',
            [material_id]
          );
          const retryVersionNumber = (retryVersionResult.rows[0]?.max_version ?? 0) + 1;
          
          const retryExamResult = await pool.query(
            `INSERT INTO exams (revision_material_id, topic_id, version_number, title, questions, total_questions)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              material_id,
              topic_id,
              retryVersionNumber,
              `Exam - ${material.title} (v${retryVersionNumber})`,
              JSON.stringify(validQuestions),
              validQuestions.length
            ]
          );
          
          return NextResponse.json({
            success: true,
            data: {
              exam: retryExamResult.rows[0],
              questions: validQuestions
            }
          });
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
          throw retryError;
        }
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Check if it's a network/connectivity error
    const isNetworkError = error?.code === 'ECONNREFUSED' || 
                           error?.code === 'ENOTFOUND' || 
                           error?.message?.includes('fetch failed') ||
                           error?.message?.includes('network') ||
                           error?.cause?.code === 'ECONNREFUSED';
    
    const errorMessage = error.message || 'Failed to generate exam';
    return NextResponse.json(
      { 
        success: false, 
        message: isNetworkError
          ? 'Unable to connect to AI service. Please check your internet connection and try again.'
          : errorMessage.includes('API key') 
            ? 'OpenAI API key is not configured. Please check your environment variables.'
            : `Failed to generate exam: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}


