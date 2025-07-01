"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Player } from "@/lib/types";
import { createDeck, shuffleDeck } from "@/lib/game";
import GameSetup from "./GameSetup";
import { getCardImageSrc } from "@/lib/utils";
import useSound from "@/hooks/useSound";

type GameState =
  | "SETUP"
  | "AWAITING_COLOUR_GUESS"
  | "AWAITING_KEEP_OR_CHANGE"
  | "AWAITING_HIGHER_LOWER"
  | "PLAY_OR_PASS"
  | "SHOWING_RESULT"
  | "GAME_OVER";

export default function Game() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [cardKey, setCardKey] = useState<number>(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
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

  const playerScrollContainerRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const playButtonSound = useSound('/sounds/button-click.mp3', 0.5, isMuted);
  const playCardFlipSound = useSound('/sounds/card-flip.mp3', 0.5, isMuted);
  const playCorrectSound = useSound('/sounds/correct-guess.mp3', 0.5, isMuted);
  const playIncorrectSound = useSound('/sounds/incorrect-guess.mp3', 0.5, isMuted);
  const playGameStartSound = useSound('/sounds/game-start.mp3', 0.6, isMuted);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000); // Simulate loading time
    return () => clearTimeout(timer);
  }, []);

  // Preload card images for smoother animations
  useEffect(() => {
    const preloadImages = async () => {
      const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];
      
      const imagePromises = suits.flatMap(suit =>
        ranks.map(rank => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Still resolve on error to prevent hanging
            img.src = `/cards/SVG-cards/${rank}_of_${suit}.svg`;
          });
        })
      );

      await Promise.all(imagePromises);
    };

    preloadImages();
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
    if (gameState === 'SHOWING_RESULT') {
        const timeoutId = setTimeout(() => {
            processTurnEnd();
        }, 2500); 
        return () => clearTimeout(timeoutId);
    }
  }, [gameState]);

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

  const processTurnEnd = () => {
    if (!failureReason) return;

    const newPlayers = [...players];
    const playerWhoGuessed = newPlayers[currentPlayerIndex];
    playerWhoGuessed.lives--;
    setPlayers(newPlayers);

    if (checkForWinner()) return;

    const lostLastLife = playerWhoGuessed.lives <= 0;
    const shouldAdvance = failureReason === 'SAME_VALUE_TIE' || lostLastLife;

    let messagePrefix = lostLastLife 
        ? `${playerWhoGuessed.name} is out of lives!`
        : `${playerWhoGuessed.name} loses a life.`;

    if (shouldAdvance) {
      const nextPlayerIndex = advanceToNextPlayer();
      setCurrentPlayerIndex(nextPlayerIndex);
      setMessage(`${messagePrefix} It's now ${newPlayers[nextPlayerIndex].name}'s turn. Red or Black?`);
    } else {
      setMessage(`${messagePrefix} It's your turn again. Red or Black?`);
    }
    
    setGameState("AWAITING_COLOUR_GUESS");
    setFailureReason(null);
  };

  const handleGameStart = (players: Player[]) => {
    playGameStartSound();
    setPlayers(players);
    const newDeck = createDeck();
    setDeck(shuffleDeck(newDeck));
    setCurrentCard(null);
    
    const startingPlayer = Math.floor(Math.random() * players.length);
    setCurrentPlayerIndex(startingPlayer);

    setGameStarted(true);
    setGameState("AWAITING_COLOUR_GUESS");
    setMessage(`${players[startingPlayer].name}, is the first card Red or Black?`);
  };

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      playButtonSound();
    }
  };

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
    // If there's a current card, move it to discard pile first
    if (currentCard) {
      setDiscardPile(prev => [...prev, currentCard]);
    }
    
    // Small delay to allow exit animation, then set new card
    setTimeout(() => {
      setCurrentCard(newCard);
      setCardKey(prev => prev + 1);
    }, 150);
  };

  const handleColourGuess = (guess: "Red" | "Black") => {
    playButtonSound();
    const nextCard = drawCard();
    if (!nextCard) return;

    const isRed = nextCard.suit === "Hearts" || nextCard.suit === "Diamonds";
    const isGuessCorrect = (guess === "Red" && isRed) || (guess === "Black" && !isRed);
    
    smoothCardTransition(nextCard);

    if (isGuessCorrect) {
      // Small delay to let card flip sound play first
      setTimeout(() => playCorrectSound(), 100);
      setGameState("AWAITING_KEEP_OR_CHANGE");
      setMessage(`Correct! The card is the ${nextCard.rank} of ${nextCard.suit}. ${players[currentPlayerIndex].name}, keep it or change?`);
    } else {
      // Small delay to let card flip sound play first
      setTimeout(() => playIncorrectSound(), 100);
      setTurnOwnerIndex(currentPlayerIndex);
      const nextPlayerIndex = advanceToNextPlayer();
      setCurrentPlayerIndex(nextPlayerIndex);
      
      setGameState("AWAITING_KEEP_OR_CHANGE");
      setMessage(`Incorrect! It was the ${nextCard.rank} of ${nextCard.suit}. ${players[nextPlayerIndex].name}, you decide: keep or change?`);
    }
  };

  const advanceToNextPlayer = () => {
    let nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    // Skip players who are out of lives
    while (players[nextPlayerIndex].lives <= 0) {
      nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
    }
    return nextPlayerIndex;
  }

  const checkForWinner = () => {
    const activePlayers = players.filter(p => p.lives > 0);
    if (activePlayers.length === 1) {
        setGameState("GAME_OVER");
        setMessage(`Game Over! ${activePlayers[0].name} is the winner!`);
        return true;
    }
    return false;
  }

  const handleKeepCard = () => {
    playButtonSound();
    setGameState("AWAITING_HIGHER_LOWER");
    if (turnOwnerIndex !== null) {
      setCurrentPlayerIndex(turnOwnerIndex);
      setMessage(`Card is ${currentCard?.rank} of ${currentCard?.suit}. ${players[turnOwnerIndex].name}, your turn. Higher or Lower?`);
      setTurnOwnerIndex(null);
    } else {
      setMessage(`Card is ${currentCard?.rank} of ${currentCard?.suit}. Higher or Lower?`);
    }
  }

  const handleChangeCard = () => {
    playButtonSound();
    const newCard = drawCard();
    if (!newCard) return;

    smoothCardTransition(newCard);
    setGameState("AWAITING_HIGHER_LOWER");

    if (turnOwnerIndex !== null) {
      setCurrentPlayerIndex(turnOwnerIndex);
      setMessage(`New card is ${newCard.rank} of ${newCard.suit}. ${players[turnOwnerIndex].name}, your turn. Higher or Lower?`);
      setTurnOwnerIndex(null);
    } else {
      setMessage(`New card is ${newCard.rank} of ${newCard.suit}. Higher or Lower?`);
    }
  }

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
        }
    }
    
    setMessage(reason);
    smoothCardTransition(newCard);
    
    if (correct) {
      // Small delay to let card flip sound play first
      setTimeout(() => {
        playCorrectSound();
        setTitleFeedback('correct');
      }, 100);
      setGameState("PLAY_OR_PASS");
    } else {
      // Small delay to let card flip sound play first
      setTimeout(() => {
        playIncorrectSound();
        setTitleFeedback('incorrect');
      }, 100);
      setGameState("SHOWING_RESULT");
    }
  };

  const handlePlay = () => {
    playButtonSound();
    setGameState("AWAITING_HIGHER_LOWER");
    setMessage(`Card is ${currentCard?.rank}. Higher or Lower?`);
  };

  const handlePass = () => {
    playButtonSound();
    const nextPlayerIndex = advanceToNextPlayer();
    setCurrentPlayerIndex(nextPlayerIndex);
    setGameState("AWAITING_HIGHER_LOWER");
    setMessage(`${players[nextPlayerIndex].name}, your turn. Higher or lower than ${currentCard?.rank}?`);
  };

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const handlePlayAgain = () => {
    playButtonSound();
    setIsLoading(true);
    setGameStarted(false);
    setGameState("SETUP");
    setMessage("Welcome to POP! Setup the game to start.");
    setPlayers([]);
    setDeck([]);
    setDiscardPile([]);
    setCurrentCard(null);
    setCardKey(0);
    setCurrentPlayerIndex(0);
    setTurnOwnerIndex(null);
    setTitleFeedback('idle');
    setFailureReason(null);
    setTimeout(() => setIsLoading(false), 500);
  };

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

  const titleVariants = {
    idle: {
      color: "#facc15", // tailwind yellow-400
    },
    correct: {
      scale: [1, 1.1, 1],
      color: ["#facc15", "#4ade80", "#facc15"], // yellow-400, green-400, yellow-400
      transition: {
        duration: 2,
        times: [0, 0.5, 1]
      }
    },
    incorrect: {
      x: [0, -10, 10, -10, 10, 0],
      color: ["#facc15", "#ef4444", "#facc15"], // yellow-400, red-500, yellow-400
      transition: {
        duration: 0.4
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-900 text-white font-sans overflow-x-hidden">
      <header className="w-full text-center mb-8">
        <motion.h1
          className="font-cinzel text-4xl md:text-6xl font-bold tracking-widest [text-shadow:_2px_2px_4px_rgb(0_0_0_/_50%)]"
          variants={titleVariants}
          animate={titleFeedback}
          onAnimationComplete={() => setTitleFeedback('idle')}
        >
          PLAY or PASS?
        </motion.h1>
        <p className="text-gray-300 mt-4 text-lg h-8 px-2">{message}</p>
      </header>

      {installPrompt && (
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

      <div className="relative w-full">
        <section
          ref={playerScrollContainerRef}
          className="w-full flex items-center gap-4 mb-4 overflow-x-auto py-2"
          style={{
            paddingLeft: 'calc(50% - 4rem)', /* 4rem is half of w-32 */
            paddingRight: 'calc(50% - 4rem)',
            scrollbarWidth: 'none'
          }}
        >
          <AnimatePresence>
            {players.map((player, index) => (
              <motion.div
                ref={el => { playerRefs.current[index] = el; }}
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className={`p-3 rounded-lg border-2 transition-all duration-300 text-center flex-shrink-0 w-32 ${
                  currentPlayerIndex === index
                    ? "border-yellow-400 bg-yellow-900 shadow-md shadow-yellow-400/20"
                    : "border-gray-600 bg-gray-800"
                }`}
              >
                <h2 className="text-sm font-semibold truncate">{player.name}</h2>
                <p className="text-base mt-1">{player.lives > 0 ? "❤️".repeat(player.lives) : "💀"}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </section>

        {/* Left Fade */}
        <div className="absolute top-0 left-0 bottom-0 w-24 bg-gradient-to-r from-gray-900 to-transparent pointer-events-none"></div>
        {/* Right Fade */}
        <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none"></div>
      </div>

      <style jsx global>{`
        section::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <section className="relative flex items-center justify-center gap-4 md:gap-8 h-72 md:h-96 w-full">
        <div className="absolute w-full h-full bg-green-900/20 rounded-full blur-3xl"></div>
        <div 
          className="relative w-44 h-64 md:w-60 md:h-80 cursor-pointer"
          onClick={() => setIsSettingsOpen(true)}
          role="button"
          aria-label="Open settings"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsSettingsOpen(true)}
        >
          <div className="relative w-full h-full rounded-lg flex items-center justify-center shadow-2xl">
            <img src="/cards/SVG-cards/card_back3.svg" alt="Card Back" className="w-full h-full rounded-lg" />
          </div>
        </div>
        <div className="relative w-44 h-64 md:w-60 md:h-80">
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
                className="w-full h-full rounded-lg"
              />
            </div>
          ))}

          <AnimatePresence mode="wait">
            {currentCard && (
              <div
                className="absolute w-full h-full"
                style={{
                  perspective: '1000px',
                  zIndex: discardPile.length + 1
                }}
              >
                <motion.div
                  key={cardKey}
                  className="relative w-full h-full"
                  initial={{ x: '-120%', rotateY: 180, opacity: 0 }}
                  animate={{ x: 0, rotateY: 0, opacity: 1 }}
                  exit={{ 
                    x: '10%',
                    y: 8,
                    scale: 0.95,
                    opacity: 0,
                    rotateY: -15,
                    transition: { duration: 0.15, ease: 'easeIn' }
                  }}
                  transition={{ 
                    duration: 0.5, 
                    ease: [0.25, 0.46, 0.45, 0.94],
                    opacity: { duration: 0.3 }
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Card Back */}
                  <div className="absolute w-full h-full" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <img src="/cards/SVG-cards/card_back3.svg" alt="Card Back" className="w-full h-full rounded-lg shadow-lg" />
                  </div>
                  {/* Card Front */}
                  <div className="absolute w-full h-full" style={{ backfaceVisibility: 'hidden' }}>
                    <img
                      src={getCardImageSrc(currentCard)}
                      alt={`${currentCard.rank} of ${currentCard.suit}`}
                      className="w-full h-full rounded-lg shadow-lg"
                    />
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {!currentCard && discardPile.length === 0 && (
            <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-400/50"></div>
          )}
        </div>
      </section>

      <section className="flex-grow flex items-center justify-center w-full">
        <div className="flex flex-col items-center justify-center gap-4">

          {/* --- Row 1: Colour Guess / Keep Change --- */}
          <div className="h-16 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {gameState === "AWAITING_COLOUR_GUESS" && (
                <motion.div
                  key="colour-guess"
                  className="flex gap-4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <button onClick={() => handleColourGuess('Red')} className="w-32 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Red</button>
                  <button onClick={() => handleColourGuess('Black')} className="w-32 bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Black</button>
                </motion.div>
              )}

              {gameState === "AWAITING_KEEP_OR_CHANGE" && (
                <motion.div
                  key="keep-change"
                  className="flex gap-4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <button
                    onClick={handleKeepCard}
                    className="w-32 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                  >
                    Keep
                  </button>
                  <button
                    onClick={handleChangeCard}
                    className="w-32 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                  >
                    Change
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* --- Row 2: Higher Lower --- */}
          <div className="flex gap-4">
            <button
              onClick={() => handleHigherLowerGuess('Higher')}
              className="w-32 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100"
              disabled={gameState !== "AWAITING_HIGHER_LOWER"}
            >
              Higher
            </button>
            <button
              onClick={() => handleHigherLowerGuess('Lower')}
              className="w-32 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100"
              disabled={gameState !== "AWAITING_HIGHER_LOWER"}
            >
              Lower
            </button>
          </div>

          {/* --- Row 3: Play Pass --- */}
          <div className="flex gap-4 items-center">
            <button
              onClick={handlePlay}
              className="w-28 h-28 rounded-full flex items-center justify-center text-lg bg-teal-500 hover:bg-teal-600 text-white font-bold transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100"
              disabled={gameState !== "PLAY_OR_PASS"}
            >
              Play
            </button>
            <button
              onClick={handlePass}
              className="w-28 h-28 rounded-full flex items-center justify-center text-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition-transform transform hover:scale-105 shadow-lg disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none disabled:hover:scale-100"
              disabled={gameState !== "PLAY_OR_PASS"}
            >
              Pass
            </button>
          </div>

          <AnimatePresence>
            {gameState === "GAME_OVER" && (
              <motion.div
                key="game-over"
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <button onClick={handlePlayAgain} className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Play Again</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <footer className="w-full text-center mt-auto pt-4">
        <p className="text-gray-500 text-sm">&copy; 2024 POP Game. All rights reserved.</p>
      </footer>

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
                        <ol className="list-decimal list-inside space-y-2">
                          <li>
                            <span className="font-semibold">Red or Black?</span> Start your turn by guessing the colour of the first card.
                            <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                              <li><span className="font-semibold text-green-400">Correct:</span> You decide whether to keep that card or draw a new one.</li>
                              <li><span className="font-semibold text-red-400">Incorrect:</span> The turn passes to the next player to decide, but then it comes back to you for the next step.</li>
                            </ul>
                          </li>
                          <li>
                            <span className="font-semibold">Higher or Lower?</span> Guess if the next card drawn will be higher or lower than the current one.
                            <ul className="list-disc list-inside ml-4 mt-1 text-gray-400">
                              <li><span className="font-semibold text-green-400">Correct:</span> You can either <span className="font-bold">PLAY</span> (guess again on the new card) or <span className="font-bold">PASS</span> the turn to the next player.</li>
                              <li><span className="font-semibold text-red-400">Incorrect:</span> You lose a life and start your turn over from Step 1.</li>
                            </ul>
                          </li>
                        </ol>
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
                    <h2 className="text-2xl font-bold mb-6 text-yellow-400 font-cinzel">Settings</h2>
                    <div className="flex flex-col items-center gap-4">
                      <button
                        onClick={() => {
                          playButtonSound();
                          setShowRules(true);
                        }}
                        className="w-48 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                      >
                        How to Play
                      </button>
                      <button
                        onClick={() => {
                          handleToggleMute();
                          playButtonSound();
                        }}
                        className="w-48 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                      >
                        {isMuted ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l-5-5m0 5l5-5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                        <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                      </button>
                      <button
                        onClick={() => {
                          playButtonSound();
                          handlePlayAgain();
                          setIsSettingsOpen(false);
                          setShowRules(false);
                        }}
                        className="w-48 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                      >
                        Reset Game
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
