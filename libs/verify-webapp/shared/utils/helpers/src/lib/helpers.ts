import { formatDate } from '@angular/common';
import {
  IngredientAssertion,
  Manifest,
  RelationshipType,
} from '@dawn-technology/c2pa-ts/manifest';

const ingredientRelationshipOrder: readonly RelationshipType[] = [
  RelationshipType.ParentOf,
  RelationshipType.ComponentOf,
  RelationshipType.InputTo,
];

type EmbeddedFileComponent = {
  content: Uint8Array;
  mimeType: string;
};

export function formatFileDateForLocale(
  file: File | null,
  localeId: string,
  fallback = '—',
): string {
  const lastModified = file?.lastModified;
  if (!lastModified) {
    return fallback;
  }

  return formatDate(lastModified, 'dd MMMM yyyy', localeId);
}

export function getOrderedIngredients(
  manifest: Manifest | null,
): IngredientAssertion[] {
  if (!manifest?.assertions) {
    return [];
  }

  return ingredientRelationshipOrder.flatMap(
    (relationship) =>
      manifest.assertions?.getIngredientsByRelationship(relationship) ?? [],
  );
}

function isEmbeddedFileComponent(
  component: unknown,
): component is EmbeddedFileComponent {
  const candidate = component as EmbeddedFileComponent;
  return (
    candidate?.content instanceof Uint8Array &&
    typeof candidate.mimeType === 'string' &&
    candidate.mimeType.length > 0
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x4000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    for (let index = 0; index < chunk.length; index += 1) {
      binary += String.fromCharCode(chunk[index]);
    }
  }

  return btoa(binary);
}

function toDataUrl(mimeType: string, bytes: Uint8Array): string {
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

export function resolveIngredientPreviewDataUrl(
  manifest: Manifest,
  ingredient: IngredientAssertion,
): string | null {
  const referencedUris = [
    ingredient.thumbnail?.uri,
    ingredient.data?.uri,
  ].filter((uri): uri is string => !!uri);

  for (const uri of referencedUris) {
    const component = manifest.getComponentByURL(uri);
    if (!isEmbeddedFileComponent(component)) {
      continue;
    }

    return toDataUrl(component.mimeType, component.content);
  }

  return null;
}
