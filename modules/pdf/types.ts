export type PdfTextLine = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Font size in points (default: 10). */
  size?: number;
};

export type PdfTwoColumnRow = {
  left: PdfTextLine;
  right: PdfTextLine;
};

export type PdfTwoColumnSection = {
  rows: PdfTwoColumnRow[];
  gapBefore?: number;
  rowGap?: number;
};

export type PdfHeaderSection = {
  /** Optional label line above the section title (e.g. "in account with:"). */
  label?: string;
  title?: string;
  lines?: string[];
  /** Overrides document `headerAlign` for this section only. */
  align?: 'left' | 'center';
  /** Extra vertical space before this section (points). */
  gapBefore?: number;
};

export type PdfGenerateInput = {
  title: string;
  subtitleLines?: string[];
  columns: string[];
  rows: string[][];
  footerLine?: string;
  format?: 'A4' | 'Letter' | 'Legal';
  /** When set, title and subtitle lines use this alignment (default: left). */
  headerAlign?: 'left' | 'center';
  /** When true, skips the data table (header-only documents). */
  omitTable?: boolean;
  /** Points between main title and first subtitle (default: 8). */
  titleSubtitleGap?: number;
  /** Points between subtitle lines (default: line height). */
  subtitleLineGap?: number;
  /** Points after the title/subtitle block before optional sections (default: 8). */
  headerBlockGap?: number;
  /** Extra centered blocks below the main header (statement title, account block, etc.). */
  sections?: PdfHeaderSection[];
  /** Points between each section block (default: 12). */
  sectionGap?: number;
  /** Left/right paired rows (e.g. statement dates beside account details). */
  twoColumnSection?: PdfTwoColumnSection;
  /** Vertical space before the data table (points). */
  tableGapBefore?: number;
  /** Pad with empty rows so at least this many data rows appear before the total row. */
  tableMinRows?: number;
  /** Final table row (e.g. "Total payable" + amount). */
  tableTotalRow?: {
    label: string;
    amount: string;
    /** Column index for the label (default: 2). */
    labelColumnIndex?: number;
    /** Column index for the amount (default: 3). */
    amountColumnIndex?: number;
  };
  /** Closing copy and signature blocks below the table. */
  closingSection?: PdfClosingSection;
  /** Draw centered `Page N / M` footer on each page (default: true). */
  showPageNumbers?: boolean;
};

export type PdfSignatureColumn = {
  heading: string;
  name: string;
  subtitle: string;
};

export type PdfClosingSection = {
  message: string;
  gapBefore?: number;
  left: PdfSignatureColumn;
  right: PdfSignatureColumn;
};

export type PdfPageFormat = 'A4' | 'Letter' | 'Legal';

export type PdfEngine = {
  generate(input: PdfGenerateInput): Promise<Buffer>;
  createBlank(format?: PdfPageFormat): Promise<Buffer>;
  close(): Promise<void>;
};

