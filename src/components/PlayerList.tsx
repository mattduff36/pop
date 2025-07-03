import React, { memo, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player } from "@/lib/types";

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex: number;
  playerRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

const PlayerList = memo(forwardRef<HTMLDivElement, PlayerListProps>(
  ({ players, currentPlayerIndex, playerRefs }, ref) => {
    return (
      <section
        ref={ref}
        className="w-full flex items-center gap-4 overflow-x-auto py-1"
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
              className={`p-3 rounded-lg border-2 transition-all duration-300 text-center flex-shrink-0 w-32 will-change-transform ${
                currentPlayerIndex === index
                  ? "border-yellow-400 bg-yellow-900 shadow-md shadow-yellow-400/20"
                  : "border-gray-600 bg-gray-800"
              }`}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <h2 className="text-sm font-semibold truncate">{player.name}</h2>
                {player.isComputer && (
                  <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                  </div>
                )}
              </div>
              <p className="text-base">{player.lives > 0 ? "❤️".repeat(player.lives) : "💀"}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </section>
    );
  }
));

PlayerList.displayName = "PlayerList";

export default PlayerList; 