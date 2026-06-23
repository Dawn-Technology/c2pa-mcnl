import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { VerifyWebappValidateUiDetailManifestList } from './verify-webapp-validate-ui-detail-manifest-list';

const createVerifyStoreStub = () => ({
  manifestsReversed: signal([
    { label: 'manifest-1', validationResult: null } as {
      label: string;
      validationResult: null;
    },
  ]),
  isActiveManifest: () => false,
  setActiveManifest: () => undefined,
  getManifestsThumbnailDataUrl: () => null,
  fileDataUrl: signal<string | null>(null),
  file: signal<File | null>(null),
});

describe('VerifyWebappValidateUiDetailManifestList', () => {
  let component: VerifyWebappValidateUiDetailManifestList;
  let fixture: ComponentFixture<VerifyWebappValidateUiDetailManifestList>;
  let storeStub: ReturnType<typeof createVerifyStoreStub>;

  beforeEach(async () => {
    storeStub = createVerifyStoreStub();

    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateUiDetailManifestList],
      providers: [{ provide: VerifyStore, useValue: storeStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateUiDetailManifestList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build a fallback aria label for manifests without label', () => {
    expect(component.manifestAriaLabel(undefined, 0)).toBe(
      'Selecteer manifest 1',
    );
  });

  it('should detect video files based on mime type', () => {
    expect(component.isVideoFile('video/mp4')).toBe(true);
    expect(component.isVideoFile('image/jpeg')).toBe(false);
  });

  it('should render a video icon when there is no thumbnail for a video file', () => {
    storeStub.file.set(new File(['video'], 'clip.mp4', { type: 'video/mp4' }));
    fixture.detectChanges();

    const svgIcon = fixture.nativeElement.querySelector('svg');
    const fallbackText = fixture.nativeElement.textContent;

    expect(svgIcon).not.toBeNull();
    expect(fallbackText).not.toContain('Geen thumbnails beschikbaar');
  });
});
