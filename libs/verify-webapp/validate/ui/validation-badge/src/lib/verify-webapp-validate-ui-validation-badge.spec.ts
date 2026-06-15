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

  it('should return valid status label when valid is true', () => {
    fixture.componentRef.setInput('valid', true);
    fixture.componentRef.setInput('textValid', 'Geverifieerd');
    fixture.detectChanges();

    expect(component.statusLabel()).toBe('Geverifieerd');
  });

  it('should return invalid status label when valid is false', () => {
    fixture.componentRef.setInput('valid', false);
    fixture.componentRef.setInput('textInvalid', 'Niet herkenbaar');
    fixture.detectChanges();

    expect(component.statusLabel()).toBe('Niet herkenbaar');
  });
});
