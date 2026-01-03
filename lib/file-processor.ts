import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export async function extractTextFromFile(file: File | Blob, fileName?: string): Promise<{ content: string; fileType: string }> {
  const name = (file instanceof File ? file.name : fileName || 'file').toLowerCase();
  const fileExtension = name.split('.').pop() || '';
  
  // Convert File/Blob to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  switch (fileExtension) {
    case 'pdf':
      return await extractTextFromPDF(buffer);
    
    case 'docx':
      return await extractTextFromDOCX(buffer);
    
    case 'doc':
      // .doc files (old Word format) - mammoth doesn't support these
      // We'll return an error message suggesting conversion
      throw new Error('DOC files (old Word format) are not supported. Please convert to DOCX or PDF first.');
    
    case 'xls':
    case 'xlsx':
      return await extractTextFromExcel(buffer, fileExtension);
    
    case 'txt':
      return {
        content: buffer.toString('utf-8'),
        fileType: 'text',
      };
    
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

async function extractTextFromPDF(buffer: Buffer): Promise<{ content: string; fileType: string }> {
  try {
    // Use pdf-parse library (not OpenAI)
    const data = await pdfParse(buffer);
    
    const extractedText = data.text || '';
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains no extractable text. The PDF may be image-based or corrupted.');
    }
    
    return {
      content: extractedText,
      fileType: 'pdf',
    };
  } catch (error: any) {
    // Provide helpful error messages with suggestions
    if (error.message?.includes('bad XRef entry') || error.message?.includes('XRef')) {
      throw new Error('This PDF file has structural issues. The document may be fine, but the PDF parser is having trouble reading it. Please try: 1) Converting the PDF to DOCX format, 2) Copying and pasting the text content directly, or 3) Re-saving the PDF from the original source.');
    }
    if (error.message?.includes('password') || error.message?.includes('encrypted')) {
      throw new Error('This PDF file is password-protected. Please remove the password protection before uploading.');
    }
    if (error.message?.includes('empty') || error.message?.includes('no extractable text')) {
      throw new Error('This PDF file appears to be empty or contains no extractable text. It may be image-based - please copy the text manually or convert to DOCX format.');
    }
    if (error.message?.includes('Cannot find module')) {
      throw new Error('PDF parsing library error. Please try uploading the file again or use the text input option to paste the content directly.');
    }
    
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}. The document may be fine, but the parser is having issues. Please try converting to DOCX or pasting the text content directly.`);
  }
}

async function extractTextFromDOCX(buffer: Buffer): Promise<{ content: string; fileType: string }> {
  try {
    // Convert Buffer to ArrayBuffer for mammoth
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const result = await mammoth.extractRawText({ arrayBuffer });
    return {
      content: result.value,
      fileType: 'docx',
    };
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromExcel(buffer: Buffer, extension: string): Promise<{ content: string; fileType: string }> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let textContent = '';

    // Extract text from all sheets
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      textContent += `\n=== Sheet: ${sheetName} ===\n`;
      sheetData.forEach((row: any) => {
        if (Array.isArray(row)) {
          textContent += row.join(' | ') + '\n';
        }
      });
    });

    return {
      content: textContent.trim(),
      fileType: extension === 'xls' ? 'xls' : 'xlsx',
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

