import type { SuperShapeParams } from "./supershape";

export interface SuperShapePreset {
  id: string;
  name: string;
  description: string;
  params: SuperShapeParams;
}

const baseSegments = { latSegments: 120, lonSegments: 200 };

export const SUPER_SHAPE_PRESETS: SuperShapePreset[] = [
  {
    id: "sphere",
    name: "Sphere",
    description: "Baseline sphere generated with neutral superformula parameters.",
    params: {
      m1: 0,
      m2: 0,
      n1: 1,
      n2: 1,
      n3: 1,
      a: 1,
      b: 1,
      radius: 1.6,
      ...baseSegments,
    },
  },
  {
    id: "star",
    name: "Twisted Star",
    description: "Asymmetric starfish-like shape with contrasting lobes.",
    params: {
      m1: 6,
      m2: 7,
      n1: 0.3,
      n2: 1.7,
      n3: 1.7,
      a: 1,
      b: 1,
      radius: 1.6,
      ...baseSegments,
    },
  },
  {
    id: "flower",
    name: "Polar Bloom",
    description: "Petal-like bloom with soft curvature and pronounced poles.",
    params: {
      m1: 8,
      m2: 16,
      n1: 0.55,
      n2: 0.9,
      n3: 0.9,
      a: 1,
      b: 1,
      radius: 1.55,
      latSegments: 140,
      lonSegments: 220,
    },
  },
  {
    id: "asteroid",
    name: "Craggy Asteroid",
    description: "Chunky, near-cubic form with sharp ridges and heavy facets.",
    params: {
      m1: 3,
      m2: 3,
      n1: 0.2,
      n2: 1.2,
      n3: 1.2,
      a: 1,
      b: 1,
      radius: 1.4,
      latSegments: 120,
      lonSegments: 140,
    },
  },
  {
    id: "urchin",
    name: "Sea Urchin",
    description: "Spiky urchin form with elongated spikes along the poles.",
    params: {
      m1: 10,
      m2: 8,
      n1: 0.2,
      n2: 1,
      n3: 1,
      a: 1,
      b: 1,
      radius: 1.75,
      latSegments: 150,
      lonSegments: 260,
    },
  },
  {
    id: "toroid",
    name: "Toroidal Shell",
    description: "Hollow torus-like shape produced by high angular modulation.",
    params: {
      m1: 6,
      m2: 12,
      n1: 0.8,
      n2: 2.2,
      n3: 2.2,
      a: 1,
      b: 1,
      radius: 1.3,
      latSegments: 140,
      lonSegments: 260,
    },
  },
];

export const DEFAULT_PRESET_ID = SUPER_SHAPE_PRESETS[1]?.id ?? SUPER_SHAPE_PRESETS[0].id;

export function getPresetById(id: string): SuperShapePreset | undefined {
  return SUPER_SHAPE_PRESETS.find((preset) => preset.id === id);
}
