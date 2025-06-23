export interface IPlayerPosition {
  name: string;
  x: number; // Calculated x position
  y: number; // Calculated y position
}

const players: IPlayerPosition[] = [
  { name: 'Bowler', x: 15.0, y: -210.0 },
  { name: 'Wicket Keeper', x: 0.0, y: 165.0 },
  { name: 'First Slip', x: -32.5, y: 185.15 },
  { name: 'Second Slip', x: -180.3, y: 180.3 },
  { name: 'Third Man', x: -420.0, y: 0.0 },
  { name: 'Point', x: -311.76, y: -180.0 },
  { name: 'Cover', x: -150.0, y: -259.8 },
  { name: 'Mid-on', x: 100.0, y: 283.0 },
  { name: 'Midwicket', x: 259.8, y: 150.0 },
  { name: 'Square leg', x: 360.0, y: 0.0 },
  { name: 'Fine leg', x: 275.76, y: -275.76 },
];


const getPlayers = (): IPlayerPosition[] => {
  /*
  *crreating deep copy of player so that original array remain unaltered 
  *Spreading operator may create an new array but the reference og object is still same
  */
  const fieldersPositions = players.map(p=>({...p}));
  return fieldersPositions;
};

export default getPlayers;


export interface IFallOfWicket{
  wicket:number,
  runs:number,
  overs:string
}
