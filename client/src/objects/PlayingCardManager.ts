import { Object3D } from "three";
import {
  CARD_DIMENSIONS,
  CARD_PADDING,
  Card,
  Pip,
  Suit,
  fourOfSpades,
  playingCards52,
} from "../types/cards";
import { Coord3D } from "../types/world";
import PlayingCard from "./PlayingCard";
import { PositionGenerator } from "./PositionGenerator";
import { isEqual } from "lodash-es";
import * as THREE from "three";

export default class PlayingCardManager {
  private scene: THREE.Scene;
  private playingCards: PlayingCard[];
  private positionManager: PositionGenerator;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.playingCards = [];
    this.positionManager = new PositionGenerator(
      this.playingCards.length,
      CARD_DIMENSIONS
    );
  }

  createStack(playingCards: Card[] = playingCards52): void {
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

  async deleteStack() {
    await Promise.all(
      this.playingCards.map(async (playingCard) => {
        await playingCard.fadeOut();
        const mesh = playingCard.getCardMesh();
        const materials = mesh.material;
        if (Array.isArray(materials)) {
          materials.forEach((material) => material.dispose());
        } else {
          materials.dispose();
        }
        mesh.geometry.dispose();
        this.scene.remove(mesh);
      })
    );
    console.log("deleted stack", this.playingCards);
    this.playingCards = [];
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

  async moveCardsToGridPositions2d(columns: number, rows: number) {
    await this.updateCardPositions(
      this.positionManager.generateGridPositions2d([0, 0, 0], columns, rows, [
        CARD_PADDING[0],
        CARD_PADDING[1],
      ])
    );
  }

  moveCardsToSpiralPositions() {
    this.updateCardPositions(
      this.positionManager.generateHelixPositions([0, 0, 0])
    );
  }

  moveCardsToSpherePositions() {
    this.updateCardPositions(
      this.positionManager.generateSpherePositions([0, 0, 0])
    );
  }

  async updateCardPositions(
    positions: Coord3D[],
    durationMs?: number
  ): Promise<void> {
    const promises = [];
    for (let i = 0; i < this.playingCards.length; i++) {
      promises.push(
        this.playingCards[i].moveCardToSmoothly(positions[i], durationMs)
      );
    }
    await Promise.all(promises);
  }

  selectCard(object: Object3D<THREE.Event>) {
    const selectedCard = this.playingCards.find(
      (card) => card.getCardMesh().uuid === object.uuid
    );
    if (!selectedCard) {
      return;
    }
    const newValue = fourOfSpades;
    const oldValue = selectedCard.getCardValue();

    const cardToSwitchWith = this.playingCards.find((card) =>
      isEqual(card.getCardValue(), newValue)
    );
    if (!cardToSwitchWith) {
      throw new Error("No card to switch with");
    }

    selectedCard.updateCardValue(newValue);
    cardToSwitchWith.updateCardValue(oldValue);
  }

  flipCards() {
    for (const playingCard of this.playingCards) {
      playingCard.flipCard();
    }
  }

  async flipCard(card: Card) {
    const playingCard = this.findCard(card);
    if (!playingCard) {
      return;
    }
    await playingCard.flipCard();
  }

  findCard(value: Card) {
    return this.playingCards.find((card) =>
      isEqual(card.getCardValue(), value)
    );
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
