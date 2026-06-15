import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateUiDetailFileHandler } from './verify-webapp-validate-ui-detail-file-handler';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { signal } from '@angular/core';
import { vi } from 'vitest';

const createVerifyStoreStub = () => ({
  fileDataUrl: signal<string | null>(null),
  file: signal<File | null>(null),
  fileDate: signal(''),
  setFile: vi.fn(),
});

describe('VerifyWebappValidateUiDetailFileHandler', () => {
  let component: VerifyWebappValidateUiDetailFileHandler;
  let fixture: ComponentFixture<VerifyWebappValidateUiDetailFileHandler>;
  let storeStub: ReturnType<typeof createVerifyStoreStub>;

  beforeEach(async () => {
    storeStub = createVerifyStoreStub();

    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateUiDetailFileHandler],
      providers: [{ provide: VerifyStore, useValue: storeStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateUiDetailFileHandler);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render fallback preview text as paragraph when no file preview exists', () => {
    fixture.detectChanges();

    const fallbackText: HTMLElement | null = Array.from(
      fixture.nativeElement.querySelectorAll('p'),
    ).find((el: Element) =>
      el.textContent?.includes('Geen preview beschikbaar voor dit bestand'),
    ) as HTMLElement | null;

    expect(fallbackText).not.toBeNull();
  });
});
