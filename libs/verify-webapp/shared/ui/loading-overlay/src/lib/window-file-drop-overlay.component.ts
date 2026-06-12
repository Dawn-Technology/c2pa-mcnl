import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  signal,
} from '@angular/core';

@Component({
  selector: 'lib-verify-webapp-window-file-drop-overlay',
  standalone: true,
  template: `
    <ng-content />

    @if (isWindowDragActive()) {
      <div
        class="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-600/50"
      >
        <p
          class="rounded-xl bg-white/90 px-8 py-5 text-2xl font-bold text-blue-900"
        >
          Plaats hier het bestand
        </p>
      </div>
    }
  `,
})
export class WindowFileDropOverlayComponent {
  private dragDepth = 0;

  readonly isWindowDragActive = signal(false);

  @Input() enabled = false;
  @Output() readonly fileDropped = new EventEmitter<File>();

  @HostListener('window:dragenter', ['$event'])
  onWindowDragEnter(event: DragEvent): void {
    if (!this.enabled) {
      return;
    }
    if (!this.isFileDrag(event)) {
      return;
    }

    event.preventDefault();

    this.dragDepth += 1;
    this.isWindowDragActive.set(true);
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    if (!this.enabled) {
      return;
    }
    if (!this.isFileDrag(event)) {
      return;
    }

    event.preventDefault();

    if (!this.isWindowDragActive()) {
      this.isWindowDragActive.set(true);
    }
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent): void {
    if (!this.enabled) {
      return;
    }
    if (!this.isFileDrag(event)) {
      return;
    }

    event.preventDefault();

    this.dragDepth = Math.max(0, this.dragDepth - 1);

    if (this.dragDepth === 0) {
      this.isWindowDragActive.set(false);
    }
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent): void {
    if (!this.enabled) {
      return;
    }
    if (!this.isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    this.resetDragState();

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.fileDropped.emit(files[0]);
    }
  }

  private isFileDrag(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    return types?.includes('Files') ?? false;
  }

  private resetDragState(): void {
    this.dragDepth = 0;
    this.isWindowDragActive.set(false);
  }
}
