export type WrapHtmlDocumentOptions = {
  /** Link shown in the preview toolbar (optional). */
  pdfLinkHref?: string;
  pdfLinkLabel?: string;
};

/**
 * Wraps PDF-related HTML fragment content in a full preview document for browser viewing.
 */
export const wrapHtmlDocument = (
  body: string,
  title = 'PDF Preview',
  options: WrapHtmlDocumentOptions = {},
): string => {
  const pdfLinkHref = options.pdfLinkHref ?? '/pdf/sample?output=pdf';
  const pdfLinkLabel = options.pdfLinkLabel ?? 'Open as PDF';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; background: #f3f4f6; margin: 0; padding: 24px; color: #111827; }
      .toolbar { margin: 0 auto 16px; max-width: 960px; }
      .toolbar a { color: #2563eb; text-decoration: none; }
      .toolbar a:hover { text-decoration: underline; }
      .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 960px; margin: 0 auto; padding: 16px; }
      .error { margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 12px; border-radius: 6px; }
      .muted { color: #6b7280; margin: 0 0 10px; }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <a href="${pdfLinkHref}">${pdfLinkLabel}</a>
    </div>
    <div class="card">${body}</div>
  </body>
</html>`;
};
