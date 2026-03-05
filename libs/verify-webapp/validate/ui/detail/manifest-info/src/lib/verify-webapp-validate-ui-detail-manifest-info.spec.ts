import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateUiDetailManifestInfo } from './verify-webapp-validate-ui-detail-manifest-info';

describe('VerifyWebappValidateUiDetailManifestInfo', () => {
  let component: VerifyWebappValidateUiDetailManifestInfo;
  let fixture: ComponentFixture<VerifyWebappValidateUiDetailManifestInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateUiDetailManifestInfo],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateUiDetailManifestInfo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
