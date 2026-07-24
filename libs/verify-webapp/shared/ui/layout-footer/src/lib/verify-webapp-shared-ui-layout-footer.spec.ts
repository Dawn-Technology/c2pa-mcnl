import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappSharedUiLayoutFooter } from './verify-webapp-shared-ui-layout-footer';

describe('VerifyWebappSharedUiLayoutFooter', () => {
  let component: VerifyWebappSharedUiLayoutFooter;
  let fixture: ComponentFixture<VerifyWebappSharedUiLayoutFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappSharedUiLayoutFooter],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappSharedUiLayoutFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
