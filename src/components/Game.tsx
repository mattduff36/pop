"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Player } from "@/lib/types";
import { createDeck, shuffleDeck } from "@/lib/game";
import GameSetup from "./GameSetup";
import PlayerList from "./PlayerList";
import { getCardImageSrc } from "@/lib/utils";
import useAudioManager from "@/hooks/useAudioManager";
import { useMobileAudioManager } from "@/hooks/useMobileAudioManager";
import { detectDeviceCapabilities, getPerformanceSettings } from "@/lib/device-performance";
import { useViewportSize } from "@/hooks/useAssetPreloader";
import { AIPlayer } from "@/lib/ai-player";

type GameState =
  | "SETUP"
  | "AWAITING_COLOUR_GUESS"
  | "AWAITING_KEEP_OR_CHANGE"
  | "AWAITING_HIGHER_LOWER"
  | "PLAY_OR_PASS"
  | "SHOWING_RESULT"
  | "GAME_OVER"
  | "CREDITS";

export default function Game() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [cardKey, setCardKey] = useState<number>(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [heartPopAnimation, setHeartPopAnimation] = useState<{
    show: boolean;
    playerIndex: number;
    startPosition: { x: number; y: number };
  } | null>(null);
  const [turnOwnerIndex, setTurnOwnerIndex] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Welcome to POP! Setup the game to start.");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [titleFeedback, setTitleFeedback] = useState<'correct' | 'incorrect' | 'idle'>('idle');
  const [failureReason, setFailureReason] = useState<'INCORRECT_GUESS' | 'SAME_VALUE_TIE' | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [winnerName, setWinnerName] = useState<string>("");
  const [isLandscape, setIsLandscape] = useState(false);
  const [aiPlayers, setAiPlayers] = useState<Map<string, AIPlayer>>(new Map());
  const [aiThinking, setAiThinking] = useState<boolean>(false);
  const [aiTimeout, setAiTimeout] = useState<NodeJS.Timeout | null>(null);
  const [cardJustChanged, setCardJustChanged] = useState(false);
  const currentCardRef = useRef<Card | null>(null);

  const playerScrollContainerRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep currentCardRef in sync with currentCard state
  useEffect(() => {
    currentCardRef.current = currentCard;
  }, [currentCard]);

  // ALL memoized values MUST be at the top before any other logic  
  const initialDeck = useMemo(() => createDeck(), []);
  const activePlayers = useMemo(() => players.filter(p => p.lives > 0), [players]);
  const capabilities = useMemo(() => detectDeviceCapabilities(), []);
  const settings = useMemo(() => getPerformanceSettings(capabilities), [capabilities]);
  const viewport = useViewportSize();

  // Choose appropriate audio manager based on device capabilities (MUST be before any early returns)
  const mobileAudio = useMobileAudioManager(isMuted);
  const desktopAudio = useAudioManager(isMuted);
  const { playSound, preloadSound } = capabilities.isMobile ? mobileAudio : desktopAudio;
  const titleAnimationClass = useMemo(() => {
    if (titleFeedback === 'idle') return '';
    if (capabilities.shouldReduceEffects) {
      return titleFeedback === 'correct' ? 'simple-correct' : 'simple-incorrect';
    }
    return titleFeedback === 'correct' ? 'mobile-correct' : 'mobile-incorrect';
  }, [titleFeedback, capabilities.shouldReduceEffects]);
  const heartParticleCount = useMemo(() => settings.particleCount.hearts, [settings.particleCount.hearts]);

  // Check if running in PWA mode
  const isPWA = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  }, []);

  // Check if should show install button (mobile browser, not PWA)
  const shouldShowInstallButton = useMemo(() => {
    // Show if mobile AND not PWA (even without installPrompt for Safari fallback)
    return capabilities.isMobile && !isPWA;
  }, [capabilities.isMobile, isPWA]);

  // All hooks must be called before any early returns
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000); // Simulate loading time
    return () => clearTimeout(timer);
  }, []);

  // Preload sounds on component mount
  useEffect(() => {
    preloadSound('/sounds/button-click.mp3', 3, 0.5);
    preloadSound('/sounds/card-flip.mp3', 3, 0.5);
    preloadSound('/sounds/correct-guess.mp3', 3, 0.5);
    preloadSound('/sounds/incorrect-guess.mp3', 3, 0.5);
    preloadSound('/sounds/game-start.mp3', 3, 0.6);
    preloadSound('/sounds/game-win.mp3', 3, 0.7);
  }, [preloadSound]);

  // Sound player functions
  const playButtonSound = useCallback(() => playSound('/sounds/button-click.mp3'), [playSound]);
  const playCardFlipSound = useCallback(() => playSound('/sounds/card-flip.mp3'), [playSound]);
  const playCorrectSound = useCallback(() => playSound('/sounds/correct-guess.mp3'), [playSound]);
  const playIncorrectSound = useCallback(() => playSound('/sounds/incorrect-guess.mp3'), [playSound]);
  const playGameStartSound = useCallback(() => playSound('/sounds/game-start.mp3'), [playSound]);
  const playGameWinSound = useCallback(() => playSound('/sounds/game-win.mp3'), [playSound]);

  const handleTitleAnimationComplete = useCallback(() => {
    setTitleFeedback('idle');
  }, []);



  useEffect(() => {
    // PWA Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('Service Worker registered with scope:', registration.scope))
        .catch(error => console.error('Service Worker registration failed:', error));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);



  useEffect(() => {
    // Ensure player refs are created
    playerRefs.current = playerRefs.current.slice(0, players.length);
  }, [players]);

  useEffect(() => {
    if (playerScrollContainerRef.current && playerRefs.current[currentPlayerIndex]) {
      playerRefs.current[currentPlayerIndex]!.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentPlayerIndex, players]);

  // Handle orientation change for mobile devices
  useEffect(() => {
    // Only apply landscape restriction to mobile devices
    if (!capabilities.isMobile) return;

    const checkOrientation = () => {
      // Check both screen orientation API and window dimensions
      const isCurrentlyLandscape = 
        (screen.orientation && Math.abs(screen.orientation.angle) === 90) ||
        (window.innerWidth > window.innerHeight && window.innerWidth > 768);
      
      setIsLandscape(isCurrentlyLandscape);
    };

    // Initial check
    checkOrientation();

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(checkOrientation, 100);
    };

    // Listen to both orientation and resize events
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [capabilities.isMobile]);



  const handleGameStart = useCallback((players: Player[]) => {
    playGameStartSound();
    setPlayers(players);
    setDeck(shuffleDeck([...initialDeck]));
    setCurrentCard(null);
    
    // Initialize AI players
    const aiPlayerMap = new Map<string, AIPlayer>();
    players.forEach(player => {
      if (player.isComputer) {
        aiPlayerMap.set(player.id, new AIPlayer("medium"));
      }
    });
    setAiPlayers(aiPlayerMap);
    
    // Always start with the first human player
    const startingPlayerIndex = players.findIndex(player => !player.isComputer);
    // If no human players found, start with first player
    const actualStartingIndex = startingPlayerIndex >= 0 ? startingPlayerIndex : 0;
    
    setCurrentPlayerIndex(actualStartingIndex);
    setGameStarted(true);
    setGameState("AWAITING_COLOUR_GUESS");
    setMessage(`${players[actualStartingIndex].name}, is the first card Red or Black?`);
  }, [playGameStartSound, initialDeck]);

  const handleInstallClick = useCallback(() => {
    playButtonSound();
    
    if (installPrompt) {
      // Chrome/Edge: Use native install prompt
      installPrompt.prompt();
    } else {
      // Safari/other browsers: Show manual install instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const instructions = isIOS 
        ? "To install: Tap the Share button (⬆️) at the bottom of your screen, then tap 'Add to Home Screen'"
        : "To install: Tap the menu button (⋮) and look for 'Add to Home Screen' or 'Install App'";
      
      alert(instructions);
    }
  }, [installPrompt, playButtonSound]);

  const drawCard = (playSound: boolean = true) => {
    if (playSound) {
      // Small delay to let button sound play first
      setTimeout(() => playCardFlipSound(), 50);
    }
    if (deck.length > 0) {
      const newDeck = [...deck];
      const card = newDeck.pop()!;
      setDeck(newDeck);
      return card;
    } else {
      setMessage("Reshuffling the deck...");
      const newShuffledDeck = shuffleDeck(discardPile);
      setDiscardPile([]);
      const card = newShuffledDeck.pop()!;
      setDeck(newShuffledDeck);
      return card;
    }
  };

  const smoothCardTransition = (newCard: Card) => {
    console.log('smoothCardTransition called with newCard:', newCard);
    console.log('Current card before transition:', currentCard);
    
    // If there's a current card, move it to discard pile first
    if (currentCard) {
      setDiscardPile(prev => [...prev, currentCard]);
    }
    
    // Adaptive delay based on device capabilities
    const delay = capabilities.shouldReduceEffects ? 100 : 150;
    console.log('Setting card transition delay:', delay);
    setTimeout(() => {
      console.log('Card transition executing - setting currentCard to:', newCard);
      setCurrentCard(newCard);
      currentCardRef.current = newCard; // Update ref immediately
      setCardKey(prev => prev + 1);
      console.log('Card transition completed, ref updated to:', currentCardRef.current);
    }, delay);
  };

  const triggerHeartLossAnimation = () => {
    const playerElement = playerRefs.current[currentPlayerIndex];
    if (playerElement) {
      const rect = playerElement.getBoundingClientRect();
      const heartPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height * 0.7 // Position near where hearts are displayed
      };
      
      setHeartPopAnimation({
        show: true,
        playerIndex: currentPlayerIndex,
        startPosition: heartPosition
      });
    }
  };

  const advanceToNextPlayer = useCallback((playersArray = players) => {
    let nextPlayerIndex = (currentPlayerIndex + 1) % playersArray.length;
    // Skip players who are out of lives
    while (playersArray[nextPlayerIndex].lives <= 0) {
      nextPlayerIndex = (nextPlayerIndex + 1) % playersArray.length;
    }
    return nextPlayerIndex;
  }, [currentPlayerIndex, players]);

  const handleColourGuess = useCallback((guess: "Red" | "Black") => {
    console.log('handleColourGuess called with guess:', guess);
    console.log('Current player making guess:', players[currentPlayerIndex]);
    
    playButtonSound();
    const nextCard = drawCard();
    if (!nextCard) return;

    const isRed = nextCard.suit === "Hearts" || nextCard.suit === "Diamonds";
    const isGuessCorrect = (guess === "Red" && isRed) || (guess === "Black" && !isRed);
    
    console.log('Card drawn:', nextCard);
    console.log('Is guess correct?', isGuessCorrect);
    
    smoothCardTransition(nextCard);

    if (isGuessCorrect) {
      console.log('Correct guess - same player keeps turn');
      // Small delay to let card flip sound play first
      setTimeout(() => playCorrectSound(), 100);
      // Shorter delay for CPU turns, longer for human turns
      const messageDelay = players[currentPlayerIndex]?.isComputer ? 200 : 800;
      setTimeout(() => {
        setGameState("AWAITING_KEEP_OR_CHANGE");
        setMessage(`Correct! The card is the ${nextCard.rank} of ${nextCard.suit}. ${players[currentPlayerIndex].name}, keep it or change?`);
      }, messageDelay);
    } else {
      console.log('Incorrect guess - advancing to next player');
      // Small delay to let card flip sound play first (no life lost on Red/Black incorrect)
      setTimeout(() => playIncorrectSound(), 100);
      setTurnOwnerIndex(currentPlayerIndex);
      const nextPlayerIndex = advanceToNextPlayer();
      console.log('Turn advancing from player', currentPlayerIndex, 'to player', nextPlayerIndex);
      console.log('Next player will be:', players[nextPlayerIndex]);
      setCurrentPlayerIndex(nextPlayerIndex);
      
      // Shorter delay for CPU turns, longer for human turns
      const messageDelay = players[nextPlayerIndex]?.isComputer ? 200 : 800;
      setTimeout(() => {
        setGameState("AWAITING_KEEP_OR_CHANGE");
        setMessage(`Incorrect! It was the ${nextCard.rank} of ${nextCard.suit}. ${players[nextPlayerIndex].name}, you decide: keep or change?`);
      }, messageDelay);
    }
  }, [playButtonSound, drawCard, smoothCardTransition, playCorrectSound, playIncorrectSound, players, currentPlayerIndex, advanceToNextPlayer]);

  const checkForWinner = useCallback((playersArray = players) => {
    const activePlayersArray = playersArray.filter(p => p.lives > 0);
    if (activePlayersArray.length === 1) {
        setWinnerName(activePlayersArray[0].name);
        setGameState("GAME_OVER");
        setMessage(`Game Over! ${activePlayersArray[0].name} is the winner!`);
        // Play game win sound with a small delay to let other sounds finish
        setTimeout(() => playGameWinSound(), 200);
        return true;
    }
    return false;
  }, [players, playGameWinSound]);

  const processTurnEnd = useCallback(() => {
    if (!failureReason) return;

    const newPlayers = [...players];
    const playerWhoGuessed = newPlayers[currentPlayerIndex];
    playerWhoGuessed.lives--;
    setPlayers(newPlayers);

    if (checkForWinner(newPlayers)) return;

    const lostLastLife = playerWhoGuessed.lives <= 0;
    // Turn only advances if the player has lost their last life
    const shouldAdvance = lostLastLife;

    let messagePrefix = lostLastLife 
        ? `${playerWhoGuessed.name} is out of lives!`
        : `${playerWhoGuessed.name} loses a life.`;

    if (shouldAdvance) {
      const nextPlayerIndex = advanceToNextPlayer(newPlayers);
      setCurrentPlayerIndex(nextPlayerIndex);
      setMessage(`${messagePrefix} It's now ${newPlayers[nextPlayerIndex].name}'s turn. Red or Black?`);
    } else {
      setMessage(`${messagePrefix} It's your turn again. Red or Black?`);
    }
    
    setGameState("AWAITING_COLOUR_GUESS");
    setFailureReason(null);
  }, [failureReason, players, currentPlayerIndex, checkForWinner, advanceToNextPlayer]);

  useEffect(() => {
    if (gameState === 'SHOWING_RESULT') {
        const timeoutId = setTimeout(() => {
            processTurnEnd();
        }, 2500); 
        return () => clearTimeout(timeoutId);
    }
  }, [gameState, processTurnEnd]);

  const handleKeepCard = useCallback(() => {
    playButtonSound();
    setCardJustChanged(false); // Reset flag since we're keeping the current card
    // Shorter delay for CPU turns, longer for human turns
    const nextPlayerIndex = turnOwnerIndex !== null ? turnOwnerIndex : currentPlayerIndex;
    const messageDelay = players[nextPlayerIndex]?.isComputer ? 200 : 800;
    setTimeout(() => {
      setGameState("AWAITING_HIGHER_LOWER");
      if (turnOwnerIndex !== null) {
        setCurrentPlayerIndex(turnOwnerIndex);
        setMessage(`Card is ${currentCard?.rank} of ${currentCard?.suit}. ${players[turnOwnerIndex].name}, your turn. Higher or Lower?`);
        setTurnOwnerIndex(null);
      } else {
        setMessage(`Card is ${currentCard?.rank} of ${currentCard?.suit}. Higher or Lower?`);
      }
    }, messageDelay);
  }, [playButtonSound, turnOwnerIndex, currentCard, players, currentPlayerIndex]);

  const handleChangeCard = useCallback(() => {
    playButtonSound();
    const newCard = drawCard();
    if (!newCard) return;

    setCardJustChanged(true);
    smoothCardTransition(newCard);
    
    // Shorter delay for CPU turns, longer for human turns
    const nextPlayerIndex = turnOwnerIndex !== null ? turnOwnerIndex : currentPlayerIndex;
    const messageDelay = players[nextPlayerIndex]?.isComputer ? 200 : 800;
    setTimeout(() => {
      setGameState("AWAITING_HIGHER_LOWER");

      if (turnOwnerIndex !== null) {
        setCurrentPlayerIndex(turnOwnerIndex);
        setMessage(`New card is ${newCard.rank} of ${newCard.suit}. ${players[turnOwnerIndex].name}, your turn. Higher or Lower?`);
        setTurnOwnerIndex(null);
      } else {
        setMessage(`New card is ${newCard.rank} of ${newCard.suit}. Higher or Lower?`);
      }
    }, messageDelay);
  }, [playButtonSound, drawCard, smoothCardTransition, turnOwnerIndex, players, currentPlayerIndex]);

  const handleHigherLowerGuess = (guess: 'Higher' | 'Lower') => {
    playButtonSound();
    const previousCard = currentCard;
    if (!previousCard) return;

    const newCard = drawCard();
    if (!newCard) return;

    let correct = false;
    let reason = "";

    if (newCard.value === previousCard.value) {
        correct = false;
        reason = `Same card value! It's the ${newCard.rank} of ${newCard.suit}.`;
        setFailureReason('SAME_VALUE_TIE');
        // Trigger heart animation for same value tie (life loss)
        triggerHeartLossAnimation();
    } else {
        if (guess === 'Higher') {
            correct = newCard.value > previousCard.value;
        } else { // Lower
            correct = newCard.value < previousCard.value;
        }
        reason = correct 
            ? `Correct! It's the ${newCard.rank} of ${newCard.suit}. Play again or Pass?` 
            : `Incorrect! It was the ${newCard.rank} of ${newCard.suit}.`;
        if (!correct) {
          setFailureReason('INCORRECT_GUESS');
          // Trigger heart animation for incorrect guess (life loss)
          triggerHeartLossAnimation();
        }
    }
    
    smoothCardTransition(newCard);
    
    // Shorter delay for CPU turns, longer for human turns
    const messageDelay = players[currentPlayerIndex]?.isComputer ? 200 : 800;
    setTimeout(() => {
      setMessage(reason);
      
      if (correct) {
        // Small delay to let card flip sound play first
        setTimeout(() => {
          playCorrectSound();
          setTitleFeedback('correct');
        }, 100);
        setGameState("PLAY_OR_PASS");
      } else {
        // For both incorrect guesses and same value ties, play sound with delay to sync with heart animation
        setTimeout(() => {
          playIncorrectSound();
          setTitleFeedback('incorrect');
        }, 200);
        setGameState("SHOWING_RESULT");
      }
    }, messageDelay);
  };

  const handlePlay = useCallback(() => {
    playButtonSound();
    // Shorter delay for CPU turns, longer for human turns
    const messageDelay = players[currentPlayerIndex]?.isComputer ? 200 : 800;
    setTimeout(() => {
      setGameState("AWAITING_HIGHER_LOWER");
      setMessage(`Card is ${currentCard?.rank}. Higher or Lower?`);
    }, messageDelay);
  }, [playButtonSound, currentCard, players, currentPlayerIndex]);

  const handlePass = useCallback(() => {
    playButtonSound();
    const nextPlayerIndex = advanceToNextPlayer();
    setCurrentPlayerIndex(nextPlayerIndex);
    // Shorter delay for CPU turns, longer for human turns
    const messageDelay = players[nextPlayerIndex]?.isComputer ? 200 : 800;
    setTimeout(() => {
      setGameState("AWAITING_HIGHER_LOWER");
      setMessage(`${players[nextPlayerIndex].name}, your turn. Higher or lower than ${currentCard?.rank}?`);
    }, messageDelay);
  }, [playButtonSound, advanceToNextPlayer, players, currentCard]);

  // AI Logic Functions
  const isCurrentPlayerAI = useCallback(() => {
    return players[currentPlayerIndex]?.isComputer || false;
  }, [players, currentPlayerIndex]);

  const clearAITimeout = useCallback(() => {
    if (aiTimeout) {
      console.log('Clearing AI timeout');
      clearTimeout(aiTimeout);
      setAiTimeout(null);
    }
  }, [aiTimeout]);

  // Use a ref to avoid dependency issues
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const clearAITimeoutRef = useCallback(() => {
    if (aiTimeoutRef.current) {
      console.log('Clearing AI timeout (ref)');
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
      setAiTimeout(null);
    }
  }, []);

  const handleAIDecision = useCallback((decision: string, delay: number, callback: () => void, decisionMessage?: string) => {
    console.log(`AI Decision: ${decision}, Delay: ${delay}ms`);
    clearAITimeoutRef();
    setAiThinking(true);
    
    const timeout = setTimeout(() => {
      console.log(`AI decision made: ${decision}, showing decision to user`);
      setAiThinking(false);
      
      // Show the decision message if provided
      if (decisionMessage) {
        setMessage(decisionMessage);
      }
      
      // Add delay for user to read the decision before executing
      const displayDelay = 1500 + Math.random() * 1000; // 1.5-2.5 seconds to read decision
      console.log(`AI decision display delay: ${displayDelay}ms`);
      
      const executeTimeout = setTimeout(() => {
        console.log(`AI executing decision: ${decision}`);
        aiTimeoutRef.current = null;
        setAiTimeout(null);
        try {
          callback();
        } catch (error) {
          console.error('Error executing AI decision:', error);
        }
      }, displayDelay);
      
      aiTimeoutRef.current = executeTimeout;
      setAiTimeout(executeTimeout);
    }, delay);
    
    console.log('Setting AI timeout:', timeout);
    aiTimeoutRef.current = timeout;
    setAiTimeout(timeout);
  }, [clearAITimeoutRef]);

  const processAIColorGuess = useCallback(() => {
    if (!isCurrentPlayerAI()) return;
    
    const currentPlayer = players[currentPlayerIndex];
    const aiPlayer = aiPlayers.get(currentPlayer.id);
    
    if (aiPlayer) {
      const decision = aiPlayer.makeColorGuess();
      const thinkingMessage = `${currentPlayer.name} is thinking... ${aiPlayer.getThinkingMessage("color")}`;
      setMessage(thinkingMessage);
      
      handleAIDecision(decision.choice, decision.delay, () => {
        handleColourGuess(decision.choice as "Red" | "Black");
      }, `${currentPlayer.name} guesses ${decision.choice}!`);
    }
  }, [isCurrentPlayerAI, players, currentPlayerIndex, aiPlayers, handleAIDecision, handleColourGuess]);

  const processAIKeepOrChange = useCallback(() => {
    console.log('processAIKeepOrChange called');
    console.log('currentCard (state):', currentCard);
    console.log('currentCard (ref):', currentCardRef.current);
    console.log('currentPlayerIndex:', currentPlayerIndex);
    console.log('turnOwnerIndex:', turnOwnerIndex);
    console.log('players[currentPlayerIndex]:', players[currentPlayerIndex]);
    console.log('turnOwnerIndex player:', turnOwnerIndex !== null ? players[turnOwnerIndex] : 'null');
    
    const cardToUse = currentCardRef.current;
    if (!cardToUse) {
      console.log('No current card in ref, returning - this should not happen after delay fix');
      return;
    }
    
    // Determine who should make the keep/change decision
    // If turnOwnerIndex is set, that player made the guess and someone else makes the decision
    // If turnOwnerIndex is null, the current player made the guess and makes the decision
    const decisionMakerIndex = currentPlayerIndex;
    const decisionMaker = players[decisionMakerIndex];
    
    console.log('decisionMakerIndex:', decisionMakerIndex);
    console.log('decisionMaker:', decisionMaker);
    console.log('Is decision maker AI?', decisionMaker?.isComputer);
    
    // Check if the decision maker is AI
    if (!decisionMaker?.isComputer) {
      console.log('Decision maker is not AI, returning');
      return;
    }
    
    const aiPlayer = aiPlayers.get(decisionMaker.id);
    console.log('aiPlayer found:', !!aiPlayer);
    
    if (aiPlayer) {
      const decision = aiPlayer.makeKeepOrChangeDecision(cardToUse);
      const thinkingMessage = `${decisionMaker.name} is thinking... ${aiPlayer.getThinkingMessage("keep")}`;
      console.log('AI decision:', decision);
      setMessage(thinkingMessage);
      
      handleAIDecision(decision.choice, decision.delay, () => {
        console.log('Executing keep/change decision:', decision.choice);
        if (decision.choice === "Keep") {
          handleKeepCard();
        } else {
          handleChangeCard();
        }
      }, `${decisionMaker.name} decides to ${decision.choice} the card.`);
    }
  }, [players, currentPlayerIndex, aiPlayers, handleAIDecision, handleKeepCard, handleChangeCard]); // Remove currentCard from deps to avoid closure capture

  const processAIHigherLower = useCallback(() => {
    if (!isCurrentPlayerAI()) return;
    
    const cardToUse = currentCardRef.current;
    if (!cardToUse) return;
    
    const currentPlayer = players[currentPlayerIndex];
    const aiPlayer = aiPlayers.get(currentPlayer.id);
    
    if (aiPlayer) {
      const decision = aiPlayer.makeHigherLowerGuess(cardToUse);
      const thinkingMessage = `${currentPlayer.name} is thinking... ${aiPlayer.getThinkingMessage("higher")}`;
      setMessage(thinkingMessage);
      
      handleAIDecision(decision.choice, decision.delay, () => {
        handleHigherLowerGuess(decision.choice as "Higher" | "Lower");
      }, `${currentPlayer.name} guesses ${decision.choice}!`);
    }
  }, [isCurrentPlayerAI, players, currentPlayerIndex, aiPlayers, handleAIDecision, handleHigherLowerGuess]); // Remove currentCard from deps

  const processAIPlayOrPass = useCallback(() => {
    if (!isCurrentPlayerAI()) return;
    
    const cardToUse = currentCardRef.current;
    if (!cardToUse) return;
    
    const currentPlayer = players[currentPlayerIndex];
    const aiPlayer = aiPlayers.get(currentPlayer.id);
    
    if (aiPlayer) {
      const decision = aiPlayer.makePlayOrPassDecision(cardToUse, currentPlayer.lives, players.length);
      const thinkingMessage = `${currentPlayer.name} is thinking... ${aiPlayer.getThinkingMessage("play")}`;
      setMessage(thinkingMessage);
      
      handleAIDecision(decision.choice, decision.delay, () => {
        if (decision.choice === "Play") {
          handlePlay();
        } else {
          handlePass();
        }
      }, `${currentPlayer.name} chooses to ${decision.choice}!`);
    }
  }, [isCurrentPlayerAI, players, currentPlayerIndex, aiPlayers, handleAIDecision, handlePlay, handlePass]); // Remove currentCard from deps

  // Cleanup AI timeout on unmount
  useEffect(() => {
    return () => {
      clearAITimeoutRef();
    };
  }, [clearAITimeoutRef]);

  // Trigger AI decisions when game state changes
  useEffect(() => {
    console.log('AI trigger useEffect:', { gameState, currentPlayerIndex, aiThinking });
    console.log('Current player:', players[currentPlayerIndex]);
    console.log('Is current player AI?', players[currentPlayerIndex]?.isComputer);
    
    if (aiThinking) {
      console.log('AI already thinking, skipping');
      return; // Don't process if AI is already thinking
    }
    
    // Check if current player is actually AI
    if (!players[currentPlayerIndex]?.isComputer) {
      console.log('Current player is not AI, skipping AI logic');
      return;
    }
    
    const triggerAIDecision = () => {
      console.log('triggerAIDecision called for state:', gameState);
      switch (gameState) {
        case "AWAITING_COLOUR_GUESS":
          console.log('Triggering color guess');
          processAIColorGuess();
          break;
        case "AWAITING_KEEP_OR_CHANGE":
          console.log('Triggering keep/change');
          // Wait for card transition to complete before AI makes decision
          const cardTransitionDelay = capabilities.shouldReduceEffects ? 100 : 150;
          setTimeout(() => {
            console.log('Card transition delay completed, triggering AI decision...');
            processAIKeepOrChange();
          }, cardTransitionDelay + 100); // Add 100ms buffer for safety
          break;
        case "AWAITING_HIGHER_LOWER":
          console.log('Triggering higher/lower');
          if (cardJustChanged) {
            console.log('Card just changed, waiting for transition');
            const cardTransitionDelay = capabilities.shouldReduceEffects ? 100 : 150;
            setTimeout(() => {
              setCardJustChanged(false);
              processAIHigherLower();
            }, cardTransitionDelay + 100);
          } else {
            processAIHigherLower();
          }
          break;
        case "PLAY_OR_PASS":
          console.log('Triggering play/pass');
          processAIPlayOrPass();
          break;
        default:
          console.log('No AI action for state:', gameState);
          break;
      }
    };

    // Delay to let the UI update and show messages before CPU starts thinking
    const timeout = setTimeout(triggerAIDecision, 800);
    return () => {
      console.log('Clearing trigger timeout');
      clearTimeout(timeout);
    };
  }, [gameState, currentPlayerIndex]); // Remove aiThinking from dependencies to prevent re-triggering

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handlePlayAgain = useCallback(() => {
    playButtonSound();
    clearAITimeoutRef();
    setIsLoading(true);
    setGameStarted(false);
    setGameState("SETUP");
    setMessage("Welcome to POP! Setup the game to start.");
    setPlayers([]);
    setDeck([]);
    setDiscardPile([]);
    setCurrentCard(null);
    currentCardRef.current = null; // Reset ref as well
    setCardKey(0);
    setCurrentPlayerIndex(0);
    setTurnOwnerIndex(null);
    setTitleFeedback('idle');
    setFailureReason(null);
    setHeartPopAnimation(null);
    setWinnerName("");
    setAiPlayers(new Map());
    setAiThinking(false);
    setCardJustChanged(false);
    setTimeout(() => setIsLoading(false), 500);
  }, [playButtonSound, clearAITimeoutRef]);

  const handleShowCredits = useCallback(() => {
    playButtonSound();
    setGameState("CREDITS");
  }, [playButtonSound]);

  const handleBackFromCredits = useCallback(() => {
    playButtonSound();
    setGameState("GAME_OVER");
  }, [playButtonSound]);

  // Helper to determine if buttons should be disabled during CPU turns
  const isButtonsDisabled = useMemo(() => {
    const isCurrentPlayerAI = players[currentPlayerIndex]?.isComputer || false;
    return isCurrentPlayerAI || aiThinking;
  }, [players, currentPlayerIndex, aiThinking]);



  // Render different screens based on game state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <h1 className="font-cinzel text-5xl font-bold text-yellow-400">POP</h1>
        </motion.div>
      </div>
    );
  }

  if (gameState === "SETUP") {
    return (
      <GameSetup 
        onGameStart={handleGameStart} 
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        showRules={showRules}
        onToggleRules={() => setShowRules(!showRules)}
        playButtonSound={playButtonSound}
      />
    );
  }

  if (gameState === "CREDITS") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-gray-800 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-lg text-center"
        >
          <motion.h1 
            className="font-cinzel text-4xl md:text-5xl font-bold text-yellow-400 mb-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Game Credits
          </motion.h1>
          
          <motion.div 
            className="space-y-6 text-gray-300"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div>
              <h2 className="text-xl font-bold text-yellow-500 mb-2">Created by</h2>
              <a 
                href="https://mpdee.co.uk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors text-lg font-semibold underline"
              >
                mpdee.co.uk
              </a>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-yellow-500 mb-2">About This Game</h3>
              <p className="text-sm leading-relaxed">
                "Play or Pass" is a modern digital adaptation of the classic card guessing game. 
                Test your luck, strategy, and nerve as you compete with friends to be the last player standing.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-yellow-500 mb-2">Built With</h3>
              <p className="text-sm text-gray-400">
                Next.js • React • TypeScript • Tailwind CSS • Framer Motion
              </p>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 italic">
                Thanks for playing! Share with your friends and see who has the best card intuition.
              </p>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 mt-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={handlePlayAgain}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
            >
              Play Again
            </button>
            <button
              onClick={handleBackFromCredits}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
            >
              Back
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <main className={`game-grid bg-gray-900 text-white font-sans overflow-hidden ${viewport.isSmallScreen ? 'mobile-compact p-4' : 'p-8'}`}>
      {/* Title Section */}
      <header className="w-full text-center">
        <h1 
          className={`game-title font-cinzel text-4xl md:text-6xl font-bold tracking-widest [text-shadow:_2px_2px_4px_rgb(0_0_0_/_50%)] text-yellow-400 mobile-title ${titleAnimationClass}`}
          onAnimationEnd={handleTitleAnimationComplete}
          style={{
            willChange: settings.renderSettings.willChange ? 'transform, color' : 'auto',
            transform: settings.renderSettings.transform3d ? 'translate3d(0,0,0)' : 'none',
            // Dynamic animation duration
            '--title-duration': `${settings.animationDuration.title}ms`
          } as React.CSSProperties}
        >
          PLAY or PASS?
        </h1>
      </header>

      {/* Game Status Text Section */}
      <section className="game-status-section">
        <p className={`game-message text-gray-300 text-lg px-2 ${viewport.isSmallScreen ? 'text-base' : ''}`}>{message}</p>
      </section>

      {shouldShowInstallButton && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-4 right-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-full shadow-lg z-50"
          title="Install App"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      )}

      {/* Combined Cards and Player Lives Section */}
      <section className="relative flex flex-col justify-center gap-4 min-h-0 overflow-hidden">
        {/* Player Lives */}
      <div className="relative w-full">
        <PlayerList 
          ref={playerScrollContainerRef}
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          playerRefs={playerRefs}
        />

        {/* Left Fade */}
        <div className="absolute top-0 left-0 bottom-0 w-24 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none"></div>
        {/* Right Fade */}
        <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none"></div>
      </div>

        {/* Cards Container */}
        <div className="cards-container relative">
          
          {/* New aspect ratio container 800x554 */}
          <div className="cards-aspect-container">
            
            {/* Left card - Deck */}
            <div 
              className="aspect-card left cursor-pointer z-10"
              onClick={() => setIsSettingsOpen(true)}
              role="button"
              aria-label="Open settings"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setIsSettingsOpen(true)}
            >
              <div className="relative w-full h-full rounded-lg flex items-center justify-center shadow-2xl">
                <img src="/cards/card-back-new.png" alt="Card Back" className="w-full h-full rounded-lg object-cover" />
              </div>
            </div>

            {/* Right card - Discard pile */}
            <div className="aspect-card right z-10">
              {/* Static pile of discarded cards */}
              {discardPile.map((card, index) => (
                <div
                  key={`${card.rank}-${card.suit}-${index}`}
                  className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                  style={{ zIndex: index }}
                >
                  <img
                    src={getCardImageSrc(card)}
                    alt={`${card.rank} of ${card.suit}`}
                    className="w-full h-full rounded-lg object-cover"
                  />
                </div>
              ))}

              {currentCard && (
                <div
                  key={cardKey}
                  className={`absolute w-full h-full ${capabilities.shouldReduceEffects ? 'mobile-card-simple' : 'mobile-card-full'}`}
                  style={{ 
                    zIndex: discardPile.length + 1,
                    willChange: settings.renderSettings.willChange ? 'transform, opacity' : 'auto',
                    transform: settings.renderSettings.transform3d ? 'translate3d(0,0,0)' : 'none',
                    '--card-duration': `${settings.animationDuration.card}ms`
                  } as React.CSSProperties}
                >
                  <img
                    src={getCardImageSrc(currentCard)}
                    alt={`${currentCard.rank} of ${currentCard.suit}`}
                    className="w-full h-full rounded-lg shadow-lg object-cover"
                    loading={capabilities.isMobile ? "lazy" : "eager"}
                  />
                </div>
              )}

              {!currentCard && discardPile.length === 0 && (
                <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-400/50"></div>
              )}
            </div>
            
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section className="flex items-center justify-center w-full">
        <div className="adaptive-buttons flex flex-col items-center justify-center">

          {/* --- Row 1: Colour Guess / Keep Change --- */}
          <div className={`${viewport.isSmallScreen ? 'h-12' : 'h-16'} flex items-center justify-center`}>
            <AnimatePresence mode="wait">
              {gameState === "AWAITING_COLOUR_GUESS" && !aiThinking && (
                <motion.div
                  key="colour-guess"
                  className="flex gap-4 will-change-transform"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <button 
                    onClick={() => handleColourGuess('Red')} 
                    className={`relative w-32 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg ${isButtonsDisabled ? 'pointer-events-none' : ''}`}
                    disabled={isButtonsDisabled}
                  >
                    <span className={isButtonsDisabled ? 'opacity-50' : ''}>Red</span>
                    {isButtonsDisabled && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg"></div>
                    )}
                  </button>
                  <button 
                    onClick={() => handleColourGuess('Black')} 
                    className={`relative w-32 bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg ${isButtonsDisabled ? 'pointer-events-none' : ''}`}
                    disabled={isButtonsDisabled}
                  >
                    <span className={isButtonsDisabled ? 'opacity-50' : ''}>Black</span>
                    {isButtonsDisabled && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg"></div>
                    )}
                  </button>
                </motion.div>
              )}

              {gameState === "AWAITING_KEEP_OR_CHANGE" && !aiThinking && (
                <motion.div
                  key="keep-change"
                  className="flex gap-4 will-change-transform"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <button
                    onClick={handleKeepCard}
                    className={`relative w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg ${isButtonsDisabled ? 'pointer-events-none' : ''}`}
                    disabled={isButtonsDisabled}
                  >
                    <span className={isButtonsDisabled ? 'opacity-50' : ''}>Keep</span>
                    {isButtonsDisabled && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg"></div>
                    )}
                  </button>
                  <button
                    onClick={handleChangeCard}
                    className={`relative w-32 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg ${isButtonsDisabled ? 'pointer-events-none' : ''}`}
                    disabled={isButtonsDisabled}
                  >
                    <span className={isButtonsDisabled ? 'opacity-50' : ''}>Change</span>
                    {isButtonsDisabled && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg"></div>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --- Row 2: Higher Lower --- */}
          <div className="flex gap-4">
            <button
              onClick={() => handleHigherLowerGuess('Higher')}
              className={`relative w-32 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100 ${isButtonsDisabled && gameState === "AWAITING_HIGHER_LOWER" ? 'pointer-events-none' : ''}`}
              disabled={gameState !== "AWAITING_HIGHER_LOWER"}
            >
              <span>Higher</span>
              {isButtonsDisabled && gameState === "AWAITING_HIGHER_LOWER" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg"></div>
              )}
            </button>
            <button
              onClick={() => handleHigherLowerGuess('Lower')}
              className={`relative w-32 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100 ${isButtonsDisabled && gameState === "AWAITING_HIGHER_LOWER" ? 'pointer-events-none' : ''}`}
              disabled={gameState !== "AWAITING_HIGHER_LOWER"}
            >
              <span>Lower</span>
              {isButtonsDisabled && gameState === "AWAITING_HIGHER_LOWER" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg"></div>
              )}
            </button>
          </div>

          {/* --- Row 3: Play Pass --- */}
          <div className="flex gap-4 items-center">
            <button
              onClick={handlePlay}
              className={`relative round-button w-28 h-28 rounded-full flex items-center justify-center text-lg bg-teal-500 hover:bg-teal-600 text-white font-bold transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100 ${isButtonsDisabled && gameState === "PLAY_OR_PASS" ? 'pointer-events-none' : ''}`}
              disabled={gameState !== "PLAY_OR_PASS"}
            >
              <span>Play</span>
              {isButtonsDisabled && gameState === "PLAY_OR_PASS" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full"></div>
              )}
            </button>
            <button
              onClick={handlePass}
              className={`relative round-button w-28 h-28 rounded-full flex items-center justify-center text-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100 ${isButtonsDisabled && gameState === "PLAY_OR_PASS" ? 'pointer-events-none' : ''}`}
              disabled={gameState !== "PLAY_OR_PASS"}
            >
              <span>Pass</span>
              {isButtonsDisabled && gameState === "PLAY_OR_PASS" && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full"></div>
              )}
            </button>
          </div>

          {/* Game Over Modal - Moved to fixed position overlay */}
          <AnimatePresence>
            {gameState === "GAME_OVER" && (
              <motion.div
                key="game-over"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 50 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-gray-800 border-2 border-yellow-400 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
                    className="text-6xl mb-4"
                  >
                    🏆
                  </motion.div>
                  
                  <motion.h2 
                    className="font-cinzel text-3xl font-bold text-yellow-400 mb-2"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    Game Over!
                  </motion.h2>
                  
                  <motion.p 
                    className="text-xl text-white mb-6"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="font-bold text-yellow-300">{winnerName}</span> wins!
                  </motion.p>
                  
                  <motion.p 
                    className="text-gray-300 mb-8"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Would you like to play again?
                  </motion.p>
                  
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <button
                      onClick={handlePlayAgain}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <span className="text-4xl">✓</span>
                    </button>
                    <button
                      onClick={handleShowCredits}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <span className="text-4xl">✗</span>
                    </button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setIsSettingsOpen(false);
              setShowRules(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              <AnimatePresence mode="wait">
                {showRules ? (
                  <motion.div
                    key="rules-view"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                  >
                    <h2 className="text-2xl font-bold mb-4 text-yellow-400 font-cinzel text-center">How to Play</h2>
                    <div className="space-y-4 text-gray-300 text-sm mb-6 max-h-80 overflow-y-auto pr-2">
                      <div>
                        <h3 className="font-bold text-yellow-500 mb-1">Objective</h3>
                        <p>Be the last player with lives remaining. Everyone starts with 4 lives.</p>
                      </div>
                      <div>
                        <h3 className="font-bold text-yellow-500 mb-1">Gameplay</h3>
                        <div className="space-y-2">
                          <div>
                            <span className="font-semibold">Red or Black?</span> Start your turn by guessing the colour of the first card.
                            <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                              <li><span className="font-semibold text-green-400">Guess Correct:</span> You decide whether to keep that card or draw a new one.</li>
                              <li><span className="font-semibold text-red-400">Guess Incorrect:</span> The next player in turn chooses whether you keep that card or not.</li>
                            </ul>
                          </div>
                          <div>
                            <span className="font-semibold">Higher or Lower?</span> Guess if the next card drawn will be higher or lower than the current one.
                            <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                              <li><span className="font-semibold text-green-400">Guess Correct:</span> You can either <span className="font-bold">PLAY</span> (guess again on the new card) or <span className="font-bold">PASS</span> the turn to the next player.</li>
                              <li><span className="font-semibold text-red-400">Guess Incorrect:</span> You lose a life and start your turn over from Step 1.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                       <div>
                        <h3 className="font-bold text-yellow-500 mb-1">Key Rules</h3>
                        <ul className="list-disc list-inside space-y-1 text-gray-400">
                          <li>Aces are always HIGH.</li>
                          <li>If the next card is the <span className="font-semibold">same value</span>, you lose a life.</li>
                          <li>When you lose your last life, you are out of the game.</li>
                          <li>The deck automatically reshuffles when it runs out.</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex justify-center mt-4">
                       <button
                        onClick={() => setShowRules(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                      >
                        Back
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="main-view"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center"
                  >
                    <h2 className="text-2xl font-bold mb-8 text-yellow-400 font-cinzel">Settings</h2>
                    
                    {/* Settings Grid */}
                    <div className="grid gap-4 mb-6">
                      {/* How to Play Card */}
                      <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50 hover:border-blue-500/50 transition-all">
                        <button
                          onClick={() => {
                            playButtonSound();
                            setShowRules(true);
                          }}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-500 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">How to Play</h3>
                              <p className="text-sm text-gray-400">View game rules and instructions</p>
                            </div>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-blue-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Audio Settings Card */}
                      <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50 hover:border-indigo-500/50 transition-all">
                        <button
                          onClick={() => {
                            handleToggleMute();
                            playButtonSound();
                          }}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-600 group-hover:bg-red-500' : 'bg-indigo-600 group-hover:bg-indigo-500'}`}>
                              {isMuted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l-5-5m0 5l5-5" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <h3 className={`font-semibold transition-colors ${isMuted ? 'text-white group-hover:text-red-300' : 'text-white group-hover:text-indigo-300'}`}>
                                Sound Effects
                              </h3>
                              <p className="text-sm text-gray-400">
                                Currently {isMuted ? 'muted' : 'enabled'}
                              </p>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isMuted ? 'bg-red-900/50 text-red-300 group-hover:bg-red-800/50' : 'bg-green-900/50 text-green-300 group-hover:bg-green-800/50'}`}>
                            {isMuted ? 'OFF' : 'ON'}
                          </div>
                        </button>
                      </div>

                      {/* Reset Game Card */}
                      <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50 hover:border-yellow-500/50 transition-all">
                        <button
                          onClick={() => {
                            playButtonSound();
                            handlePlayAgain();
                            setIsSettingsOpen(false);
                            setShowRules(false);
                          }}
                          className="w-full flex items-center justify-between text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-yellow-500 p-2 rounded-lg group-hover:bg-yellow-400 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-semibold text-white group-hover:text-yellow-300 transition-colors">Reset Game</h3>
                              <p className="text-sm text-gray-400">Start a new game with new players</p>
                            </div>
                          </div>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-yellow-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => {
                        playButtonSound();
                        setIsSettingsOpen(false);
                        setShowRules(false);
                      }}
                      className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg border border-gray-500"
                    >
                      Close Settings
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heart Pop Animation */}
      <AnimatePresence>
        {heartPopAnimation?.show && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
            onAnimationComplete={() => {
              setTimeout(() => {
                setHeartPopAnimation(null);
              }, 1000);
            }}
          >
            <motion.div
              className="text-red-500 text-8xl filter drop-shadow-2xl will-change-transform"
              initial={{
                scale: 0.1,
                x: typeof window !== 'undefined' ? heartPopAnimation.startPosition.x - window.innerWidth / 2 : 0,
                y: typeof window !== 'undefined' ? heartPopAnimation.startPosition.y - window.innerHeight / 2 : 0,
                opacity: 1
              }}
              animate={{
                scale: [0.1, 10, 7],
                x: 0,
                y: 0,
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: settings.animationDuration.heart / 1000,
                times: [0, 0.6, 1],
                ease: capabilities.shouldReduceEffects ? "linear" : [0.25, 0.46, 0.45, 0.94]
              }}
              style={{
                textShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6)'
              }}
            >
              💔
            </motion.div>
            
            {/* Particle Effects - Adaptive count based on device capabilities */}
            {capabilities.shouldReduceEffects ? null : [...Array(heartParticleCount)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-red-400 text-2xl will-change-transform"
                initial={{
                  scale: 0,
                  x: typeof window !== 'undefined' ? heartPopAnimation.startPosition.x - window.innerWidth / 2 : 0,
                  y: typeof window !== 'undefined' ? heartPopAnimation.startPosition.y - window.innerHeight / 2 : 0,
                  opacity: 0
                }}
                animate={{
                  scale: [0, 1, 0],
                  x: [0, (Math.cos(i * 90 * Math.PI / 180) * 250)],
                  y: [0, (Math.sin(i * 90 * Math.PI / 180) * 250)],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: settings.animationDuration.heart / 1000 * 1.2,
                  delay: capabilities.shouldReduceEffects ? 0.1 : 0.3,
                  ease: "easeOut"
                }}
              >
                💔
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landscape Orientation Warning - Mobile Only */}
      <AnimatePresence>
        {capabilities.isMobile && isLandscape && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-2xl p-8 text-center max-w-sm mx-auto border border-yellow-500/50 shadow-2xl"
            >
              {/* Rotate Icon */}
              <motion.div
                animate={{ rotate: [0, -90, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-6xl mb-6"
              >
                📱
              </motion.div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-yellow-400 mb-4 font-cinzel">
                Rotate Your Device
              </h2>
              
              {/* Message */}
              <p className="text-gray-300 mb-6 leading-relaxed">
                POP is designed for portrait mode. Please rotate your device to portrait orientation for the best gaming experience.
              </p>
              
              {/* Instruction */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
                  <span className="text-xl">🔄</span>
                  <span>Turn your device upright</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
