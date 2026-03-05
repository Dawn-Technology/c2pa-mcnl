import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyWebappValidateUiDetailFileHandler } from './verify-webapp-validate-ui-detail-file-handler';

describe('VerifyWebappValidateUiDetailFileHandler', () => {
  let component: VerifyWebappValidateUiDetailFileHandler;
  let fixture: ComponentFixture<VerifyWebappValidateUiDetailFileHandler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyWebappValidateUiDetailFileHandler],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyWebappValidateUiDetailFileHandler);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
