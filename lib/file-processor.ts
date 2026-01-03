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
    const data = await pdfParse(buffer);
    return {
      content: data.text,
      fileType: 'pdf',
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

