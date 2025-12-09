export type VecAny = Array<number>;
export type Vec3 = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Matrix4d = [Vec4, Vec4, Vec4, Vec4];

export const normalize = (vec: Vec3): Vec3 => {
  const div = Math.sqrt(vec.reduce((acc, v) => acc + Math.pow(v, 2), 0));
  return vec.map((n) => n / div) as Vec3;
};
export const subtract = (a: Vec3, b: Vec3): Vec3 =>
  a.map((val, i) => val - b[i]) as Vec3;
export const crossProduct = (a: Vec3, b: Vec3): Vec3 => {
  const i = a[1] * b[2] - a[2] * b[1];
  const j = a[0] * b[2] - a[2] * b[0];
  const k = a[0] * b[1] - a[1] * b[0];

  return [i, -j, k];
};
export const dotProduct = <V extends VecAny>(a: V, b: V) =>
  a.reduce((acc, num, i) => acc + num * b[i], 0);

export const lookAt = (
  camera: Vec3,
  target: Vec3,
  worldUpVector: Vec3,
): Matrix4d => {
  const forwardVec = normalize(subtract(target, camera));
  const rightVec = crossProduct(forwardVec, worldUpVector);
  const upVector = crossProduct(rightVec, forwardVec);

  const viewMatrix = [
    [...rightVec, -dotProduct(rightVec, camera)],
    [...upVector, -dotProduct(upVector, camera)],
    [...forwardVec.map((v) => -v), dotProduct(forwardVec, camera)],
    [0, 0, 0, 1],
  ] as Matrix4d;
  return viewMatrix;
};

export const perspective = (
  fov: number,
  aspectRatio: number,
  near: number,
  far: number,
): Matrix4d => {
  const scalingFactor = 1 / Math.tan(fov / 2);
  const range = 1 / (near - far);
  return [
    [scalingFactor / aspectRatio, 0, 0, 0],
    [0, scalingFactor, 0, 0],
    [0, 0, (near + far) * range, 2 * near * far * range],
    [0, 0, -1, 0],
  ];
};
export const transformVector = (target: Vec4, matrix: Matrix4d): Vec4 => {
  const x = dotProduct(target, matrix[0]);
  const y = dotProduct(target, matrix[1]);
  const z = dotProduct(target, matrix[2]);
  const w = dotProduct(target, matrix[3]);

  return [x, y, z, w];
};
export const viewportTransform = (
  pointNDC: Vec3,
  width: number,
  height: number,
): Vec3 => {
  const xPixel = (pointNDC[0] + 1) * 0.5 * width;
  const yPixel = (1 - pointNDC[1]) * 0.5 * height;

  return [xPixel, yPixel, pointNDC[2]];
};
export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};
export const lerpVec3 = (start: Vec3, end: Vec3, t: number): Vec3 => {
  return [
    lerp(start[0], end[0], t),
    lerp(start[1], end[1], t),
    lerp(start[2], end[2], t),
  ];
};

export const getExplosionVector = (triangle: Vec3[], center: Vec3): Vec3 => {
  const p1 = triangle[0];
  const p2 = triangle[1];
  const p3 = triangle[2];

  const U = subtract(p2, p1);
  const V = subtract(p3, p1);

  let normal = normalize(crossProduct(U, V));

  const centerToSurface = subtract(p1, center);

  const alignment = dotProduct(normal, centerToSurface);

  if (alignment < 0) {
    normal = normal.map((n) => -n) as Vec3;
  }

  return normal;
};

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
