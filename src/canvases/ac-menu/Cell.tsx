import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { RedMaterial, GrayMaterial } from "./materials";

interface CellProps {
  size?: number;
  depth?: number;
  isRed?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

function createCellShapes(size: number, gap: number): THREE.Shape[] {
  const tl = new THREE.Shape();
  tl.moveTo(0, 0);
  tl.lineTo(0, size / 2);
  tl.lineTo(size / 2, size);
  tl.lineTo(size, size);
  tl.lineTo(size, 0);

  const tr = new THREE.Shape();
  tr.moveTo(size + gap, 0);
  tr.lineTo(size + gap, size);
  tr.lineTo(size + gap + size / 2, size);
  tr.lineTo(2 * size + gap, size / 2);
  tr.lineTo(2 * size + gap, 0);

  const bl = new THREE.Shape();
  bl.moveTo(size, -gap);
  bl.lineTo(size, -(size + gap));
  bl.lineTo(size / 2, -(size + gap));
  bl.lineTo(0, -(size / 2 + gap));
  bl.lineTo(0, -gap);

  const br = new THREE.Shape();
  br.moveTo(size + gap, -gap);
  br.lineTo(size * 2 + gap, -gap);
  br.lineTo(size * 2 + gap, -(size / 2 + gap));
  br.lineTo(size + size / 2 + gap, -(size + gap));
  br.lineTo(size + gap, -(gap + size));

  return [tl, tr, bl, br];
}

function CellOutline({
  geometry,
  color,
}: {
  geometry: THREE.BufferGeometry;
  color: number;
}) {
  const lineSegments = useMemo(() => {
    const edges = new THREE.EdgesGeometry(geometry, 15);
    const positions = edges.attributes.position.array as Float32Array;
    const segments: [THREE.Vector3, THREE.Vector3][] = [];

    for (let i = 0; i < positions.length; i += 6) {
      segments.push([
        new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]),
        new THREE.Vector3(
          positions[i + 3],
          positions[i + 4],
          positions[i + 5],
        ),
      ]);
    }

    return segments;
  }, [geometry]);

  return (
    <>
      {lineSegments.map((segment, idx) => (
        <Line
          key={idx}
          points={segment}
          color={color}
          lineWidth={1.2}
        />
      ))}
    </>
  );
}

export function Cell({
  size = 2,
  depth,
  isRed = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: CellProps) {
  const actualDepth = depth ?? size / 5;
  const gap = size / 6;

  const geometry = useMemo(() => {
    const shapes = createCellShapes(size, gap);
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: actualDepth,
      bevelEnabled: false,
    });
    geo.center();
    return geo;
  }, [size, gap, actualDepth]);

  const outlineColor = isRed ? 0xbd4540 : 0xffffff;

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry}>
        {isRed ? <RedMaterial /> : <GrayMaterial />}
      </mesh>
      <CellOutline geometry={geometry} color={outlineColor} />
    </group>
  );
}
