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

  it('should detect video files based on mime type', () => {
    fixture.componentRef.setInput('mimeType', 'video/mp4');

    expect(component.isVideoFile()).toBe(true);
  });

  it('should render a video icon when no preview url exists for video files', () => {
    fixture.componentRef.setInput('mimeType', 'video/mp4');
    fixture.componentRef.setInput('fileName', 'clip.mp4');
    fixture.detectChanges();

    const svgIcon = fixture.nativeElement.querySelector('svg');
    const previewImage = fixture.nativeElement.querySelector('img');

    expect(svgIcon).not.toBeNull();
    expect(previewImage).toBeNull();
  });
});
