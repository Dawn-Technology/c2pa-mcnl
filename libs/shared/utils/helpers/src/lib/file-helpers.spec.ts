import {
  fetchFileFromUrl,
  formatFileSize,
  isImageMimeType,
} from './file-helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MAX = 1024 * 1024; // 1 MB

function mockResponse(
  body: BlobPart,
  headers: Record<string, string> = {},
  status = 200,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    blob: () =>
      Promise.resolve(
        body instanceof Blob
          ? body
          : new Blob([body], { type: headers['content-type'] ?? '' }),
      ),
  } as unknown as Response;
}
describe('formatFileSize', () => {
  describe('zero and small values', () => {
    it('should return "0 Bytes" for zero', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });
  });

  describe('kilobytes', () => {
    it('should format 1 KB correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should format KB with decimals', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('should round KB to 2 decimal places', () => {
      expect(formatFileSize(1234)).toBe('1.21 KB');
    });
  });

  describe('megabytes', () => {
    it('should format 1 MB correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('should format MB with decimals', () => {
      expect(formatFileSize(5242880)).toBe('5 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should round MB to 2 decimal places', () => {
      expect(formatFileSize(1234567)).toBe('1.18 MB');
    });
  });

  describe('gigabytes', () => {
    it('should format 1 GB correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should format GB with decimals', () => {
      expect(formatFileSize(2147483648)).toBe('2 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
    });

    it('should round GB to 2 decimal places', () => {
      expect(formatFileSize(1234567890)).toBe('1.15 GB');
    });
  });
});

describe('isImageMimeType', () => {
  const makeFile = (type: string) => new File([], 'test', { type });

  describe('image types', () => {
    it('should return true for image/jpeg', () => {
      expect(isImageMimeType(makeFile('image/jpeg'))).toBe(true);
    });

    it('should return true for image/png', () => {
      expect(isImageMimeType(makeFile('image/png'))).toBe(true);
    });

    it('should return true for image/gif', () => {
      expect(isImageMimeType(makeFile('image/gif'))).toBe(true);
    });

    it('should return true for image/webp', () => {
      expect(isImageMimeType(makeFile('image/webp'))).toBe(true);
    });

    it('should return true for image/svg+xml', () => {
      expect(isImageMimeType(makeFile('image/svg+xml'))).toBe(true);
    });
  });

  describe('non-image types', () => {
    it('should return false for application/pdf', () => {
      expect(isImageMimeType(makeFile('application/pdf'))).toBe(false);
    });

    it('should return false for text/plain', () => {
      expect(isImageMimeType(makeFile('text/plain'))).toBe(false);
    });

    it('should return false for video/mp4', () => {
      expect(isImageMimeType(makeFile('video/mp4'))).toBe(false);
    });

    it('should return false for audio/mpeg', () => {
      expect(isImageMimeType(makeFile('audio/mpeg'))).toBe(false);
    });

    it('should return false for an empty mime type', () => {
      expect(isImageMimeType(makeFile(''))).toBe(false);
    });
  });
});

describe('fetchFileFromUrl', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves to a File with name and type derived from the URL', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse('data', {
        'content-type': 'image/jpeg',
        'content-length': '4',
      }),
    );

    const file = await fetchFileFromUrl('https://example.com/photo.jpg', MAX);

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('photo.jpg');
    expect(file.type).toBe('image/jpeg');
  });

  it('strips charset from the content-type', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse('data', {
        'content-type': 'video/mp4; charset=utf-8',
        'content-length': '4',
      }),
    );

    const file = await fetchFileFromUrl('https://example.com/clip.mp4', MAX);
    expect(file.type).toBe('video/mp4');
  });

  it('throws on an invalid URL', async () => {
    await expect(fetchFileFromUrl('not-a-url', MAX)).rejects.toThrow(
      'Invalid URL',
    );
  });

  it('throws on non-http(s) URLs', async () => {
    await expect(fetchFileFromUrl('data:text/plain,hi', MAX)).rejects.toThrow(
      'Unsupported URL protocol',
    );
  });

  it('throws a CORS-friendly message on network failure', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      fetchFileFromUrl('https://example.com/img.jpg', MAX),
    ).rejects.toThrow('The server may not allow cross-origin requests');
  });

  it('throws on a non-2xx response', async () => {
    fetchSpy.mockResolvedValue(mockResponse('', {}, 404));

    await expect(
      fetchFileFromUrl('https://example.com/img.jpg', MAX),
    ).rejects.toThrow('Server returned status 404');
  });

  it('throws when Content-Length exceeds max size', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse('x', {
        'content-length': String(MAX + 1),
        'content-type': 'image/jpeg',
      }),
    );

    await expect(
      fetchFileFromUrl('https://example.com/big.jpg', MAX),
    ).rejects.toThrow('exceeds the maximum allowed size');
  });

  it('throws when blob size exceeds max size (no Content-Length)', async () => {
    const bigBlob = new Blob([new Uint8Array(MAX + 1)], { type: 'image/jpeg' });
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      blob: () => Promise.resolve(bigBlob),
    } as unknown as Response);

    await expect(
      fetchFileFromUrl('https://example.com/big.jpg', MAX),
    ).rejects.toThrow('exceeds the maximum allowed size');
  });

  it('falls back to "file-from-url" when the URL has no path segment', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse('data', {
        'content-type': 'image/png',
        'content-length': '4',
      }),
    );

    const file = await fetchFileFromUrl('https://example.com/', MAX);
    expect(file.name).toBe('file-from-url');
  });

  it('uses Content-Disposition filename when URL path has no filename', async () => {
    fetchSpy.mockResolvedValue(
      mockResponse('data', {
        'content-type': 'image/png',
        'content-length': '4',
        'content-disposition': 'attachment; filename="server-name.png"',
      }),
    );

    const file = await fetchFileFromUrl('https://example.com/', MAX);
    expect(file.name).toBe('server-name.png');
  });
});
