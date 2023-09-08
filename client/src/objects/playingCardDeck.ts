import { Pip, Suit, allCards, cardDimensions } from "../types/cards";
import { Coord3D } from "../types/world";
import PlayingCard from "./playingCard";

export default class PlayingCardDeck {
  private scene: THREE.Scene;
  private playingCards: PlayingCard[]; // Specify the type

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.playingCards = [];
  }

  createDeck(): void {
    // Create a playingCard for each card in the deck
    let zOffset = 0;
    for (const card of allCards) {
      zOffset += cardDimensions[2];
      const position: Coord3D = [0, 0, zOffset];
      const playingCard = this.createPlayingCard(position, card.suit, card.pip);
      this.addPlayingCard(playingCard);
    }
  }

  createPlayingCard(position: Coord3D, suit: Suit, pip: Pip): PlayingCard {
    return new PlayingCard(position, suit, pip);
  }

  addPlayingCard(playingCard: PlayingCard): void {
    this.playingCards.push(playingCard);
    this.scene.add(playingCard.getCardMesh());
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
