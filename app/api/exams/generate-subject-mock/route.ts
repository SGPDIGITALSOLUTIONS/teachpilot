import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { subject_id, num_questions, additional_instructions } = await request.json();

    if (!subject_id || !num_questions) {
      return NextResponse.json(
        { success: false, message: 'Subject ID and number of questions are required' },
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

    // Combine all material content
    let combinedContent = '';
    topics.forEach((topic: any) => {
      const topicMaterials = materials.filter((m: any) => m.topic_id === topic.id);
      if (topicMaterials.length > 0) {
        combinedContent += `\n\n=== TOPIC: ${topic.name} ===\n`;
        topicMaterials.forEach((m: any) => {
          combinedContent += `--- ${m.title} ---\n${m.content}\n\n`;
        });
      }
    });

    // Build the prompt with additional instructions if provided
    let userPrompt = `Based on the following revision materials for the subject "${subject.name}", generate exactly ${num_questions} exam questions covering all topics.

Revision Materials:
${combinedContent}

Requirements:
- Mix of question types: multiple choice, short answer, and true/false
- Questions should test understanding, not just memorization
- Include answer key with explanations
- Age-appropriate language for a 15-year-old student
- Cover all topics in the subject`;

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
      return NextResponse.json(
        { success: false, message: 'Generated questions are invalid. Please try again.' },
        { status: 500 }
      );
    }

    // Store exam in database - use first topic as the topic_id
    const firstTopicId = topics[0].id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let finalVersionNumber;
      for (let i = 0; i < 5; i++) {
        const versionCheckResult = await client.query(
          'SELECT COALESCE(MAX(version_number), 0) as max_version FROM exams WHERE topic_id = $1',
          [firstTopicId]
        );
        finalVersionNumber = (versionCheckResult.rows[0]?.max_version ?? 0) + 1;

        try {
          const examResult = await client.query(
            `INSERT INTO exams (revision_material_id, topic_id, version_number, title, questions, total_questions)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              null, // No specific material_id for subject-wide exams
              firstTopicId,
              finalVersionNumber,
              `Mock Exam - ${subject.name} (All Topics) (v${finalVersionNumber})`,
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
        } catch (insertError: any) {
          if (insertError.code === '23505') {
            await client.query('ROLLBACK');
            await client.query('BEGIN');
            continue;
          }
          throw insertError;
        }
      }
      throw new Error('Failed to generate a unique version number after multiple retries.');
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
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
            : error.message || 'Failed to generate mock exam',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}


