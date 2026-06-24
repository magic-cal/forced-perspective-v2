export interface LandmarkConfig {
  src: string;
  /** Horizontal rotation in degrees. Positive = rotate right (pan left in view). */
  initialYaw: number;
}

export const LANDMARKS: LandmarkConfig[] = [
  { src: '/src/assets/equirectangular/TokyoDay1.jpg', initialYaw: 90 },
  { src: '/src/assets/equirectangular/Everest.jpg', initialYaw: 75 },
  { src: '/src/assets/equirectangular/NiagraNight1.jpg', initialYaw: 80 },
  { src: '/src/assets/equirectangular/DiamondMine1.jpg', initialYaw: 100 },
  { src: '/src/assets/Logo.png', initialYaw: 0 },
  // Example video (optional). Uncomment or replace with a valid CORS-enabled video URL to demo video panoramas
  // { src: 'https://example.com/panorama_video.mp4', initialYaw: 0 },
];
