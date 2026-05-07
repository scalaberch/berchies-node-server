import AppConfig from '@src/config';
import type { PdfConfig as ServerPdfConfig } from './defines';

export type PdfConfig = {
  enabled: boolean;
  timeoutMs: number;
  headless: boolean;
  browserPath?: string;
};

const toNumber = (value: string | number, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getPdfConfig = (): PdfConfig => {
  const pdfConfig = (AppConfig.pdf ?? {}) as ServerPdfConfig;
  const enabled = Array.isArray(AppConfig.modules) && AppConfig.modules.includes('pdf');
  const timeoutMs = toNumber(pdfConfig.timeoutMs ?? 30000, 30000);
  const headless = pdfConfig.headless !== undefined ? Boolean(pdfConfig.headless) : true;
  const browserPath = String(pdfConfig.browserPath ?? '').trim();

  return {
    enabled,
    timeoutMs,
    headless,
    browserPath: browserPath || undefined,
  };
};

