import "./styles.css";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/Addons.js";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { LineSegmentsGeometry } from "three/examples/jsm/Addons.js";
import { redMaterial, grayMaterial, particleMaterial } from "./materials";
import {
  cellGeometry,
  cellEdgesGeometry,
  unitQuadGeometry,
} from "./geometries";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe3dfde);
scene.fog = new THREE.Fog(0xe3dfde, 10, 60);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.z = 20;

const lineResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const roomEnvironment = new RoomEnvironment();
scene.environment = pmremGenerator.fromScene(roomEnvironment).texture;

const MAX_COUNT = 1000;

const redMesh = new THREE.InstancedMesh(cellGeometry, redMaterial, MAX_COUNT);
const grayMesh = new THREE.InstancedMesh(cellGeometry, grayMaterial, MAX_COUNT);
const starMesh = new THREE.InstancedMesh(
  unitQuadGeometry,
  particleMaterial,
  MAX_COUNT * 2,
);

scene.add(grayMesh);
scene.add(redMesh);
scene.add(starMesh);

const dummy = new THREE.Object3D();
let grayIdx = 0;
let redIdx = 0;
let starIdx = 0;

// Collect outline transforms instead of creating individual objects
const whiteOutlineMatrices: THREE.Matrix4[] = [];
const redOutlineMatrices: THREE.Matrix4[] = [];

const addCell = (
  x: number,
  y: number,
  z: number,
  size: number,
  rotationDeg: number,
  isRed: boolean = false,
) => {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, 0, 0);
  dummy.rotateZ(THREE.MathUtils.degToRad(rotationDeg));
  dummy.scale.set(size, size, size);
  dummy.updateMatrix();

  // Store matrix for batched outline creation later
  const matrix = dummy.matrix.clone();
  if (isRed) {
    redOutlineMatrices.push(matrix);
    redMesh.setMatrixAt(redIdx, dummy.matrix);
    redIdx++;
  } else {
    whiteOutlineMatrices.push(matrix);
    grayMesh.setMatrixAt(grayIdx, dummy.matrix);
    grayIdx++;
  }
};

const addStar = (
  x: number,
  y: number,
  z: number,
  size: number,
  rot: number,
) => {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, 0, THREE.MathUtils.degToRad(rot));
  dummy.scale.set(size, size * 1.5, 1);
  dummy.updateMatrix();

  starMesh.setMatrixAt(starIdx++, dummy.matrix);
};

// Create merged outlines from collected matrices
const createMergedOutlines = (
  matrices: THREE.Matrix4[],
  color: number,
): LineSegments2 => {
  const basePositions = cellEdgesGeometry.attributes.position
    .array as Float32Array;
  const positionsPerOutline = basePositions.length;

  const mergedPositions = new Float32Array(
    matrices.length * positionsPerOutline,
  );

  const v = new THREE.Vector3();
  let offset = 0;

  for (const matrix of matrices) {
    for (let i = 0; i < positionsPerOutline; i += 3) {
      v.set(basePositions[i], basePositions[i + 1], basePositions[i + 2]);
      v.applyMatrix4(matrix);
      mergedPositions[offset++] = v.x;
      mergedPositions[offset++] = v.y;
      mergedPositions[offset++] = v.z;
    }
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(mergedPositions);

  const material = new LineMaterial({
    color,
    linewidth: 1.2,
    worldUnits: false,
    resolution: lineResolution,
    alphaToCoverage: true,
  });

  return new LineSegments2(geometry, material);
};

const extrapolate = (i: number, total: number, start: number, end: number) => {
  const delta = (end - start) / total;
  return start + delta * i;
};

const buildScene = () => {
  const chain1 = () => {
    const offset = 150;
    const deltaY = -0.2;
    const items1 = 20;

    for (let i = 0; i <= items1; ++i) {
      addCell(
        extrapolate(i, items1, -3, 2),
        1.5 + deltaY * Math.sin((i * 3.14) / items1) * 3,
        extrapolate(i, items1, 1, 2),
        2,
        extrapolate(i, items1, offset, 240),
        false,
      );
    }
  };

  const chain2 = () => {
    const items2 = 40;

    for (let i = 0; i <= items2; ++i) {
      addCell(
        extrapolate(i, items2, -20, -3.5),
        extrapolate(i, items2, -12, 1.7),
        extrapolate(i, items2, 0, 0.5),
        extrapolate(i, items2, 4, 2),
        extrapolate(i, items2, -40, 140),
        false,
      );
    }

    const items3 = 10;
    for (let i = 0; i <= items3; ++i) {
      addCell(
        extrapolate(i, items3, -20, -18),
        extrapolate(i, items3, -12, -11),
        extrapolate(i, items3, 0, -1),
        extrapolate(i, items3, 4, 5),
        extrapolate(i, items3, -40, -120),
        false,
      );
    }
  };

  const redChain = () => {
    const items = 7;
    for (let i = 0; i <= items; ++i) {
      addCell(
        extrapolate(i, items, 3, 10),
        1.5,
        extrapolate(i, items, 2, 2.5),
        2,
        240,
        true,
      );
    }
  };

  const chain3 = () => {
    const f = (x: number) => Math.pow(x, 2) / 20 - 1 * x;

    const items = 36;
    for (let i = 0; i < items; ++i) {
      addCell(
        extrapolate(i, items, 11, 23),
        1.5 + Math.min(f(i) / 3, 0.4 * i),
        extrapolate(i, items, 3, 4),
        2,
        extrapolate(i, items, 240, 440),
        false,
      );
    }
  };

  // const stars = () => {
  //   const seedGrid = (
  //     x: number,
  //     y: number,
  //     size: number,
  //     rotate: number = 10,
  //   ) => {
  //     for (let i = 0; i <= 1; ++i) {
  //       addStar(extrapolate(i, 2, x, x + 12), y, -1, size, rotate);
  //     }

  //     for (let i = 0; i <= 1; ++i) {
  //       addStar(extrapolate(i, 2, x, x + 12) + 5, y, -5, size, rotate);
  //     }
  //   };

  //   seedGrid(0, -10, 10, 0);
  //   seedGrid(0, 0, 10, 0);
  //   seedGrid(0, 10, 10, 0);

  //   seedGrid(12, -11, 7, -5);
  //   seedGrid(11, 3, 5, -5);
  //   seedGrid(14, -4, 7, -5);
  //   seedGrid(13, 12, 9, -5);

  //   seedGrid(21, -6, 8, -10);
  //   seedGrid(27, -14, 4, -10);
  //   seedGrid(25, 12, 4, -10);

  //   seedGrid(-12, -11, 7, 5);
  //   seedGrid(-11, 3, 5, 5);
  //   seedGrid(-14, -4, 7, 5);
  //   seedGrid(-13, 12, 9, 5);

  //   seedGrid(-24, -7, 8, 5);
  //   seedGrid(-25, -14, 4, 5);
  //   seedGrid(-25, 8, 13, 5);

  //   addStar(-7, 5, -1, 30, 0);
  //   addStar(-12, 3, -2, 25, 0);
  // };

  // stars();
  chain1();
  chain2();
  redChain();
  chain3();
};

buildScene();

const whiteOutlines = createMergedOutlines(whiteOutlineMatrices, 0xffffff);
const redOutlines = createMergedOutlines(redOutlineMatrices, 0xbd4540);

scene.add(whiteOutlines);
scene.add(redOutlines);

function animate() {
  renderer.render(scene, camera);
}
