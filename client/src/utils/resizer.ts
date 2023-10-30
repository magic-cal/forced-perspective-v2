import { Camera, Renderer } from "../types/world";

interface ResizerTypes {
  camera: Camera;
  renderer: Renderer;
}

const setSize = ({ camera, renderer }: ResizerTypes) => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
};
export default class Resizer {
  constructor({ camera, renderer }: ResizerTypes) {
    setSize({ camera, renderer });
    window.addEventListener("resize", () => {
      console.log("resize");
      setSize({ camera, renderer });
    });
  }
}
