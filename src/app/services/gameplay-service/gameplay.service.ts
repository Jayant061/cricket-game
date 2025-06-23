import { effect, Injectable, signal } from '@angular/core';
import getPlayers, { IFallOfWicket, IPlayerPosition } from '../../filedersPosition';

@Injectable({
  providedIn: 'root',
})
export class GameplayService {
  constructor(){
    let currentWicketStored=  0;
    effect(()=>{
      if(this.wicketFallen() !== currentWicketStored && this.wicketFallen() !==0 ){
        currentWicketStored = this.wicketFallen()
        const over = `${Math.floor(this.totalBallFaced()/6)}.${this.totalBallFaced()%6}`;
        this.fallOfWickets.update(prev=>([...prev,{overs:over,runs:this.totalRunsScored(),wicket:this.wicketFallen()}]))
      }
      if(this.wicketFallen()===10){
        this.screenMessage.set('Game Over');
        this.isGamePaused.set(true);
        const timeout = setTimeout(()=>{
          this.wicketFallen.set(0);
          this.totalBallFaced.set(0);
          this.totalRunsScored.set(0);
          this.fallOfWickets.set([]);
          clearTimeout(timeout)
        },1000);
      }
    })
    }
  public derivedBallPath = signal<number>(0);
  public fieldersPos = signal<IPlayerPosition[]>(getPlayers());
  public nearsetPlayerToBallTrajectory = signal<number>(0);
  public BallAndPlayerContactPoint = signal<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  public wicketFallen = signal<number>(0);
  public totalRunsScored = signal<number>(0);
  public totalBallFaced = signal<number>(0);
  public fallOfWickets = signal<IFallOfWicket[]>([]);
  public isBatsmanRunningAllowed = signal<boolean>(false);
  public batsmanRunningType= signal<'run'|'retreat'|'none'>('none')
  public batsmanRunningDirection = signal<-1|1>(1);
  public isGamePaused = signal<boolean>(true);
  public screenMessage = signal<string>('');

  private readonly slopes = [
    3.732, // tan(75°)
    1.732, // tan(60°)
    1.0, // tan(45°)
    0.577, // tan(30°)
    0.268, // tan(15°)
    0.0, // tan(0°)
    -0.268, // tan(-15°)
    -0.577, // tan(-30°)
    -1.0, // tan(-45°)
    -1.732, // tan(-60°)
    -3.732, // tan(-75°)
  ];

  public getBallPath(): number {
    const randomIndex = Math.floor(Math.random() * this.slopes.length);
    this.derivedBallPath.set(this.slopes[randomIndex]);
    return this.derivedBallPath();
  }

  public getNearestPlayerToBallTrajectory(
    C: number,
    directionCoefficient: -1 | 1
  ): number {
    let distance = Number.MAX_VALUE;
    const slope = this.derivedBallPath();
    this.fieldersPos().forEach((player, index) => {
      const { x, y } = player;
      if (
        (directionCoefficient < 0 && x >= 0) ||
        (directionCoefficient > 0 && x <= 0) ||
        index === 0
      ) {
        return;
      }
      const currentFielderDistance = this.distanceBetweenPointAndLine(
        slope,
        C,
        x,
        y
      );
      if (currentFielderDistance < distance) {
        distance = currentFielderDistance;
        this.nearsetPlayerToBallTrajectory.set(index);
      }
    });
    //calculating foot of perpendicular
    const { x, y } = this.fieldersPos()[this.nearsetPlayerToBallTrajectory()];
    const xf = (slope * (y - C) + x) / (slope * slope + 1);
    const yf = slope * xf + C;
    this.BallAndPlayerContactPoint.set({ x: xf, y: yf });

    return this.nearsetPlayerToBallTrajectory();
  }
  private distanceBetweenPointAndLine(
    slope: number,
    C: number,
    X: number,
    Y: number
  ): number {
    return Math.abs(slope * X - Y + C) / Math.sqrt(1 + slope * slope);
  }

  public getPlayerNewY(A: number, B: number, x: number): number {
    const fielderOriginalCoord =
      this.fieldersPos()[this.nearsetPlayerToBallTrajectory()];
    return Math.floor(
      (B * x + A * fielderOriginalCoord.y - B * fielderOriginalCoord.x) / A
    );
  }

  public handleOut(outType:string){
    this.screenMessage.set(outType);
  }

  public boundry(run:6|4){
    this.screenMessage.set(run===6?'Six!':'Four')
  }
}
