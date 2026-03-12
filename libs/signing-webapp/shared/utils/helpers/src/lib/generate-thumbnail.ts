/**
 * Generates a thumbnail from an image file using HTML5 Canvas.
 * @param file - The input image File or Blob.
 * @param maxWidth - The maximum width of the thumbnail.
 * @param maxHeight - The maximum height of the thumbnail.
 * @param quality - The JPEG compression quality (0.0 to 1.0). Default is 0.8.
 * @returns A Promise that resolves with the thumbnail as a Blob.
 * @throws Error Either an issue with the Image or the canvas will throw an error
 */
export function generateThumbnail(
  file: File | Blob,
  maxWidth: number,
  maxHeight: number,
  quality = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.src = objectUrl;

    img.onload = () => {
      // Clean up the object URL to prevent memory leaks
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas 2D context'));
        return;
      }

      // Calculate new dimensions (preserving aspect ratio)
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);

      // Prevent upscaling if the image is already smaller than max dimensions
      const finalRatio = ratio > 1 ? 1 : ratio;

      canvas.width = img.width * finalRatio;
      canvas.height = img.height * finalRatio;

      // Draw the resized image onto the canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Export as a compressed JPEG Blob
      canvas.toBlob(
        (blob: Blob | null) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      // Ensure we clean up memory even if the image fails to load
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load the image file'));
    };
  });
}
