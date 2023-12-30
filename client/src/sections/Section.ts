import { PerspectiveCamera, Scene } from "three";
import PlayingCardManager from "../objects/PlayingCardManager";

export default class Section {
  public scene: Scene;
  public camera: PerspectiveCamera;
  public cardManager: PlayingCardManager;

  constructor(
    scene: Scene,
    camera: PerspectiveCamera,
    cardManager: PlayingCardManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.cardManager = cardManager;
  }

  public next(): void {
    console.log("next");
  }

  public previous(): void {
    console.log("previous");
  }

  public reset(): void {
    console.log("reset");
  }
}
