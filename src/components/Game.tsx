"use client";

import { useState, useEffect } from "react";
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
  | "GAME_OVER";

export default function Game() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>("SETUP");
  const [message, setMessage] = useState("Welcome to POP! Setup the game to start.");
  const [installPrompt, setInstallPrompt] = useState<any>(null);

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

  const handleGameStart = (players: Player[]) => {
    setPlayers(players);
    const newDeck = createDeck();
    setDeck(shuffleDeck(newDeck));
    setCurrentCard(null);
    
    const startingPlayer = Math.floor(Math.random() * players.length);
    setCurrentPlayerIndex(startingPlayer);

    setGameState("AWAITING_COLOR_GUESS");
    setMessage(`${players[startingPlayer].name}, is the next card Red or Black?`);
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
    
    if (isGuessCorrect) {
      if(currentCard) setDiscardPile(prev => [...prev, currentCard]);
      setCurrentCard(nextCard);
      setGameState("AWAITING_KEEP_OR_CHANGE");
      setMessage(`Correct! The card is the ${nextCard.rank} of ${nextCard.suit}. Keep it or change?`);
    } else {
      if (currentCard) {
        setDiscardPile(prev => [...prev, currentCard, nextCard]);
      } else {
        setDiscardPile(prev => [...prev, nextCard]);
      }
      setCurrentCard(null);
      handleIncorrectGuess(`Incorrect! The card was ${nextCard.rank} of ${nextCard.suit}.`);
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

  const handleIncorrectGuess = (customMessage: string) => {
    const newPlayers = [...players];
    const currentPlayer = newPlayers[currentPlayerIndex];
    currentPlayer.lives--;
    setPlayers(newPlayers);

    if (checkForWinner()) return;

    if (currentPlayer.lives <= 0) {
        setMessage(`${customMessage} ${currentPlayer.name} is out of lives!`);
    } else {
        setMessage(`${customMessage} ${currentPlayer.name} loses a life.`);
    }
    
    const nextPlayerIndex = advanceToNextPlayer();
    setCurrentPlayerIndex(nextPlayerIndex);

    setGameState("AWAITING_COLOR_GUESS");
    setTimeout(() => {
        setMessage(`${newPlayers[nextPlayerIndex].name}, your turn. Red or Black?`);
    }, 2000);
  }

  const handleKeepCard = () => {
    setGameState("AWAITING_HIGHER_LOWER");
    setMessage(`Card is ${currentCard?.rank} of ${currentCard?.suit}. Higher or Lower?`);
  }

  const handleChangeCard = () => {
    const newCard = drawCard();
    if (!newCard) return;

    if(currentCard) setDiscardPile(prev => [...prev, currentCard]);
    setCurrentCard(newCard);
    setGameState("AWAITING_HIGHER_LOWER");
    setMessage(`New card is ${newCard.rank} of ${newCard.suit}. Higher or Lower?`);
  }

  const handleHigherLowerGuess = (guess: 'Higher' | 'Lower') => {
    const newCard = drawCard();
    if (!newCard) return;

    let correct = false;

    if (guess === 'Higher') {
        correct = newCard.value > currentCard!.value;
    } else { // Lower
        correct = newCard.value < currentCard!.value;
    }

    // Tie condition
    if (newCard.value === currentCard!.value) {
        handleIncorrectGuess(`Same card! It's a ${newCard.rank} of ${newCard.suit}.`);
        return;
    }

    if (correct) {
        if(currentCard) setDiscardPile(prev => [...prev, currentCard]);
        setCurrentCard(newCard);
        setGameState("PLAY_OR_PASS");
        setMessage(`Correct! It's a ${newCard.rank}. Play again or Pass?`);
    } else {
        handleIncorrectGuess(`Incorrect! It was a ${newCard.rank}.`);
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
  }

  if (gameState === "SETUP") {
    return <GameSetup onGameStart={handleGameStart} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-gray-900 text-white font-sans">
      <header className="w-full text-center mb-4">
        <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 tracking-wider">POP: Play Or Pass</h1>
        <p className="text-gray-300 mt-2 text-lg h-8 px-2">{message}</p>
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
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`p-2 rounded-lg border-2 transition-all duration-300 ${
              currentPlayerIndex === index
                ? "border-yellow-400 bg-yellow-900 shadow-md shadow-yellow-400/20"
                : "border-gray-600 bg-gray-800"
            }`}
          >
            <h2 className="text-sm font-semibold truncate">{player.name}</h2>
            <p className="text-lg mt-1">{player.lives > 0 ? "❤️".repeat(player.lives) : "💀"}</p>
          </div>
        ))}
      </section>

      <section className="relative flex items-center justify-center gap-4 md:gap-8 h-56 md:h-72 w-full">
        <div className="absolute w-full h-full bg-green-900/20 rounded-full blur-3xl"></div>
        <div className="relative w-36 h-52 md:w-48 md:h-64 transform hover:scale-105 transition-transform">
          <div className="relative w-full h-full rounded-lg bg-blue-800 border-2 border-blue-500 flex items-center justify-center shadow-2xl">
            <img src="/cards/SVG-cards/card_back3.svg" alt="Card Back" className="w-full h-full rounded-lg" />
            <span className="absolute -bottom-2 -right-2 bg-gray-900 rounded-full px-2 py-0.5 text-xs md:text-sm font-bold border-2 border-blue-400">{deck.length}</span>
          </div>
        </div>
        <div className="relative w-36 h-52 md:w-48 md:h-64 transform hover:scale-105 transition-transform">
          {currentCard ? (
            <img 
              src={getCardImageSrc(currentCard)} 
              alt={`${currentCard.rank} of ${currentCard.suit}`}
              className="w-full h-full"
            />
          ) : (
             <img src="/cards/SVG-cards/card_back3.svg" alt="Card Back" className="w-full h-full rounded-lg" />
          )}
        </div>
      </section>

      <section className="mt-8 h-16 flex items-center justify-center">
        <div className="flex gap-2 md:gap-4">
            {gameState === "AWAITING_COLOR_GUESS" && (
                <>
                    <button onClick={() => handleColorGuess("Red")} className="px-6 py-3 md:px-8 md:py-4 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Red</button>
                    <button onClick={() => handleColorGuess("Black")} className="px-6 py-3 md:px-8 md:py-4 bg-gray-800 hover:bg-gray-700 border-2 border-white rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Black</button>
                </>
            )}
            {gameState === "AWAITING_KEEP_OR_CHANGE" && (
                <>
                    <button onClick={handleKeepCard} className="px-6 py-3 md:px-8 md:py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Keep Card</button>
                    <button onClick={handleChangeCard} className="px-6 py-3 md:px-8 md:py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Change Card</button>
                </>
            )}
            {gameState === "AWAITING_HIGHER_LOWER" && (
                <>
                    <button onClick={() => handleHigherLowerGuess('Higher')} className="px-6 py-3 md:px-8 md:py-4 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Higher</button>
                    <button onClick={() => handleHigherLowerGuess('Lower')} className="px-6 py-3 md:px-8 md:py-4 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Lower</button>
                </>
            )}
            {gameState === "PLAY_OR_PASS" && (
                <>
                    <button onClick={handlePlay} className="px-6 py-3 md:px-8 md:py-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Play</button>
                    <button onClick={handlePass} className="px-6 py-3 md:px-8 md:py-4 bg-orange-500 hover:bg-orange-600 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Pass</button>
                </>
            )}
            {gameState === "GAME_OVER" && (
                <button onClick={handlePlayAgain} className="px-6 py-3 md:px-8 md:py-4 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-110">Play Again?</button>
            )}
        </div>
      </section>
    </main>
  );
} 