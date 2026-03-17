import { describe, expect, it } from 'vitest';
import { formatFileSize, isImageMimeType } from './file-helpers';

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
