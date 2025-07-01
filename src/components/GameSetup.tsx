"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "@/lib/types";

interface GameSetupProps {
  onGameStart: (players: Player[]) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  showRules: boolean;
  onToggleRules: () => void;
  playButtonSound: () => void;
}

export default function GameSetup({ 
  onGameStart, 
  isMuted, 
  onToggleMute, 
  showRules, 
  onToggleRules, 
  playButtonSound 
}: GameSetupProps) {
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "Player 2"]);

  const handleNumPlayersChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value, 10);
    setNumPlayers(count);
    setPlayerNames(Array.from({ length: count }, (_, i) => `Player ${i + 1}`));
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStartGame = () => {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `${index + 1}`,
      name: name.trim() || `Player ${index + 1}`,
      lives: 4,
    }));
    onGameStart(players);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="flex items-center justify-center gap-4 mb-8">
        {/* Info Icon - Left */}
        <button
          onClick={() => {
            playButtonSound();
            onToggleRules();
          }}
          className="text-yellow-400 hover:text-yellow-300 transition-colors p-2"
          aria-label="Show game rules"
          tabIndex={0}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 text-center">Game Setup</h1>

        {/* Speaker Icon - Right */}
        <button
          onClick={() => {
            playButtonSound();
            onToggleMute();
          }}
          className="text-yellow-400 hover:text-yellow-300 transition-colors p-2"
          aria-label={isMuted ? "Unmute sound" : "Mute sound"}
          tabIndex={0}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l-5-5m0 5l5-5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg w-full max-w-sm md:max-w-md">
        <div className="mb-6">
          <label htmlFor="numPlayers" className="block text-base md:text-lg font-medium text-gray-300 mb-2">
            Number of Players
          </label>
          <select
            id="numPlayers"
            value={numPlayers}
            onChange={handleNumPlayersChange}
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base md:text-lg"
          >
            {[2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
            <h2 className="block text-base md:text-lg font-medium text-gray-300 mb-2">Player Names</h2>
            <div className="space-y-3 md:space-y-4">
                {playerNames.map((name, index) => (
                    <input
                        key={index}
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base md:text-lg"
                    />
                ))}
            </div>
        </div>

        <button
          onClick={handleStartGame}
          className="w-full py-3 md:py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg md:text-xl transition-transform transform hover:scale-105"
        >
          Start Game
        </button>
      </div>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => onToggleRules()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
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
                    onClick={() => {
                      playButtonSound();
                      onToggleRules();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 