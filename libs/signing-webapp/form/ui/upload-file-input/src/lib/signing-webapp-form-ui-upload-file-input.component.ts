import { Component, input } from '@angular/core';
import { FileUploadComponent } from '@c2pa-mcnl/shared/ui/file-upload';
import { FieldTree, FormField } from '@angular/forms/signals';
import { SigningWebappFormUiFormGroup } from '@c2pa-mcnl/signing-webapp/form/ui/form-group';

@Component({
  selector: 'lib-signing-webapp-form-ui-upload-file-input',
  standalone: true,
  imports: [FileUploadComponent, FormField, SigningWebappFormUiFormGroup],
  templateUrl: './signing-webapp-form-ui-upload-file-input.component.html',
})
export class SigningWebappFormUiUploadFileInputComponent {
  // UI Inputs
  label = input.required<string>();
  inputId = input.required<string>();
  description = input<string>();
  help = input<string>();
  required = input(false);

  // Passthrough Inputs for File Upload
  acceptedMimeTypes = input.required<string[]>();
  maxFileSizeBytes = input.required<number>();
  control = input.required<FieldTree<File | null>>();
}
