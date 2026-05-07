export type PdfGenerateInput = {
  title: string;
  subtitleLines?: string[];
  columns: string[];
  rows: string[][];
  footerLine?: string;
  format?: 'A4' | 'Letter' | 'Legal';
};

export type PdfEngine = {
  generate(input: PdfGenerateInput): Promise<Buffer>;
  close(): Promise<void>;
};

