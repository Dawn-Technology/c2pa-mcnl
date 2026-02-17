import { Component, input } from '@angular/core';

@Component({
  selector: 'lib-signing-webapp-form-ui-form-group',
  imports: [],
  template: `
    <div class="flex flex-col gap-5 group">
      <div class="flex flex-col gap-0 text-center">
        <label [for]="inputId()" class="text-xl font-bold">
          {{ label() }}
          @if (required()) {
            <span class="text-red-600">*</span>
          }
        </label>
        <div class="flex flex-col gap-4">
          @if (description()) {
            <p class="text-gray-700 text-sm">
              {{ description() }}
            </p>
          }

          @if (help()) {
            <p
              class="text-xs opacity-30 group-hover:opacity-100 group-hover:font-bold transition-all duration-500 ease-in-out"
            >
              {{ help() }}
            </p>
          }
        </div>
      </div>

      <ng-content></ng-content>
    </div>
  `,
})
export class SigningWebappFormUiFormGroup {
  label = input.required<string>();
  inputId = input.required<string>();
  description = input<string>();
  help = input<string>();
  required = input(false);
}
