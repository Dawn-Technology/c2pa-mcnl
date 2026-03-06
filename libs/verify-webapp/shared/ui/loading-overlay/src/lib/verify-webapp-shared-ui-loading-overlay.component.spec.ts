import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappSharedUiLoadingOverlayComponent } from './verify-webapp-shared-ui-loading-overlay.component';

describe('VerifyWebappSharedUiLoadingOverlayComponent', () => {
  let component: VerifyWebappSharedUiLoadingOverlayComponent;
  let fixture: ComponentFixture<VerifyWebappSharedUiLoadingOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappSharedUiLoadingOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      VerifyWebappSharedUiLoadingOverlayComponent,
    );
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('shown input', () => {
    it('should default to false', () => {
      expect(component.shown()).toBe(false);
    });

    it('should not render the overlay when shown is false', () => {
      fixture.detectChanges();
      const overlay = fixture.nativeElement.querySelector('.overlay');
      expect(overlay).toBeNull();
    });

    it('should render the overlay when shown is set to true', () => {
      fixture.componentRef.setInput('shown', true);
      fixture.detectChanges();
      const overlay = fixture.nativeElement.querySelector('.overlay');
      expect(overlay).not.toBeNull();
    });

    it('should hide the overlay again when shown is switched back to false', () => {
      fixture.componentRef.setInput('shown', true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.overlay')).not.toBeNull();

      fixture.componentRef.setInput('shown', false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.overlay')).toBeNull();
    });
  });

  describe('spinner', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('shown', true);
      fixture.detectChanges();
    });

    it('should render a spinner inside the overlay', () => {
      const spinner = fixture.nativeElement.querySelector('.overlay .spinner');
      expect(spinner).not.toBeNull();
    });
  });

  describe('overlay element', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('shown', true);
      fixture.detectChanges();
    });

    it('should have the overlay class that sets pointer-events to block interaction', () => {
      const overlay: HTMLElement =
        fixture.nativeElement.querySelector('.overlay');
      expect(overlay.classList.contains('overlay')).toBe(true);
    });

    it('should have the overlay class that sets fixed positioning to cover the full screen', () => {
      const overlay: HTMLElement =
        fixture.nativeElement.querySelector('.overlay');
      expect(overlay.classList.contains('overlay')).toBe(true);
    });
  });
});
