import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";

import { CellChain } from "./ac-menu/CellChain";
import { Stars } from "./ac-menu/Stars";
import { Cell } from "./ac-menu/Cell";
import { degToRad, extrapolate } from "./ac-menu/utils";

function Chain3() {
  const f = (x: number) => Math.pow(x, 2) / 20 - 1 * x;
  const items = 36;

  return (
    <>
      {Array.from({ length: items }, (_, i) => (
        <Cell
          key={i}
          position={[
            extrapolate(i, items, 11, 23),
            1.5 + Math.min(f(i) / 3, 0.4 * i),
            extrapolate(i, items, 3, 4),
          ]}
          rotation={[0, 0, degToRad(extrapolate(i, items, 240, 440))]}
        />
      ))}
    </>
  );
}

function Scene() {
  return (
    <>
      {/* Chain 1 */}
      <CellChain
        count={20}
        startPosition={[-3, 1.5, 1]}
        endPosition={[2, 1.5, 2]}
        startRotation={150}
        endRotation={240}
        positionModifier={(i, count, pos) => [
          pos[0],
          pos[1] + -0.2 * Math.sin((i * Math.PI) / count) * 3,
          pos[2],
        ]}
      />

      {/* Chain 2 */}
      <CellChain
        count={40}
        startPosition={[-20, -12, 0]}
        endPosition={[-3.5, 1.7, 0.5]}
        startRotation={-40}
        endRotation={140}
        startSize={4}
        endSize={2}
      />

      {/* Chain 2 branch */}
      <CellChain
        count={10}
        startPosition={[-20, -12, 0]}
        endPosition={[-18, -11, -1]}
        startRotation={-40}
        endRotation={-120}
        startSize={4}
        endSize={5}
      />

      {/* Red chain */}
      <CellChain
        count={7}
        startPosition={[3, 1.5, 2]}
        endPosition={[10, 1.5, 2.5]}
        startRotation={240}
        endRotation={240}
        isRed
      />

      {/* Chain 3 - with custom y modifier */}
      <Chain3 />

      {/* Stars */}
      <Stars />
    </>
  );
}

function Menu() {
  return (
    <React.Fragment>
      <div className="fixed top-[40%] -translate-y-[50%] left-0">
        <div className="w-sm h-20 bg-linear-to-b from-red-950 to-red-700"></div>
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
    </React.Fragment>
  );
}

export function AcMenu() {
  return (
    <React.Fragment>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 75, near: 0.1, far: 1000 }}
        style={{ width: "100vw", height: "100vh" }}
      >
        <color attach="background" args={[0xe3dfde]} />
        <fog attach="fog" args={[0xe3dfde, 10, 60]} />

        {/* Environment for PBR materials */}
        <Environment preset="apartment" />

        <Scene />
      </Canvas>
      <Menu />
    </React.Fragment>
  );
}

export default AcMenu;
