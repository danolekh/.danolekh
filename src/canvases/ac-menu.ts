import "./styles.css";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/Addons.js";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { LineSegmentsGeometry } from "three/examples/jsm/Addons.js";

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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
const roomEnvironment = new RoomEnvironment();
scene.environment = pmremGenerator.fromScene(roomEnvironment).texture;

const redMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,

  transmission: 0.8,
  thickness: 2.0,
  roughness: 0.12,
  metalness: 0.2,

  ior: 1.5,
  side: THREE.DoubleSide,
});

redMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uColorCenter = { value: new THREE.Color(0xe83e38) };
  shader.uniforms.uColorEdge = { value: new THREE.Color(0x8f0f0a) };
  shader.uniforms.uSize = { value: 4.5 };
  shader.vertexShader = shader.vertexShader.replace(
    "#include <common>",
    `
      #include <common>
      varying vec3 vPos;
      `,
  );
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `
      #include <begin_vertex>
      vPos = position;
      `,
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <common>",
    `
      #include <common>
      varying vec3 vPos;
      uniform vec3 uColorCenter;
      uniform vec3 uColorEdge;
      uniform float uSize;
      `,
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    `
      float dist = length(vPos.xy);
      float normalizedDist = dist / (uSize * 0.6);
      float gradient = smoothstep(0.0, 1.0, normalizedDist);

      vec3 gradientColor = mix(uColorCenter, uColorEdge, pow(gradient, 1.0/2.0));

      diffuseColor.rgb = gradientColor;
      `,
  );
};

const grayMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uSize: { value: 3.5 },
    colorCenter: { value: new THREE.Color(0xffffff) },
    colorEdge: { value: new THREE.Color(0xb5b4b3) },
  },
  vertexShader: `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uSize;
    uniform vec3 colorCenter;
    uniform vec3 colorEdge;
    varying vec3 vPos;

    void main() {
      float dist = length(vPos.xy);

      float normalizedDist = dist / (uSize * 0.6);

      float gradient = smoothstep(0.0, 1.0, normalizedDist);

      vec3 col = mix(colorCenter, colorEdge, pow(gradient, 1.0/2.0));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
  side: THREE.DoubleSide,
});

const particleMaterial = new THREE.ShaderMaterial({
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,

  uniforms: {
    uColor: { value: new THREE.Color(0xffffff) },
  },

  vertexShader: `
      varying vec2 vUv;
      void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
      }
  `,

  fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;

      void main() {
          vec2 centered = vUv - 0.5;

          float distFromXAxis = abs(centered.y);
          float distFromYAxis = abs(centered.x);

          float distToAxis = distFromXAxis * distFromYAxis;

          distToAxis = pow(distToAxis, 0.6);

          float core = 1.0 - smoothstep(0.0, 0.03, distToAxis);
          float glow1 = 1.0 - smoothstep(0.0, 0.08, distToAxis);
          float glow2 = 1.0 - smoothstep(0.0, 0.15, distToAxis);

          float shape = core * 1.5 + glow1 * 0.1 + glow2 * 0.02;

          gl_FragColor = vec4(uColor, shape);
      }
  `,
});

const lineResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

const createOutline = (geometry: THREE.BufferGeometry, color: number) => {
  const edges = new THREE.EdgesGeometry(geometry, 15);
  const lineGeometry = new LineSegmentsGeometry();
  lineGeometry.fromEdgesGeometry(edges);
  const lineMaterial = new LineMaterial({
    color: color,
    linewidth: 1.2,

    worldUnits: false,

    resolution: lineResolution,
    dashed: false,
    alphaToCoverage: true,
  });

  return new LineSegments2(lineGeometry, lineMaterial);
};

const createCell = (opts?: {
  size?: number;
  depth?: number;
  material?: THREE.Material;
  isRed?: boolean;
}) => {
  const {
    size = 2,
    depth = size / 5,
    material = grayMaterial,
    isRed = false,
  } = opts ?? {};

  const gap = size / 6;

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

  const geometry = new THREE.ExtrudeGeometry([tl, tr, bl, br], {
    depth,
    bevelEnabled: false,
  });
  geometry.center();

  const outlineColor = isRed ? 0xbd4540 : 0xffffff;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.add(createOutline(geometry, outlineColor));

  return mesh;
};

const createStar = () =>
  new THREE.Mesh(new THREE.PlaneGeometry(1, 1), particleMaterial);

const degToRad = (deg: number) => (Math.PI / 180) * deg;

const extrapolate = (i: number, total: number, start: number, end: number) => {
  const delta = (end - start) / total;
  return start + delta * i;
};

const buildScene = () => {
  const chain1 = () => {
    const offset = 150;
    const deltaY = -0.2;
    const items = 20;

    for (let i = 0; i <= items; ++i) {
      const cell = createCell({
        material: grayMaterial,
        isRed: false,
      });
      cell.rotateZ(degToRad(extrapolate(i, items, offset, 240)));
      cell.position.set(
        extrapolate(i, items, -3, 2),
        1.5 + deltaY * Math.sin((i * 3.14) / items) * 3,
        extrapolate(i, items, 1, 2),
      );
      scene.add(cell);
    }
  };

  const chain2 = () => {
    const endPos = [-3.5, 1.7, 0.5];
    const endSize = 2;
    const startPos = [-20, -12, 0];
    const startSize = 4;
    const items = 40;

    for (let i = 0; i <= items; ++i) {
      const cell = createCell({
        size: extrapolate(i, items, startSize, endSize),
        material: grayMaterial,
        isRed: false,
      });

      cell.rotateZ(degToRad(extrapolate(i, items, -40, 140)));
      cell.position.set(
        extrapolate(i, items, startPos[0], endPos[0]),
        extrapolate(i, items, startPos[1], endPos[1]),
        extrapolate(i, items, startPos[2], endPos[2]),
      );
      scene.add(cell);
    }

    const items2 = 10;
    for (let i = 0; i <= items2; ++i) {
      const cell = createCell({
        size: extrapolate(i, items2, startSize, 5.0),
        material: grayMaterial,
        isRed: false,
      });
      cell.rotateZ(degToRad(extrapolate(i, items2, -40, -120)));
      cell.position.set(
        extrapolate(i, items2, startPos[0], -18),
        extrapolate(i, items2, startPos[1], -11),
        extrapolate(i, items2, startPos[2], -1),
      );
      scene.add(cell);
    }
  };

  const redChain = () => {
    const items = 7;
    for (let i = 0; i <= items; ++i) {
      const cell = createCell({
        material: redMaterial,
        isRed: true,
      });
      cell.rotateZ(degToRad(240));
      cell.position.set(
        extrapolate(i, items, 3, 10),
        1.5,
        extrapolate(i, items, 2, 2.5),
      );
      scene.add(cell);
    }
  };

  const chain3 = () => {
    const f = (x: number) => Math.pow(x, 2) / 20 - 1 * x;

    const items = 36;
    for (let i = 0; i < items; ++i) {
      const cell = createCell({
        material: grayMaterial,
        isRed: false,
      });
      cell.position.set(
        extrapolate(i, items, 11, 23),
        1.5 + Math.min(f(i) / 3, 0.4 * i),
        extrapolate(i, items, 3, 4),
      );
      cell.rotateZ(degToRad(extrapolate(i, items, 240, 440)));
      scene.add(cell);
    }
  };

  const stars = () => {
    const seedGrid = (
      x: number,
      y: number,
      size: number,
      rotate: number = 10,
    ) => {
      for (let i = 0; i <= 1; ++i) {
        const star = createStar();
        star.position.set(extrapolate(i, 2, x, x + 12), y, -1);
        star.scale.set(size, size * 1.5, 1);
        star.rotateY(degToRad(rotate));
        scene.add(star);
      }

      for (let i = 0; i <= 1; ++i) {
        const star = createStar();

        star.position.set(extrapolate(i, 2, x, x + 12) + 5, y, -5);
        star.scale.set(size / 2, (size * 1.5) / 2, 1);
        star.rotateY(degToRad(rotate));
        scene.add(star);
      }
    };

    seedGrid(0, -10, 10, 0);
    seedGrid(0, 0, 10, 0);
    seedGrid(0, 10, 10, 0);

    seedGrid(12, -11, 7, -5);
    seedGrid(11, 3, 5, -5);
    seedGrid(14, -4, 7, -5);
    seedGrid(13, 12, 9, -5);

    seedGrid(21, -6, 8, -10);
    seedGrid(27, -14, 4, -10);
    seedGrid(25, 12, 4, -10);

    seedGrid(-12, -11, 7, 5);
    seedGrid(-11, 3, 5, 5);
    seedGrid(-14, -4, 7, 5);
    seedGrid(-13, 12, 9, 5);

    seedGrid(-24, -7, 8, 5);
    seedGrid(-25, -14, 4, 5);
    seedGrid(-25, 8, 13, 5);

    const star = createStar();
    star.position.set(-7, 5, -1);
    star.scale.set(30, 30, 1);
    const star2 = createStar();
    star2.position.set(-12, 3, -2);
    star2.scale.set(25, 25, 1);
    scene.add(star);
    scene.add(star2);
  };

  stars();
  chain1();
  chain2();
  redChain();
  chain3();
};

buildScene();

function animate() {
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  lineResolution.set(window.innerWidth, window.innerHeight);
});
