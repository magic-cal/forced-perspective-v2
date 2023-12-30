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
  steps = [
    this.setup,
    // this.createMonteCards,
    // this.moveCardsThreeGrid,
  ];

  public async next(): Promise<boolean> {
    await this.steps[this.currentStep].bind(this)();
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      return false;
    }
    return true;
  }

  public async setup() {
    // await this.cardManager.deleteStack();
    await this.createMonteCards();
    // await this.moveCardsThreeGrid();
    // await this.flipCards();
    await this.shuffleCards();
  }

  public async createMonteCards(): Promise<void> {
    this.cardManager.createStack(threeCardMonte());
  }

  public moveCardsThreeGrid(): void {
    this.cardManager.moveCardsToGridPositions2d(3, 1);
  }

  public async flipCards(delayMs = 1000): Promise<void> {
    const cards = threeCardMonte();
    await Promise.all(
      cards.map(async (card, index) => {
        await scheduleAction(() => {
          this.cardManager.flipCard(card);
        }, index * delayMs);
      })
    );
  }

  shuffleCards = async (shuffleRounds = 5, durationMs = 200) => {
    const positionGenerator = new PositionGenerator(3, CARD_DIMENSIONS);
    const positions = positionGenerator.generateGridPositions2d(
      [0, 0, 0],
      3,
      1,
      [CARD_PADDING[0], CARD_PADDING[1]]
    );
    let shufflesPerformed = 0;
    const previousPositions = positions;

    while (shufflesPerformed < shuffleRounds) {
      const shuffledPositions = positions.sort(() => Math.random() - 0.5);
      if (previousPositions !== shuffledPositions) {
        shufflesPerformed++;
        await this.cardManager.updateCardPositions(
          shuffledPositions,
          durationMs
        );
      }
    }
  };
}
