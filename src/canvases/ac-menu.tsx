import * as React from "react";
import { useLayoutEffect, useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { LineSegmentsGeometry } from "three/examples/jsm/Addons.js";
import { redMaterial, grayMaterial } from "./materials";
import { cellGeometry, cellEdgesGeometry } from "./geometries";

const RED_CELL_COUNT = 8;
const CELL_SIZE = 2;
const SELECTION_Y_OFFSET = CELL_SIZE * 1.5;
const SELECTION_ROTATION_OFFSET = 45;

const extrapolate = (
  i: number,
  total: number,
  start: number,
  end: number,
): number => {
  const delta = (end - start) / total;
  return start + delta * i;
};

interface SceneProps {
  selectedIndex: number;
}

function Scene({ selectedIndex }: SceneProps) {
  const grayMeshRef = useRef<THREE.InstancedMesh>(null);
  const redMeshRef = useRef<THREE.InstancedMesh>(null);
  const { scene } = useThree();

  // Store base matrices for red cells (for animation back to original position)
  const redCellBaseMatrices = useRef<THREE.Matrix4[]>([]);

  // Animation state per red cell (current animated values)
  const redCellAnimState = useRef<{ yOffset: number; rotOffset: number }[]>(
    Array(RED_CELL_COUNT)
      .fill(null)
      .map(() => ({ yOffset: 0, rotOffset: 0 })),
  );

  // Ref for red outlines to update in animation loop
  const redOutlinesRef = useRef<LineSegments2 | null>(null);

  // Dummy object for matrix calculations
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Build the scene and create outlines
  const { whiteOutlines, redOutlines, redOutlineBasePositions } =
    useMemo(() => {
      const whiteOutlineMatrices: THREE.Matrix4[] = [];
      const redOutlineMatrices: THREE.Matrix4[] = [];

      let grayIdx = 0;
      let redIdx = 0;

      // Clear previous base matrices
      redCellBaseMatrices.current = [];

      // Helper function to add a cell instance
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
        dummy.scale.set(size, size, 0.1);
        dummy.updateMatrix();

        const matrix = dummy.matrix.clone();

        if (isRed) {
          if (redMeshRef.current && redIdx < 1000) {
            redMeshRef.current.setMatrixAt(redIdx, dummy.matrix);
            redOutlineMatrices.push(matrix);
            // Store base matrix for animation
            redCellBaseMatrices.current.push(matrix.clone());
            redIdx++;
          }
        } else {
          if (grayMeshRef.current && grayIdx < 1000) {
            grayMeshRef.current.setMatrixAt(grayIdx, dummy.matrix);
            whiteOutlineMatrices.push(matrix);
            grayIdx++;
          }
        }
      };

      // Helper function to create merged outlines
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

        const lineResolution = new THREE.Vector2(
          window.innerWidth,
          window.innerHeight,
        );

        const material = new LineMaterial({
          color,
          linewidth: 1.2,
          worldUnits: false,
          resolution: lineResolution,
          alphaToCoverage: true,
        });

        return new LineSegments2(geometry, material);
      };

      // Build scene with all chains
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

        chain1();
        chain2();
        redChain();
        chain3();
      };

      buildScene();

      // Update instance counts
      if (grayMeshRef.current) {
        grayMeshRef.current.instanceMatrix.needsUpdate = true;
      }
      if (redMeshRef.current) {
        redMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      // Create merged outlines
      const whiteOutlines = createMergedOutlines(
        whiteOutlineMatrices,
        0xffffff,
      );
      const redOutlines = createMergedOutlines(redOutlineMatrices, 0xbd4540);

      // Store base positions for red outlines (for animation)
      const basePositions = cellEdgesGeometry.attributes.position
        .array as Float32Array;

      return {
        whiteOutlines,
        redOutlines,
        redOutlineBasePositions: basePositions,
      };
    }, [dummy]);

  // Store red outlines ref for animation
  useLayoutEffect(() => {
    redOutlinesRef.current = redOutlines;
  }, [redOutlines]);

  // Add outlines to scene
  useLayoutEffect(() => {
    if (scene) {
      scene.add(whiteOutlines);
      scene.add(redOutlines);

      return () => {
        scene.remove(whiteOutlines);
        scene.remove(redOutlines);
      };
    }
  }, [whiteOutlines, redOutlines, scene]);

  // Initialize first cell as selected
  useLayoutEffect(() => {
    // Set initial animation state for first cell
    redCellAnimState.current[0] = {
      yOffset: SELECTION_Y_OFFSET,
      rotOffset: SELECTION_ROTATION_OFFSET,
    };

    // Update the matrix for the first cell
    if (redMeshRef.current && redCellBaseMatrices.current.length > 0) {
      const baseMatrix = redCellBaseMatrices.current[0];
      dummy.matrix.copy(baseMatrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.position.y += SELECTION_Y_OFFSET;
      dummy.rotateZ(THREE.MathUtils.degToRad(SELECTION_ROTATION_OFFSET));
      dummy.updateMatrix();
      redMeshRef.current.setMatrixAt(0, dummy.matrix);
      redMeshRef.current.instanceMatrix.needsUpdate = true;

      // Also update outline for first cell
      updateRedOutlines();
    }
  }, [dummy]);

  // Helper to update red outlines based on current cell matrices
  const updateRedOutlines = () => {
    if (!redOutlinesRef.current || !redOutlineBasePositions) return;

    const basePositions = redOutlineBasePositions;
    const positionsPerCell = basePositions.length;
    const totalPositions = RED_CELL_COUNT * positionsPerCell;
    const newPositions = new Float32Array(totalPositions);

    const v = new THREE.Vector3();

    for (let cellIdx = 0; cellIdx < RED_CELL_COUNT; cellIdx++) {
      const baseMatrix = redCellBaseMatrices.current[cellIdx];
      if (!baseMatrix) continue;

      const { yOffset, rotOffset } = redCellAnimState.current[cellIdx];

      // Build animated matrix
      dummy.matrix.copy(baseMatrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      dummy.position.y += yOffset;
      dummy.rotateZ(THREE.MathUtils.degToRad(rotOffset));
      dummy.updateMatrix();

      // Transform outline positions
      const cellOffset = cellIdx * positionsPerCell;
      for (let i = 0; i < positionsPerCell; i += 3) {
        v.set(basePositions[i], basePositions[i + 1], basePositions[i + 2]);
        v.applyMatrix4(dummy.matrix);
        newPositions[cellOffset + i] = v.x;
        newPositions[cellOffset + i + 1] = v.y;
        newPositions[cellOffset + i + 2] = v.z;
      }
    }

    redOutlinesRef.current.geometry.setPositions(newPositions);
  };

  // Animation loop
  useFrame((_, delta) => {
    if (!redMeshRef.current || redCellBaseMatrices.current.length === 0) return;

    const lerpFactor = 1 - Math.pow(0.001, delta); // Smooth lerp

    let needsOutlineUpdate = false;

    for (let i = 0; i < RED_CELL_COUNT; i++) {
      const isSelected = i === selectedIndex;
      const targetY = isSelected ? SELECTION_Y_OFFSET : 0;
      const targetRot = isSelected ? SELECTION_ROTATION_OFFSET : 0;

      const currentState = redCellAnimState.current[i];
      const prevY = currentState.yOffset;
      const prevRot = currentState.rotOffset;

      // Lerp current values toward targets
      currentState.yOffset = THREE.MathUtils.lerp(
        currentState.yOffset,
        targetY,
        lerpFactor,
      );
      currentState.rotOffset = THREE.MathUtils.lerp(
        currentState.rotOffset,
        targetRot,
        lerpFactor,
      );

      // Check if values changed significantly
      if (
        Math.abs(currentState.yOffset - prevY) > 0.0001 ||
        Math.abs(currentState.rotOffset - prevRot) > 0.0001
      ) {
        needsOutlineUpdate = true;

        // Rebuild matrix from base + offsets
        const baseMatrix = redCellBaseMatrices.current[i];
        dummy.matrix.copy(baseMatrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.position.y += currentState.yOffset;
        dummy.rotateZ(THREE.MathUtils.degToRad(currentState.rotOffset));
        dummy.updateMatrix();

        redMeshRef.current.setMatrixAt(i, dummy.matrix);
      }
    }

    if (needsOutlineUpdate) {
      redMeshRef.current.instanceMatrix.needsUpdate = true;
      updateRedOutlines();
    }
  });

  return (
    <>
      <instancedMesh
        ref={grayMeshRef}
        args={[cellGeometry, grayMaterial, 1000]}
      />
      <instancedMesh
        ref={redMeshRef}
        args={[cellGeometry, redMaterial, 1000]}
      />
    </>
  );
}

function HTMLMenu() {
  return (
    <>
      <div className="fixed top-[40%] -translate-y-[50%] left-0">
        <div className="w-100 h-20 bg-linear-to-b from-red-950/80 to-red-700/80 relative overflow-clip">
          <div className="h-10 aspect-square rotate-45 bg-black/80 outline-2 outline-white right-12 translate-y-[50%] z-2 absolute" />
          <div className="absolute h-full w-[1.5px] bg-white/80 right-[calc(48px+(39px/2))]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[60%] right-0 top-[calc(50%-40px/4)]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[60%] right-0 top-[calc(50%+40px/4)]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[calc((48px+39px/2)*2)] right-0 top-[calc(50%+40px/4)] -rotate-30 -translate-x-[28px] translate-y-[14px]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[calc((48px+39px/2)*2)] right-0 top-[calc(50%-40px/4)] rotate-30 -translate-x-[28px] -translate-y-[14px]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[calc((48px+39px/2)*2)] right-0 top-[calc(50%-40px/4)] rotate-42 -translate-x-[51px] -translate-y-[25px]" />
        </div>
      </div>
      <div className="fixed top-[40%] -translate-y-[calc(50%+136px)] left-60">
        <span className="uppercase text-4xl font-light leading-none">
          Sequence 5
        </span>
      </div>
      <div className="fixed top-[40%] -translate-y-[calc(50%+80px)] left-60">
        <span className="bg-stone-950/83 text-white uppercase text-6xl pt-2 px-2 font-light leading-none">
          memory 7
        </span>
      </div>

      <div className="h-20 fixed top-[40%] -translate-y-[50%] left-[414px] flex flex-col gap-1">
        <span className="bg-stone-950/83 text-white uppercase text-2xl pt-2 px-2 font-light leading-none">
          rodriguo pazzi
        </span>
        <span className="bg-stone-700/80 text-white uppercase text-2xl pt-2 px-2 font-light leading-none w-fit">
          venice, 1482
        </span>
      </div>

      <div className="fixed left-[50%] -translate-x-[50%] bottom-12 w-[80vw] min-w-[200px] max-w-3xl bg-gray-100/90 px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-5 aspect-square rotate-45 bg-red-700/90 border border-red-500" />
            <span className="text-lg uppercase">dna menu</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Left</span>
            <span>Right</span>
            <span>Select</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function AcMenu() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setSelectedIndex(
          (prev) => (prev - 1 + RED_CELL_COUNT) % RED_CELL_COUNT,
        );
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev + 1) % RED_CELL_COUNT);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 75, near: 0.1, far: 1000 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <color attach="background" args={[0xe3dfde]} />
        <fog attach="fog" args={[0xe3dfde, 10, 60]} />
        <Environment preset="apartment" />
        <Scene selectedIndex={selectedIndex} />
      </Canvas>
      <HTMLMenu />
    </>
  );
}
