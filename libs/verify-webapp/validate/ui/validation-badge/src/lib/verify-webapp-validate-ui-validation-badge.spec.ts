import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateUiValidationBadge } from './verify-webapp-validate-ui-validation-badge';

describe('VerifyWebappValidateUiValidationBadge', () => {
  let component: VerifyWebappValidateUiValidationBadge;
  let fixture: ComponentFixture<VerifyWebappValidateUiValidationBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateUiValidationBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateUiValidationBadge);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
