import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function scoreShortAnswerWithAI(question: string, userAnswer: string, correctAnswer: string): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant grading exam answers for a 15-year-old student. Evaluate the accuracy and understanding demonstrated in the student\'s answer. Return valid JSON only.'
        },
        {
          role: 'user',
          content: `Evaluate this exam answer:

Question: ${question}

Correct Answer: ${correctAnswer}

Student's Answer: ${userAnswer}

Rate the answer on a scale of 0-100 based on:
- Accuracy of the information
- Understanding of the concept
- Completeness of the response
- Use of appropriate terminology

Return your evaluation in JSON format:
{
  "score": 85,
  "isCorrect": true,
  "feedback": "The answer demonstrates good understanding but could be more detailed..."
}

Consider an answer correct (isCorrect: true) if it shows understanding of the concept, even if not word-for-word identical. Score 70+ for correct answers, 40-69 for partially correct, and below 40 for incorrect.`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const evaluation = JSON.parse(responseContent);
    
    return {
      isCorrect: evaluation.isCorrect === true || evaluation.score >= 70,
      score: evaluation.score || 0,
      feedback: evaluation.feedback || ''
    };
  } catch (error: any) {
    console.error('OpenAI scoring error:', error);
    
    // Check if it's a network/connectivity error
    const isNetworkError = error?.code === 'ECONNREFUSED' || 
                           error?.code === 'ENOTFOUND' || 
                           error?.message?.includes('fetch failed') ||
                           error?.message?.includes('network') ||
                           error?.cause?.code === 'ECONNREFUSED';
    
    // Fallback to simple text comparison if AI fails
    const normalizedUser = userAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    const isSimilar = normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser);
    
    return {
      isCorrect: isSimilar,
      score: isSimilar ? 70 : 0,
      feedback: isNetworkError 
        ? 'AI scoring unavailable offline. Answer evaluated using text matching. Please connect to the internet for detailed AI feedback.'
        : 'Automated scoring unavailable. Answer evaluated using text matching.'
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examId = parseInt(params.id);
    const { exam_type, answers, time_taken } = await request.json();

    if (!exam_type || !answers) {
      return NextResponse.json(
        { success: false, message: 'Exam type and answers are required' },
        { status: 400 }
      );
    }

    // Get exam with questions
    const examResult = await pool.query(
      'SELECT * FROM exams WHERE id = $1',
      [examId]
    );

    if (examResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Exam not found' },
        { status: 404 }
      );
    }

    const exam = examResult.rows[0];
    
    // Parse questions - handle both string and object
    let questions;
    try {
      if (typeof exam.questions === 'string') {
        questions = JSON.parse(exam.questions);
      } else {
        questions = exam.questions;
      }
      
      // Handle nested format { questions: [...] }
      if (questions && !Array.isArray(questions) && questions.questions) {
        questions = questions.questions;
      }
      
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Exam has no valid questions' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('Failed to parse exam questions:', parseError);
      return NextResponse.json(
        { success: false, message: 'Failed to parse exam questions' },
        { status: 500 }
      );
    }

    console.log('Processing exam submission:', {
      examId,
      examType: exam_type,
      questionsCount: questions.length,
      answersCount: Object.keys(answers).length,
    });

    // Score questions - use AI for short_answer, exact match for others
    let correctCount = 0;
    let totalScore = 0;
    const results = await Promise.all(
      questions.map(async (q: any, index: number) => {
        // Try to get answer by question ID first, then by index
        const userAnswer = answers[q.id] || answers[String(q.id)] || answers[index] || answers[String(index)] || null;
        
        let isCorrect = false;
        let score = 0;
        let feedback = '';

        if (userAnswer === null || userAnswer === '') {
          return {
            question_id: q.id,
            user_answer: null,
            correct_answer: q.correct_answer,
            is_correct: false,
            score: 0,
            feedback: 'No answer provided',
            explanation: q.explanation
          };
        }

        // Use AI scoring for short_answer questions
        if (q.type === 'short_answer') {
          const aiEvaluation = await scoreShortAnswerWithAI(
            q.question,
            String(userAnswer),
            String(q.correct_answer)
          );
          isCorrect = aiEvaluation.isCorrect;
          score = aiEvaluation.score;
          feedback = aiEvaluation.feedback;
        } else {
          // For multiple_choice and true_false, extract the letter/option from the answer
          let normalizedUserAnswer = String(userAnswer).trim();
          let normalizedCorrectAnswer = String(q.correct_answer).trim();
          
          // Extract just the letter/option if answer is in format "A) ...", "A. ...", "A ...", or just "A"
          // Match: letter A-E at start, optionally followed by ) or . or space
          const userMatch = normalizedUserAnswer.match(/^([A-E])(?:\s*[).]|\s|$)/i);
          if (userMatch) {
            normalizedUserAnswer = userMatch[1].toUpperCase();
          } else {
            // If no match, try to extract any single letter at the start
            const singleLetter = normalizedUserAnswer.match(/^([A-Z])/i);
            if (singleLetter) {
              normalizedUserAnswer = singleLetter[1].toUpperCase();
            } else {
              // For True/False, normalize
              normalizedUserAnswer = normalizedUserAnswer.toLowerCase();
            }
          }
          
          // Extract from correct answer
          const correctMatch = normalizedCorrectAnswer.match(/^([A-E])(?:\s*[).]|\s|$)/i);
          if (correctMatch) {
            normalizedCorrectAnswer = correctMatch[1].toUpperCase();
          } else {
            const singleLetter = normalizedCorrectAnswer.match(/^([A-Z])/i);
            if (singleLetter) {
              normalizedCorrectAnswer = singleLetter[1].toUpperCase();
            } else {
              normalizedCorrectAnswer = normalizedCorrectAnswer.toLowerCase();
            }
          }
          
          // Compare normalized answers (case-insensitive)
          isCorrect = normalizedUserAnswer.toLowerCase() === normalizedCorrectAnswer.toLowerCase();
          score = isCorrect ? 100 : 0;
          feedback = isCorrect ? 'Correct!' : 'Incorrect';
          
          console.log('Answer comparison:', {
            questionId: q.id,
            userAnswer: String(userAnswer),
            normalizedUserAnswer,
            correctAnswer: String(q.correct_answer),
            normalizedCorrectAnswer,
            isCorrect
          });
        }

        if (isCorrect) correctCount++;
        totalScore += score;

        return {
          question_id: q.id,
          user_answer: userAnswer,
          correct_answer: q.correct_answer,
          is_correct: isCorrect,
          score: score,
          feedback: feedback,
          explanation: q.explanation
        };
      })
    );

    const averageScore = Math.round(totalScore / questions.length);
    const percentageScore = Math.round((correctCount / questions.length) * 100);

    // Store attempt
    const attemptResult = await pool.query(
      `INSERT INTO exam_attempts 
       (exam_id, exam_type, answers, score, total_correct, total_questions, time_taken, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        examId,
        exam_type,
        JSON.stringify(answers),
        percentageScore, // Use percentage for compatibility
        correctCount,
        questions.length,
        time_taken || null
      ]
    );

    const attempt = attemptResult.rows[0];

    // If real exam (not mock), save to performance_scores
    if (exam_type === 'exam') {
      try {
        // Get subject_id from topic
        const topicResult = await pool.query(
          'SELECT subject_id FROM topics WHERE id = $1',
          [exam.topic_id]
        );
        const subjectId = topicResult.rows[0]?.subject_id || null;

        if (subjectId) {
          await pool.query(
            `INSERT INTO performance_scores 
             (subject_id, topic_id, exam_id, exam_attempt_id, score, total_questions, correct_answers, performance_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)`,
            [
              subjectId,
              exam.topic_id,
              examId,
              attempt.id,
              percentageScore,
              questions.length,
              correctCount
            ]
          );
        } else {
          console.warn(`Topic ${exam.topic_id} not found, skipping performance score`);
        }
      } catch (perfError: any) {
        console.error('Failed to save performance score:', perfError);
        // Don't fail the whole request if performance score fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        attempt: attempt,
        score: percentageScore,
        average_score: averageScore,
        total_correct: correctCount,
        total_questions: questions.length,
        results: results,
        exam: exam
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Failed to submit exam attempt',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
