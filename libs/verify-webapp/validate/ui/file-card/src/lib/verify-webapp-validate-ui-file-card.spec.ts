import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateUiFileCard } from './verify-webapp-validate-ui-file-card';

describe('VerifyWebappValidateUiFileCard', () => {
  let component: VerifyWebappValidateUiFileCard;
  let fixture: ComponentFixture<VerifyWebappValidateUiFileCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateUiFileCard],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateUiFileCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return descriptive alt text when file name exists', () => {
    fixture.componentRef.setInput('fileName', 'beeld.jpg');
    expect(component.imageAltText()).toBe('Voorbeeld van beeld.jpg');
  });

  it('should return fallback alt text when file name is missing', () => {
    expect(component.imageAltText()).toBe('Voorbeeldbestand');
  });
});
