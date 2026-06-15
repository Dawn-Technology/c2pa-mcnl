import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateUiDetailManifestList } from './verify-webapp-validate-ui-detail-manifest-list';

describe('VerifyWebappValidateUiDetailManifestList', () => {
  let component: VerifyWebappValidateUiDetailManifestList;
  let fixture: ComponentFixture<VerifyWebappValidateUiDetailManifestList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateUiDetailManifestList],
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
});
