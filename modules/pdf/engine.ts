import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { crownPdfTheme, hexToRgbUnit } from '@src/pdf/theme';
import { getPdfConfig } from './config';
import type { PdfEngine, PdfGenerateInput, PdfPageFormat } from './types';

const toPdfColor = (hex: string) => {
  const [r, g, b] = hexToRgbUnit(hex);
  return rgb(r, g, b);
};

const PAGE_SIZES: Record<PdfPageFormat, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  Legal: [612, 1008],
};

const MARGIN_X = 40;
const MARGIN_Y = 40;
const TITLE_SIZE = 18;
const SECTION_TITLE_SIZE = 14;
const TEXT_SIZE = 10;
const ROW_PADDING_X = 6;
const ROW_PADDING_Y = 4;
const ROW_GAP = 3;
const LINE_HEIGHT = TEXT_SIZE + 2;
const PAGE_NUMBER_SIZE = 8;
const PAGE_NUMBER_FOOTER_Y = 18;

const TABLE_HEADER_BG = toPdfColor(crownPdfTheme.primary);
const TABLE_HEADER_TEXT = toPdfColor(crownPdfTheme.text);
const TABLE_ROW_BG_EVEN = rgb(1, 1, 1);
const TABLE_ROW_BG_ODD = toPdfColor(crownPdfTheme.primaryLight);
const TABLE_TOTAL_ROW_BG = toPdfColor(crownPdfTheme.primaryMuted);
const TABLE_BORDER = toPdfColor(crownPdfTheme.primaryDark);

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
    const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    const format = input.format ?? 'A4';
    const [pageWidth, pageHeight] = PAGE_SIZES[format] ?? PAGE_SIZES.A4;
    const tableWidth = pageWidth - MARGIN_X * 2;
    const colCount = Math.max(input.columns.length, 1);
    const colWidth = tableWidth / colCount;

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - MARGIN_Y;
    const headerAlign = input.headerAlign ?? 'left';
    const contentWidth = pageWidth - MARGIN_X * 2;

    const drawNewPage = () => {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - MARGIN_Y;
    };

    const drawAlignedText = (
      text: string,
      size: number,
      font: typeof fontBold,
      color: ReturnType<typeof rgb>,
      align: 'left' | 'center' | 'right' = headerAlign,
      yPosition = y,
    ) => {
      const content = String(text ?? '');
      if (!content) {
        return;
      }
      const textWidth = font.widthOfTextAtSize(content, size);
      let x = MARGIN_X;
      if (align === 'center') {
        x = MARGIN_X + Math.max(0, (contentWidth - textWidth) / 2);
      } else if (align === 'right') {
        x = pageWidth - MARGIN_X - textWidth;
      }
      page.drawText(content, {
        x,
        y: yPosition,
        size,
        font,
        color,
      });
    };

    const titleSubtitleGap = input.titleSubtitleGap ?? 8;
    const subtitleLineGap = input.subtitleLineGap ?? LINE_HEIGHT;
    const headerBlockGap = input.headerBlockGap ?? 8;
    const sectionGap = input.sectionGap ?? 12;
    const subtitleColor = rgb(0.42, 0.45, 0.5);
    const bodyColor = rgb(0.11, 0.14, 0.18);

    drawAlignedText(input.title, TITLE_SIZE, fontBold, rgb(0.07, 0.1, 0.14));
    y -= TITLE_SIZE + titleSubtitleGap;

    for (const line of input.subtitleLines ?? []) {
      drawAlignedText(String(line ?? ''), TEXT_SIZE, fontRegular, subtitleColor);
      y -= subtitleLineGap;
    }
    y -= headerBlockGap;

    const drawColumnLine = (
      line: { text: string; bold?: boolean; italic?: boolean; size?: number },
      align: 'left' | 'right',
      yPosition: number,
    ) => {
      const content = String(line.text ?? '').trim();
      if (!content) {
        return;
      }
      const size = line.size ?? TEXT_SIZE;
      const font = line.italic ? fontItalic : line.bold ? fontBold : fontRegular;
      const color = line.bold ? rgb(0.07, 0.1, 0.14) : bodyColor;
      drawAlignedText(content, size, font, color, align, yPosition);
    };

    const twoColumn = input.twoColumnSection;
    if (twoColumn?.rows?.length) {
      if (twoColumn.gapBefore) {
        y -= twoColumn.gapBefore;
      }
      const defaultRowGap = twoColumn.rowGap ?? LINE_HEIGHT;
      for (const row of twoColumn.rows) {
        drawColumnLine(row.left, 'left', y);
        drawColumnLine(row.right, 'right', y);
        const leftSize = row.left.size ?? TEXT_SIZE;
        const rightSize = row.right.size ?? TEXT_SIZE;
        y -= Math.max(defaultRowGap, Math.max(leftSize, rightSize) + 4);
      }
      y -= sectionGap;
    }

    for (const section of input.sections ?? []) {
      const sectionAlign = section.align ?? headerAlign;
      if (section.gapBefore) {
        y -= section.gapBefore;
      }

      if (section.label) {
        drawAlignedText(section.label, TEXT_SIZE, fontRegular, bodyColor, sectionAlign);
        y -= LINE_HEIGHT;
      }
      if (section.title) {
        drawAlignedText(
          section.title,
          SECTION_TITLE_SIZE,
          fontBold,
          rgb(0.07, 0.1, 0.14),
          sectionAlign,
        );
        y -= SECTION_TITLE_SIZE + 6;
      }
      for (const line of section.lines ?? []) {
        drawAlignedText(String(line ?? ''), TEXT_SIZE, fontRegular, subtitleColor, sectionAlign);
        y -= LINE_HEIGHT;
      }
      y -= sectionGap;
    }

    if (input.omitTable) {
      const bytes = await pdf.save();
      return Buffer.from(bytes);
    }

    if (input.tableGapBefore) {
      y -= input.tableGapBefore;
    }

    const drawHeader = () => {
      if (y < MARGIN_Y + 70) {
        drawNewPage();
      }
      const headerHeight = LINE_HEIGHT + ROW_PADDING_Y * 2;
      page.drawRectangle({
        x: MARGIN_X,
        y: y - headerHeight,
        width: tableWidth,
        height: headerHeight,
        color: TABLE_HEADER_BG,
        borderColor: TABLE_BORDER,
        borderWidth: 0.5,
      });
      input.columns.forEach((title, index) => {
        page.drawText(String(title ?? ''), {
          x: MARGIN_X + index * colWidth + ROW_PADDING_X,
          y: y - (TEXT_SIZE + ROW_PADDING_Y),
          size: TEXT_SIZE,
          font: fontBold,
          color: TABLE_HEADER_TEXT,
        });
      });
      y -= headerHeight + ROW_GAP;
    };

    drawHeader();

    const measureRegular = (value: string) => fontRegular.widthOfTextAtSize(value, TEXT_SIZE);
    const measureBold = (value: string) => fontBold.widthOfTextAtSize(value, TEXT_SIZE);

    const drawTableRow = (
      row: string[],
      options: {
        bold?: boolean;
        rightAlignColumnIndexes?: number[];
        fillColor?: ReturnType<typeof rgb>;
      } = {},
    ) => {
      const rowFont = options.bold ? fontBold : fontRegular;
      const measure = options.bold ? measureBold : measureRegular;
      const normalized = Array.from({ length: colCount }, (_, i) => String(row?.[i] ?? ''));
      const wrappedByCell = normalized.map((cell) => wrapText(cell, colWidth - ROW_PADDING_X * 2, measure));
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
        color: options.fillColor ?? TABLE_ROW_BG_EVEN,
        borderColor: TABLE_BORDER,
        borderWidth: 0.5,
      });

      wrappedByCell.forEach((lines, index) => {
        const rightAlign = options.rightAlignColumnIndexes?.includes(index) ?? false;
        lines.forEach((line, lineIndex) => {
          const lineWidth = measure(line);
          const defaultX = MARGIN_X + index * colWidth + ROW_PADDING_X;
          const x = rightAlign
            ? MARGIN_X + (index + 1) * colWidth - ROW_PADDING_X - lineWidth
            : defaultX;
          page.drawText(line, {
            x,
            y: y - ROW_PADDING_Y - TEXT_SIZE - lineIndex * LINE_HEIGHT,
            size: TEXT_SIZE,
            font: rowFont,
            color: rgb(0.11, 0.14, 0.18),
          });
        });
      });
      y -= rowHeight + ROW_GAP;
    };

    const tableRows = [...input.rows];
    const minRows = Math.max(0, Number(input.tableMinRows ?? 0));
    while (tableRows.length < minRows) {
      tableRows.push(Array.from({ length: colCount }, () => ''));
    }

    const amountColumnIndex = 3;
    let dataRowIndex = 0;
    for (const row of tableRows) {
      const fillColor = dataRowIndex % 2 === 0 ? TABLE_ROW_BG_EVEN : TABLE_ROW_BG_ODD;
      drawTableRow(row, {
        rightAlignColumnIndexes: [amountColumnIndex],
        fillColor,
      });
      dataRowIndex += 1;
    }

    if (input.tableTotalRow) {
      const totalRow = input.tableTotalRow;
      const labelCol = totalRow.labelColumnIndex ?? 2;
      const amountCol = totalRow.amountColumnIndex ?? amountColumnIndex;
      const cells = Array.from({ length: colCount }, () => '');
      cells[labelCol] = totalRow.label;
      cells[amountCol] = totalRow.amount;
      drawTableRow(cells, {
        bold: true,
        rightAlignColumnIndexes: [amountCol],
        fillColor: TABLE_TOTAL_ROW_BG,
      });
    }

    const ensureSpaceBelowTable = (neededHeight: number) => {
      if (y < MARGIN_Y + neededHeight) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - MARGIN_Y;
      }
    };

    const closing = input.closingSection;
    if (closing) {
      ensureSpaceBelowTable((closing.gapBefore ?? 0) + 100);
      if (closing.gapBefore) {
        y -= closing.gapBefore;
      }

      const messageLines = wrapText(
        String(closing.message ?? ''),
        contentWidth,
        measureRegular,
      );
      for (const line of messageLines) {
        if (y < MARGIN_Y + 40) {
          drawNewPage();
        }
        drawAlignedText(line, TEXT_SIZE, fontRegular, bodyColor, 'left');
        y -= LINE_HEIGHT;
      }
      y -= 16;

      const rightSignatureX = MARGIN_X + contentWidth / 2;
      const drawSignatureAt = (
        text: string,
        x: number,
        yPosition: number,
        font: typeof fontRegular,
      ) => {
        const content = String(text ?? '').trim();
        if (!content) {
          return;
        }
        page.drawText(content, {
          x,
          y: yPosition,
          size: TEXT_SIZE,
          font,
          color: bodyColor,
        });
      };

      const signatureRows = [
        { left: closing.left.heading, right: closing.right.heading, bold: false },
        { left: closing.left.name, right: closing.right.name, bold: true },
        { left: closing.left.subtitle, right: closing.right.subtitle, bold: false },
      ];

      for (const [index, row] of signatureRows.entries()) {
        if (y < MARGIN_Y + 40) {
          drawNewPage();
        }
        const font = row.bold ? fontBold : fontRegular;
        drawSignatureAt(row.left, MARGIN_X, y, font);
        drawSignatureAt(row.right, rightSignatureX, y, font);
        y -= row.bold ? LINE_HEIGHT + 2 : LINE_HEIGHT;
        if (index === 0) {
          y -= 4;
        }
      }
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

    if (input.showPageNumbers !== false) {
      const pages = pdf.getPages();
      const totalPages = pages.length;
      const footerColor = rgb(0.45, 0.47, 0.5);
      pages.forEach((pdfPage, pageIndex) => {
        const { width } = pdfPage.getSize();
        const label = `Page ${pageIndex + 1} / ${totalPages}`;
        const textWidth = fontRegular.widthOfTextAtSize(label, PAGE_NUMBER_SIZE);
        pdfPage.drawText(label, {
          x: (width - textWidth) / 2,
          y: PAGE_NUMBER_FOOTER_Y,
          size: PAGE_NUMBER_SIZE,
          font: fontRegular,
          color: footerColor,
        });
      });
    }

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }

  async createBlank(format: PdfPageFormat = 'Letter'): Promise<Buffer> {
    const cfg = getPdfConfig();
    if (!cfg.enabled) {
      throw new Error('PDF_ENGINE_DISABLED');
    }

    const pdf = await PDFDocument.create();
    const [pageWidth, pageHeight] = PAGE_SIZES[format] ?? PAGE_SIZES.Letter;
    pdf.addPage([pageWidth, pageHeight]);

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }

  async close(): Promise<void> {
    return;
  }
}

export const pdfEngine: PdfEngine = new PdfLibEngine();

