import * as THREE from "three";
import { CardSuit, CardValue, getCardFileName } from "../types/cards";

class TextureManager {
  private static instance: TextureManager;
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture>;
  private loadingPromises: Map<string, Promise<THREE.Texture>>;

  private constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
    this.loadingPromises = new Map();
  }

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  public async loadCardTexture(
    suit: CardSuit,
    value: CardValue
  ): Promise<THREE.Texture> {
    const fileName = getCardFileName(suit, value);
    const key = `card-front-${fileName}`;

    // Return cached texture if available
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    // Return existing promise if texture is already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    // Create new loading promise
    const loadingPromise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader
        .loadAsync(`/src/assets/playingCardFaces/${fileName}.svg`)
        .then((texture) => {
          texture.anisotropy = 16; // Improve texture quality
          texture.encoding = THREE.sRGBEncoding;
          this.textureCache.set(key, texture);
          this.loadingPromises.delete(key);
          resolve(texture);
        })
        .catch(reject);
    });

    this.loadingPromises.set(key, loadingPromise);
    return loadingPromise;
  }

  public async loadCardBack(
    color: "RED" | "BLUE" = "RED"
  ): Promise<THREE.Texture> {
    const key = `card-back-${color}`;

    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    const loadingPromise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader
        .loadAsync(`/src/assets/playingCardBacks/${color}_BACK.svg`)
        .then((texture) => {
          texture.anisotropy = 16;
          texture.encoding = THREE.sRGBEncoding;
          this.textureCache.set(key, texture);
          this.loadingPromises.delete(key);
          resolve(texture);
        })
        .catch(reject);
    });

    this.loadingPromises.set(key, loadingPromise);
    return loadingPromise;
  }

  public disposeTexture(suit: CardSuit, value: CardValue) {
    const fileName = getCardFileName(suit, value);
    const key = `card-front-${fileName}`;
    const texture = this.textureCache.get(key);
    if (texture) {
      texture.dispose();
      this.textureCache.delete(key);
    }
  }

  public disposeAll() {
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
    this.loadingPromises.clear();
  }
}

export const textureManager = TextureManager.getInstance();
