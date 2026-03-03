import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileUploadComponent } from './file-upload.component';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

// --- Mocks for Node/JSDOM Environment ---
if (!globalThis.DataTransfer) {
  Object.defineProperty(globalThis, 'DataTransfer', {
    value: class {
      items = { add: vi.fn() };
      files: File[] = [];
    },
  });
}

if (!globalThis.DragEvent) {
  Object.defineProperty(globalThis, 'DragEvent', {
    value: class extends Event {
      dataTransfer: any;
      constructor(type: string, eventInitDict: any = {}) {
        super(type, eventInitDict);
        this.dataTransfer =
          eventInitDict.dataTransfer || new globalThis.DataTransfer();
      }
    },
  });
}
// ----------------------------------------

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  const MAX_SIZE_BYTES = 1024 * 1024; // 1MB
  const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg'];
  const VALID_FILE = new File(['content'], 'test.png', { type: 'image/png' });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;

    // Initialize required inputs
    fixture.componentRef.setInput('acceptedMimeTypes', ACCEPTED_MIME_TYPES);
    fixture.componentRef.setInput('maxFileSizeBytes', MAX_SIZE_BYTES);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute acceptAttribute correctly', () => {
    expect(component.acceptAttribute()).toBe('image/png,image/jpeg');
  });

  it('should compute acceptAttributeHumanReadable correctly', () => {
    expect(component.acceptAttributeHumanReadable()).toBe('.png, .jpeg');
  });

  describe('Drag and Drop interactions', () => {
    let dropZone: any;

    beforeEach(() => {
      dropZone = fixture.debugElement.query(By.css('.border-dashed'));
    });

    it('should set isDragging to true on dragOver', () => {
      const event = new DragEvent('dragover');
      vi.spyOn(event, 'preventDefault');
      vi.spyOn(event, 'stopPropagation');

      dropZone.triggerEventHandler('dragover', event);

      expect(component.isDragging()).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should set isDragging to false on dragLeave', () => {
      component.isDragging.set(true);
      const event = new DragEvent('dragleave');

      dropZone.triggerEventHandler('dragleave', event);

      expect(component.isDragging()).toBe(false);
    });

    it('should set isDragging to false and process file on Drop', () => {
      component.isDragging.set(true);

      const dataTransfer = new DataTransfer();
      // @ts-expect-error: Mocking internal files property for test
      dataTransfer.files = [VALID_FILE];

      const event = new DragEvent('drop', { dataTransfer });

      vi.spyOn(event, 'preventDefault');
      vi.spyOn(event, 'stopPropagation');
      vi.spyOn(component.value, 'set');

      dropZone.triggerEventHandler('drop', event);

      expect(component.isDragging()).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.value.set).toHaveBeenCalledWith(VALID_FILE);
    });
  });

  describe('File Input interactions', () => {
    it('should process file when selected via input', () => {
      const inputEl = fixture.debugElement.query(By.css('input[type="file"]'));
      const mockEvent = { target: { files: [VALID_FILE] } };

      vi.spyOn(component.value, 'set');

      inputEl.triggerEventHandler('change', mockEvent);

      expect(component.value.set).toHaveBeenCalledWith(VALID_FILE);
    });
  });

  describe('UI Actions', () => {
    it('should remove file and clear input value', () => {
      // Setup initial state
      fixture.detectChanges();

      const inputEl = component.fileInput()!.nativeElement;

      // Hack: In JSDOM/Browser, file inputs are read-only for security.
      // We must redefine the property to behave like a normal writable string for testing.
      Object.defineProperty(inputEl, 'value', {
        value: 'C:\\fakepath\\test.png',
        writable: true,
      });

      component.removeFile();

      expect(inputEl.value).toBe('');
    });

    it('should trigger click on hidden input when chooseNewFile is called', () => {
      const inputEl = component.fileInput()!.nativeElement;
      vi.spyOn(inputEl, 'click');

      component.chooseNewFile();

      expect(inputEl.click).toHaveBeenCalled();
    });
  });
});
