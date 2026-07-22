import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateFeatureAbout } from './verify-webapp-validate-feature-about';

describe('VerifyWebappValidateFeatureAbout', () => {
  let component: VerifyWebappValidateFeatureAbout;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureAbout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateFeatureAbout],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateFeatureAbout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
