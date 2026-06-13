import { ServerModule } from '@server/modules/defines';
import { pdfEngine } from './engine';
import type { PdfGenerateInput } from './types';

export const generatePdf = async (input: PdfGenerateInput): Promise<Buffer> => {
  return pdfEngine.generate(input);
};

export const createBlankPdf = async (format: PdfGenerateInput['format'] = 'Letter'): Promise<Buffer> => {
  return pdfEngine.createBlank(format ?? 'Letter');
};

export const closePdfEngine = async (): Promise<void> => {
  await pdfEngine.close();
};

export * from './types';
export { wrapHtmlDocument } from './htmlDocument';
export type { WrapHtmlDocumentOptions } from './htmlDocument';

class PdfModule extends ServerModule {
  protected async onInit(): Promise<void> {}

  protected async onStart(): Promise<void> {}

  protected async onStop(): Promise<void> {
    await closePdfEngine();
  }
}

export default new PdfModule({ name: 'pdf' });

