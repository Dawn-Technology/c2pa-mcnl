import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateFeatureDetailComponent } from './verify-webapp-validate-feature-detail.component';

describe('VerifyWebappValidateFeatureDetailComponent', () => {
  let component: VerifyWebappValidateFeatureDetailComponent;
  let fixture: ComponentFixture<VerifyWebappValidateFeatureDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateFeatureDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      VerifyWebappValidateFeatureDetailComponent,
    );
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a main landmark with an accessible page heading', () => {
    fixture.detectChanges();

    const main: HTMLElement | null =
      fixture.nativeElement.querySelector('main');
    const pageHeading: HTMLElement | null =
      fixture.nativeElement.querySelector('main h1.sr-only');

    expect(main).not.toBeNull();
    expect(main?.getAttribute('aria-label')).toBe(
      'Bestandsverificatie details',
    );
    expect(pageHeading?.textContent?.trim()).toBe(
      'Details van contentverificatie',
    );
  });
});
