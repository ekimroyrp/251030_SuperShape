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
import chroma from "chroma-js";
import {
  SuperShapeParams,
  createSuperShapeGeometry,
  updateSuperShapeGeometry,
  GradientStops,
} from "./supershape";
import {
  DEFAULT_PRESET_ID,
  SUPER_SHAPE_PRESETS,
  getPresetById,
} from "./presets";

interface SuperShapeControls extends SuperShapeParams {
  autoRotate: boolean;
  rotationSpeed: number;
  showStats: boolean;
}

interface UIState extends SuperShapeControls {
  selectedPreset: string;
  cyclePresets: boolean;
  cycleDuration: number;
  morphDuration: number;
  wireframe: boolean;
  gradientStart: string;
  gradientEnd: string;
}

interface MorphState {
  start: SuperShapeParams;
  end: SuperShapeParams;
  startTime: number;
  duration: number;
}

const PARAM_KEYS: (keyof SuperShapeParams)[] = [
  "m1",
  "m2",
  "n1",
  "n2",
  "n3",
  "a",
  "b",
  "radius",
  "latSegments",
  "lonSegments",
];

const CUSTOM_PRESET_ID = "custom";

const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const FALLBACK_PARAMS: SuperShapeParams = {
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
};

const defaultPreset =
  getPresetById(DEFAULT_PRESET_ID) ?? SUPER_SHAPE_PRESETS[0];
const initialParams = { ...(defaultPreset?.params ?? FALLBACK_PARAMS) };

const controlState: UIState = {
  ...initialParams,
  autoRotate: false,
  rotationSpeed: 0.25,
  showStats: false,
  selectedPreset: defaultPreset?.id ?? CUSTOM_PRESET_ID,
  cyclePresets: false,
  cycleDuration: 6,
  morphDuration: 1.5,
  wireframe: false,
  gradientStart: "#e1ff00",
  gradientEnd: "#4400ff",
};

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

const camera = new PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
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

const material = new MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.35,
  metalness: 0.2,
  emissive: new Color(0x0d1b3a),
  vertexColors: true,
  wireframe: controlState.wireframe,
});

const controllerMap = new Map<string, any>();

const updateController = (key: keyof UIState) => {
  const controller = controllerMap.get(key as string);
  if (controller) {
    controller.updateDisplay();
  }
};

const registerController = <K extends keyof UIState>(
  key: K,
  controller: any
) => {
  controllerMap.set(key as string, controller);
  return controller;
};

let needsUpdate = true;
let needsRebuild = false;
let morph: MorphState | null = null;
let lastPresetSwitch = performance.now();
let presetIndex = Math.max(
  0,
  SUPER_SHAPE_PRESETS.findIndex(
    (preset) => preset.id === controlState.selectedPreset
  )
);

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

const getGradientStops = (): GradientStops => {
  const start = chroma(controlState.gradientStart).gl();
  const end = chroma(controlState.gradientEnd).gl();
  return {
    start: [start[0], start[1], start[2]],
    end: [end[0], end[1], end[2]],
  };
};

const setParamsInstant = (params: SuperShapeParams) => {
  PARAM_KEYS.forEach((key) => {
    (controlState as any)[key] = params[key];
    updateController(key as keyof UIState);
  });
};

const markCustom = () => {
  if (controlState.selectedPreset !== CUSTOM_PRESET_ID) {
    controlState.selectedPreset = CUSTOM_PRESET_ID;
    updateController("selectedPreset");
  }
  if (controlState.cyclePresets) {
    controlState.cyclePresets = false;
    updateController("cyclePresets");
  }
  morph = null;
};

const applyPreset = (presetId: string, animate = true) => {
  if (presetId === CUSTOM_PRESET_ID) {
    controlState.selectedPreset = CUSTOM_PRESET_ID;
    updateController("selectedPreset");
    return;
  }

  const preset = getPresetById(presetId);
  if (!preset) {
    return;
  }

  const currentParams = getParams();
  const targetParams = { ...preset.params };

  controlState.selectedPreset = presetId;
  updateController("selectedPreset");

  if (animate && controlState.morphDuration > 0.05) {
    morph = {
      start: currentParams,
      end: targetParams,
      startTime: performance.now(),
      duration: controlState.morphDuration * 1000,
    };
  } else {
    morph = null;
    setParamsInstant(targetParams);
    scheduleUpdate(true);
  }

  presetIndex = Math.max(
    0,
    SUPER_SHAPE_PRESETS.findIndex((candidate) => candidate.id === presetId)
  );
  lastPresetSwitch = performance.now();
};

const geometry = createSuperShapeGeometry(getParams(), getGradientStops());
const supershape = new Mesh(geometry, material);
scene.add(supershape);

const stats = new Stats();
stats.dom.style.position = "absolute";
stats.dom.style.left = "1rem";
stats.dom.style.bottom = "1rem";
stats.dom.style.zIndex = "10";
stats.dom.style.display = controlState.showStats ? "block" : "none";
mount.appendChild(stats.dom);

const gui = new GUI({ width: 320 });

const formulaFolder = gui.addFolder("Superformula");

registerController(
  "m1",
  formulaFolder
    .add(controlState, "m1", 0, 20, 0.1)
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
registerController(
  "m2",
  formulaFolder
    .add(controlState, "m2", 0, 20, 0.1)
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
registerController(
  "n1",
  formulaFolder
    .add(controlState, "n1", 0.01, 10, 0.01)
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
registerController(
  "n2",
  formulaFolder
    .add(controlState, "n2", 0.01, 10, 0.01)
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
registerController(
  "n3",
  formulaFolder
    .add(controlState, "n3", 0.01, 10, 0.01)
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
registerController(
  "a",
  formulaFolder
    .add(controlState, "a", 0.01, 5, 0.01)
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
registerController(
  "b",
  formulaFolder
    .add(controlState, "b", 0.01, 5, 0.01)
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
formulaFolder.open();

const detailFolder = gui.addFolder("Surface Detail");
registerController(
  "latSegments",
  detailFolder
    .add(controlState, "latSegments", 8, 256, 1)
    .name("Latitude Segments")
    .onChange(() => {
      scheduleUpdate();
    })
    .onFinishChange(markCustom)
);
registerController(
  "lonSegments",
  detailFolder
    .add(controlState, "lonSegments", 12, 360, 1)
    .name("Longitude Segments")
    .onChange(() => {
      scheduleUpdate();
    })
    .onFinishChange(markCustom)
);
registerController(
  "radius",
  detailFolder
    .add(controlState, "radius", 0.2, 3, 0.01)
    .name("Radius")
    .onChange(() => scheduleUpdate())
    .onFinishChange(markCustom)
);
detailFolder.open();

const presentationFolder = gui.addFolder("Presentation");
const gradientFolder = presentationFolder.addFolder("Gradient");
gradientFolder.open();
registerController(
  "gradientStart",
  gradientFolder
    .addColor(controlState, "gradientStart")
    .name("Low Color")
    .onChange(() => {
      markCustom();
      scheduleUpdate();
    })
);
registerController(
  "gradientEnd",
  gradientFolder
    .addColor(controlState, "gradientEnd")
    .name("High Color")
    .onChange(() => {
      markCustom();
      scheduleUpdate();
    })
);
registerController(
  "autoRotate",
  presentationFolder.add(controlState, "autoRotate").name("Auto Rotate")
);
registerController(
  "rotationSpeed",
  presentationFolder
    .add(controlState, "rotationSpeed", 0, 2, 0.01)
    .name("Rotation Speed")
);
registerController(
  "showStats",
  presentationFolder
    .add(controlState, "showStats")
    .name("Show Stats")
    .onChange((value: boolean) => {
      stats.dom.style.display = value ? "block" : "none";
    })
);
registerController(
  "wireframe",
  presentationFolder
    .add(controlState, "wireframe")
    .name("Wireframe")
    .onChange((value: boolean) => {
      material.wireframe = value;
      material.needsUpdate = true;
    })
);

const presetOptions: Record<string, string> = {
  Custom: CUSTOM_PRESET_ID,
};
SUPER_SHAPE_PRESETS.forEach((preset) => {
  presetOptions[preset.name] = preset.id;
});

registerController(
  "selectedPreset",
  presentationFolder
    .add(controlState, "selectedPreset", presetOptions)
    .name("Preset")
    .onChange((value: string) => {
      applyPreset(value, true);
    })
);

registerController(
  "morphDuration",
  presentationFolder
    .add(controlState, "morphDuration", 0, 10, 0.05)
    .name("Morph Duration")
);
registerController(
  "cyclePresets",
  presentationFolder
    .add(controlState, "cyclePresets")
    .name("Cycle Presets")
    .onChange((value: boolean) => {
      lastPresetSwitch = performance.now();
      if (value && controlState.selectedPreset === CUSTOM_PRESET_ID) {
        applyPreset(defaultPreset?.id ?? SUPER_SHAPE_PRESETS[0].id, false);
      }
    })
);
registerController(
  "cycleDuration",
  presentationFolder
    .add(controlState, "cycleDuration", 2, 30, 0.5)
    .name("Cycle Sec")
);
presentationFolder.open();

if (controlState.selectedPreset !== CUSTOM_PRESET_ID) {
  applyPreset(controlState.selectedPreset, false);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const animate = () => {
  requestAnimationFrame(animate);

  const now = performance.now();

  if (controlState.showStats) {
    stats.begin();
  }

  if (morph) {
    const currentMorph = morph;
    const elapsed = now - currentMorph.startTime;
    const duration = Math.max(1, currentMorph.duration);
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(t);
    PARAM_KEYS.forEach((key) => {
      const startVal = currentMorph.start[key];
      const endVal = currentMorph.end[key];
      const interpolated = startVal + (endVal - startVal) * eased;
      (controlState as any)[key] = interpolated;
      updateController(key as keyof UIState);
    });
    scheduleUpdate();
    if (t >= 1) {
      setParamsInstant(currentMorph.end);
      scheduleUpdate(true);
      morph = null;
    }
  } else if (controlState.cyclePresets) {
    const cycleMs = controlState.cycleDuration * 1000;
    if (now - lastPresetSwitch >= cycleMs) {
      presetIndex = (presetIndex + 1) % SUPER_SHAPE_PRESETS.length;
      applyPreset(SUPER_SHAPE_PRESETS[presetIndex].id, true);
    }
  }

  if (needsUpdate) {
    const nextParams = getParams();
    const gradientStops = getGradientStops();
    if (needsRebuild) {
      const newGeometry = createSuperShapeGeometry(nextParams, gradientStops);
      supershape.geometry.dispose();
      supershape.geometry = newGeometry;
      needsRebuild = false;
    } else {
      updateSuperShapeGeometry(supershape.geometry, nextParams, gradientStops);
    }
    needsUpdate = false;
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

animate();
