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
    fixture.componentRef.setInput('state', 'invalid');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render valid state text', () => {
    fixture.componentRef.setInput('state', 'valid');
    fixture.componentRef.setInput('textValid', 'Geverifieerd');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Geverifieerd');
  });

  it('should render invalid state text', () => {
    fixture.componentRef.setInput('state', 'invalid');
    fixture.componentRef.setInput('textInvalid', 'Gemanipuleerd');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gemanipuleerd');
  });

  it('should render untrusted state text', () => {
    fixture.componentRef.setInput('state', 'untrusted');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Niet vertrouwd');
  });
});
