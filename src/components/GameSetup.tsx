"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "@/lib/types";
import useAssetPreloader, { useViewportSize } from "@/hooks/useAssetPreloader";

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
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "CPU 2"]);
  const [playerTypes, setPlayerTypes] = useState<boolean[]>([false, true]); // false = human, true = computer
  const { progress, preloadAssets } = useAssetPreloader();
  const viewport = useViewportSize();

  // Start preloading assets when component mounts
  useEffect(() => {
    preloadAssets();
  }, [preloadAssets]);

  const handleNumPlayersChange = (count: number) => {
    setNumPlayers(count);
    const newTypes = Array.from({ length: count }, (_, i) => {
      // First player defaults to human, others to computer
      if (i === 0) return false;
      return playerTypes[i] !== undefined ? playerTypes[i] : true;
    });
    const newNames = Array.from({ length: count }, (_, i) => {
      // If we already have a name for this player, keep it
      if (playerNames[i]) return playerNames[i];
      // Otherwise, set default name based on type
      const isComputer = newTypes[i];
      return isComputer ? `CPU ${i + 1}` : `Player ${i + 1}`;
    });
    setPlayerNames(newNames);
    setPlayerTypes(newTypes);
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handlePlayerTypeToggle = (index: number) => {
    const newTypes = [...playerTypes];
    const newNames = [...playerNames];
    const wasComputer = newTypes[index];
    const willBeComputer = !wasComputer;
    
    newTypes[index] = willBeComputer;
    
    // Update name only if it matches the default pattern
    const currentName = newNames[index];
    const defaultHumanName = `Player ${index + 1}`;
    const defaultComputerName = `CPU ${index + 1}`;
    
    if (willBeComputer && currentName === defaultHumanName) {
      // Switching to computer and has default human name
      newNames[index] = defaultComputerName;
    } else if (!willBeComputer && currentName === defaultComputerName) {
      // Switching to human and has default computer name
      newNames[index] = defaultHumanName;
    }
    
    setPlayerTypes(newTypes);
    setPlayerNames(newNames);
    playButtonSound();
  };

  const handleStartGame = () => {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `${index + 1}`,
      name: name.trim() || `Player ${index + 1}`,
      lives: 4,
      isComputer: playerTypes[index],
    }));
    onGameStart(players);
  };

  return (
    <div 
      className={`game-container flex flex-col items-center justify-center bg-gray-900 text-white ${viewport.isSmallScreen ? 'mobile-compact' : 'p-4 md:p-8'}`}
      style={{
        // Move content up by half the safe area inset to visually center it on mobile
        transform: viewport.isSmallScreen ? 'translateY(calc(-0.5 * env(safe-area-inset-top, 0px)))' : 'none',
        minHeight: '100dvh', // Use dynamic viewport height with fallback
      }}
    >
      <div className={`flex items-center justify-center gap-4 ${viewport.isSmallScreen ? 'mb-4' : 'mb-8'}`}>
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
          <svg xmlns="http://www.w3.org/2000/svg" className={`${viewport.isTinyScreen ? 'h-6 w-6' : 'h-8 w-8 md:h-10 md:w-10'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Title */}
        <h1 className={`${viewport.isTinyScreen ? 'text-2xl' : 'text-4xl md:text-5xl'} font-bold text-yellow-400 text-center font-cinzel`}>Game Setup</h1>

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
            <svg xmlns="http://www.w3.org/2000/svg" className={`${viewport.isTinyScreen ? 'h-6 w-6' : 'h-8 w-8 md:h-10 md:w-10'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l-5-5m0 5l5-5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className={`${viewport.isTinyScreen ? 'h-6 w-6' : 'h-8 w-8 md:h-10 md:w-10'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>
      
      <div className={`bg-gray-800 ${viewport.isSmallScreen ? 'p-4' : numPlayers >= 5 ? 'p-4 md:p-6' : 'p-6 md:p-8'} rounded-lg shadow-lg w-full ${numPlayers >= 5 ? 'max-w-sm md:max-w-md' : 'max-w-sm md:max-w-lg'}`}>
        <div className={`${numPlayers >= 5 ? 'mb-4' : 'mb-6'}`}>
          <label className={`block text-base md:text-lg font-medium text-gray-300 ${numPlayers >= 5 ? 'mb-2' : 'mb-4'} text-center`}>
            Number of Players
          </label>
          <div className="flex justify-center gap-2">
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => {
                  playButtonSound();
                  handleNumPlayersChange(n);
                }}
                className={`
                  relative w-12 h-16 rounded-md border-2 transition-all duration-200 transform hover:scale-105 hover:-translate-y-1
                  ${numPlayers === n 
                    ? 'bg-white border-yellow-400 text-red-600 shadow-lg shadow-yellow-400/50' 
                    : 'bg-gray-100 border-gray-400 text-gray-900 hover:bg-white hover:border-gray-300'
                  }
                `}
                aria-label={`Select ${n} players`}
                tabIndex={0}
              >
                {/* Card corner numbers */}
                <div className="absolute top-0.5 left-0.5 text-xs font-bold">
                  {n}
                </div>
                <div className="absolute bottom-0.5 right-0.5 text-xs font-bold rotate-180">
                  {n}
                </div>
                
                {/* Center number */}
                <div className="flex items-center justify-center h-full">
                  <span className="text-3xl font-bold font-cinzel">
                    {n}
                  </span>
                </div>
                
                {/* Playing card suit decoration */}
                <div className="absolute top-3 left-0.5 text-xs opacity-60">
                  {n === 2 ? '♠' : n === 3 ? '♥' : n === 4 ? '♦' : n === 5 ? '♣' : '♠'}
                </div>
                <div className="absolute bottom-3 right-0.5 text-xs opacity-60 rotate-180">
                  {n === 2 ? '♠' : n === 3 ? '♥' : n === 4 ? '♦' : n === 5 ? '♣' : '♠'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={`${numPlayers >= 5 ? 'mb-4' : 'mb-6'}`}>
            <div className={`flex items-center justify-between ${numPlayers >= 5 ? 'mb-1' : 'mb-2'}`}>
                <h2 className="text-base md:text-lg font-medium text-gray-300">Player Names</h2>
                <span className="text-sm font-medium text-gray-400">Human/CPU</span>
            </div>
            <div className={`${numPlayers >= 5 ? 'space-y-2' : 'space-y-3 md:space-y-4'}`}>
                {playerNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(index, e.target.value)}
                            className={`flex-1 ${numPlayers >= 5 ? 'p-2.5' : 'p-3'} bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base md:text-lg`}
                        />
                        <button
                            onClick={() => handlePlayerTypeToggle(index)}
                            className="relative inline-flex items-center w-16 h-8 rounded-full border-2 border-gray-600 bg-gray-700 transition-all duration-200 hover:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50"
                            aria-label={playerTypes[index] ? "Switch to human" : "Switch to computer"}
                            tabIndex={0}
                        >
                            {/* Toggle switch background */}
                            <div className={`absolute inset-0 rounded-full transition-all duration-200 ${playerTypes[index] ? 'bg-blue-600' : 'bg-green-600'}`}>
                                {/* Switch handle */}
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-200 transform ${playerTypes[index] ? 'translate-x-8' : 'translate-x-0.5'}`}>
                                    {/* Icon inside handle */}
                                    <div className="flex items-center justify-center w-full h-full">
                                        {playerTypes[index] ? (
                                            // Robot icon (CPU on right)
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h2v2H9V9zm4 0h2v2h-2V9zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z" />
                                            </svg>
                                        ) : (
                                            // Human icon (Human on left)
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    </div>
                ))}
            </div>
        </div>

        <button
          onClick={handleStartGame}
          disabled={!progress.isComplete}
          className={`w-full ${numPlayers >= 5 ? 'py-2.5 md:py-3' : 'py-3 md:py-4'} rounded-lg font-bold text-lg md:text-xl transition-all transform relative overflow-hidden ${
            progress.isComplete
              ? "bg-green-600 hover:bg-green-700 hover:scale-105 cursor-pointer"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          {/* Progress bar background */}
          {!progress.isComplete && (
            <motion.div
              className="absolute inset-0 bg-yellow-400 opacity-20"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.3 }}
              style={{ left: 0, top: 0, height: '100%' }}
            />
          )}
          
          {/* Button text */}
          <span className="relative z-10">
            {progress.isComplete ? "Start Game" : "Loading..."}
          </span>
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