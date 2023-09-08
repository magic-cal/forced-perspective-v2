import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Resizer from "./world-utils/resizer";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { SocketEventService } from "./sockets/SocketEventService";
import { throttle } from "lodash-es";
import { TypedSocketEventService } from "./sockets/TypedSocketEventService";
import {
  CameraChangedEventData,
  MouseDownEventData,
} from "../../shared/SocketEvents";
import PlayingCardDeck from "./objects/playingCardDeck";

export interface ForcedPerspectiveOptions {
  debug: boolean;
}

const defaultOptions: ForcedPerspectiveOptions = {
  debug: false,
};

const CAMERA_THROTTLE_MS = 10;

class ForcedPerspective {
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer | THREE.WebGL1Renderer;
  controls: OrbitControls;
  cameraUpdateService: TypedSocketEventService<CameraChangedEventData>;
  mouseDownUpdateService: TypedSocketEventService<MouseDownEventData>;
  debug: boolean;

  constructor(
    options: ForcedPerspectiveOptions = defaultOptions,
    socketEventService: SocketEventService
  ) {
    this.debug = options.debug;
    this.camera = this.setupCamera();
    this.scene = this.createScene({ backgroundColor: "#d3d3d3" });
    this.renderer = this.createRenderer();
    this.controls = this.setupControls();
    this.setupLights();
    this.addObjects();
    this.setupDebug(options.debug);
    this.setupVr();
    this.addResizer();
    [this.cameraUpdateService, this.mouseDownUpdateService] =
      this.addSocketUpdateServices(socketEventService);

    this.addCameraSynchronization();
    this.addControllerSynchronization();
    this.addPlayingCardsDeck();
  }

  addSocketUpdateServices(socketEventService: SocketEventService) {
    const cameraUpdateService =
      new TypedSocketEventService<CameraChangedEventData>(
        socketEventService,
        "camera-changed"
      );
    const mouseDownUpdateService =
      new TypedSocketEventService<MouseDownEventData>(
        socketEventService,
        "mouse-down"
      );

    return [cameraUpdateService, mouseDownUpdateService] as const;
  }

  addControllerSynchronization() {
    this.mouseDownUpdateService.addEventListener((data) => {});
    window.addEventListener("click", (e: MouseEvent) => {
      this.mouseDownUpdateService.emit({
        x: e.clientX,
        y: e.clientY,
      });
    });
  }
  addCameraSynchronization() {
    this.cameraUpdateService.addEventListener((data) => {
      this.camera.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
      this.camera.rotation.set(
        data.rotation.x,
        data.rotation.y,
        data.rotation.z
      );
    });
    this.controls.addEventListener(
      "change",
      throttle(() => {
        this.cameraUpdateService.emit({
          position: {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
          },
          rotation: {
            x: this.camera.rotation.x,
            y: this.camera.rotation.y,
            z: this.camera.rotation.z,
          },
        });
      }, CAMERA_THROTTLE_MS)
    );
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

  addPlayingCardsDeck() {
    const playingCardDeck = new PlayingCardDeck(this.scene);
    playingCardDeck.createDeck();
  }

  addCube() {
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

const forcedPerspective = new ForcedPerspective(
  { debug: true },
  new SocketEventService()
);
forcedPerspective.start();
