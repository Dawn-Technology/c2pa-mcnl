import * as exifr from 'exifr';

export function imageMetadataHelpers(
  input: Parameters<typeof exifr.parse>[0],
): Promise<Record<string, any>> {
  return exifr.parse(input, {
    xmp: true,
    tiff: false,
    exif: false,
    icc: false,
  });
}

export async function getImageXmpIdentifiers(
  input: Parameters<typeof exifr.parse>[0],
) {
  try {
    const metadata = await imageMetadataHelpers(input);
    return {
      instanceID: metadata['InstanceID']
        ? metadata['InstanceID'].replace('xmp.iid:', 'xmp:iid:')
        : undefined,
      documentID: metadata['DocumentID']
        ? metadata['DocumentID'].replace('xmp.did:', 'xmp:did:')
        : undefined,
    };
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return { instanceID: undefined, documentID: undefined };
  }
}
