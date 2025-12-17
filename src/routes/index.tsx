import { createFileRoute } from "@tanstack/react-router";

import * as React from "react";
import { Code2Icon, ServerIcon, TerminalIcon } from "lucide-react";
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";

import { redMaterial, grayMaterial } from "./-materials";
import { cellGeometry, cellEdgesGeometry } from "./-geometries";
import { createStore, useStore } from "@/lib/create-store";
import { cn } from "@/lib/utils";
import { AnimusSection, DataRow, ProjectCard, TechTag } from "./-animus";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export const Route = createFileRoute("/")({ component: App, ssr: false });

function App() {
  return (
    <React.Fragment>
      <HTMLMenu />
      <ThreeScene />
    </React.Fragment>
  );
}

extend({ LineSegments2, LineMaterial, LineSegmentsGeometry });

const DATA = [
  {
    label: "IDENTITY",
    entity: "DANIIL OLEKH",
    detail: "KYIV, UA",
    component: () => (
      <div className="max-w-2xl">
        <div className="flex items-end justify-between mb-8 border-b border-white/20 pb-4">
          <h1 className="text-4xl text-white font-thin uppercase tracking-widest mb-1">
            Subject Profile
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimusSection title="Biometrics">
            <DataRow label="Class" value="Software Engineer" />
            <DataRow label="Specialization" value="Full-stack" />
            <DataRow label="Education" value="KNU (Exp. 2026)" />
            <DataRow label="Location" value="Kyiv, Ukraine" />
            <DataRow label="Language" value="EN / UA" />
          </AnimusSection>

          <AnimusSection title="Mission Statement">
            <p className="text-stone-300 font-light text-sm leading-6">
              Founding engineer specialized in building scalable platforms from
              zero to one. Focused on building and shipping software with
              TypeScript, and tools of choice as React (&amp; Tanstack), Bun
              (&amp; Effect.ts).
            </p>
          </AnimusSection>
        </div>
      </div>
    ),
  },
  {
    label: "SEQUENCE 01",
    entity: "QUEXTRO",
    detail: "FOUNDING ENG.",
    component: () => (
      <div className="max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-950/20 border border-red-900/50">
            <TerminalIcon className="text-red-500 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl text-white font-thin uppercase tracking-widest">
              Quextro
            </h1>
            <p className="text-stone-500 font-mono text-xs">
              2024 — PRESENT {"//"} FOUNDING ENGINEER
            </p>
          </div>
        </div>

        <AnimusSection title="Synchronized Memories">
          <ul className="space-y-4">
            <li className="flex gap-4 items-start group">
              <span className="text-red-600 font-mono text-xs mt-1">01</span>
              <p className="text-stone-300 text-sm font-light">
                <strong className="text-white block mb-1">
                  Solo Founding Engineer
                </strong>
                Engineered the entire platform solo using Bun, Effect.ts, and
                Drizzle ORM. Scaled to support British teachers and students in
                production.
              </p>
            </li>
            <li className="flex gap-4 items-start group">
              <span className="text-red-600 font-mono text-xs mt-1">02</span>
              <p className="text-stone-300 text-sm font-light">
                <strong className="text-white block mb-1">AI Core</strong>
                Developed algorithms using LLMs to extract structured exam
                questions from PDF papers.
              </p>
            </li>
            <li className="flex gap-4 items-start group">
              <span className="text-red-600 font-mono text-xs mt-1">03</span>
              <p className="text-stone-300 text-sm font-light">
                <strong className="text-white block mb-1">
                  Infrastructure
                </strong>
                Managed full CI/CD, Docker containerization, and OpenTelemetry
                observability.
              </p>
            </li>
          </ul>
        </AnimusSection>

        <AnimusSection title="Tech Stack">
          <div className="flex flex-wrap">
            {["TypeScript", "React", "Effect.ts"].map((t) => (
              <TechTag key={t} label={t} />
            ))}
          </div>
        </AnimusSection>
      </div>
    ),
  },
  {
    label: "SEQUENCE 02",
    entity: "PROJECTS",
    detail: "ARCHIVE",
    component: () => (
      <div className="max-w-2xl">
        <h1 className="text-3xl text-white font-thin uppercase tracking-widest mb-8 border-b border-white/20 pb-4">
          Project Archive
        </h1>

        <AnimusSection title="Deployed Units">
          <ProjectCard
            href="https://www.sportmagaz.com"
            title="SportMagaz"
            jobRole="Freelance"
            description="Full e-commerce platform built from scratch (no CMS). Custom admin panel for 2000+ products."
            stack={["Next.js", "Drizzle", "Postgres", "Vercel"]}
          />
        </AnimusSection>
      </div>
    ),
  },
  {
    label: "PROTOCOL",
    entity: "ARSENAL",
    detail: "SKILLS",
    component: () => (
      <div>
        <h1 className="text-3xl text-white font-thin uppercase tracking-widest mb-8">
          Skill Protocol
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-stone-950/50 p-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <Code2Icon size={18} />
              <h3 className="uppercase tracking-widest font-bold text-sm">
                Frontend
              </h3>
            </div>
            <div className="space-y-2">
              <DataRow label="Frameworks" value="TanStack / Next.js" />
            </div>
          </div>

          <div className="bg-stone-950/50 p-6 border-t">
            <div className="flex items-center gap-2 mb-4">
              <ServerIcon size={18} />
              <h3 className="uppercase tracking-widest font-bold text-sm">
                Backend
              </h3>
            </div>
            <div className="space-y-2">
              <DataRow
                label="Language & Runtime"
                value="TypeScript (Bun / Node)"
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <AnimusSection title="Certifications & Education">
            <div className="flex justify-between items-center bg-stone-900/50 p-4 border-l-4 border-white mb-2">
              <div>
                <div className="text-white font-medium">
                  Bachelor of Computer Science
                </div>
                <div className="text-stone-500 text-xs font-mono">
                  TARAS SHEVCHENKO NATIONAL UNIVERSITY
                </div>
              </div>
              <div className="text-white/50 text-sm font-mono">2026</div>
            </div>
          </AnimusSection>
        </div>
      </div>
    ),
  },
  {
    label: "UPLINK",
    entity: "@danolekh",
    detail: "ENCRYPTED",
    component: () => (
      <div className="max-w-xl mx-auto flex flex-col justify-center animate-in fade-in zoom-in-95 duration-500">
        <div className="p-8">
          <h1 className="text-2xl text-white font-thin uppercase tracking-[0.3em] mb-8 text-center">
            Contact me
          </h1>

          <div className="grid grid-cols-1">
            <a
              target="_blank"
              rel="noopener"
              href="mailto:danyaolekhq@gmail.com"
              className="flex items-center justify-between p-4 bg-stone-900 hover:bg-red-950/30 border border-stone-800 hover:border-red-500 group"
            >
              <span className="text-stone-400 group-hover:text-red-400 font-mono text-sm">
                EMAIL
              </span>
              <span className="text-white text-sm">danyaolekhq@gmail.com</span>
            </a>
            <a
              target="_blank"
              rel="noopener"
              href="https://github.com/danolekh"
              className="flex items-center justify-between p-4 bg-stone-900 hover:bg-red-950/30 border border-stone-800 hover:border-red-500 group"
            >
              <span className="text-stone-400 group-hover:text-red-400 font-mono text-sm">
                GITHUB
              </span>
              <span className="text-white text-sm">@danolekh</span>
            </a>
            <a
              target="_blank"
              rel="noopener"
              href="https://x.com/danolekh"
              className="flex items-center justify-between p-4 bg-stone-900 hover:bg-red-950/30 border border-stone-800 hover:border-red-500 group"
            >
              <span className="text-stone-400 group-hover:text-red-400 font-mono text-sm">
                X
              </span>
              <span className="text-white text-sm">Dan</span>
            </a>

            <a
              target="_blank"
              rel="noopener"
              href="https://t.me/danolekh"
              className="flex items-center justify-between p-4 bg-stone-900 hover:bg-red-950/30 border border-stone-800 hover:border-red-500 group"
            >
              <span className="text-stone-400 group-hover:text-red-400 font-mono text-sm">
                TELEGRAM
              </span>
              <span className="text-white text-sm">Dan</span>
            </a>
            <a
              target="_blank"
              rel="noopener"
              href="https://linkedin.com/danolekh"
              className="flex items-center justify-between p-4 bg-stone-900 hover:bg-red-950/30 border border-stone-800 hover:border-red-500 group"
            >
              <span className="text-stone-400 group-hover:text-red-400 font-mono text-sm">
                LINKEDIN
              </span>
              <span className="text-white text-sm">Daniil Olekh</span>
            </a>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "AUDIO",
    entity: "SPOTIFY",
    detail: "IDLE",
    component: () => (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 opacity-50">
          <div className="flex items-center justify-center gap-1 h-12">
            <div className="w-1 h-full bg-red-500 animate-[pulse_1s_ease-in-out_infinite]" />
            <div className="w-1 h-2/3 bg-red-500 animate-[pulse_1.2s_ease-in-out_infinite]" />
            <div className="w-1 h-4/5 bg-red-500 animate-[pulse_0.8s_ease-in-out_infinite]" />
            <div className="w-1 h-1/2 bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
          <p className="font-mono text-red-500 text-xs tracking-widest">
            AUDIO STREAM OFFLINE
          </p>
        </div>
      </div>
    ),
  },
];

const TITLES = [
  "About Me",
  "Experience",
  "My Work",
  "Skills",
  "Contact",
  "Blog",
  "Music",
];

type CellState = {
  selectedCell: number;
  activeCell: number | null;
};

const cellStore = createStore<CellState>({
  selectedCell: 0,
  activeCell: null,
});

type CellData = {
  x: number;
  y: number;
  z: number;
  size: number;
  rotationDeg: number;
  isRed: boolean;
};

const dummy = new THREE.Object3D();

const getMatrix = (data: CellData) => {
  dummy.position.set(data.x, data.y, data.z);
  dummy.rotation.set(0, 0, 0);
  dummy.rotateZ(THREE.MathUtils.degToRad(data.rotationDeg));
  dummy.scale.set(data.size, data.size, 0.1);
  dummy.updateMatrix();
  return dummy.matrix.clone();
};

const createMergedLineGeometry = (matrices: THREE.Matrix4[]) => {
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
  return geometry;
};

function BackgroundChain() {
  const { size } = useThree();

  const { grayMatrices, lineGeometry } = (() => {
    const matrices: THREE.Matrix4[] = [];
    const addFn = (c: CellData) => matrices.push(getMatrix(c));
    const items1 = 20;
    for (let i = 0; i <= items1; ++i) {
      const t = i / items1;
      addFn({
        x: THREE.MathUtils.lerp(-3, 2, t),
        y: 1.5 - 0.2 * Math.sin((i * 3.14) / items1) * 3,
        z: THREE.MathUtils.lerp(1, 2, t),
        size: 2,
        rotationDeg: THREE.MathUtils.lerp(150, 240, t),
        isRed: false,
      });
    }

    // Chain 2
    const items2 = 40;
    for (let i = 0; i <= items2; ++i) {
      const t = i / items2;
      addFn({
        x: THREE.MathUtils.lerp(-20, -3.5, t),
        y: THREE.MathUtils.lerp(-12, 1.7, t),
        z: THREE.MathUtils.lerp(0, 0.5, t),
        size: THREE.MathUtils.lerp(4, 2, t),
        rotationDeg: THREE.MathUtils.lerp(-40, 140, t),
        isRed: false,
      });
    }
    const items3 = 10;
    for (let i = 0; i <= items3; ++i) {
      const t = i / items3;
      addFn({
        x: THREE.MathUtils.lerp(-20, -18, t),
        y: THREE.MathUtils.lerp(-12, -11, t),
        z: THREE.MathUtils.lerp(0, -1, t),
        size: THREE.MathUtils.lerp(4, 5, t),
        rotationDeg: THREE.MathUtils.lerp(-40, -120, t),
        isRed: false,
      });
    }

    // Chain 3
    const f = (x: number) => Math.pow(x, 2) / 20 - 1 * x;
    const items4 = 36;
    for (let i = 0; i < items4; ++i) {
      const t = i / items4;
      addFn({
        x: THREE.MathUtils.lerp(11, 23, t),
        y: 1.5 + Math.min(f(i) / 3, 0.4 * i),
        z: THREE.MathUtils.lerp(3, 4, t),
        size: 2,
        rotationDeg: THREE.MathUtils.lerp(240, 440, t),
        isRed: false,
      });
    }

    const geo = createMergedLineGeometry(matrices);
    return { grayMatrices: matrices, lineGeometry: geo };
  })();

  const meshRef = React.useRef<THREE.InstancedMesh>(null);

  React.useEffect(() => {
    if (!meshRef.current) return;
    grayMatrices.forEach((mat, i) => {
      meshRef.current!.setMatrixAt(i, mat);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [grayMatrices]);

  return (
    <React.Fragment>
      <instancedMesh
        ref={meshRef}
        key={grayMatrices.length}
        args={[cellGeometry, grayMaterial, grayMatrices.length]}
      />
      {/*@ts-ignore extended*/}
      <lineSegments2 geometry={lineGeometry}>
        {/*@ts-ignore extended*/}
        <lineMaterial
          color={0xffffff}
          linewidth={1.2}
          worldUnits={false}
          resolution={[size.width, size.height]}
          alphaToCoverage={true}
        />
        {/*@ts-ignore extended*/}
      </lineSegments2>
    </React.Fragment>
  );
}

const SELECTION_ANIMATION_DURATION = 300;
const ACTIVE_ANIMATION_DURATION = 700;
const COUNT = DATA.length;

function RedCells() {
  const meshRef = React.useRef<THREE.InstancedMesh>(null);

  const [{ selectedCell, activeCell }, setState] = useStore(cellStore);

  const stateRef = React.useRef<{
    selectionChangedAt: number;
    activeCellChangedAt: number;
    currentPositions: CellData[];
  }>({
    selectionChangedAt: 0,
    activeCellChangedAt: 0,
    // mutable
    currentPositions: Array.from({ length: COUNT }).map((_, i) => {
      const t = i / COUNT;
      return {
        x: THREE.MathUtils.lerp(3, 10, t),
        y: 1.5,
        z: THREE.MathUtils.lerp(2.1, 2.5, t),
        size: 2,
        rotationDeg: 240,
        isRed: true,
      };
    }),
  });

  const initialPositions = React.useMemo(
    () =>
      Array.from({ length: COUNT }).map((_, i) => {
        const t = i / COUNT;
        return {
          x: THREE.MathUtils.lerp(3, 10, t),
          y: 1.5,
          z: THREE.MathUtils.lerp(2.1, 2.5, t),
          size: 2,
          rotationDeg: 240,
          isRed: true,
        };
      }),
    [],
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = performance.now();

      if (activeCell === null) {
        if (e.key === "ArrowLeft") {
          setState((prev) => ({
            selectedCell:
              prev.selectedCell !== 0 ? prev.selectedCell - 1 : DATA.length - 1,
          }));
          stateRef.current.selectionChangedAt = now;
        }
        if (e.key === "ArrowRight") {
          setState((prev) => ({
            selectedCell: (prev.selectedCell + 1) % DATA.length,
          }));
          stateRef.current.selectionChangedAt = now;
        }
      }
      if (activeCell === null) {
        if (e.key === "Enter") {
          setState({ activeCell: selectedCell });
          stateRef.current.activeCellChangedAt = now;
        }
      }
      if (activeCell !== null) {
        if (e.key === "Escape" || e.key === "Backspace") {
          setState({ activeCell: null });
          stateRef.current.activeCellChangedAt = now;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCell, selectedCell, setState]);

  useFrame(() => {
    if (!meshRef.current) return;

    const time = performance.now();

    const { selectionChangedAt, activeCellChangedAt, currentPositions } =
      stateRef.current;

    const selectionElapsed = time - selectionChangedAt;
    const activeElapsed = time - activeCellChangedAt;

    const animation =
      selectionChangedAt > activeCellChangedAt
        ? "selection"
        : activeElapsed > ACTIVE_ANIMATION_DURATION
          ? "stale"
          : "active";

    const DURATION =
      animation === "active"
        ? ACTIVE_ANIMATION_DURATION
        : SELECTION_ANIMATION_DURATION;

    let t =
      animation === "active"
        ? Math.min(activeElapsed / DURATION, 1)
        : Math.min(selectionElapsed / DURATION, 1);

    t *= t;

    for (let i = 0; i < COUNT; ++i) {
      const initPos = initialPositions[i];
      const currentPos = currentPositions[i];

      const isSelected = selectedCell === i;
      const isActive = activeCell === i;

      const targetY = isActive ? 0 : isSelected ? initPos.y + 2.5 : initPos.y;
      const targetX = isActive ? -8 : initPos.x;
      const targetZ = isActive ? 8 : initPos.z;
      const targetRot = isActive
        ? 0
        : isSelected
          ? initPos.rotationDeg + 60
          : initPos.rotationDeg;

      const movingForward = targetZ > initPos.z;
      const zt = movingForward
        ? Math.max(0, (t - 0.1) / 0.9)
        : Math.min(1, t / 0.3);

      currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetX, t);
      currentPos.y = isActive
        ? THREE.MathUtils.lerp(currentPos.y, targetY, t)
        : THREE.MathUtils.lerp(currentPos.y, targetY, t);
      currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetZ, zt);
      currentPos.rotationDeg = THREE.MathUtils.lerp(
        currentPos.rotationDeg,
        targetRot,
        t,
      );

      dummy.position.set(currentPos.x, currentPos.y, currentPos.z);
      dummy.rotation.set(0, 0, 0);
      dummy.rotateZ(THREE.MathUtils.degToRad(currentPos.rotationDeg));
      dummy.scale.set(initPos.size, initPos.size, initPos.size);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[cellGeometry, redMaterial, COUNT]} />
  );
}

function ThreeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 20], fov: 75 }}
      style={{
        position: "fixed",
        height: "100vh",
        width: "100vw",
        inset: 0,
        zIndex: -1,
      }}
      gl={{ antialias: true }}
      className="fixed inset-0 h-screen w-screen"
    >
      <fog attach={"fog"} args={[0xe3dfde, 10, 60]} />
      <Environment preset="city" />
      <BackgroundChain />
      <RedCells />
    </Canvas>
  );
}

function HTMLMenu() {
  const [{ activeCell, selectedCell }] = useStore(cellStore);
  const hasActiveCell = activeCell !== null;

  const createCircularArray = (currentIndex: number, siblings: number = 2) => {
    const min = 0;
    const max = DATA.length - 1;

    return [
      ...Array.from({ length: siblings })
        .fill(null)
        .map((_, i) => {
          const n = currentIndex - (siblings - i);
          if (n >= min) return n;
          else return max + n + 1;
        }),
      currentIndex,
      ...Array.from({ length: siblings })
        .fill(null)
        .map((_, i) => {
          const n = currentIndex + (1 + i);
          if (n <= max) return n;
          else return (n % max) - 1;
        }),
    ];
  };

  const selectedIndexArray = createCircularArray(selectedCell);

  const currentData = DATA[selectedCell];

  return (
    <React.Fragment>
      <div className="fixed top-[40%] -translate-y-[50%] left-0">
        <div
          className={cn(
            "w-100 h-20 will-change-[width] duration-300 bg-linear-to-b from-red-950/80 to-red-700/80 relative overflow-clip",
            {
              "w-0": hasActiveCell,
            },
          )}
        >
          <div className="h-10 aspect-square rotate-45 bg-black/80 outline-2 outline-white right-12 translate-y-[50%] z-2 absolute" />
          <div className="absolute h-full w-[1.5px] bg-white/80 right-[calc(48px+(39px/2))]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[60%] right-0 top-[calc(50%-40px/4)]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[60%] right-0 top-[calc(50%+40px/4)]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[calc((48px+39px/2)*2)] right-0 top-[calc(50%+40px/4)] -rotate-30 -translate-x-[28px] translate-y-[14px]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[calc((48px+39px/2)*2)] right-0 top-[calc(50%-40px/4)] rotate-30 -translate-x-[28px] -translate-y-[14px]" />
          <div className="absolute bg-linear-to-r from-white/20 to-white h-[1px] w-[calc((48px+39px/2)*2)] right-0 top-[calc(50%-40px/4)] rotate-42 -translate-x-[51px] -translate-y-[25px]" />
        </div>
      </div>
      <div
        className={
          "fixed top-[40%] -translate-y-[calc(50%+136px)] left-60 overflow-clip"
        }
      >
        <div
          className={cn(
            "grid overflow-clip transition-[transform,translate] duration-300",
            {
              "-translate-y-full": hasActiveCell,
            },
          )}
        >
          {selectedIndexArray.map((num, i) => {
            const difference = 2 - i;

            return (
              <span
                key={num}
                className="col-start-1 row-start-1 uppercase text-4xl font-light leading-none transition-[transform] duration-300 will-change-[translate]"
                style={{
                  transform: `translateY(${100 * difference}%)`,
                }}
              >
                {TITLES[num]}
              </span>
            );
          })}
        </div>
      </div>
      <div className="fixed top-[40%] -translate-y-[calc(50%+80px)] left-60 overflow-clip">
        <span
          className={cn(
            "bg-stone-950/83 text-white uppercase text-6xl pt-2 px-2 font-light leading-none block transition-[transform,translate,background-color] duration-300",
            {
              "-translate-y-full bg-transparent": hasActiveCell,
            },
          )}
        >
          {currentData.label}
        </span>
      </div>

      <div className="h-20 fixed top-[40%] -translate-y-[50%] left-[414px] flex flex-col gap-1 overflow-clip">
        <span
          className={cn(
            "bg-stone-950/83 text-white uppercase text-2xl pt-2 px-2 font-light leading-none block transition-[transform,translate,background-color] duration-300",
            {
              "-translate-y-full bg-transparent": hasActiveCell,
            },
          )}
        >
          {currentData.entity}
        </span>
        <span
          className={cn(
            "bg-stone-700/80 text-white uppercase text-2xl pt-2 px-2 font-light leading-none w-fit block transition-[transform,translate,background-color] transition-trans duration-300",
            {
              "translate-y-[calc(120%+4px)] bg-transparent": hasActiveCell,
            },
          )}
        >
          {currentData.detail}
        </span>
      </div>

      <div className="fixed left-[50%] -translate-x-[50%] bottom-12 w-[80vw] min-w-[200px] max-w-3xl bg-gray-100/90 px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-5 aspect-square rotate-45 bg-red-700/90 border border-red-500" />
            <span className="text-lg uppercase">dna menu</span>
          </div>
          <div className="flex items-center gap-6">
            {!hasActiveCell ? (
              <div className="flex items-center gap-1 cursor-pointer">
                <Kbd>↵</Kbd>
                <span>Select</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 cursor-pointer">
                <KbdGroup>
                  <Kbd>⎋</Kbd>/<Kbd>⌫</Kbd>
                </KbdGroup>
                <span>Deselect</span>
              </div>
            )}
            <div className="flex items-center gap-1 cursor-pointer">
              <Kbd>←</Kbd>
              <span>Left</span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer">
              <Kbd>→</Kbd>
              <span>Right</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed right-10 top-10 bg-black/80 w-[50%] h-0 rounded-md transition-[height] duration-500 overflow-y-clip text-white p-0",
          {
            "h-[calc(100%-160px)]": hasActiveCell,
          },
        )}
      >
        <div className="w-full h-full p-6">{<currentData.component />}</div>
      </div>
    </React.Fragment>
  );
}
