import { Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ScoreCardsComponent } from '../score-cards/score-cards.component';
import { GameplayService } from '../../services/gameplay-service/gameplay.service';
import getPlayers, { IPlayerPosition } from '../../filedersPosition';

interface ICoord {
  x: number;
  y: number;
}
@Component({
  selector: 'app-playground',
  imports: [ScoreCardsComponent],
  templateUrl: './playground.component.html',
  styleUrl: './playground.component.scss',
})
export class PlaygroundComponent implements OnInit, OnDestroy{
  public gamePlayService = inject(GameplayService);
  public groundRadius = signal<number>(450);
  public viewBoxDimension = signal<string>('');
  public batsmanCoord = signal<ICoord>(defaultBatsmenCoord);
  public stumpsPosition = signal<IWicketPos[]>(initialWicketsPos);
  public bailsPosition = signal<IWicketPos[]>(initialBailsPos);
  public wicketFallEnd = signal<'' | WicketEnd>('');
  public ballCoord = signal<ICoord>(defaultBallCoord);
  public isBatHitted = signal<boolean>(false);
  // public isNextBallReady = signal<boolean>(true);
  public ballThrowIntervalToken = signal<number>(0);
  public isBallThrown = signal<boolean>(false);
  private readonly runScoredInCurrentDelivery = signal<number>(0);
  private readonly runningIntervalTokens = signal<number[]>([]);
  private readonly batsmanRunningIntervalToken = signal<number>(0);
  private readonly isWicketFellInCurrentDelivery = signal<boolean>(false);

  constructor(){
    effect(()=>{
      const message = this.gamePlayService.screenMessage().trim();
      if(message){
        const timeout = setTimeout(()=>{
          this.gamePlayService.screenMessage.set('');
          clearTimeout(timeout);
        },1500);
      }

    })
  }

  ngOnInit(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    setTimeout(()=>{
      window.alert("Use 'P' to play or pause the game. Use 'Enter' or 'SpaceBar' to hit the ball. And use 'R' to run or retreat");
    },1000);
  }

  private handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase().trim();
    // key P is for Play pause game
    // key R is for Run or Retreat game
    // key space or Enter is for hit the ball
    if (key === 'p') {
      this.gamePlayService.isGamePaused.update((prev) => !prev);
      if(this.gamePlayService.isGamePaused()){
        this.runningIntervalTokens().forEach(i=>{
          clearInterval(i);
        });
        this.runningIntervalTokens.set([])
      }
      this.handleReset(0,false);
    } else if (key === 'r') {
      if(!this.gamePlayService.isBatsmanRunningAllowed()) return;
      this.gamePlayService.batsmanRunningDirection.update((prev) =>
        prev === 1 ? -1 : 1
      );
      if(this.gamePlayService.batsmanRunningType()==='none'|| this.gamePlayService.batsmanRunningType()==='retreat'){
        this.gamePlayService.batsmanRunningType.set('run');
      }else{
        this.gamePlayService.batsmanRunningType.set('retreat');
      }
      this.handleRunBatsman();
    }
    else if(key==='' || key ==='enter'){
      this.handleBat();
    }

  }

  public throwBall() {
    if (this.gamePlayService.isGamePaused()){
      clearInterval(this.ballThrowIntervalToken());
      return;
    };
    // pitch length = 260
    const ballSpeed = 5; // 5 units per 20ms
    const bowlerSpeed = 4;
    this.ballThrowIntervalToken.set(window.setInterval(() => {
      if (this.ballCoord().y >= 150) {
        clearInterval(this.ballThrowIntervalToken());
        this.fallOfWicket();
        this.gamePlayService.screenMessage.set("Bowled")
      }
      // bowler runing
      // bowler throw ball when reaches crease ie -135;
      const bowlerCoord = this.gamePlayService.fieldersPos()[0];
      if (bowlerCoord.y < -135) {
        if (this.isBallThrown()) {
          this.isBallThrown.set(false);
        }
        bowlerCoord.y += bowlerSpeed;
      } else {
        if (!this.isBallThrown()) {
          this.isBallThrown.set(true);
        }
        const { y } = this.ballCoord();
        const newY = y + ballSpeed;
        const newX = (150 - newY) / 28;
        this.ballCoord.set({ x: newX, y: newY });
      }
    }, 20));
  }

  public fallOfWicket(end: WicketEnd = 'striker') {
    // index 0 1 2 are for non striker ends and 3 4 5 are for striker end
    if (this.wicketFallEnd() !== '') {
      return;
    }
    this.isWicketFellInCurrentDelivery.set(true);
    this.wicketFallEnd.set(end);
    const maxDeviation = 5;
    let deviation = 1;
    const interval = window.setInterval(() => {
      if (deviation === maxDeviation) {
        console.log("first")
        clearInterval(interval);
        this.handleReset(1500);
        return;
      }
      const updatesWicketPos = this.stumpsPosition().map((stump, index) => {
        if (
          (end === 'striker' && index < 3) ||
          (end === 'non-striker' && index >= 3) ||
          stump.x1 === 0
        ) {
          return stump;
        }
        let newX2 = stump.x2;
        if (stump.x1 === -6) {
          newX2--;
        } else if (stump.x1 === 6) {
          newX2++;
        }
        return { ...stump, x2: newX2 };
      });
      this.stumpsPosition.set(updatesWicketPos);
      deviation++;
    }, 10);
    this.runningIntervalTokens.update(prev=>[...prev,interval])
  }

  public handleBat() {
    // bat coordinate is -15 130 and batLength is 35;
    if (this.isBatHitted()) {
      return;
    }

    this.isBatHitted.set(true);

    // allowing user to hit ball again after 1s of hitting ball
    const timeout = setTimeout(() => {
      this.isBatHitted.set(false);
      clearTimeout(timeout);
    }, 1000);

    // if bats hits the ball or ball is in radar of bat. Assuming bat coverage is 50 unit for easy 40 for medium and 35 for Hard
    // bat range is 80 - 130 in y
    // radius of ground is 450 unit

    if (this.ballCoord().y >= 80 && this.ballCoord().y <= 130) {
      this.gamePlayService.isBatsmanRunningAllowed.set(true);
      clearInterval(this.ballThrowIntervalToken());
    } else {
      return;
    }
    // Below algorthm is for ball trajectory and fielder movement towards the ball
    const slope = this.gamePlayService.getBallPath();
    const direction = Math.floor(Math.random() * 100);
    const directionCoefficient = direction>50 ? -1 : 1;
    const C = this.ballCoord().y;
    // ballSpeed  ranging from 4 to 8 unit per 20 ms
    // 3 to 5 considered dropped (grounded) and above considered as in air
    const ballSpeed = Math.floor(Math.random() * 4) + 4;
    const flyingBallMinSpeed = 6;
    const flyingBallMaxSpeed = 7;
    const fielderSpeed = 2;
    const R = 450; // radius of ground
    this.gamePlayService.getNearestPlayerToBallTrajectory(
      C,
      directionCoefficient
    ); // this method gets the nearest fielder to ball and point of contact.
    const activePlayerIndex =
      this.gamePlayService.nearsetPlayerToBallTrajectory();
    const fielderDestinationPosition =
      this.gamePlayService.BallAndPlayerContactPoint();
    const fielderOrignalPosition =
      this.gamePlayService.fieldersPos()[activePlayerIndex];
    const fielderDirectionCoeffifientX =
      fielderDestinationPosition.x - fielderOrignalPosition.x > 0 ? 1 : -1;
    const fielderDirectionCoefficientY =
      fielderDestinationPosition.y - fielderOrignalPosition.y > 0 ? 1 : -1;
    //Moving the ball and fielder
    const interval = window.setInterval(() => {
      const { x, y } = this.ballCoord();
      const fielderCoord =
        this.gamePlayService.fieldersPos()[activePlayerIndex];
      if (x * x + y * y - R * R > 0) {
        // if ball goes out of ground return;
        clearInterval(interval);
        this.handleRunBatsman(true);
        this.gamePlayService.isBatsmanRunningAllowed.set(false);
        this.gamePlayService.boundry(
          ballSpeed >= flyingBallMinSpeed ? 6 : 4,
        );
        this.runScoredInCurrentDelivery.set(ballSpeed >= flyingBallMinSpeed ? 6 : 4)
        this.handleReset();
      }
      // if fielder caught the ball
      if (
        Math.abs(fielderCoord.x - x) < 5 &&
        Math.abs(fielderCoord.y - y) < 5
      ) {
        clearInterval(interval);
        //checking out as per ballSpeed
        if (ballSpeed >= flyingBallMaxSpeed) {
          this.gamePlayService.handleOut(
            'Catch Out!',
          );
          this.isWicketFellInCurrentDelivery.set(true);
          this.handleReset()
        } else {
          const timeout = setTimeout(() => {
            this.throwBallAtStump(this.ballCoord());
            clearTimeout(timeout);
          }, 200);
        }
        return;
      }
      // moving ball and fielder
      this.updateCoordOfBall(x, directionCoefficient, ballSpeed, slope, C);
      this.updateFielderCoord(
        fielderCoord,
        fielderDirectionCoeffifientX,
        fielderDirectionCoefficientY,
        fielderSpeed,
        fielderDestinationPosition,
        activePlayerIndex
      );
    }, 20);
    this.runningIntervalTokens.update(prev=>[...prev,interval])
  }

  public getBailsClassName(index: number): string {
    // index 0 1 for non striker and 2 3 for striker
    if (this.wicketFallEnd() === '') {
      return '';
    }
    const fallWicketEnd = this.wicketFallEnd();
    if (
      (fallWicketEnd === 'non-striker' && index === 0) ||
      (fallWicketEnd === 'striker' && index === 2)
    ) {
      return 'left';
    } else if (
      (fallWicketEnd === 'non-striker' && index === 1) ||
      (fallWicketEnd === 'striker' && index === 3)
    ) {
      return 'right';
    }
    return '';
  }

  private updateCoordOfBall(
    x: number,
    directionCoefficient: number,
    ballSpeed: number,
    slope: number,
    C: number
  ) {
    const newX = x + directionCoefficient * ballSpeed;
    const newY = slope * newX + C;
    this.ballCoord.set({ x: newX, y: newY });
  }

  private updateFielderCoord(
    fielderCoord: IPlayerPosition,
    fielderDirectionCoefficientX: number,
    fielderDirectionCoefficientY: number,
    fielderSpeed: number,
    fielderDestinationPosition: ICoord,
    activePlayerIndex: number
  ) {
    const newFielderX =
      fielderCoord.x + fielderDirectionCoefficientX * fielderSpeed;
    const newFielderY =
      fielderCoord.y + fielderDirectionCoefficientY * fielderSpeed;
    const playersCoords = [...this.gamePlayService.fieldersPos()];
    if (fielderCoord.x - fielderDestinationPosition.x <= fielderSpeed) {
      playersCoords[activePlayerIndex].x = fielderDestinationPosition.x;
    } else {
      playersCoords[activePlayerIndex].x = newFielderX;
    }
    if (fielderCoord.y - fielderDestinationPosition.y < fielderSpeed) {
      playersCoords[activePlayerIndex].y = fielderDestinationPosition.y;
    } else {
      playersCoords[activePlayerIndex].y = newFielderY;
    }
    this.gamePlayService.fieldersPos.set([...playersCoords]);
  }

  private handleReset(timeOutdration: number = 1000,countBall:boolean=true) {
    if(countBall){
      this.gamePlayService.totalBallFaced.update(prev=>prev+1);
    }
    this.gamePlayService.totalRunsScored.update(prev=>prev+this.runScoredInCurrentDelivery());
    if(this.isWicketFellInCurrentDelivery()){
      this.gamePlayService.wicketFallen.update(prev=>prev+1);
    }
    const timeout = setTimeout(() => {
      this.ballCoord.set(defaultBallCoord);
      this.gamePlayService.isBatsmanRunningAllowed.set(false);
      this.wicketFallEnd.set('');
      this.stumpsPosition.set(initialWicketsPos);
      this.isBatHitted.set(false);
      this.gamePlayService.fieldersPos.set(getPlayers());
      this.isBallThrown.set(false);
      this.runScoredInCurrentDelivery.set(0)
      this.batsmanCoord.set(defaultBatsmenCoord);
      this.isWicketFellInCurrentDelivery.set(false)
      const thorowBallWaitTimeout = setTimeout(()=>{
        this.throwBall();
        clearTimeout(thorowBallWaitTimeout);
      },1000)
      clearTimeout(timeout);
    }, timeOutdration);
  }

  private throwBallAtStump(ballCoord: ICoord) {
    const StrikerEndStumpPosition = { x: 0, y: 150 };
    const nonStrikerEndStumpPosition = { x: 0, y: -150 };
    const ballThrowSpeed = 5;
    const { x, y } =
      ballCoord.y > 0 ? StrikerEndStumpPosition : nonStrikerEndStumpPosition;
    const ballThrowDirectionCoefficient: number = x - ballCoord.x >= 0 ? 1 : -1;
    // p1 = wicketCoord(x,y) p2 = ballCoord
    const getNewYCoordForBall = (newX: number): number => {
      const y1 = ((ballCoord.y - y) * (newX - x)) / (ballCoord.x - x) + y;
      return y1;
    };

    const interval = window.setInterval(() => {
      let newX =
        this.ballCoord().x + ballThrowDirectionCoefficient * ballThrowSpeed;
      if (Math.abs(this.ballCoord().x - x) < ballThrowSpeed) {
        newX = x;
      }
      const newY = getNewYCoordForBall(newX);
      this.ballCoord.set({ x: newX, y: newY });
      if (newX === x && newY === y) {
        clearInterval(interval);
        this.isBallThrown.set(false);
        if (this.gamePlayService.batsmanRunningType() !=='none') {
          this.fallOfWicket(y < 0 ? 'non-striker' : 'striker');
          this.gamePlayService.screenMessage.set('Run Out')
        }else{
          this.gamePlayService.isBatsmanRunningAllowed.set(false);
          this.handleReset()
        }
      }
    },20);
    this.runningIntervalTokens.update(prev=>[...prev,interval])
  }

  private handleRunBatsman(abortRun:boolean = false) {

    if(abortRun){
      clearInterval(this.batsmanRunningIntervalToken());
      return;
    }
    const batsmanRunningSpeed = 4;
    const interval = window.setInterval(() => {
      if(!this.gamePlayService.isBatsmanRunningAllowed()) return;
      this.batsmanCoord.update((prev) => ({
        ...prev,
        y: prev.y + this.gamePlayService.batsmanRunningDirection() * batsmanRunningSpeed,
      }));
      if (Math.abs(this.batsmanCoord().y) > 130) {
        if(this.gamePlayService.batsmanRunningType()==='run'){
          this.runScoredInCurrentDelivery.update(prev=>prev+1);
        }
        this.gamePlayService.batsmanRunningType.set('none');
        this.batsmanCoord.set(defaultBatsmenCoord);
        this.gamePlayService.batsmanRunningDirection.set(1)
        clearInterval(interval);
      }
    }, 20);
    this.batsmanRunningIntervalToken.set(interval);
    this.runningIntervalTokens.update(prev=>[...prev,interval]);
  }

  ngOnDestroy(): void {
      window.removeEventListener('keydown', this.handleKeyDown.bind(this));
      this.runningIntervalTokens().forEach((i)=>{
        clearInterval(i);
      });
  }
}

const defaultBallCoord: ICoord = {
  x: 10,
  y: -120,
};

const defaultBatsmenCoord:ICoord = { x: -6, y: 130 }

interface IWicketPos {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}
type WicketEnd = 'striker' | 'non-striker';
const initialWicketsPos: IWicketPos[] = [
  //wickets and bails
  { x1: -6, y1: -150, x2: -6, y2: -180 }, //wickets
  { x1: 0, y1: -150, x2: 0, y2: -180 },
  { x1: 6, y1: -150, x2: 6, y2: -180 },
  { x1: -6, y1: 150, x2: -6, y2: 120 },
  { x1: 0, y1: 150, x2: 0, y2: 120 },
  { x1: 6, y1: 150, x2: 6, y2: 120 },
];
const initialBailsPos: IWicketPos[] = [
  { x1: -7, y1: -180, x2: 0, y2: -180 },
  { x1: 0, y1: -180, x2: 7, y2: -180 },
  { x1: -7, y1: 120, x2: 0, y2: 120 },
  { x1: 0, y1: 120, x2: 7, y2: 120 },
];
