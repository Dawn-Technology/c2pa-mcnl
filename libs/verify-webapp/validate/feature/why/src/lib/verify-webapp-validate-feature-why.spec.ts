import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateFeatureWhy } from './verify-webapp-validate-feature-why';

describe('VerifyWebappValidateFeatureWhy', () => {
  let component: VerifyWebappValidateFeatureWhy;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureWhy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateFeatureWhy],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateFeatureWhy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
