import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prompts: Record<string, string> = {
  revision_tip: 'Provide a practical, helpful revision tip for a 15-year-old student (2-3 sentences max). Focus on effective study techniques, memory strategies, or time management. Make it actionable and encouraging.',
  motivational_study: 'Write a motivational message about studying and being enough for a 15-year-old student (2-3 sentences max). Emphasize that they are doing their best and that is enough. Be warm, supportive, and validating.',
  anxiety_mood_tip: 'Provide a supportive tip for managing anxiety, stress, or mood for a 15-year-old student (2-3 sentences max). Focus on practical coping strategies, self-care, or emotional regulation. Be gentle and understanding.',
  bible_quote: 'Share a relevant Bible verse or quote that promotes feeling good, peace, strength, or encouragement (2-3 sentences max). Include the verse reference. Make it uplifting and relevant to a student\'s daily life.'
};

const typeInfo: Record<string, { emoji: string; title: string }> = {
  revision_tip: { emoji: '📖', title: 'Revision Tip' },
  motivational_study: { emoji: '💝', title: 'You Are Enough' },
  anxiety_mood_tip: { emoji: '🌱', title: 'Wellness Tip' },
  bible_quote: { emoji: '✝️', title: 'Daily Verse' }
};

export async function GET() {
  try {
    // Randomly select content type
    const types = Object.keys(prompts);
    const randomType = types[Math.floor(Math.random() * types.length)];
    const prompt = prompts[randomType];
    const info = typeInfo[randomType];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a supportive assistant providing encouraging, helpful, and positive content for a 15-year-old student. Keep responses concise (2-3 sentences maximum). Be warm, understanding, and age-appropriate.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.8,
    });

    const content = completion.choices[0]?.message?.content || 'Keep up the great work!';

    return NextResponse.json({
      success: true,
      data: {
        content,
        type: randomType,
        emoji: info.emoji,
        title: info.title,
      }
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({
      success: true,
      data: {
        content: 'You are doing great! Keep up the excellent work.',
        type: 'fallback',
        emoji: '🌟',
        title: 'Daily Encouragement',
      }
    });
  }
}



