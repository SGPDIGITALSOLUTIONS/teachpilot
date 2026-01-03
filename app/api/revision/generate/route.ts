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
    
    // Get content - use existing content if available
    let materialContent = material.content;
    
    // If content is missing, try to extract from file_data using OpenAI
    // But only if file_data exists and content is truly empty/null
    if ((!materialContent || materialContent.trim().length === 0) && material.file_data) {
      try {
        const { extractTextFromFile } = await import('@/lib/file-processor');
        // Try local parsing first (it might work now even if it failed before)
        const fileBuffer = Buffer.from(material.file_data);
        const blob = new Blob([fileBuffer]);
        const file = new File([blob], material.file_name || 'document', { 
          type: material.file_type || 'application/octet-stream' 
        });
        
        try {
          const result = await extractTextFromFile(file, material.file_name);
          materialContent = result.content;
          
          // Update the material with extracted content for future use
          if (materialContent && materialContent.trim().length > 0) {
            await pool.query(
              'UPDATE revision_materials SET content = $1 WHERE id = $2',
              [materialContent, material_id]
            );
          }
        } catch (localError: any) {
          // Local parsing failed, try OpenAI as fallback
          console.log('Local parsing failed, trying OpenAI:', localError.message);
          try {
            const { extractTextWithOpenAI } = await import('@/lib/openai-file-parser');
            materialContent = await extractTextWithOpenAI(
              fileBuffer,
              material.file_name || 'document',
              material.file_type || 'pdf'
            );
            
            if (materialContent && materialContent.trim().length > 0) {
              await pool.query(
                'UPDATE revision_materials SET content = $1 WHERE id = $2',
                [materialContent, material_id]
              );
            }
          } catch (openaiError: any) {
            console.error('Both local and OpenAI parsing failed:', openaiError.message);
            // Don't fail completely - just use empty content and let OpenAI generate from what we have
            materialContent = materialContent || '';
          }
        }
      } catch (error: any) {
        console.error('File parsing error:', error);
        // Continue with whatever content we have (might be empty, but let OpenAI try)
        materialContent = materialContent || '';
      }
    }
    
    // If we still don't have content, return an error
    if (!materialContent || materialContent.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No content available in the material. Please ensure the file contains readable text, or try uploading the content as text instead.' 
        },
        { status: 400 }
      );
    }

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


