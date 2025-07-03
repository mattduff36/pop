export type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "Jack"
  | "Queen"
  | "King"
  | "Ace";

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export interface Player {
  id: string;
  name: string;
  lives: number;
  isComputer: boolean;
}

export type AIDifficulty = "easy" | "medium" | "hard";

export interface AIDecision {
  choice: string;
  delay: number;
  confidence: number;
} 