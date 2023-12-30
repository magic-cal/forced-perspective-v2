import TWEEN from "@tweenjs/tween.js";
import { throttle } from "lodash-es";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import {
  CameraChangedEventData,
  MouseDownEventData,
} from "../../shared/SocketEvents";
import CardRaycaster from "./objects/CardSelector";
import PlayingCardManager from "./objects/PlayingCardManager";
import ThreeCardMonte from "./sections/ThreeCardMonte";
import { SocketEventService } from "./sockets/SocketEventService";
import { TypedSocketEventService } from "./sockets/TypedSocketEventService";
import Resizer from "./utils/resizer";
import Initialisation from "./sections/Initialisation";

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
  playingCardManager: PlayingCardManager;
  cardRaycaster: CardRaycaster;
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
    // this.addObjects();
    this.setupDebug(options.debug);
    this.setupVr();
    this.addResizer();
    [this.cameraUpdateService, this.mouseDownUpdateService] =
      this.addSocketUpdateServices(socketEventService);
    this.addCameraSynchronization();
    this.addControllerSynchronization();
    this.playingCardManager = this.addPlayingCardsManager();
    this.cardRaycaster = this.addCardRaycaster();
  }
  addCardRaycaster() {
    const cardRaycaster = new CardRaycaster(
      this.scene,
      this.camera,
      this.playingCardManager
    );

    window.addEventListener("click", (e: MouseEvent) => {
      const mousePosition = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      cardRaycaster.selectObjects(mousePosition);
    });

    return cardRaycaster;
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
    this.mouseDownUpdateService.addEventListener(() => {});
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

  addPlayingCardsManager() {
    return new PlayingCardManager(this.scene);
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

    const frontFacingLight = new THREE.DirectionalLight(0xffffff);
    frontFacingLight.position.set(1, 1, 1).normalize();
    this.scene.add(frontFacingLight);

    const backFacingLight = new THREE.DirectionalLight(0xffffff);
    backFacingLight.position.set(-1, -1, -1).normalize();
    this.scene.add(backFacingLight);
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

  async start() {
    this.renderer.setAnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
      TWEEN.update();
    });

    const initialisation = new Initialisation(
      this.scene,
      this.camera,
      this.playingCardManager
    );
    await initialisation.next();

    const threeCardMonte = new ThreeCardMonte(
      this.scene,
      this.camera,
      this.playingCardManager
    );
    await threeCardMonte.next();

    // TODO: Refactor this into a section manager
  }
}

const forcedPerspective = new ForcedPerspective(
  { debug: false && import.meta.env.MODE === "development" },
  new SocketEventService()
);
forcedPerspective.start();
