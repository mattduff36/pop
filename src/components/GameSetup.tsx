"use client";

import { useState } from "react";
import { Player } from "@/lib/types";

interface GameSetupProps {
  onGameStart: (players: Player[]) => void;
}

export default function GameSetup({ onGameStart }: GameSetupProps) {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-5xl font-bold text-yellow-400 mb-8">Game Setup</h1>
      
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="mb-6">
          <label htmlFor="numPlayers" className="block text-lg font-medium text-gray-300 mb-2">
            Number of Players
          </label>
          <select
            id="numPlayers"
            value={numPlayers}
            onChange={handleNumPlayersChange}
            className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {[2, 3, 4, 5, 6].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="mb-6">
            <h2 className="block text-lg font-medium text-gray-300 mb-2">Player Names</h2>
            <div className="space-y-4">
                {playerNames.map((name, index) => (
                    <input
                        key={index}
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        className="w-full p-3 bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                ))}
            </div>
        </div>

        <button
          onClick={handleStartGame}
          className="w-full py-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-xl transition-transform transform hover:scale-105"
        >
          Start Game
        </button>
      </div>
    </div>
  );
} 