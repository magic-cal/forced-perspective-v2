import * as THREE from "three";
import { Mesh } from "three";
import { Coord3D } from "../types/world";
import {
  Pip,
  Suit,
  CARD_DIMENSIONS,
  suitToLetter,
  Card,
  aceOfSpades,
  kingOfHearts,
} from "../types/cards";
import { Tween, Easing } from "@tweenjs/tween.js";

const txtLoader = new THREE.TextureLoader();
const colorLight = new THREE.Color(0xffffff);
let faceDownTexture = txtLoader.load(
  "src/assets/playingCardBacks/RED_BACK.svg"
);
let darkMaterial = new THREE.MeshPhongMaterial({
  transparent: true,
  opacity: 0,
});
let faceDownMaterial = new THREE.MeshPhongMaterial({
  transparent: true,
  map: faceDownTexture,
  shininess: 40,
  depthTest: false,
});
const defaultAnimationDurationMs = 2 * 1000;

export default class PlayingCard {
  select() {
    console.log("selecting card");
    this.updateCardValue(kingOfHearts);
  }

  private position: Coord3D;
  private suit: Suit;
  private pip: Pip;
  private cardMesh: Mesh;

  constructor(position: Coord3D, suit: Suit, pip: Pip) {
    this.position = position;
    this.suit = suit;
    this.pip = pip;
    this.cardMesh = this.createCardMesh();
  }

  updateCardValue(card: Card) {
    this.suit = card.suit;
    this.pip = card.pip;
    this.cardMesh = this.createCardMesh();
  }

  private createCardMesh() {
    let faceUpTexture = txtLoader.load(
      `src/assets/playingCardFaces/${suitToLetter(this.suit)}-${this.pip}.svg`
    );

    let faceUpMaterial = new THREE.MeshPhongMaterial({
      color: colorLight,
      map: faceUpTexture,
      transparent: true,
      shininess: 40,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...CARD_DIMENSIONS), [
      darkMaterial,
      darkMaterial,
      darkMaterial,
      darkMaterial,
      faceUpMaterial,
      faceDownMaterial,
    ]);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.position.set(...this.position);
    mesh.userData = { card: `${suitToLetter(this.suit)}-${this.pip}111` };

    return mesh;

    // Group
    // this.group = new THREE.Group();
    // this.group.add(this.mesh);
    // this.group.position.set(...this.position);

    // this.uuid = this.mesh.uuid;
  }

  public getCardMesh() {
    console.log(this.cardMesh.uuid);
    return this.cardMesh;
  }

  public getPosition() {
    return this.position;
  }

  public moveCardToSmoothly(
    newPosition: Coord3D,
    durationMs = defaultAnimationDurationMs
  ): void {
    const endPosition = new THREE.Vector3(...newPosition);

    const tween = new Tween(this.cardMesh.position)
      .to(endPosition, durationMs)
      .easing(Easing.Quadratic.Out);
    tween.start();
  }

  public rotateCardToSmoothly(
    newRotation: Coord3D,
    durationMs = defaultAnimationDurationMs
  ): void {
    const endRotation = new THREE.Euler(...newRotation);

    const tween = new Tween(this.cardMesh.rotation)
      .to(endRotation, durationMs)

      .easing(Easing.Quadratic.Out);
    tween.start();
  }
}
