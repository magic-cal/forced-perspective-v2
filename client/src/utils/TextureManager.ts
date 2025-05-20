import * as THREE from "three";
import {
  CardSuit,
  CardValue,
  VALUE_TO_FILE_MAP,
  SUIT_TO_FILE_MAP,
} from "../types/cards";

class TextureManager {
  private static instance: TextureManager;
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture>;
  private loadingPromises: Map<string, Promise<THREE.Texture>>;

  private constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.textureLoader.setCrossOrigin("anonymous"); // Enable cross-origin loading
    this.textureCache = new Map();
    this.loadingPromises = new Map();
  }

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
    }
    return TextureManager.instance;
  }

  private getBaseUrl(): string {
    // Force HTTPS
    return "https://localhost:5173";
  }

  private getCardFilePath(suit: CardSuit, value: CardValue): string {
    const suitLetter = SUIT_TO_FILE_MAP[suit];
    const valueNumber = VALUE_TO_FILE_MAP[value];
    const path = `${this.getBaseUrl()}/src/assets/playingCardFaces/${suitLetter}-${valueNumber}.svg`;
    console.log("Loading card texture:", path);
    return path;
  }

  public async loadCardTexture(
    suit: CardSuit,
    value: CardValue
  ): Promise<THREE.Texture> {
    const filePath = this.getCardFilePath(suit, value);
    const key = `card-front-${suit}-${value}`;

    // Return cached texture if available
    if (this.textureCache.has(key)) {
      console.log("Using cached texture for:", key);
      return this.textureCache.get(key)!;
    }

    // Return existing promise if texture is already loading
    if (this.loadingPromises.has(key)) {
      console.log("Using existing loading promise for:", key);
      return this.loadingPromises.get(key)!;
    }

    console.log("Starting new texture load for:", key);

    // Create new loading promise
    const loadingPromise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader
        .loadAsync(filePath)
        .then((texture) => {
          console.log("Successfully loaded texture for:", key);
          texture.anisotropy = 16;
          texture.encoding = THREE.sRGBEncoding;
          texture.needsUpdate = true;
          texture.flipY = false;
          texture.generateMipmaps = true; // Enable mipmaps for better quality
          this.textureCache.set(key, texture);
          this.loadingPromises.delete(key);
          resolve(texture);
        })
        .catch((error) => {
          console.error("Failed to load texture for:", key, error);
          this.loadingPromises.delete(key);
          reject(error);
        });
    });

    this.loadingPromises.set(key, loadingPromise);
    return loadingPromise;
  }

  public async loadCardBack(
    color: "RED" | "BLUE" = "RED"
  ): Promise<THREE.Texture> {
    const key = `card-back-${color}`;
    const filePath = `${this.getBaseUrl()}/src/assets/playingCardBacks/${color}_BACK.svg`;

    if (this.textureCache.has(key)) {
      console.log("Using cached back texture for:", key);
      return this.textureCache.get(key)!;
    }

    if (this.loadingPromises.has(key)) {
      console.log("Using existing back texture loading promise for:", key);
      return this.loadingPromises.get(key)!;
    }

    console.log("Starting new back texture load for:", key);

    const loadingPromise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader
        .loadAsync(filePath)
        .then((texture) => {
          console.log("Successfully loaded back texture for:", key);
          texture.anisotropy = 16;
          texture.encoding = THREE.sRGBEncoding;
          texture.needsUpdate = true;
          texture.flipY = false;
          texture.generateMipmaps = true; // Enable mipmaps for better quality
          this.textureCache.set(key, texture);
          this.loadingPromises.delete(key);
          resolve(texture);
        })
        .catch((error) => {
          console.error("Failed to load back texture for:", key, error);
          this.loadingPromises.delete(key);
          reject(error);
        });
    });

    this.loadingPromises.set(key, loadingPromise);
    return loadingPromise;
  }

  public disposeTexture(suit: CardSuit, value: CardValue) {
    const key = `card-front-${suit}-${value}`;
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
