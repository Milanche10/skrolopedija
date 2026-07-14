import { createRequire } from 'module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
// direktan import lib fajla zaobilazi debug-mode bag u pdf-parse index.js
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/**
 * @returns {{pages: string[], pageCount: number, needsOcr: boolean}}
 *  pages — tekst po stranama (za docx: jedan element, pageCount 0 = nepoznato)
 */
export async function extractText(filePath, fileType, fileBuffer) {
  if (fileType === 'pdf') return extractPdf(fileBuffer);
  if (fileType === 'docx') return extractDocx(filePath);
  throw new Error(`Nepodržan tip fajla: ${fileType}`);
}

async function extractPdf(buffer) {
  const pages = [];
  await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const tc = await pageData.getTextContent();
      let lastY;
      let text = '';
      for (const item of tc.items) {
        if (lastY !== undefined && lastY !== item.transform[5]) text += '\n';
        text += item.str;
        lastY = item.transform[5];
      }
      pages.push(text);
      return text;
    },
  });
  const totalChars = pages.reduce((s, p) => s + p.trim().length, 0);
  const needsOcr = pages.length > 0 && totalChars / pages.length < 100;
  return { pages, pageCount: pages.length, needsOcr };
}

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value || '';
  return { pages: [text], pageCount: 0, needsOcr: text.trim().length < 200 };
}
