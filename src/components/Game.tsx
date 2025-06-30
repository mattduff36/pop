"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Player } from "@/lib/types";
import { createDeck, shuffleDeck } from "@/lib/game";
import GameSetup from "./GameSetup";
import { getCardImageSrc } from "@/lib/utils";

type GameState =
  | "SETUP"
  | "AWAITING_COLOR_GUESS"
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
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [turnOwnerIndex, setTurnOwnerIndex] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("Welcome to POP! Setup the game to start.");
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000); // Simulate loading time
    return () => clearTimeout(timer);
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
            loseLifeAndAdvanceTurn();
        }, 2500); 
        return () => clearTimeout(timeoutId);
    }
  }, [gameState, players, currentPlayerIndex]);

  const loseLifeAndAdvanceTurn = () => {
    const newPlayers = [...players];
    const playerWhoGuessed = newPlayers[currentPlayerIndex];
    playerWhoGuessed.lives--;
    setPlayers(newPlayers);

    if (checkForWinner()) return;

    const messagePrefix = playerWhoGuessed.lives <= 0 
        ? `${playerWhoGuessed.name} is out of lives!`
        : `${playerWhoGuessed.name} loses a life.`;

    const nextPlayerIndex = advanceToNextPlayer();
    setCurrentPlayerIndex(nextPlayerIndex);
    
    setGameState("AWAITING_COLOR_GUESS");
    setMessage(`${messagePrefix} It's now ${newPlayers[nextPlayerIndex].name}'s turn. Red or Black?`);
  };

  const handleGameStart = (players: Player[]) => {
    setPlayers(players);
    const newDeck = createDeck();
    setDeck(shuffleDeck(newDeck));
    setCurrentCard(null);
    
    const startingPlayer = Math.floor(Math.random() * players.length);
    setCurrentPlayerIndex(startingPlayer);

    setGameStarted(true);
    setGameState("AWAITING_COLOR_GUESS");
    setMessage(`${players[startingPlayer].name}, is the first card Red or Black?`);
  };

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
    }
  };

  const drawCard = () => {
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

  const handleColorGuess = (guess: "Red" | "Black") => {
    const nextCard = drawCard();
    if (!nextCard) return;

    const isRed = nextCard.suit === "Hearts" || nextCard.suit === "Diamonds";
    const isGuessCorrect = (guess === "Red" && isRed) || (guess === "Black" && !isRed);
    
    if(currentCard) setDiscardPile(prev => [...prev, currentCard]);
    setCurrentCard(nextCard);

    if (isGuessCorrect) {
      setGameState("AWAITING_KEEP_OR_CHANGE");
      setMessage(`Correct! The card is the ${nextCard.rank} of ${nextCard.suit}. ${players[currentPlayerIndex].name}, keep it or change?`);
    } else {
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
    const newCard = drawCard();
    if (!newCard) return;

    if(currentCard) setDiscardPile(prev => [...prev, currentCard]);
    setCurrentCard(newCard);
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
    const previousCard = currentCard;
    if (!previousCard) return;

    const newCard = drawCard();
    if (!newCard) return;

    let correct = false;
    let reason = "";

    if (newCard.value === previousCard.value) {
        correct = false;
        reason = `Same card value! It's the ${newCard.rank} of ${newCard.suit}.`;
    } else {
        if (guess === 'Higher') {
            correct = newCard.value > previousCard.value;
        } else { // Lower
            correct = newCard.value < previousCard.value;
        }
        reason = correct 
            ? `Correct! It's the ${newCard.rank} of ${newCard.suit}. Play again or Pass?` 
            : `Incorrect! It was the ${newCard.rank} of ${newCard.suit}.`;
    }

    setDiscardPile(prev => [...prev, previousCard]);
    setCurrentCard(newCard);
    setMessage(reason);

    if (correct) {
        setGameState("PLAY_OR_PASS");
    } else {
        setGameState("SHOWING_RESULT");
    }
  }

  const handlePlay = () => {
    setGameState("AWAITING_HIGHER_LOWER");
    setMessage(`Next card is on the ${currentCard?.rank}. Higher or Lower?`);
  };

  const handlePass = () => {
    const nextPlayerIndex = advanceToNextPlayer();
    setCurrentPlayerIndex(nextPlayerIndex);
    setGameState("AWAITING_HIGHER_LOWER");
    setMessage(`Turn passed to ${players[nextPlayerIndex].name}. Higher or lower than ${currentCard?.rank}?`);
  };

  const handlePlayAgain = () => {
    setGameState("SETUP");
    setMessage("Welcome to POP! Setup the game to start.");
    setCurrentCard(null);
    setDiscardPile([]);
    setGameStarted(false);
    setTurnOwnerIndex(null);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <h1 className="font-cinzel text-5xl font-bold text-yellow-400">POP</h1>
        </motion.div>
      </div>
    );
  }

  if (gameState === "SETUP") {
    return <GameSetup onGameStart={handleGameStart} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-900 text-white font-sans">
      <header className="w-full text-center mb-8">
        <h1 className="font-cinzel text-4xl md:text-6xl font-bold text-yellow-400 tracking-widest [text-shadow:_2px_2px_4px_rgb(0_0_0_/_50%)]">PLAY or PASS?</h1>
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

      <section className="w-full flex flex-row flex-wrap items-center justify-center gap-2 mb-4">
        <AnimatePresence>
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              className={`p-2 rounded-lg border-2 transition-all duration-300 ${
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

      <section className="relative flex items-center justify-center gap-4 md:gap-8 h-72 md:h-96 w-full">
        <div className="absolute w-full h-full bg-green-900/20 rounded-full blur-3xl"></div>
        <div className="relative w-44 h-64 md:w-60 md:h-80 transform hover:scale-105 transition-transform">
          <div className="relative w-full h-full rounded-lg bg-blue-800 border-2 border-blue-500 flex items-center justify-center shadow-2xl">
            <img src="/cards/SVG-cards/card_back3.svg" alt="Card Back" className="w-full h-full rounded-lg" />
            <span className="absolute -bottom-2 -right-2 bg-gray-900 rounded-full px-2 py-0.5 text-xs md:text-sm font-bold border-2 border-blue-400">{deck.length}</span>
          </div>
        </div>
        <div className="relative w-44 h-64 md:w-60 md:h-80 transform">
          <AnimatePresence mode="wait">
            {currentCard ? (
              <motion.img
                key={currentCard.suit + currentCard.rank}
                src={getCardImageSrc(currentCard)}
                alt={`${currentCard.rank} of ${currentCard.suit}`}
                className="w-full h-full rounded-lg shadow-lg"
                initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            ) : (
              <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-400/50"></div>
            )}
          </AnimatePresence>
          {discardPile.length > 0 && (
            <span className="absolute bottom-2 right-2 text-white font-bold text-xl bg-black/50 px-2 py-1 rounded">
              {discardPile.length}
            </span>
          )}
        </div>
      </section>

      <section className="flex-grow flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <div className="flex flex-col items-center justify-center gap-4">
            {gameState === "AWAITING_COLOR_GUESS" && (
              <motion.div 
                key="color-guess"
                className="flex gap-4 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <button onClick={() => handleColorGuess('Red')} className="w-32 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Red</button>
                <button onClick={() => handleColorGuess('Black')} className="w-32 bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Black</button>
              </motion.div>
            )}
            {gameState === "AWAITING_KEEP_OR_CHANGE" && (
              <motion.div 
                key="keep-change"
                className="flex gap-4 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
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
            {gameState === "AWAITING_HIGHER_LOWER" && (
              <motion.div 
                key="higher-lower"
                className="flex gap-4 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <button onClick={() => handleHigherLowerGuess('Higher')} className="w-32 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Higher</button>
                <button onClick={() => handleHigherLowerGuess('Lower')} className="w-32 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Lower</button>
              </motion.div>
            )}
            {gameState === "PLAY_OR_PASS" && (
              <motion.div 
                key="play-pass"
                className="flex gap-4 mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <button onClick={handlePlay} className="w-32 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Play</button>
                <button onClick={handlePass} className="w-32 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg">Pass</button>
              </motion.div>
            )}
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
          </div>
        </AnimatePresence>
      </section>

      <footer className="w-full text-center mt-auto pt-4">
        <p className="text-gray-500 text-sm">&copy; 2024 POP Game. All rights reserved.</p>
      </footer>
    </main>
  );
}
