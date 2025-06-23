import { Component, inject } from '@angular/core';
import { GameplayService } from '../../services/gameplay-service/gameplay.service';
import { IFallOfWicket } from '../../filedersPosition';

@Component({
  selector: 'app-score-cards',
  imports: [],
  templateUrl: './score-cards.component.html',
  styleUrl: './score-cards.component.scss'
})
export class ScoreCardsComponent {
  public gameplayService = inject(GameplayService);
  public get overs():number {
    return Math.floor(this.gameplayService.totalBallFaced()/6);
  }
  public get deliveries(){
    return Math.floor(this.gameplayService.totalBallFaced()%6);
  }

  public get runs():number{
    return this.gameplayService.totalRunsScored();
  }

  public get wicekts():number{
    return this.gameplayService.wicketFallen();
  }

  public get fallOfWickets():IFallOfWicket[]{
    return this.gameplayService.fallOfWickets();
  }
}
