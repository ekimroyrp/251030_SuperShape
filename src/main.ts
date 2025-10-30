import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import GUI from "lil-gui";
import Stats from "stats.js";
import {
  SuperShapeParams,
  createSuperShapeGeometry,
  updateSuperShapeGeometry,
} from "./supershape";

interface SuperShapeControls extends SuperShapeParams {
  autoRotate: boolean;
  rotationSpeed: number;
  showStats: boolean;
}

const mount = document.getElementById("app");

if (!mount) {
  throw new Error("Failed to find #app container");
}

const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.shadowMap.enabled = false;
renderer.domElement.style.display = "block";
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
mount.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(0x05070a);

const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.8, 4.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.5;
controls.maxDistance = 10;

const ambientLight = new AmbientLight(0xbfd2ff, 0.35);
scene.add(ambientLight);

const keyLight = new DirectionalLight(0xffffff, 1.2);
keyLight.position.set(3, 4, 5);
scene.add(keyLight);

const rimLight = new DirectionalLight(0x66aaff, 0.4);
rimLight.position.set(-4, 2, -3);
scene.add(rimLight);

const controlState: SuperShapeControls = {
  m1: 6,
  m2: 7,
  n1: 0.25,
  n2: 1.7,
  n3: 1.7,
  a: 1,
  b: 1,
  radius: 1.6,
  latSegments: 120,
  lonSegments: 240,
  autoRotate: true,
  rotationSpeed: 0.25,
  showStats: false,
};

const material = new MeshStandardMaterial({
  color: 0x80b7ff,
  roughness: 0.35,
  metalness: 0.2,
  emissive: new Color(0x0d1b3a),
});

let geometry = createSuperShapeGeometry(controlState);
const supershape = new Mesh(geometry, material);
scene.add(supershape);

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.left = "1rem";
stats.dom.style.bottom = "1rem";
stats.dom.style.zIndex = "10";
stats.dom.style.display = "none";
mount.appendChild(stats.dom);

let needsUpdate = false;
let needsRebuild = false;

const scheduleUpdate = (rebuild = false) => {
  needsUpdate = true;
  needsRebuild = needsRebuild || rebuild;
};

const getParams = (): SuperShapeParams => ({
  m1: controlState.m1,
  m2: controlState.m2,
  n1: controlState.n1,
  n2: controlState.n2,
  n3: controlState.n3,
  a: controlState.a,
  b: controlState.b,
  radius: controlState.radius,
  latSegments: Math.max(8, Math.floor(controlState.latSegments)),
  lonSegments: Math.max(12, Math.floor(controlState.lonSegments)),
});

const gui = new GUI({ width: 320 });

const formulaFolder = gui.addFolder("Superformula");
formulaFolder.add(controlState, "m1", 0, 20, 0.1).onChange(() => scheduleUpdate());
formulaFolder.add(controlState, "m2", 0, 20, 0.1).onChange(() => scheduleUpdate());
formulaFolder.add(controlState, "n1", 0.01, 10, 0.01).onChange(() => scheduleUpdate());
formulaFolder.add(controlState, "n2", 0.01, 10, 0.01).onChange(() => scheduleUpdate());
formulaFolder.add(controlState, "n3", 0.01, 10, 0.01).onChange(() => scheduleUpdate());
formulaFolder.add(controlState, "a", 0.01, 5, 0.01).onChange(() => scheduleUpdate());
formulaFolder.add(controlState, "b", 0.01, 5, 0.01).onChange(() => scheduleUpdate());
formulaFolder.open();

const detailFolder = gui.addFolder("Surface Detail");
detailFolder
  .add(controlState, "latSegments", 8, 256, 1)
  .name("Latitude Segments")
  .onChange(() => scheduleUpdate(true));
detailFolder
  .add(controlState, "lonSegments", 12, 360, 1)
  .name("Longitude Segments")
  .onChange(() => scheduleUpdate(true));
detailFolder
  .add(controlState, "radius", 0.2, 3, 0.01)
  .name("Radius")
  .onChange(() => scheduleUpdate());

const presentationFolder = gui.addFolder("Presentation");
presentationFolder
  .add(controlState, "autoRotate")
  .name("Auto Rotate");
presentationFolder
  .add(controlState, "rotationSpeed", 0, 2, 0.01)
  .name("Rotation Speed");
presentationFolder
  .add(controlState, "showStats")
  .name("Show Stats")
  .onChange((value: boolean) => {
    stats.dom.style.display = value ? "block" : "none";
  });

gui.close();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const animate = () => {
  requestAnimationFrame(animate);

  if (controlState.showStats) {
    stats.begin();
  }

  if (needsUpdate) {
    const nextParams = getParams();
    if (needsRebuild) {
      const newGeometry = createSuperShapeGeometry(nextParams);
      supershape.geometry.dispose();
      supershape.geometry = newGeometry;
      geometry = newGeometry;
    } else {
      updateSuperShapeGeometry(geometry, nextParams);
    }
    needsUpdate = false;
    needsRebuild = false;
  }

  if (controlState.autoRotate) {
    supershape.rotation.y += controlState.rotationSpeed * 0.01;
    supershape.rotation.x += controlState.rotationSpeed * 0.0025;
  }

  controls.update();
  renderer.render(scene, camera);

  if (controlState.showStats) {
    stats.end();
  }
};

scheduleUpdate(true);
animate();
