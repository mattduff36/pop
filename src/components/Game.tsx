"use client";

import { useState, useEffect } from "react";
import { Card, Player } from "@/lib/types";
import { createDeck, shuffleDeck } from "@/lib/game";
import GameSetup from "./GameSetup";

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

  const handleGameStart = (players: Player[]) => {
    setPlayers(players);
    const newDeck = createDeck();
    const shuffled = shuffleDeck(newDeck);
    const firstCard = shuffled.pop()!;

    setCurrentCard(firstCard);
    setDeck(shuffled);
    
    const startingPlayer = Math.floor(Math.random() * players.length);
    setCurrentPlayerIndex(startingPlayer);

    setGameState("AWAITING_COLOR_GUESS");
    setMessage(`Player ${players[startingPlayer].name}, is the next card Red or Black?`);
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

    const newDeck = createDeck();
    const shuffled = shuffleDeck(newDeck);
    const firstCard = shuffled.pop()!;
    setCurrentCard(firstCard);
    setDeck(shuffled);
    setDiscardPile([]);

    setGameState("AWAITING_COLOR_GUESS");
    setTimeout(() => {
        setMessage(`Player ${newPlayers[nextPlayerIndex].name}, your turn. Red or Black?`);
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
      <header className="w-full text-center mb-8">
        <h1 className="text-5xl font-bold text-yellow-400 tracking-wider">POP: Play Or Pass</h1>
        <p className="text-gray-300 mt-2 text-lg h-8">{message}</p>
      </header>

      <section className="w-full flex justify-center gap-8 mb-8">
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`p-4 rounded-lg border-2 transition-all duration-300 ${
              currentPlayerIndex === index
                ? "border-yellow-400 bg-yellow-900 shadow-lg shadow-yellow-400/20"
                : "border-gray-600 bg-gray-800"
            }`}
          >
            <h2 className="text-xl font-semibold">{player.name}</h2>
            <p className="text-2xl mt-2">{player.lives > 0 ? "❤️".repeat(player.lives) : "💀 Out of Game"}</p>
          </div>
        ))}
      </section>

      <section className="relative flex items-center justify-center gap-8 h-64 w-full">
        <div className="absolute w-full h-full bg-green-900/20 rounded-full blur-3xl"></div>
        <div className="relative w-40 h-56 transform hover:scale-105 transition-transform">
          <div className="relative w-full h-full rounded-lg bg-blue-800 border-2 border-blue-500 flex items-center justify-center shadow-2xl">
            <span className="text-5xl font-bold text-blue-200">POP</span>
            <span className="absolute -bottom-2 -right-2 bg-gray-900 rounded-full px-3 py-1 text-sm font-bold border-2 border-blue-400">{deck.length}</span>
          </div>
        </div>
        <div className="relative w-40 h-56 transform hover:scale-105 transition-transform">
          {currentCard ? (
            <div className="relative w-full h-full rounded-lg bg-white border-4 border-gray-300 flex flex-col items-center justify-center shadow-2xl p-2">
              <span className={`text-7xl font-bold ${
                  currentCard.suit === "Hearts" || currentCard.suit === "Diamonds"
                    ? "text-red-600"
                    : "text-black"
                }`}
              >
                {currentCard.rank.length > 2 ? currentCard.rank.charAt(0) : currentCard.rank}
              </span>
            </div>
          ) : (
             <div className="relative w-full h-full rounded-lg bg-gray-500 border-4 border-gray-400 flex items-center justify-center shadow-inner"></div>
          )}
        </div>
      </section>

      <section className="mt-8 h-16 flex items-center justify-center">
        <div className="flex gap-4">
            {gameState === "AWAITING_COLOR_GUESS" && (
                <>
                    <button onClick={() => handleColorGuess("Red")} className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Red</button>
                    <button onClick={() => handleColorGuess("Black")} className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border-2 border-white rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Black</button>
                </>
            )}
            {gameState === "AWAITING_KEEP_OR_CHANGE" && (
                <>
                    <button onClick={handleKeepCard} className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Keep Card</button>
                    <button onClick={handleChangeCard} className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Change Card</button>
                </>
            )}
            {gameState === "AWAITING_HIGHER_LOWER" && (
                <>
                    <button onClick={() => handleHigherLowerGuess('Higher')} className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Higher</button>
                    <button onClick={() => handleHigherLowerGuess('Lower')} className="px-8 py-4 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Lower</button>
                </>
            )}
            {gameState === "PLAY_OR_PASS" && (
                <>
                    <button onClick={handlePlay} className="px-8 py-4 bg-teal-500 hover:bg-teal-600 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Play</button>
                    <button onClick={handlePass} className="px-8 py-4 bg-orange-500 hover:bg-orange-600 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Pass</button>
                </>
            )}
            {gameState === "GAME_OVER" && (
                <button onClick={handlePlayAgain} className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-xl transition-transform transform hover:scale-110">Play Again?</button>
            )}
        </div>
      </section>
    </main>
  );
} 