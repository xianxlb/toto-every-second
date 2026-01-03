export interface TotoDraw {
  type: "toto";
  numbers: number[];
  additional: number;
}

export interface TotoResult {
  id: number;
  lottery_type: "toto";
  score: number;
  guesses: TotoDraw[];
  draw: TotoDraw;
  timestamp: Date | string;
}
