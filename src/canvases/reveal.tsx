import * as React from "react";
import {
  easeInOutSine,
  getExplosionVector,
  lerpVec3,
  lookAt,
  perspective,
  transformVector,
  viewportTransform,
  type Vec3,
} from "./utils";

// coordinates from my notes
const camera: Vec3 = [14, 3, 10];
const sphereCenter: Vec3 = [Math.sqrt(3), 3, Math.sqrt(3)];
const sphereRadius = Math.sqrt(2.8 / 5);

const worldUpVector: Vec3 = [0, 0, 1];
const explodeDist = 1.3;

const dp: Vec3[] = [
  [0, 0, 0],
  [0, 6, 0],
  [Math.sqrt(3) * 3, 3, 0],
];
const dpNormal = getExplosionVector(dp, sphereCenter);
const dpTarget = dp.map(
  (p) =>
    [
      p[0] + dpNormal[0] * explodeDist,
      p[1] + dpNormal[1] * explodeDist,
      p[2] + dpNormal[2] * explodeDist,
    ] as Vec3,
);

const lp: Vec3[] = [
  [0, 0, 0],
  [0, 3, 3],
  [Math.sqrt(3) * 3, 3, 0],
];
const lpNormal = getExplosionVector(lp, sphereCenter);
const lpTarget = lp.map(
  (p) =>
    [
      p[0] + lpNormal[0] * explodeDist,
      p[1] + lpNormal[1] * explodeDist,
      p[2] + lpNormal[2] * explodeDist,
    ] as Vec3,
);

const rp: Vec3[] = [
  [0, 6, 0],
  [0, 3, 3],
  [Math.sqrt(3) * 3, 3, 0],
];
const rpNormal = getExplosionVector(rp, sphereCenter);
const rpTarget = rp.map(
  (p) =>
    [
      p[0] + rpNormal[0] * explodeDist,
      p[1] + rpNormal[1] * explodeDist,
      p[2] + rpNormal[2] * explodeDist,
    ] as Vec3,
);

const bp: Vec3[] = [
  [0, 0, 0],
  [0, 3, 3],
  [0, 6, 0],
];
const bpNormal = getExplosionVector(bp, sphereCenter);
const bpTarget = bp.map(
  (p) =>
    [
      p[0] + bpNormal[0] * explodeDist,
      p[1] + bpNormal[1] * explodeDist,
      p[2] + bpNormal[2] * explodeDist,
    ] as Vec3,
);

const point3dToCanvas = (
  pointWorld: Vec3,
  canvasWidth: number,
  canvasHeight: number,
): Vec3 => {
  const aspectRatio = canvasWidth / canvasHeight;

  const worldToViewMat = lookAt(camera, sphereCenter, worldUpVector);
  const fov = 33 * (Math.PI / 180);
  const viewToClipMat = perspective(fov, aspectRatio, 0.1, 100);

  const pointView = transformVector([...pointWorld, 1], worldToViewMat);
  const pointClip = transformVector(pointView, viewToClipMat);

  const pointNDC: Vec3 = [
    pointClip[0] / pointClip[3],
    pointClip[1] / pointClip[3],
    pointClip[2] / pointClip[3],
  ];

  return viewportTransform(pointNDC, canvasWidth, canvasHeight);
};

export function RevealCanvas() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dpRef = React.useRef<Vec3[]>(dp);
  const bpRef = React.useRef<Vec3[]>(bp);
  const rpRef = React.useRef<Vec3[]>(rp);
  const lpRef = React.useRef<Vec3[]>(lp);

  const requestRef = React.useRef<number>(null);

  const drawScene = React.useMemo(
    () => () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderSphere = () => {
        const center2d = point3dToCanvas(sphereCenter, rect.width, rect.height);
        const topEdge2d = point3dToCanvas(
          [sphereCenter[0], sphereCenter[1], sphereCenter[2] + sphereRadius],
          rect.width,
          rect.height,
        );
        const dx = center2d[0] - topEdge2d[0];
        const dy = center2d[1] - topEdge2d[1];
        const radius2d = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(center2d[0], center2d[1], radius2d, 0, Math.PI * 2);

        const grad = ctx.createRadialGradient(
          center2d[0] - radius2d / 3,
          center2d[1] - radius2d / 3,
          radius2d / 10,
          center2d[0],
          center2d[1],
          radius2d,
        );
        grad.addColorStop(0, "#eee");
        grad.addColorStop(1, "darkgray");

        ctx.fillStyle = grad;
        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.fill();
      };

      const renderWorldTriangle = (triangle: Vec3[]) => {
        const canvasCoords = triangle.map((vec) =>
          point3dToCanvas(vec, rect.width, rect.height),
        );
        ctx.beginPath();

        ctx.moveTo(canvasCoords[0][0], canvasCoords[0][1]);
        ctx.lineTo(canvasCoords[1][0], canvasCoords[1][1]);
        ctx.lineTo(canvasCoords[2][0], canvasCoords[2][1]);

        ctx.closePath();
        ctx.fillStyle = "darkgray";
        ctx.strokeStyle = "black";
        ctx.stroke();
        ctx.fill();
      };

      renderWorldTriangle(bpRef.current);
      renderWorldTriangle(dpRef.current);
      renderSphere();
      renderWorldTriangle(rpRef.current);
      renderWorldTriangle(lpRef.current);
    },
    [],
  );

  const animateScene = (
    currentMeshRefs: Array<React.RefObject<Vec3[]>>,
    targetShapes: Array<Vec3[]>,
    duration: number = 600,
  ) => {
    if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    const startingShapes = currentMeshRefs.map((ref) => [...ref.current]);
    const startTime = window.performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = easeInOutSine(Math.min(elapsed / duration, 1));
      startingShapes.forEach((startingShape, i) => {
        currentMeshRefs[i].current = startingShape.map((vec, j) =>
          lerpVec3(vec, targetShapes[i][j], t),
        );
      });

      drawScene();

      if (t < 1) requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="h-40 mx-auto w-fit mt-6 text-end">
      <canvas
        className="h-full"
        ref={(node) => {
          canvasRef.current = node;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;

          node.width = rect.width * dpr;
          node.height = rect.height * dpr;

          const ctx = node.getContext("2d");
          if (!ctx) return;

          ctx.scale(dpr, dpr);

          drawScene();
        }}
        onPointerEnter={() => {
          animateScene(
            [dpRef, bpRef, lpRef, rpRef],
            [dpTarget, bpTarget, lpTarget, rpTarget],
            300,
          );
        }}
        onPointerLeave={() => {
          animateScene([dpRef, bpRef, lpRef, rpRef], [dp, bp, lp, rp], 300);
        }}
      />
      <span className="ml-auto text-end align-end self-end text-xs italic text-muted-foreground">
        "Reveal"
      </span>
    </div>
  );
}
