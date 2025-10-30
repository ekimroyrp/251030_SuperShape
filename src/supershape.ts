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

const tmpVector = new Vector3();

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

export function createSuperShapeGeometry(params: SuperShapeParams): BufferGeometry {
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

  for (let i = 0; i <= latSegments; i++) {
    const phi = i * phiStep - Math.PI / 2;
    const r2 = superFormula(phi, m2, n1, n2, n3, a, b);

    for (let j = 0; j <= lonSegments; j++) {
      const theta = j * thetaStep - Math.PI;
      const r1 = superFormula(theta, m1, n1, n2, n3, a, b);

      const x = radius * r1 * Math.cos(theta) * r2 * Math.cos(phi);
      const y = radius * r1 * Math.sin(theta) * r2 * Math.cos(phi);
      const z = radius * r2 * Math.sin(phi);

      positions.push(x, y, z);
      uvs.push(j / lonSegments, i / latSegments);
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

  const geometry = new BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  return geometry;
}

export function updateSuperShapeGeometry(
  geometry: BufferGeometry,
  params: SuperShapeParams
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

  if (
    positions.count !== (latSegments + 1) * (lonSegments + 1) ||
    uvs.count !== (latSegments + 1) * (lonSegments + 1)
  ) {
    const newGeometry = createSuperShapeGeometry(params);
    geometry.copy(newGeometry);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.uv.needsUpdate = true;
    geometry.index!.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    return;
  }

  let index = 0;
  const thetaStep = (Math.PI * 2) / lonSegments;
  const phiStep = Math.PI / latSegments;

  for (let i = 0; i <= latSegments; i++) {
    const phi = i * phiStep - Math.PI / 2;
    const r2 = superFormula(phi, m2, n1, n2, n3, a, b);

    for (let j = 0; j <= lonSegments; j++) {
      const theta = j * thetaStep - Math.PI;
      const r1 = superFormula(theta, m1, n1, n2, n3, a, b);

      tmpVector.set(
        radius * r1 * Math.cos(theta) * r2 * Math.cos(phi),
        radius * r1 * Math.sin(theta) * r2 * Math.cos(phi),
        radius * r2 * Math.sin(phi)
      );

      positions.setXYZ(index, tmpVector.x, tmpVector.y, tmpVector.z);
      index++;
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}
