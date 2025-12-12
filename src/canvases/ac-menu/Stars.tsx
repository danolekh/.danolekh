import { ParticleMaterial } from "./materials";
import { degToRad, extrapolate } from "./utils";

interface StarProps {
  position: [number, number, number];
  scale: [number, number, number];
  rotateY?: number;
}

function Star({ position, scale, rotateY = 0 }: StarProps) {
  return (
    <mesh
      position={position}
      scale={scale}
      rotation={[0, degToRad(rotateY), 0]}
    >
      <planeGeometry args={[1, 1]} />
      <ParticleMaterial />
    </mesh>
  );
}

interface StarGridProps {
  x: number;
  y: number;
  size: number;
  rotate?: number;
}

function StarGrid({ x, y, size, rotate = 10 }: StarGridProps) {
  return (
    <>
      {[0, 1].map((i) => (
        <Star
          key={`a-${i}`}
          position={[extrapolate(i, 2, x, x + 12), y, -1]}
          scale={[size, size * 1.5, 1]}
          rotateY={rotate}
        />
      ))}
      {[0, 1].map((i) => (
        <Star
          key={`b-${i}`}
          position={[extrapolate(i, 2, x, x + 12) + 5, y, -5]}
          scale={[size / 2, (size * 1.5) / 2, 1]}
          rotateY={rotate}
        />
      ))}
    </>
  );
}

export function Stars() {
  return (
    <>
      {/* Center grids */}
      <StarGrid x={0} y={-10} size={10} rotate={0} />
      <StarGrid x={0} y={0} size={10} rotate={0} />
      <StarGrid x={0} y={10} size={10} rotate={0} />

      {/* Right side grids */}
      <StarGrid x={12} y={-11} size={7} rotate={-5} />
      <StarGrid x={11} y={3} size={5} rotate={-5} />
      <StarGrid x={14} y={-4} size={7} rotate={-5} />
      <StarGrid x={13} y={12} size={9} rotate={-5} />

      <StarGrid x={21} y={-6} size={8} rotate={-10} />
      <StarGrid x={27} y={-14} size={4} rotate={-10} />
      <StarGrid x={25} y={12} size={4} rotate={-10} />

      {/* Left side grids */}
      <StarGrid x={-12} y={-11} size={7} rotate={5} />
      <StarGrid x={-11} y={3} size={5} rotate={5} />
      <StarGrid x={-14} y={-4} size={7} rotate={5} />
      <StarGrid x={-13} y={12} size={9} rotate={5} />

      <StarGrid x={-24} y={-7} size={8} rotate={5} />
      <StarGrid x={-25} y={-14} size={4} rotate={5} />
      <StarGrid x={-25} y={8} size={13} rotate={5} />

      {/* Individual large stars */}
      <Star position={[-7, 5, -1]} scale={[30, 30, 1]} rotateY={0} />
      <Star position={[-12, 3, -2]} scale={[25, 25, 1]} rotateY={0} />
    </>
  );
}
