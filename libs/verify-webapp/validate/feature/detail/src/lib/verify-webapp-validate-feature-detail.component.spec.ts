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
});
