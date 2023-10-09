import * as THREE from "three";
import { Coord3D } from "../types/world";

export class CardMesh {
  private readonly suit: string;
  private readonly pip: string;
  private readonly position: Coord3D;

  constructor(suit: string, pip: string, position: Coord3D) {
    this.suit = suit;
    this.pip = pip;
    this.position = position;
  }

  public createMesh(): THREE.Mesh {
    const colorLight = new THREE.Color(0xffffff);
    const darkMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 40,
      depthTest: false,
    });

    const faceDownMaterial = new THREE.MeshPhongMaterial({
      color: colorLight,
      transparent: true,
      opacity: 0.5,
      shininess: 40,
      depthTest: false,
    });

    const faceUpTexture = new THREE.TextureLoader().load(
      `src/assets/playingCardFaces/${this.suitToLetter(this.suit)}-${
        this.pip
      }.svg`
    );

    const faceUpMaterial = new THREE.MeshPhongMaterial({
      color: colorLight,
      map: faceUpTexture,
      transparent: true,
      shininess: 40,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 0.01), [
      darkMaterial,
      darkMaterial,
      darkMaterial,
      darkMaterial,
      faceUpMaterial,
      faceDownMaterial,
    ]);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.x = 0.65;
    mesh.castShadow = true;
    mesh.position.set(...this.position);

    return mesh;
  }

  private suitToLetter(suit: string): string {
    switch (suit) {
      case "hearts":
        return "h";
      case "diamonds":
        return "d";
      case "clubs":
        return "c";
      case "spades":
        return "s";
      default:
        throw new Error(`Invalid suit: ${suit}`);
    }
  }
}
