import PlayingCardManager from "../objects/PlayingCardManager";
import { PositionGenerator } from "../objects/PositionGenerator";
import { CARD_DIMENSIONS, CARD_PADDING, threeCardMonte } from "../types/cards";
import { scheduleAction } from "../utils/timingUtils";
import Section from "./Section";

export default class ThreeCardMonte extends Section {
  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    cardManager: PlayingCardManager
  ) {
    super(scene, camera, cardManager);
  }

  currentStep = 0;
  steps = [this.setup];

  public async next(): Promise<boolean> {
    await this.steps[this.currentStep].bind(this)();
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      return false;
    }
    return true;
  }

  public async setup() {
    await this.cardManager.deleteStack();
    await this.createMonteCards();
    scheduleAction(async () => {
      await this.moveCardsThreeGrid();
    }, 1000);
    await scheduleAction(async () => {
      await this.flipCards();
    }, 1000);
    await this.shuffleCards();
    await this.flipCards(500);
    await scheduleAction(async () => {
      await this.flipCards(500);
    }, 5000);
    await this.shuffleCards(500);
  }

  public async createMonteCards(): Promise<void> {
    this.cardManager.createStack(threeCardMonte());
  }

  public async moveCardsThreeGrid(): Promise<void> {
    await this.cardManager.moveCardsToGridPositions2d(3, 1);
  }

  public async flipCards(delayMs = 1000): Promise<void> {
    const cards = threeCardMonte();
    await Promise.all(
      cards.map(async (card, index) => {
        await scheduleAction(async () => {
          await this.cardManager.flipCard(card);
        }, index * delayMs);
      })
    );
  }

  async shuffleCards(durationMs = 1000) {
    const shufflePositions = this.generateThreeCardMonteShufflePositions();

    await Promise.all(
      shufflePositions.map(async (positions, index) => {
        await scheduleAction(async () => {
          await this.cardManager.updateCardPositions(positions, durationMs);
        }, index * durationMs);
      })
    );
  }

  generateThreeCardMonteShufflePositions = () => {
    const positionGenerator = new PositionGenerator(3, CARD_DIMENSIONS);
    const pos = positionGenerator.generateGridPositions2d([0, 0, 0], 3, 1, [
      CARD_PADDING[0] * 3,
      CARD_PADDING[1] * 3,
    ]);

    return [
      [pos[0], pos[1], pos[2]],
      [pos[0], pos[1], pos[2]],
      [pos[0], pos[2], pos[1]],
      [pos[0], pos[1], pos[2]],
      [pos[0], pos[2], pos[1]],
      [pos[2], pos[1], pos[0]],
      [pos[2], pos[0], pos[1]],
      [pos[1], pos[0], pos[2]],
      [pos[1], pos[2], pos[0]],
      [pos[1], pos[0], pos[2]],
      [pos[2], pos[0], pos[1]],
      [pos[2], pos[1], pos[0]],
    ];
  };
}
