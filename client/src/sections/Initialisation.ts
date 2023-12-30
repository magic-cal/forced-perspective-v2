import PlayingCardManager from "../objects/PlayingCardManager";
import { playingCards52 } from "../types/cards";
import { scheduleAction } from "../utils/timingUtils";
import Section from "./Section";
import TWEEN from "@tweenjs/tween.js";

export default class Initialisation extends Section {
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    cardManager: PlayingCardManager
  ) {
    super(scene, camera, cardManager);
  }

  public async next(): Promise<boolean> {
    await this.step1();
    return true;
  }

  createDeck() {
    this.cardManager.createStack(playingCards52);
  }

  public async step1(): Promise<void> {
    this.createDeck();
    await scheduleAction(async () => {
      await this.cardManager.moveCardsToGridPositions2d(13, 4);
    }, 5000);
    await scheduleAction(() => {
      this.cardManager.moveCardsToRandomPositions();
      const rotation = { y: 0 };
      new TWEEN.Tween(rotation)
        .to({ y: Math.PI }, 5000)
        .easing(TWEEN.Easing.Quadratic.Out)
        // .onUpdate(() => {
        //   this.camera.position.x = 20 * Math.sin(rotation.y);
        //   this.camera.position.z = 20 * Math.cos(rotation.y);
        //   this.camera.lookAt(0, 0, 0);
        // })
        .start();
    }, 5000);
    await scheduleAction(() => {
      this.cardManager.moveCardsToGridPositions2d(13, 4);
    }, 5000);
  }
}
