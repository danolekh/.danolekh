import { useMemo } from "react";
import * as THREE from "three";

// Gray gradient material - created as instance
export function GrayMaterial() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
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
  }, []);

  return <primitive object={material} attach="material" />;
}

// Particle/star material
export function ParticleMaterial() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
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
  }, []);

  return <primitive object={material} attach="material" />;
}

// Red transmissive material component - uses onBeforeCompile for shader injection
export function RedMaterial() {
  return (
    <meshPhysicalMaterial
      color={0xffffff}
      transmission={0.8}
      thickness={2.0}
      roughness={0.12}
      metalness={0.2}
      ior={1.5}
      side={THREE.DoubleSide}
      onBeforeCompile={(shader) => {
        shader.uniforms.uColorCenter = { value: new THREE.Color(0xe83e38) };
        shader.uniforms.uColorEdge = { value: new THREE.Color(0x8f0f0a) };
        shader.uniforms.uSize = { value: 4.5 };

        shader.vertexShader = shader.vertexShader.replace(
          "#include <common>",
          `#include <common>
           varying vec3 vPos;`,
        );

        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           vPos = position;`,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          `#include <common>
           varying vec3 vPos;
           uniform vec3 uColorCenter;
           uniform vec3 uColorEdge;
           uniform float uSize;`,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `float dist = length(vPos.xy);
           float normalizedDist = dist / (uSize * 0.6);
           float gradient = smoothstep(0.0, 1.0, normalizedDist);
           vec3 gradientColor = mix(uColorCenter, uColorEdge, pow(gradient, 1.0/2.0));
           diffuseColor.rgb = gradientColor;`,
        );
      }}
    />
  );
}
