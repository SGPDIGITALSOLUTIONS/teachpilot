import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract text content from a file using OpenAI
 * This is used when local parsing (pdf-parse, mammoth, etc.) fails
 */
export async function extractTextWithOpenAI(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured.');
  }

  try {
    // Convert file to base64
    const base64File = fileBuffer.toString('base64');
    
    // Determine MIME type
    const mimeType = getMimeType(fileType);
    
    // Use OpenAI's vision API to extract text
    // Note: For PDFs, we'll need to handle them differently
    if (fileType === 'pdf') {
      // OpenAI vision API doesn't directly support PDFs
      // We'll need to use a different approach or convert PDF pages to images
      // For now, return an error suggesting manual input
      throw new Error('PDF parsing via OpenAI requires converting pages to images. Please use the text input option or convert to DOCX first.');
    }
    
    // For other file types, try using vision API if it's an image
    if (fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg') {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text content from this image. Return only the extracted text, preserving structure and formatting.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      });
      
      return completion.choices[0]?.message?.content || '';
    }
    
    // For text-based files, try to read as text first
    if (fileType === 'txt' || fileType === 'text') {
      return fileBuffer.toString('utf-8');
    }
    
    // For DOCX and other formats, we'd need to convert or use a different approach
    throw new Error(`OpenAI parsing not yet implemented for ${fileType} files. Please use the text input option.`);
    
  } catch (error: any) {
    throw new Error(`Failed to extract text with OpenAI: ${error.message}`);
  }
}

function getMimeType(fileType: string): string {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
  };
  
  return mimeTypes[fileType.toLowerCase()] || 'application/octet-stream';
}

