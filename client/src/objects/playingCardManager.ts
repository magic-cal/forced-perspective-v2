import {
  Pip,
  Suit,
  playingCard52,
  CARD_DIMENSIONS,
  CARD_PADDING,
  Card,
} from "../types/cards";
import { Coord3D } from "../types/world";
import { PositionGenerator } from "./PositionGenerator";
import { Object3D } from "three";
import PlayingCard from "./playingCard";

export default class PlayingCardManager {
  private scene: THREE.Scene;
  private playingCards: PlayingCard[]; // Specify the type
  private positionManager: PositionGenerator;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.playingCards = [];
    this.positionManager = new PositionGenerator(
      this.playingCards.length,
      CARD_DIMENSIONS
    );
  }

  createStack(playingCards: Card[] = playingCard52): void {
    // Create a playingCard for each card in the stack
    let yOffset = 0;
    let xOffset = 0;
    let zOffset = 0;

    for (const card of playingCards) {
      zOffset += CARD_DIMENSIONS[2];

      const position: Coord3D = [xOffset, yOffset, zOffset];
      const playingCard = this.createPlayingCard(position, card.suit, card.pip);
      this.addPlayingCard(playingCard);
    }
    this.positionManager.setNumberOfObjects(this.playingCards.length);
    this.moveCardsToStackedPositions();
  }

  createPlayingCard(position: Coord3D, suit: Suit, pip: Pip): PlayingCard {
    return new PlayingCard(position, suit, pip);
  }

  addPlayingCard(playingCard: PlayingCard): void {
    this.playingCards.push(playingCard);
    this.scene.add(playingCard.getCardMesh());
  }

  moveCardsToRandomPositions() {
    this.updateCardPositions(this.positionManager.generateRandomPositions());
  }

  moveCardsToStackedPositions() {
    this.updateCardPositions(
      this.positionManager.generateStackedPositions([0, 0, 0])
    );
  }

  moveCardsToGridPositions2d(columns: number, rows: number) {
    this.updateCardPositions(
      this.positionManager.generateGridPositions2d([0, 0, 0], columns, rows, [
        CARD_PADDING[0],
        CARD_PADDING[1],
      ])
    );
  }

  moveCardsToSpiralPositions() {
    this.updateCardPositions(
      this.positionManager.generateSpiralPositions([0, 0, 0])
    );
  }

  updateCardPositions(positions: Coord3D[]) {
    for (let i = 0; i < this.playingCards.length; i++) {
      this.playingCards[i].moveCardToSmoothly(positions[i]);
    }
  }

  selectCard(object: Object3D<THREE.Event>) {
    const card = this.playingCards.find(
      (card) => card.getCardMesh().uuid === object.uuid
    );
    if (card) {
      card.select();
    }
  }

  // updateSwarmBehavior(): void {
  //   // Update swarm behavior for each playingCard in the collection
  //   for (const playingCard of this.playingCards) {
  //     playingCard.align(this.playingCards);
  //     playingCard.cohesion(this.playingCards);
  //     playingCard.separation(this.playingCards);
  //     playingCard.applyRandomMovement();
  //     playingCard.update();
  //   }
  // }
}

// // Example usage:
// const scene = new THREE.Scene();
// const playingCardCollection = new playingCardCollection(scene);

// // Add playing cards to the collection.
// const card1 = createPlayingCard({ x: 0, y: 0, z: 0 }, "card_texture_1.jpg");
// const card2 = createPlayingCard({ x: 1, y: 0, z: 0 }, "card_texture_2.jpg");
// playingCardCollection.addplayingCard(card1);
// playingCardCollection.addplayingCard(card2);

// // Add other playingCards to the collection (e.g., meshes, models).
// const mesh1 = createCustomMesh({ x: 2, y: 0, z: 0 }, "texture.jpg");
// playingCardCollection.addplayingCard(mesh1);

// // Inside your main application loop
// function animate(): void {
//   requestAnimationFrame(animate);

//   // Update TWEEN
//   TWEEN.update();

//   // Update swarm behavior for all playingCards
//   playingCardCollection.updateSwarmBehavior();

//   // Render the scene
//   renderer.render(scene, camera);
// }

// animate();
