import {
  Component,
  computed,
  ElementRef,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatFileSize } from '@c2pa-mcnl/shared/utils/helpers';
import {
  FormValueControl,
  ValidationError,
  WithOptionalField,
} from '@angular/forms/signals';

@Component({
  standalone: true,
  selector: 'lib-shared-ui-file-upload',
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css',
})
export class FileUploadComponent implements FormValueControl<File | null> {
  private static readonly PEM_MIME_TYPE = 'application/x-pem-file';
  private static readonly MIME_EXTENSION_MAP: Record<string, string[]> = {
    'application/x-pem-file': ['.pem'],
    'application/x-x509-ca-cert': ['.crt', '.cer'],
  };

  readonly value = model<File | null>(null);
  readonly errors = input<readonly WithOptionalField<ValidationError>[]>([]);

  fieldId = input<string>(
    `file-upload-${Math.random().toString(36).substring(2, 15)}`,
  );
  acceptedMimeTypes = input.required<string[]>();
  maxFileSizeBytes = input.required<number>();
  buttonOnly = input(false);
  buttonClass = input('');

  isDragging = signal(false);

  fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  acceptAttribute = computed(() => {
    const acceptedMimeTypes = this.acceptedMimeTypes();
    const extensions = acceptedMimeTypes.flatMap(
      (mime) => FileUploadComponent.MIME_EXTENSION_MAP[mime] || [],
    );

    return [...acceptedMimeTypes, ...extensions].join(',');
  });
  acceptAttributeHumanReadable = computed(() => {
    const extensions = this.acceptedMimeTypes().flatMap((mime) => {
      const mapped = FileUploadComponent.MIME_EXTENSION_MAP[mime];
      if (mapped && mapped.length > 0) {
        return mapped;
      }

      const subtype = mime.split('/')[1];
      return subtype ? [`.${subtype}`] : [];
    });

    return [...new Set(extensions)].join(', ');
  });

  errorMessages = computed(() => {
    const errors: string[] = [];
    if (this.errors()) {
      for (const err of this.errors()) {
        if (err.message) {
          errors.push(err.message);
        }
      }
    }
    return errors;
  });
  hasErrors = computed(() => !!this.errorMessages().length);

  readonly formatFileSize = formatFileSize;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    const hasEmptyMimeType = !file.type;
    const isPemFile = file.name.toLowerCase().endsWith('.pem');

    if (hasEmptyMimeType && isPemFile) {
      this.value.set(
        new File([file], file.name, {
          type: FileUploadComponent.PEM_MIME_TYPE,
          lastModified: file.lastModified,
        }),
      );
      return;
    }

    this.value.set(file);
  }

  removeFile(): void {
    this.value.set(null);

    // Clear the file input
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  chooseNewFile(event?: Event): void {
    event?.stopPropagation();
    event?.stopImmediatePropagation();

    const input = this.fileInput();
    if (input?.nativeElement) {
      input.nativeElement.click();
    }
  }
}
