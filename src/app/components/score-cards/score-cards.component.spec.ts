import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoreCardsComponent } from './score-cards.component';

describe('ScoreCardsComponent', () => {
  let component: ScoreCardsComponent;
  let fixture: ComponentFixture<ScoreCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreCardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoreCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
