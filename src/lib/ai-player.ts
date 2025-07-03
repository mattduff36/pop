import { Card, AIDifficulty, AIDecision } from "./types";

export interface AIPersonality {
  name: string;
  colorBias: "red" | "black" | "none";
  riskTolerance: number; // 0-1, higher = more risky
  keepCardThreshold: number; // 0-1, higher = more likely to keep
  playAgainThreshold: number; // 0-1, higher = more likely to play again
}

// Average player personality (can be extended for different difficulties)
const DEFAULT_PERSONALITY: AIPersonality = {
  name: "average",
  colorBias: "none",
  riskTolerance: 0.5,
  keepCardThreshold: 0.4,
  playAgainThreshold: 0.6,
};

// Difficulty-based personality adjustments
const DIFFICULTY_MODIFIERS: Record<AIDifficulty, Partial<AIPersonality>> = {
  easy: {
    riskTolerance: 0.3,
    keepCardThreshold: 0.2,
    playAgainThreshold: 0.4,
  },
  medium: {
    riskTolerance: 0.5,
    keepCardThreshold: 0.4,
    playAgainThreshold: 0.6,
  },
  hard: {
    riskTolerance: 0.7,
    keepCardThreshold: 0.6,
    playAgainThreshold: 0.8,
  },
};

export class AIPlayer {
  private personality: AIPersonality;
  private difficulty: AIDifficulty;

  constructor(difficulty: AIDifficulty = "medium") {
    this.difficulty = difficulty;
    this.personality = {
      ...DEFAULT_PERSONALITY,
      ...DIFFICULTY_MODIFIERS[difficulty],
    };
  }

  /**
   * Decide between Red or Black
   */
  makeColorGuess(): AIDecision {
    const choices = ["Red", "Black"];
    let choice: string;
    
    if (this.personality.colorBias === "red") {
      choice = Math.random() < 0.7 ? "Red" : "Black";
    } else if (this.personality.colorBias === "black") {
      choice = Math.random() < 0.7 ? "Black" : "Red";
    } else {
      choice = choices[Math.floor(Math.random() * choices.length)];
    }

    // Quick decision - color guessing is straightforward
    const delay = 800 + Math.random() * 1200; // 800-2000ms (back to original)
    const confidence = 0.5; // Always 50/50 for color

    return { choice, delay, confidence };
  }

  /**
   * Decide whether to keep the current card or change it
   */
  makeKeepOrChangeDecision(currentCard: Card): AIDecision {
    const cardValue = currentCard.value;
    let keepProbability = this.personality.keepCardThreshold;
    
    // Adjust based on card value
    if (cardValue <= 3 || cardValue >= 12) {
      // Very low or very high cards - more likely to keep
      keepProbability += 0.3;
    } else if (cardValue >= 6 && cardValue <= 9) {
      // Middle cards - more likely to change
      keepProbability -= 0.2;
    }

    // Add some randomness
    keepProbability += (Math.random() - 0.5) * 0.2;
    
    const choice = Math.random() < keepProbability ? "Keep" : "Change";
    
    // Medium thinking time - considering card value
    const delay = 1200 + Math.random() * 1800; // 1200-3000ms (back to original)
    const confidence = Math.abs(keepProbability - 0.5) * 2; // 0-1 scale

    return { choice, delay, confidence };
  }

  /**
   * Decide Higher or Lower based on current card
   */
  makeHigherLowerGuess(currentCard: Card): AIDecision {
    const cardValue = currentCard.value;
    let higherProbability = 0.5;
    
    // Basic probability based on card value
    if (cardValue <= 3) {
      // Very low cards - much more likely to go higher
      higherProbability = 0.8;
    } else if (cardValue <= 6) {
      // Low cards - likely to go higher
      higherProbability = 0.7;
    } else if (cardValue <= 9) {
      // Middle cards - slight bias based on exact value
      higherProbability = 0.5 - (cardValue - 7.5) * 0.1;
    } else if (cardValue <= 12) {
      // High cards - likely to go lower
      higherProbability = 0.3;
    } else {
      // Very high cards (Ace) - much more likely to go lower
      higherProbability = 0.2;
    }

    // Apply personality risk tolerance
    const riskAdjustment = (this.personality.riskTolerance - 0.5) * 0.2;
    higherProbability += riskAdjustment;

    // Ensure probability stays within bounds
    higherProbability = Math.max(0.1, Math.min(0.9, higherProbability));

    const choice = Math.random() < higherProbability ? "Higher" : "Lower";
    
    // Variable thinking time based on card difficulty
    let baseDelay = 1500; // back to original
    if (cardValue <= 3 || cardValue >= 12) {
      // Easy decisions - quick
      baseDelay = 800; // back to original
    } else if (cardValue >= 6 && cardValue <= 9) {
      // Hard decisions - longer thinking
      baseDelay = 2500; // back to original
    }
    
    const delay = baseDelay + Math.random() * 1500; // back to original
    const confidence = Math.abs(higherProbability - 0.5) * 2;

    return { choice, delay, confidence };
  }

  /**
   * Decide whether to Play again or Pass
   */
  makePlayOrPassDecision(currentCard: Card, playerLives: number, totalPlayers: number): AIDecision {
    let playProbability = this.personality.playAgainThreshold;
    
    // Adjust based on current lives
    if (playerLives === 1) {
      // Last life - be more conservative
      playProbability -= 0.3;
    } else if (playerLives >= 3) {
      // Multiple lives - can be more aggressive
      playProbability += 0.2;
    }

    // Adjust based on card value (riskiness of continuing)
    const cardValue = currentCard.value;
    if (cardValue <= 3 || cardValue >= 12) {
      // Extreme cards - harder to predict next card
      playProbability -= 0.1;
    } else if (cardValue >= 6 && cardValue <= 9) {
      // Middle cards - more options for next card
      playProbability += 0.1;
    }

    // Consider number of players (more players = more turns to wait)
    if (totalPlayers > 4) {
      playProbability += 0.1; // Take advantage of turn when you have it
    }

    // Add personality risk tolerance
    const riskAdjustment = (this.personality.riskTolerance - 0.5) * 0.3;
    playProbability += riskAdjustment;

    // Ensure probability stays within bounds
    playProbability = Math.max(0.1, Math.min(0.9, playProbability));

    const choice = Math.random() < playProbability ? "Play" : "Pass";
    
    // Quick decision - this is about risk management
    const delay = 1000 + Math.random() * 1500; // 1000-2500ms (back to original)
    const confidence = Math.abs(playProbability - 0.5) * 2;

    return { choice, delay, confidence };
  }

  /**
   * Get a thinking message for the AI player
   */
  getThinkingMessage(decisionType: string): string {
    const messages = {
      color: ["Thinking...", "Hmm...", "Let me see...", "Red or black..."],
      keep: ["Keep or change?", "Considering...", "This card...", "Hmm..."],
      higher: ["Higher or lower?", "Thinking...", "Let me think...", "Difficult choice..."],
      play: ["Play or pass?", "Considering options...", "Risk it?", "Hmm..."],
    };

    const messageArray = messages[decisionType as keyof typeof messages] || messages.color;
    return messageArray[Math.floor(Math.random() * messageArray.length)];
  }

  /**
   * Get difficulty level
   */
  getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  /**
   * Update difficulty (for future enhancement)
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
    this.personality = {
      ...DEFAULT_PERSONALITY,
      ...DIFFICULTY_MODIFIERS[difficulty],
    };
  }
} 