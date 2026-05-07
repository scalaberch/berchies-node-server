import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getPdfConfig } from './config';
import type { PdfEngine, PdfGenerateInput } from './types';

const PAGE_SIZES: Record<NonNullable<PdfGenerateInput['format']>, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

const MARGIN_X = 40;
const MARGIN_Y = 40;
const TITLE_SIZE = 18;
const TEXT_SIZE = 10;
const ROW_PADDING_X = 6;
const ROW_PADDING_Y = 4;
const ROW_GAP = 3;
const LINE_HEIGHT = TEXT_SIZE + 2;

const wrapText = (
  text: string,
  maxWidth: number,
  measure: (value: string) => number,
): string[] => {
  const content = String(text ?? '');
  if (!content) return [''];
  const words = content.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
      continue;
    }
    let slice = '';
    for (const ch of word) {
      const candidate = `${slice}${ch}`;
      if (measure(candidate) <= maxWidth) {
        slice = candidate;
      } else {
        if (slice) lines.push(slice);
        slice = ch;
      }
    }
    current = slice;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

class PdfLibEngine implements PdfEngine {
  async generate(input: PdfGenerateInput): Promise<Buffer> {
    const cfg = getPdfConfig();
    if (!cfg.enabled) {
      throw new Error('PDF_ENGINE_DISABLED');
    }

    const pdf = await PDFDocument.create();
    const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const format = input.format ?? 'A4';
    const [pageWidth, pageHeight] = PAGE_SIZES[format] ?? PAGE_SIZES.A4;
    const tableWidth = pageWidth - MARGIN_X * 2;
    const colCount = Math.max(input.columns.length, 1);
    const colWidth = tableWidth / colCount;

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - MARGIN_Y;

    const drawNewPage = () => {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - MARGIN_Y;
    };

    page.drawText(input.title, {
      x: MARGIN_X,
      y,
      size: TITLE_SIZE,
      font: fontBold,
      color: rgb(0.07, 0.1, 0.14),
    });
    y -= TITLE_SIZE + 8;

    for (const line of input.subtitleLines ?? []) {
      page.drawText(String(line ?? ''), {
        x: MARGIN_X,
        y,
        size: TEXT_SIZE,
        font: fontRegular,
        color: rgb(0.42, 0.45, 0.5),
      });
      y -= LINE_HEIGHT;
    }
    y -= 8;

    const drawHeader = () => {
      if (y < MARGIN_Y + 70) {
        drawNewPage();
      }
      page.drawRectangle({
        x: MARGIN_X,
        y: y - (LINE_HEIGHT + ROW_PADDING_Y * 2),
        width: tableWidth,
        height: LINE_HEIGHT + ROW_PADDING_Y * 2,
        color: rgb(0.97, 0.98, 0.99),
      });
      input.columns.forEach((title, index) => {
        page.drawText(String(title ?? ''), {
          x: MARGIN_X + index * colWidth + ROW_PADDING_X,
          y: y - (TEXT_SIZE + ROW_PADDING_Y),
          size: TEXT_SIZE,
          font: fontBold,
          color: rgb(0.11, 0.14, 0.18),
        });
      });
      y -= LINE_HEIGHT + ROW_PADDING_Y * 2 + ROW_GAP;
    };

    drawHeader();

    const measureRegular = (value: string) => fontRegular.widthOfTextAtSize(value, TEXT_SIZE);
    for (const row of input.rows) {
      const normalized = Array.from({ length: colCount }, (_, i) => String(row?.[i] ?? ''));
      const wrappedByCell = normalized.map((cell) => wrapText(cell, colWidth - ROW_PADDING_X * 2, measureRegular));
      const rowLines = wrappedByCell.reduce((max, lines) => Math.max(max, lines.length), 1);
      const rowHeight = rowLines * LINE_HEIGHT + ROW_PADDING_Y * 2;

      if (y - rowHeight < MARGIN_Y + 20) {
        drawNewPage();
        drawHeader();
      }

      page.drawRectangle({
        x: MARGIN_X,
        y: y - rowHeight,
        width: tableWidth,
        height: rowHeight,
        borderColor: rgb(0.89, 0.9, 0.92),
        borderWidth: 0.5,
      });

      wrappedByCell.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: MARGIN_X + index * colWidth + ROW_PADDING_X,
            y: y - ROW_PADDING_Y - TEXT_SIZE - lineIndex * LINE_HEIGHT,
            size: TEXT_SIZE,
            font: fontRegular,
            color: rgb(0.11, 0.14, 0.18),
          });
        });
      });
      y -= rowHeight + ROW_GAP;
    }

    if (input.footerLine) {
      if (y < MARGIN_Y + 20) {
        drawNewPage();
      }
      page.drawText(String(input.footerLine), {
        x: MARGIN_X,
        y: y - TEXT_SIZE,
        size: TEXT_SIZE,
        font: fontBold,
        color: rgb(0.11, 0.14, 0.18),
      });
    }

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }

  async close(): Promise<void> {
    return;
  }
}

export const pdfEngine: PdfEngine = new PdfLibEngine();

