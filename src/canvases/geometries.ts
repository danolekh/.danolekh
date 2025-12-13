import * as THREE from "three";
import { LineSegmentsGeometry } from "three/examples/jsm/Addons.js";

const generateUnitCellGeometry = () => {
  const size = 1.0;
  const depth = 0.2;
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

  return geometry;
};

const cellGeometry = generateUnitCellGeometry();
const cellEdgesGeometry = new THREE.EdgesGeometry(cellGeometry, 15);
const cellOutlineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(
  cellEdgesGeometry,
);

const starGeometry = new THREE.PlaneGeometry(1, 1);
const unitQuadGeometry = new THREE.PlaneGeometry(1, 1);
export {
  cellGeometry,
  cellEdgesGeometry,
  cellOutlineGeometry,
  starGeometry,
  unitQuadGeometry,
};
