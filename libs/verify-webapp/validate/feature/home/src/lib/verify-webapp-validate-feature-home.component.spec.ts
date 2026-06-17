import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { VerifyWebappValidateFeatureHomeComponent } from './verify-webapp-validate-feature-home.component';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActivatedRoute(params: Record<string, string> = {}) {
  const subject = new BehaviorSubject<ParamMap>(convertToParamMap(params));
  return {
    route: {
      queryParamMap: subject.asObservable(),
    } as unknown as ActivatedRoute,
    push: (p: Record<string, string>) => subject.next(convertToParamMap(p)),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('VerifyWebappValidateFeatureHomeComponent', () => {
  let component: VerifyWebappValidateFeatureHomeComponent;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureHomeComponent>;

  const isLoadingSignal = signal(false);
  const hasFile = signal(false);
  const setFileSpy = vi.fn();

  const mockStore = {
    isLoading: isLoadingSignal,
    hasFile,
    setFile: setFileSpy,
  };

  beforeEach(async () => {
    isLoadingSignal.set(false);
    hasFile.set(false);
    setFileSpy.mockReset();
    vi.restoreAllMocks();

    const stub = makeActivatedRoute();

    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateFeatureHomeComponent],
      providers: [
        provideRouter([]),
        { provide: VerifyStore, useValue: mockStore },
        { provide: ActivatedRoute, useValue: stub.route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateFeatureHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  describe('Rendering', () => {
    it('should render the main heading', () => {
      const heading = fixture.debugElement.query(By.css('h1'));
      expect(heading).toBeTruthy();
      expect(heading.nativeElement.textContent).toContain(
        'Zeker van je zaak, zeker van je bron',
      );
    });

    it('should render the file upload component', () => {
      const fileUpload = fixture.debugElement.query(
        By.css('lib-shared-ui-file-upload'),
      );
      expect(fileUpload).toBeTruthy();
    });

    it('should pass the correct acceptedMimeTypes to the file upload component', () => {
      const fileUpload = fixture.debugElement.query(
        By.css('lib-shared-ui-file-upload'),
      );
      expect(component.uploadMimeTypes).toEqual(ASSET_MIME_TYPES);
      expect(fileUpload.componentInstance.acceptedMimeTypes()).toEqual(
        ASSET_MIME_TYPES,
      );
    });

    it('should pass the correct maxFileSizeBytes to the file upload component', () => {
      const fileUpload = fixture.debugElement.query(
        By.css('lib-shared-ui-file-upload'),
      );
      expect(component.uploadMaxSize).toBe(ASSET_MAX_SIZE);
      expect(fileUpload.componentInstance.maxFileSizeBytes()).toBe(
        ASSET_MAX_SIZE,
      );
    });

    it('should render the loading overlay', () => {
      const overlay = fixture.debugElement.query(
        By.css('lib-verify-webapp-shared-ui-loading-overlay'),
      );
      expect(overlay).toBeTruthy();
    });

    it('should render the collaboration partner logos', () => {
      const logos = fixture.debugElement.queryAll(By.css('img[alt]'));
      const altTexts = logos.map((l) => l.nativeElement.alt);
      expect(altTexts).toContain('VPRO');
      expect(altTexts).toContain('MCNL');
      expect(altTexts).toContain('SIDN');
      expect(altTexts).toContain('Dawn Technology');
    });
  });

  // -----------------------------------------------------------------------
  // Loading overlay
  // -----------------------------------------------------------------------

  describe('Loading overlay', () => {
    it('should have the loading overlay hidden by default', () => {
      const overlay = fixture.debugElement.query(
        By.css('lib-verify-webapp-shared-ui-loading-overlay'),
      );
      expect(overlay.componentInstance.shown()).toBe(false);
    });

    it('should show the loading overlay when the store is loading', () => {
      isLoadingSignal.set(true);
      fixture.detectChanges();

      const overlay = fixture.debugElement.query(
        By.css('lib-verify-webapp-shared-ui-loading-overlay'),
      );
      expect(overlay.componentInstance.shown()).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // File upload (manual)
  // -----------------------------------------------------------------------

  describe('File upload', () => {
    it('should call store.setFile when a file is selected', () => {
      const mockFile = new File(['content'], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const fileUpload = fixture.debugElement.query(
        By.css('lib-shared-ui-file-upload'),
      );

      fileUpload.triggerEventHandler('valueChange', mockFile);

      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should call store.setFile with null when the file is cleared', () => {
      const fileUpload = fixture.debugElement.query(
        By.css('lib-shared-ui-file-upload'),
      );

      fileUpload.triggerEventHandler('valueChange', null);

      expect(setFileSpy).toHaveBeenCalledWith(null);
    });
  });

  // -----------------------------------------------------------------------
  // Component behavior
  // -----------------------------------------------------------------------

  describe('Component behavior', () => {
    it('should have uploadMimeTypes property', () => {
      expect(component.uploadMimeTypes).toEqual(ASSET_MIME_TYPES);
    });

    it('should have uploadMaxSize property', () => {
      expect(component.uploadMaxSize).toBe(ASSET_MAX_SIZE);
    });

    it('should have openFile method that calls store.setFile', () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      component.openFile(mockFile);
      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });
  });
});
