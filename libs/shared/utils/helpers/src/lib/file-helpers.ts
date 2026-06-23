export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function isImageMimeType(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Fetches a remote file by URL and returns it as a {@link File} object.
 *
 * Validates the URL, checks size via `Content-Length` before downloading,
 * derives the filename from the URL path or `Content-Disposition` header,
 * and strips charset/parameter suffixes from the MIME type.
 *
 * @throws {Error} on invalid URL, CORS / network failure, non-2xx response,
 *   or when the file size exceeds `maxSizeBytes`.
 */
export async function fetchFileFromUrl(
  url: string,
  maxSizeBytes: number,
): Promise<File> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol: ${parsedUrl.protocol}`);
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(
      `Failed to fetch file from URL. The server may not allow cross-origin requests: ${message}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Server returned status ${response.status}: ${response.statusText}`,
    );
  }

  // Early size check via Content-Length header (avoids downloading oversized files)
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const reported = parseInt(contentLength, 10);
    if (reported > maxSizeBytes) {
      throw new Error(
        `File size (${formatFileSize(reported)}) exceeds the maximum allowed size (${formatFileSize(maxSizeBytes)})`,
      );
    }
  }

  const blob = await response.blob();

  if (blob.size > maxSizeBytes) {
    throw new Error(
      `File size (${formatFileSize(blob.size)}) exceeds the maximum allowed size (${formatFileSize(maxSizeBytes)})`,
    );
  }

  // Derive filename from URL path, falling back to Content-Disposition
  let filename = 'file-from-url';
  const pathSegment = parsedUrl.pathname.split('/').slice(-1)[0];
  if (pathSegment) {
    filename = pathSegment.split('?')[0] || filename;
  }
  if (filename === 'file-from-url') {
    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=(["]?)([^";\n]*)\1/);
      if (match?.[2]) {
        filename = match[2];
      }
    }
  }

  // Normalise MIME type — strip charset / parameters from blob.type or Content-Type header
  const rawMime = blob.type || (response.headers.get('content-type') ?? '');
  const mimeType = rawMime.split(';')[0].trim();

  return new File([blob], filename, { type: mimeType });
}
