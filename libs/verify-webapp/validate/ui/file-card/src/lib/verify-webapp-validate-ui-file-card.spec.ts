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
});
