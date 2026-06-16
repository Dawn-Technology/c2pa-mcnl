import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFileFromUrl } from './file-helpers';

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
