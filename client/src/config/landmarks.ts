export interface LandmarkConfig {
  src: string;
  /** Horizontal rotation in degrees. Positive = rotate right (pan left in view). */
  initialYaw: number;
}

export const LANDMARKS: LandmarkConfig[] = [
  { src: '/src/assets/equirectangular/TokyoDay.png',    initialYaw: 90 },
  { src: '/src/assets/equirectangular/Everest.jpg',     initialYaw: 70 },
  { src: '/src/assets/equirectangular/NiagraFalls.png', initialYaw: 50 },
  { src: '/src/assets/equirectangular/NiagraNight.png', initialYaw: 80 },
  { src: '/src/assets/equirectangular/DiamondMine.png', initialYaw: 100 },
  // Example video (optional). Uncomment or replace with a valid CORS-enabled video URL to demo video panoramas
  // { src: 'https://example.com/panorama_video.mp4', initialYaw: 0 },
];
