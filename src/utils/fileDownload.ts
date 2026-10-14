/**
 * Real client-side file downloader for platform tasks, deliverables, and workspace files.
 */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sanitize filename to be filesystem-safe
 */
export function sanitizeFilename(name: string, defaultExt = 'txt'): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9_\-\.]+/g, '_').replace(/^_+|_+$/g, '');
  if (!clean.includes('.')) {
    return `${clean || 'task_file'}.${defaultExt}`;
  }
  return clean || `task_file.${defaultExt}`;
}
