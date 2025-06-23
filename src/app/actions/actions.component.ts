import { Component, inject } from '@angular/core';
import { GameplayService } from '../services/gameplay-service/gameplay.service';

@Component({
  selector: 'app-actions',
  imports: [],
  templateUrl: './actions.component.html',
  styleUrl: './actions.component.scss'
})
export class ActionsComponent {
  public gamePlayService = inject(GameplayService);
  
}
