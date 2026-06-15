import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappSharedUiLayoutHeaderComponent } from './verify-webapp-shared-ui-layout-header.component';

describe('VerifyWebappSharedUiLayoutHeaderComponent', () => {
  let component: VerifyWebappSharedUiLayoutHeaderComponent;
  let fixture: ComponentFixture<VerifyWebappSharedUiLayoutHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappSharedUiLayoutHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      VerifyWebappSharedUiLayoutHeaderComponent,
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a banner landmark', () => {
    const header: HTMLElement | null =
      fixture.nativeElement.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.getAttribute('role')).toBe('banner');
  });

  it('should expose a home link with an accessible label', () => {
    const homeLink: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('a[aria-label]');

    expect(homeLink).not.toBeNull();
    expect(homeLink?.getAttribute('aria-label')).toContain('homepage');
  });
});
