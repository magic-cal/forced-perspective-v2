import PlayingCard from "../../objects/playingCard";
import { Coord3D } from "../../types/world";

export default interface MovementStrategy {
  move(card: PlayingCard, newPosition: Coord3D): void;
}
