import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
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
import * as helpers from '@c2pa-mcnl/shared/utils/helpers';

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

async function buildFixture(activatedRoute: ActivatedRoute, mockStore: object) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [VerifyWebappValidateFeatureHomeComponent],
    providers: [
      provideRouter([]),
      { provide: VerifyStore, useValue: mockStore },
      { provide: ActivatedRoute, useValue: activatedRoute },
    ],
  })
    .overrideComponent(VerifyWebappValidateFeatureHomeComponent, {})
    .compileComponents();

  const f = TestBed.createComponent(VerifyWebappValidateFeatureHomeComponent);
  f.detectChanges();
  await f.whenStable();
  return f;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('VerifyWebappValidateFeatureHomeComponent', () => {
  let component: VerifyWebappValidateFeatureHomeComponent;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureHomeComponent>;
  let router: Router;

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

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

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
  // Navigation
  // -----------------------------------------------------------------------

  describe('Navigation', () => {
    it('should not navigate when there is no file in the store', () => {
      TestBed.flushEffects();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to /verify when the store has a file', async () => {
      hasFile.set(true);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(router.navigate).toHaveBeenCalledWith(['verify']);
    });
  });

  // -----------------------------------------------------------------------
  // URL parameter (?o=)
  // -----------------------------------------------------------------------

  describe('URL parameter (?o=)', () => {
    it('should not call fetchFileFromUrl when no ?o param is present', async () => {
      const fetchSpy = vi.spyOn(helpers, 'fetchFileFromUrl');
      await fixture.whenStable();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should call store.setFile with the fetched file for a supported MIME type', async () => {
      const mockFile = new File(['data'], 'image.jpg', { type: 'image/jpeg' });
      const fetchSpy = vi
        .spyOn(helpers, 'fetchFileFromUrl')
        .mockResolvedValue(mockFile);
      const stub = makeActivatedRoute({ o: 'https://example.com/image.jpg' });

      await buildFixture(stub.route, mockStore);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        ASSET_MAX_SIZE,
      );
      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should warn and not call setFile for an unsupported MIME type', async () => {
      const mockFile = new File(['data'], 'doc.pdf', {
        type: 'application/pdf',
      });
      vi.spyOn(helpers, 'fetchFileFromUrl').mockResolvedValue(mockFile);
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const stub = makeActivatedRoute({ o: 'https://example.com/doc.pdf' });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not supported'),
      );
    });

    it('should log an error and not call setFile when the fetch fails', async () => {
      vi.spyOn(helpers, 'fetchFileFromUrl').mockRejectedValue(
        new Error('CORS error'),
      );
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const stub = makeActivatedRoute({ o: 'https://example.com/image.jpg' });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to load file from URL:',
        'CORS error',
      );
    });

    it.each([
      ['image/jpeg', 'photo.jpg'],
      ['image/png', 'photo.png'],
      ['image/heic', 'photo.heic'],
      ['image/heif', 'photo.heif'],
      ['video/mp4', 'clip.mp4'],
      ['audio/mpeg', 'track.mp3'],
    ])('should accept MIME type %s', async (mimeType, filename) => {
      const mockFile = new File(['data'], filename, { type: mimeType });
      vi.spyOn(helpers, 'fetchFileFromUrl').mockResolvedValue(mockFile);
      const stub = makeActivatedRoute({ o: `https://example.com/${filename}` });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });
  });
});
