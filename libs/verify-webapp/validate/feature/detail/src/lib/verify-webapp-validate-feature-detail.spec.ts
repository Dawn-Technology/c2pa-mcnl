import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateFeatureDetail } from './verify-webapp-validate-feature-detail';

describe('VerifyWebappValidateFeatureDetail', () => {
  let component: VerifyWebappValidateFeatureDetail;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateFeatureDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateFeatureDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
