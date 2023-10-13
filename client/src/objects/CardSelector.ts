import { Raycaster } from "three";
import PlayingCardManager from "./PlayingCardManager";

export default class CardRaycaster {
  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private cardManager: PlayingCardManager
  ) {}

  public selectObjects(mouse: THREE.Vector2) {
    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children);
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      console.log({ selectedObject });
      console.log(this.cardManager);
      this.cardManager.selectCard(selectedObject);
    }
  }
}
