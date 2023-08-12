import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Resizer from "./world-utils/resizer";
// import TWEEN from "@tweenjs/tween.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
// import io from "socket.io-client";

export interface ForcedPerspectiveOptions {
  debug: boolean;
}

const defaultOptions: ForcedPerspectiveOptions = {
  debug: false,
};

class ForcedPerspective {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer | THREE.WebGL1Renderer;
  controls: OrbitControls;

  constructor(options: ForcedPerspectiveOptions = defaultOptions) {
    this.camera = this.setupCamera();
    this.scene = this.createScene({ backgroundColor: "#d3d3d3" });
    this.renderer = this.createRenderer();
    this.controls = this.setupControls();
    this.setupLights();
    this.addObjects();
    this.setupDebug(options.debug);
    this.setupVr();
    this.addResizer();
  }

  setupVr() {
    if ("xr" in navigator && navigator.xr?.isSessionSupported("immersive-vr")) {
      console.log("XR supported");
      document.body.appendChild(VRButton.createButton(this.renderer));
    }
  }

  addResizer() {
    new Resizer({
      camera: this.camera,
      renderer: this.renderer,
    });
  }

  setupDebug(debug: boolean) {
    if (!debug) {
      return;
    }
    this.scene.add(new THREE.AxesHelper(5));
    this.scene.add(new THREE.GridHelper(10, 10));
  }

  addCube() {
    console.log("tempInit");
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: "#FF0000",
      shadowSide: THREE.BackSide,
    });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
  }

  addObjects() {
    this.addCube();
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    this.scene.add(light);
  }

  setupControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();
    return controls;
  }

  createRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    renderer.render(this.scene, this.camera);
    return renderer;
  }

  createScene({ backgroundColor }: { backgroundColor: string }): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    return scene;
  }

  setupCamera() {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    camera.position.set(0, 0, 20);
    return camera;
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
    });
  }
}

const forcedPerspective = new ForcedPerspective({ debug: true });
forcedPerspective.start();
