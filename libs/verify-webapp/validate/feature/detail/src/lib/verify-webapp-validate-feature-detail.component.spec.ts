import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
} from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { VerifyWebappValidateFeatureDetailComponent } from './verify-webapp-validate-feature-detail.component';
import { VerifyStore } from '@c2pa-mcnl/verify-webapp/validate/data-access';
import { ASSET_MAX_SIZE } from '@c2pa-mcnl/shared/utils/constants';
import * as helpers from '@c2pa-mcnl/shared/utils/helpers';

// Helpers
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
    imports: [VerifyWebappValidateFeatureDetailComponent],
    providers: [
      provideRouter([]),
      { provide: VerifyStore, useValue: mockStore },
      { provide: ActivatedRoute, useValue: activatedRoute },
    ],
  })
    .overrideComponent(VerifyWebappValidateFeatureDetailComponent, {
      set: {
        template: '<div>Test</div>',
      },
    })
    .compileComponents();

  const f = TestBed.createComponent(VerifyWebappValidateFeatureDetailComponent);
  f.detectChanges();
  await f.whenStable();
  return f;
}

describe('VerifyWebappValidateFeatureDetailComponent', () => {
  let component: VerifyWebappValidateFeatureDetailComponent;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureDetailComponent>;

  const setFileSpy = vi.fn();
  const mockStore = { setFile: setFileSpy };

  beforeEach(async () => {
    setFileSpy.mockReset();
    vi.restoreAllMocks();

    const stub = makeActivatedRoute();

    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateFeatureDetailComponent],
      providers: [
        provideRouter([]),
        { provide: VerifyStore, useValue: mockStore },
        { provide: ActivatedRoute, useValue: stub.route },
      ],
    })
      .overrideComponent(VerifyWebappValidateFeatureDetailComponent, {
        set: {
          template: '<div>Test</div>',
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(
      VerifyWebappValidateFeatureDetailComponent,
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('URL parameters', () => {
    it('should not call fetchFileFromUrl when no param is present', async () => {
      const fetchSpy = vi.spyOn(helpers, 'fetchFileFromUrl');
      await fixture.whenStable();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should call store.setFile using ?o', async () => {
      const mockFile = new File(['data'], 'image.jpg', { type: 'image/jpeg' });
      vi.spyOn(helpers, 'fetchFileFromUrl').mockResolvedValue(mockFile);
      const stub = makeActivatedRoute({ o: 'https://example.com/image.jpg' });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should call store.setFile using ?open', async () => {
      const mockFile = new File(['data'], 'image.jpg', { type: 'image/jpeg' });
      vi.spyOn(helpers, 'fetchFileFromUrl').mockResolvedValue(mockFile);
      const stub = makeActivatedRoute({
        open: 'https://example.com/image.jpg',
      });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should call store.setFile using ?s', async () => {
      const mockFile = new File(['data'], 'image.jpg', { type: 'image/jpeg' });
      vi.spyOn(helpers, 'fetchFileFromUrl').mockResolvedValue(mockFile);
      const stub = makeActivatedRoute({
        s: 'https://example.com/image.jpg',
      });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should call store.setFile using ?source', async () => {
      const mockFile = new File(['data'], 'image.jpg', { type: 'image/jpeg' });
      vi.spyOn(helpers, 'fetchFileFromUrl').mockResolvedValue(mockFile);
      const stub = makeActivatedRoute({
        source: 'https://example.com/image.jpg',
      });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).toHaveBeenCalledWith(mockFile);
    });

    it('should reject unsupported MIME types', async () => {
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
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      vi.spyOn(helpers, 'fetchFileFromUrl').mockRejectedValue(
        new Error('CORS error'),
      );
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      const stub = makeActivatedRoute({ o: 'https://example.com/image.jpg' });

      await buildFixture(stub.route, mockStore);

      expect(setFileSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
