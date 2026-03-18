import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { VerifyWebappValidateFeatureHomeComponent } from './verify-webapp-validate-feature-home.component';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import {
  ASSET_MAX_SIZE,
  ASSET_MIME_TYPES,
} from '@c2pa-mcnl/shared/utils/constants';

describe('VerifyWebappValidateFeatureHomeComponent', () => {
  let component: VerifyWebappValidateFeatureHomeComponent;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureHomeComponent>;
  let router: Router;

  // Controllable signals for the mock store
  const isLoadingSignal = signal(false);
  const hasManifests = signal(false);
  const setFileSpy = vi.fn();

  const mockStore = {
    isLoading: isLoadingSignal,
    hasManifests: hasManifests,
    setFile: setFileSpy,
  };

  beforeEach(async () => {
    isLoadingSignal.set(false);
    hasManifests.set(false);
    setFileSpy.mockReset();

    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateFeatureHomeComponent],
      providers: [
        provideRouter([]),
        { provide: VerifyStore, useValue: mockStore },
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

  describe('Navigation', () => {
    it('should not navigate when there is no C2PA result', () => {
      TestBed.flushEffects();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to /verify when the store has a C2PA result', async () => {
      hasManifests.set(true);
      fixture.detectChanges();
      TestBed.flushEffects();

      expect(router.navigate).toHaveBeenCalledWith(['verify']);
    });
  });
});
