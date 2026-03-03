import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappHomeFeatureDetail } from './verify-webapp-home-feature-detail';

describe('VerifyWebappHomeFeatureDetail', () => {
  let component: VerifyWebappHomeFeatureDetail;
  let fixture: ComponentFixture<VerifyWebappHomeFeatureDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappHomeFeatureDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappHomeFeatureDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
