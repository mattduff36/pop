import { Card, AIDifficulty, AIDecision, Player } from "./types";

export interface AIPersonality {
  name: string;
  colorBias: "red" | "black" | "none";
  riskTolerance: number; // 0-1, higher = more risky
  keepCardThreshold: number; // 0-1, higher = more likely to keep
  playAgainThreshold: number; // 0-1, higher = more likely to play again
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  remainingCards: number;
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
  private playCountThisTurn: number = 0; // Hidden limit: max 2 plays per turn

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
    const delay = 800 + Math.random() * 1200; // 800-2000ms
    const confidence = 0.5; // Always 50/50 for color

    return { choice, delay, confidence };
  }

  /**
   * Decide whether to keep the current card or change it
   */
  makeKeepOrChangeDecision(currentCard: Card, gameState?: GameState): AIDecision {
    const cardValue = currentCard.value;
    let keepProbability = this.personality.keepCardThreshold;
    
    // Strategic card value analysis - 7-8 are worst for higher/lower
    if (cardValue <= 2 || cardValue >= 13) {
      // Extreme cards (2, Ace) - very good, strong keep
      keepProbability += 0.5;
    } else if (cardValue <= 4 || cardValue >= 11) {
      // Very low/high cards (3-4, Jack-Queen) - good, likely keep
      keepProbability += 0.3;
    } else if (cardValue >= 7 && cardValue <= 8) {
      // Worst cards for higher/lower - strongly change
      keepProbability -= 0.4;
    } else if (cardValue >= 5 && cardValue <= 6 || cardValue >= 9 && cardValue <= 10) {
      // Moderate cards - slight preference to change
      keepProbability -= 0.2;
    }

    // Game state awareness - adjust based on position
    if (gameState) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const alivePlayers = gameState.players.filter(p => p.lives > 0);
      const myLives = currentPlayer.lives;
      const maxLives = Math.max(...alivePlayers.map(p => p.lives));
      const isLeading = myLives === maxLives;
      const isLastLife = myLives === 1;
      
      // If leading, be more conservative with risky cards
      if (isLeading && (cardValue >= 7 && cardValue <= 8)) {
        keepProbability -= 0.1;
      }
      
      // If behind and desperate, take more risks with bad cards
      if (!isLeading && alivePlayers.length > 2) {
        keepProbability += 0.1;
      }
      
      // If on last life, be more conservative
      if (isLastLife) {
        keepProbability += 0.2;
      }
    }

    // Difficulty-based decision quality
    let randomnessFactor = 0.1;
    if (this.difficulty === "easy") {
      randomnessFactor = 0.3; // More random decisions
    } else if (this.difficulty === "hard") {
      randomnessFactor = 0.05; // More consistent optimal play
    }
    
    keepProbability += (Math.random() - 0.5) * randomnessFactor;
    
    // Ensure probability stays within bounds
    keepProbability = Math.max(0.1, Math.min(0.9, keepProbability));
    
    const choice = Math.random() < keepProbability ? "Keep" : "Change";
    
    // Medium thinking time - considering card value
    const delay = 800 + Math.random() * 1200; // 800-2000ms
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
    let baseDelay = 1000; // Default delay
    if (cardValue <= 3 || cardValue >= 12) {
      // Easy decisions - quick
      baseDelay = 800;
    } else if (cardValue >= 6 && cardValue <= 9) {
      // Hard decisions - longer thinking
      baseDelay = 1500;
    }
    
    let randomDelay = 1000; // Default random range
    if (cardValue <= 3 || cardValue >= 12) {
      // Easy decisions - smaller random range
      randomDelay = 400;
    } else if (cardValue >= 6 && cardValue <= 9) {
      // Hard decisions - larger random range
      randomDelay = 1000;
    }
    
    const delay = baseDelay + Math.random() * randomDelay;
    const confidence = Math.abs(higherProbability - 0.5) * 2;

    return { choice, delay, confidence };
  }

  /**
   * Decide whether to Play again or Pass
   */
  makePlayOrPassDecision(currentCard: Card, playerLives: number, totalPlayers: number, gameState?: GameState): AIDecision {
    // Hidden rule: CPU can only play maximum 2 times per turn
    if (this.playCountThisTurn >= 2) {
      const delay = 800 + Math.random() * 1200;
      return { choice: "Pass", delay, confidence: 0.8 };
    }
    
    const cardValue = currentCard.value;
    
    // Hidden rule: CPU can only PLAY if card is one of the 2 highest or 2 lowest cards
    // (2, 3, King=13, Ace=14)
    const isPlayableCard = cardValue === 2 || cardValue === 3 || cardValue === 13 || cardValue === 14;
    if (!isPlayableCard) {
      const delay = 800 + Math.random() * 1200;
      return { choice: "Pass", delay, confidence: 0.7 };
    }
    
    let playProbability = this.personality.playAgainThreshold;
    
    // Calculate expected value of continuing vs passing
    let successProbability = 0.5; // Basic 50/50 for unknown cards
    
    // Better probability estimation based on card value
    if (cardValue <= 3) {
      successProbability = 0.7; // High chance next card is higher
    } else if (cardValue >= 12) {
      successProbability = 0.7; // High chance next card is lower
    } else if (cardValue >= 4 && cardValue <= 6) {
      successProbability = 0.6; // Decent chance
    } else if (cardValue >= 9 && cardValue <= 11) {
      successProbability = 0.6; // Decent chance
    } else if (cardValue >= 7 && cardValue <= 8) {
      successProbability = 0.5; // True coin flip - worst position
    }
    
    // Expected value calculation
    const continueValue = successProbability * 1.0 + (1 - successProbability) * (-1.0);
    
    // Game state awareness
    if (gameState) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const alivePlayers = gameState.players.filter(p => p.lives > 0);
      const myLives = currentPlayer.lives;
      const maxLives = Math.max(...alivePlayers.map(p => p.lives));
      const isLeading = myLives === maxLives;
      const turnsToWait = alivePlayers.length - 1;
      
      // Position-based strategy
      if (isLeading) {
        // Leading player - more conservative, protect lead
        playProbability -= 0.2;
      } else if (myLives < maxLives - 1) {
        // Far behind - need to take risks
        playProbability += 0.3;
      }
      
      // Turn order consideration
      if (turnsToWait > 3) {
        // Long wait if pass - more likely to play
        playProbability += 0.15;
      }
      
      // Endgame strategy
      if (alivePlayers.length === 2) {
        // Head-to-head - adjust based on lives
        if (myLives > alivePlayers.find(p => p !== currentPlayer)!.lives) {
          playProbability -= 0.2; // Conservative when ahead
        } else {
          playProbability += 0.2; // Aggressive when behind
        }
      }
    }

    // Life-based risk adjustment
    if (playerLives === 1) {
      // Last life - much more conservative
      playProbability -= 0.4;
    } else if (playerLives >= 3) {
      // Multiple lives - can afford risks
      playProbability += 0.2;
    }

    // Card value specific adjustments
    if (cardValue >= 7 && cardValue <= 8) {
      // Worst cards - generally pass unless desperate
      playProbability -= 0.2;
    } else if (cardValue <= 3 || cardValue >= 12) {
      // Best cards - more likely to continue
      playProbability += 0.1;
    }

    // Difficulty-based decision quality
    if (this.difficulty === "easy") {
      // Easy AI makes more random decisions
      playProbability += (Math.random() - 0.5) * 0.4;
    } else if (this.difficulty === "hard") {
      // Hard AI optimizes based on expected value
      if (continueValue > 0) {
        playProbability += 0.2;
      } else {
        playProbability -= 0.2;
      }
    }

    // Add personality risk tolerance
    const riskAdjustment = (this.personality.riskTolerance - 0.5) * 0.3;
    playProbability += riskAdjustment;

    // Ensure probability stays within bounds
    playProbability = Math.max(0.1, Math.min(0.9, playProbability));

    const choice = Math.random() < playProbability ? "Play" : "Pass";
    
    // Track play count for hidden 2-play limit
    if (choice === "Play") {
      this.playCountThisTurn++;
    }
    
    // Quick decision - this is about risk management
    const delay = 800 + Math.random() * 1200; // 800-2000ms
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

  /**
   * Reset play count when turn changes (hidden rule enforcement)
   */
  resetPlayCount(): void {
    this.playCountThisTurn = 0;
  }
} 