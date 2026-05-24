/**
 * Sanitize a user-provided file name for safe use in storage keys and downloads.
 */
export const sanitizeFileName = (fileName: string, maxLength = 120): string => {
  const base = String(fileName ?? '')
    .split(/[/\\]/)
    .pop()
    ?.trim();
  const sanitized = (base || 'file').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, maxLength);
  return sanitized || 'file';
};
