import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
} from "three";

export interface SuperShapeParams {
  m1: number;
  m2: number;
  n1: number;
  n2: number;
  n3: number;
  a: number;
  b: number;
  radius: number;
  latSegments: number;
  lonSegments: number;
}

export interface GradientStops {
  start: [number, number, number];
  end: [number, number, number];
}

const tmpVector = new Vector3();
const DEFAULT_GRADIENT: GradientStops = {
  start: [0, 0, 1],
  end: [1, 0, 0],
};

function superFormula(
  angle: number,
  m: number,
  n1: number,
  n2: number,
  n3: number,
  a: number,
  b: number
): number {
  const t1 = Math.cos((m * angle) / 4) / a;
  const t2 = Math.sin((m * angle) / 4) / b;

  const part1 = Math.abs(t1) ** n2;
  const part2 = Math.abs(t2) ** n3;
  const denominator = (part1 + part2) ** (1 / n1);

  if (!isFinite(denominator) || denominator === 0) {
    return 0;
  }

  return 1 / denominator;
}

export function createSuperShapeGeometry(
  params: SuperShapeParams,
  gradientStops: GradientStops = DEFAULT_GRADIENT,
  deformation?: Float32Array
): BufferGeometry {
  const {
    m1,
    m2,
    n1,
    n2,
    n3,
    a,
    b,
    radius,
    latSegments,
    lonSegments,
  } = params;

  const thetaStep = (Math.PI * 2) / lonSegments;
  const phiStep = Math.PI / latSegments;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const radii: number[] = [];
  const colors: number[] = [];
  let minRadius = Infinity;
  let maxRadius = -Infinity;

  let vertexIndex = 0;

  for (let i = 0; i <= latSegments; i++) {
    const phi = i * phiStep - Math.PI / 2;
    const r2 = superFormula(phi, m2, n1, n2, n3, a, b);

    for (let j = 0; j <= lonSegments; j++) {
      const theta = j * thetaStep - Math.PI;
      const r1 = superFormula(theta, m1, n1, n2, n3, a, b);

      const displacement = 1 + (deformation ? deformation[vertexIndex] ?? 0 : 0);
      const x = displacement * radius * r1 * Math.cos(theta) * r2 * Math.cos(phi);
      const y = displacement * radius * r1 * Math.sin(theta) * r2 * Math.cos(phi);
      const z = displacement * radius * r2 * Math.sin(phi);

      positions.push(x, y, z);
      uvs.push(j / lonSegments, i / latSegments);

      const length = Math.sqrt(x * x + y * y + z * z);
      radii.push(length);
      if (length < minRadius) {
        minRadius = length;
      }
      if (length > maxRadius) {
        maxRadius = length;
      }

      vertexIndex++;
    }
  }

  const vertsPerRow = lonSegments + 1;

  for (let i = 0; i < latSegments; i++) {
    for (let j = 0; j < lonSegments; j++) {
      const aIndex = i * vertsPerRow + j;
      const bIndex = aIndex + vertsPerRow;

      indices.push(aIndex, aIndex + 1, bIndex);
      indices.push(aIndex + 1, bIndex + 1, bIndex);
    }
  }

  const radiusRange = Math.max(maxRadius - minRadius, 1e-6);
  const { start, end } = gradientStops;
  for (let i = 0; i < radii.length; i++) {
    const t = (radii[i] - minRadius) / radiusRange;
    colors.push(
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t
    );
  }

  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return geometry;
}

export function updateSuperShapeGeometry(
  geometry: BufferGeometry,
  params: SuperShapeParams,
  gradientStops: GradientStops = DEFAULT_GRADIENT,
  deformation?: Float32Array
): void {
  const {
    m1,
    m2,
    n1,
    n2,
    n3,
    a,
    b,
    radius,
    latSegments,
    lonSegments,
  } = params;

  const positions = geometry.getAttribute("position");
  const uvs = geometry.getAttribute("uv");
  const colors = geometry.getAttribute("color");

  if (
    positions.count !== (latSegments + 1) * (lonSegments + 1) ||
    uvs.count !== (latSegments + 1) * (lonSegments + 1) ||
    !colors ||
    colors.count !== (latSegments + 1) * (lonSegments + 1)
  ) {
    const newGeometry = createSuperShapeGeometry(params, gradientStops, deformation);
    geometry.copy(newGeometry);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.uv.needsUpdate = true;
    if (geometry.attributes.color) {
      geometry.attributes.color.needsUpdate = true;
    }
    geometry.index!.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return;
  }

  let index = 0;
  const thetaStep = (Math.PI * 2) / lonSegments;
  const phiStep = Math.PI / latSegments;

  const positionArray = positions.array as Float32Array;
  const colorAttribute = geometry.getAttribute("color") as Float32BufferAttribute;
  const colorArray = colorAttribute.array as Float32Array;

  let vertexIndex = 0;

  for (let i = 0; i <= latSegments; i++) {
    const phi = i * phiStep - Math.PI / 2;
    const r2 = superFormula(phi, m2, n1, n2, n3, a, b);

    for (let j = 0; j <= lonSegments; j++) {
      const theta = j * thetaStep - Math.PI;
      const r1 = superFormula(theta, m1, n1, n2, n3, a, b);

      const displacement = 1 + (deformation ? deformation[vertexIndex] ?? 0 : 0);
      tmpVector.set(
        displacement * radius * r1 * Math.cos(theta) * r2 * Math.cos(phi),
        displacement * radius * r1 * Math.sin(theta) * r2 * Math.cos(phi),
        displacement * radius * r2 * Math.sin(phi)
      );

      positions.setXYZ(index, tmpVector.x, tmpVector.y, tmpVector.z);
      index++;
      vertexIndex++;
    }
  }

  let minRadius = Infinity;
  let maxRadius = -Infinity;

  for (let i = 0; i < positions.count; i++) {
    const x = positionArray[i * 3];
    const y = positionArray[i * 3 + 1];
    const z = positionArray[i * 3 + 2];
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length < minRadius) {
      minRadius = length;
    }
    if (length > maxRadius) {
      maxRadius = length;
    }
  }

  const radiusRange = Math.max(maxRadius - minRadius, 1e-6);
  const { start, end } = gradientStops;
  for (let i = 0; i < positions.count; i++) {
    const x = positionArray[i * 3];
    const y = positionArray[i * 3 + 1];
    const z = positionArray[i * 3 + 2];
    const length = Math.sqrt(x * x + y * y + z * z);
    const t = (length - minRadius) / radiusRange;
    colorArray[i * 3] = start[0] + (end[0] - start[0]) * t;
    colorArray[i * 3 + 1] = start[1] + (end[1] - start[1]) * t;
    colorArray[i * 3 + 2] = start[2] + (end[2] - start[2]) * t;
  }

  positions.needsUpdate = true;
  colorAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}
