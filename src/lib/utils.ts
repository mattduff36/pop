import { Card } from "./types";

export const getCardImageSrc = (card: Card): string => {
  const rank = card.rank.toLowerCase();
  const suit = card.suit.toLowerCase();
  return `/cards/SVG-cards/${rank}_of_${suit}.svg`;
}; 