import { Component, inject, input } from '@angular/core';
import { GameplayService } from '../services/gameplay-service/gameplay.service';

@Component({
  selector: 'app-actions',
  imports: [],
  templateUrl: './actions.component.html',
  styleUrl: './actions.component.scss'
})
export class ActionsComponent {
  public play = input.required<()=>void>();
  public bat = input.required<VoidFunction>();
  public run = input.required<VoidFunction>();
  public runningStatus = input.required<string>();

  public gamePlayService = inject(GameplayService);
}
