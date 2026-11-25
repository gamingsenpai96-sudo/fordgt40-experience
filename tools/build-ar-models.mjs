import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('/tmp/gt40-ar-toolkit/package.json');
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS, KHRDracoMeshCompression, KHRMaterialsClearcoat, KHRMaterialsSpecular, KHRMaterialsTransmission, KHRMaterialsVolume, KHRMaterialsEmissiveStrength } = require('@gltf-transform/extensions');
const { prune, dedup, weld, flatten, join } = require('@gltf-transform/functions');
const { MeshoptSimplifier } = require('meshoptimizer');
const draco3d = require('draco3dgltf');

const SRC_GLB = '/Users/perfectlyimperfect/Downloads/fordgt40-experience/assets/models/car/source/gt40.glb';
const BAKED_DIR = '/tmp/gt40_ar_baked';
const OUT_GLB = '/Users/perfectlyimperfect/Downloads/fordgt40-experience/assets/models/ar/gt40-ar.glb';
const OUT_PLAIN_GLB = '/Users/perfectlyimperfect/Downloads/fordgt40-experience/tools/tmp-ar-plain.glb';

// Only prune hidden internal plumbing not visible through exterior glass
const PRUNE_NODE_PREFIXES = [
  'Dry_Sump_Oil_System'
];

// Target per-material triangle caps for heavy CAD meshes so silhouette & rims remain razor-sharp
const TRI_TARGETS = {
  GT40_Body_Livery: 240000,
  GT40_427_V8_Powertrain: 18000,
  GT40_Cockpit_Interior: 40000,
  GT40_Halibrand_Rims: 80000,
  GT40_Solid_Tires: 30000,
  GT40_Competition_Glass: 10000,
  GT40_Headlights: 7500,
  GT40_Tail_Lights: 7500,
  GT40_Headlight_Lenses: 7500
};

function triCount(prim) {
  const idx = prim.getIndices();
  if (idx) return Math.floor(idx.getCount() / 3);
  const pos = prim.getAttribute('POSITION');
  return pos ? Math.floor(pos.getCount() / 3) : 0;
}

async function run() {
  await MeshoptSimplifier.ready;
  const dracoEncoder = await draco3d.createEncoderModule();
  const dracoDecoder = await draco3d.createDecoderModule();

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': dracoEncoder,
      'draco3d.decoder': dracoDecoder
    });

  console.log('1. Reading source GLB:', SRC_GLB);
  const doc = await io.read(SRC_GLB);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];

  // 2. Remove deep hidden subassemblies & bake LHD -> RHD (-X) into Cockpit_Details geometry
  // (USDZ does not support negative node scales, so we bake X -> -X directly into vertices)
  const cockpitDetailsNode = root.listNodes().find((n) => n.getName() === 'Cockpit_Details');
  if (cockpitDetailsNode) {
    const mirrorSubtree = (node) => {
      const tr = node.getTranslation();
      if (tr[0] !== 0) node.setTranslation([-tr[0], tr[1], tr[2]]);
      const m = node.getMesh();
      if (m) {
        for (const prim of m.listPrimitives()) {
          const pos = prim.getAttribute('POSITION');
          if (pos) {
            const arr = pos.getArray();
            for (let i = 0; i < arr.length; i += 3) arr[i] = -arr[i];
            pos.setArray(arr);
          }
          const norm = prim.getAttribute('NORMAL');
          if (norm) {
            const arr = norm.getArray();
            for (let i = 0; i < arr.length; i += 3) arr[i] = -arr[i];
            norm.setArray(arr);
          }
          const idx = prim.getIndices();
          if (idx) {
            const arr = idx.getArray();
            for (let k = 0; k < arr.length; k += 3) {
              const tmp = arr[k + 1];
              arr[k + 1] = arr[k + 2];
              arr[k + 2] = tmp;
            }
            idx.setArray(arr);
          }
        }
      }
      for (const ch of node.listChildren()) mirrorSubtree(ch);
    };
    mirrorSubtree(cockpitDetailsNode);
  }
  for (const node of root.listNodes()) {
    const nName = node.getName() || '';
    if (PRUNE_NODE_PREFIXES.some((p) => nName.startsWith(p))) {
      node.dispose();
    }
  }

  // 3. Load freshly baked crisp AR textures
  const loadImgTex = (fileName) => {
    const buf = fs.readFileSync(path.join(BAKED_DIR, fileName));
    return doc.createTexture(fileName.replace(/\.png$/i, ''))
      .setImage(buf)
      .setMimeType('image/png');
  };

  const texBody = loadImgTex('ar_body_basecolor.png');
  const texRims = loadImgTex('ar_rims_basecolor.png');
  const texTires = loadImgTex('ar_tires_basecolor.png');
  const texWheelNorm = loadImgTex('ar_wheels_normal.png');
  const texEngine = loadImgTex('ar_engine_basecolor.png');
  const texInterior = loadImgTex('ar_interior_basecolor.png');
  const texLights = loadImgTex('ar_lights_basecolor.png');

  // Clear unused original 3.8MB textures cleanly after reassignment
  const clearcoatExt = doc.createExtension(KHRMaterialsClearcoat);
  const specularExt = doc.createExtension(KHRMaterialsSpecular);
  const emissiveExt = doc.createExtension(KHRMaterialsEmissiveStrength);

  for (const mat of root.listMaterials()) {
    const mName = mat.getName() || '';
    // Strip KHR_materials_transmission / volume which turn glass opaque in Three.js USDZExporter
    mat.setExtension('KHR_materials_transmission', null);
    mat.setExtension('KHR_materials_volume', null);

    if (mName === 'GT40_Body_Livery') {
      mat.setBaseColorFactor([1, 1, 1, 1])
        .setBaseColorTexture(texBody)
        .setMetallicFactor(0.03)
        .setRoughnessFactor(0.24)
        .setNormalTexture(null)
        .setMetallicRoughnessTexture(null)
        .setAlphaMode('OPAQUE')
        .setDoubleSided(true);
      // Tame mirror-chrome glare under bright HDR studio/outdoor environments so black paint stays rich piano black
      mat.setExtension('KHR_materials_clearcoat', clearcoatExt.createClearcoat()
        .setClearcoatFactor(0.18)
        .setClearcoatRoughnessFactor(0.22));
      mat.setExtension('KHR_materials_specular', specularExt.createSpecular()
        .setSpecularFactor(0.26));
    } else if (mName === 'GT40_Halibrand_Rims') {
      mat.setBaseColorFactor([1, 1, 1, 1])
        .setBaseColorTexture(texRims)
        .setNormalTexture(texWheelNorm)
        .setMetallicFactor(0.86)
        .setRoughnessFactor(0.28)
        .setAlphaMode('OPAQUE')
        .setDoubleSided(true);
    } else if (mName === 'GT40_Solid_Tires') {
      mat.setBaseColorFactor([1, 1, 1, 1])
        .setBaseColorTexture(texTires)
        .setNormalTexture(texWheelNorm)
        .setMetallicFactor(0.03)
        .setRoughnessFactor(0.88)
        .setAlphaMode('OPAQUE')
        .setDoubleSided(true);
    } else if (mName === 'GT40_Competition_Glass') {
      mat.setBaseColorFactor([0.84, 0.90, 0.95, 0.34])
        .setBaseColorTexture(null)
        .setMetallicFactor(0.12)
        .setRoughnessFactor(0.08)
        .setAlphaMode('BLEND')
        .setDoubleSided(true);
    } else if (mName === 'GT40_Headlight_Lenses') {
      mat.setBaseColorFactor([0.92, 0.96, 1.0, 0.28])
        .setBaseColorTexture(null)
        .setMetallicFactor(0.14)
        .setRoughnessFactor(0.08)
        .setAlphaMode('BLEND')
        .setDoubleSided(true);
    } else if (mName === 'GT40_Headlights') {
      mat.setBaseColorFactor([1, 1, 1, 1])
        .setBaseColorTexture(texLights)
        .setMetallicFactor(0.82)
        .setRoughnessFactor(0.16)
        .setEmissiveFactor([0.96, 0.90, 0.78])
        .setAlphaMode('OPAQUE');
      mat.setExtension('KHR_materials_emissive_strength', emissiveExt.createEmissiveStrength().setEmissiveStrength(1.1));
    } else if (mName === 'GT40_Tail_Lights') {
      mat.setBaseColorFactor([0.85, 0.04, 0.03, 1.0])
        .setBaseColorTexture(null)
        .setMetallicFactor(0.10)
        .setRoughnessFactor(0.24)
        .setEmissiveFactor([0.65, 0.04, 0.02])
        .setAlphaMode('OPAQUE');
      mat.setExtension('KHR_materials_emissive_strength', emissiveExt.createEmissiveStrength().setEmissiveStrength(1.0));
    } else if (mName === 'GT40_427_V8_Powertrain') {
      mat.setBaseColorFactor([1, 1, 1, 1])
        .setBaseColorTexture(texEngine)
        .setMetallicRoughnessTexture(null)
        .setMetallicFactor(0.68)
        .setRoughnessFactor(0.38)
        .setAlphaMode('OPAQUE')
        .setDoubleSided(true);
    } else if (mName === 'GT40_Cockpit_Interior') {
      mat.setBaseColorFactor([1, 1, 1, 1])
        .setBaseColorTexture(texInterior)
        .setNormalTexture(null)
        .setMetallicRoughnessTexture(null)
        .setMetallicFactor(0.12)
        .setRoughnessFactor(0.72)
        .setAlphaMode('OPAQUE')
        .setDoubleSided(true);
    }
  }

  // 4. Clean up unused resources, flatten, weld & merge primitives by material
  await doc.transform(
    prune(),
    dedup(),
    flatten(),
    join(),
    weld({ tolerance: 0.0001 })
  );

  // 5. Targeted meshoptimizer simplification preserving silhouette & sharp livery UVs
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mName = prim.getMaterial()?.getName() || '';
      const targetTris = TRI_TARGETS[mName];
      const currentTris = triCount(prim);
      if (targetTris && currentTris > targetTris) {
        const pos = prim.getAttribute('POSITION');
        const idx = prim.getIndices();
        if (pos && idx) {
          const posArr = pos.getArray();
          const idxArr = idx.getArray();
          const posFloat = posArr instanceof Float32Array ? posArr : new Float32Array(posArr);
          let idxUint32 = idxArr instanceof Uint32Array ? idxArr : new Uint32Array(idxArr);

          // Weld polygon-soup powertrain vertices on a 2mm spatial grid so Meshopt can simplify cleanly
          if (mName === 'GT40_427_V8_Powertrain') {
            const spatialMap = new Map();
            const vAlias = new Int32Array(pos.getCount());
            for (let v = 0; v < pos.getCount(); v++) {
              const kx = Math.round(posFloat[v * 3] * 500);
              const ky = Math.round(posFloat[v * 3 + 1] * 500);
              const kz = Math.round(posFloat[v * 3 + 2] * 500);
              const key = `${kx},${ky},${kz}`;
              let canon = spatialMap.get(key);
              if (canon === undefined) {
                canon = v;
                spatialMap.set(key, v);
              }
              vAlias[v] = canon;
            }
            const cleanIdx = [];
            for (let k = 0; k < idxUint32.length; k += 3) {
              const a = vAlias[idxUint32[k]];
              const b = vAlias[idxUint32[k + 1]];
              const c = vAlias[idxUint32[k + 2]];
              if (a !== b && b !== c && a !== c) {
                cleanIdx.push(a, b, c);
              }
            }
            idxUint32 = new Uint32Array(cleanIdx);
          }

          const targetIdxCount = Math.max(3, Math.floor(targetTris) * 3);
          const errTol = mName === 'GT40_Body_Livery'
            ? 0.0008
            : mName === 'GT40_427_V8_Powertrain'
              ? 0.25
              : (mName === 'GT40_Cockpit_Interior' ? 0.025 : mName === 'GT40_Halibrand_Rims' ? 0.012 : 0.015);
          const [simplified, error] = MeshoptSimplifier.simplify(
            idxUint32,
            posFloat,
            3,
            Math.min(idxUint32.length, targetIdxCount),
            errTol
          );
          if (simplified && simplified.length >= 3) {
            // Compact vertex buffers so deleted high-poly vertices don't bloat GLB / USDZ
            const remap = new Int32Array(pos.getCount()).fill(-1);
            let nextVert = 0;
            const compactIdx = new Uint32Array(simplified.length);
            for (let k = 0; k < simplified.length; k++) {
              const oldV = simplified[k];
              let nv = remap[oldV];
              if (nv === -1) {
                nv = nextVert++;
                remap[oldV] = nv;
              }
              compactIdx[k] = nv;
            }
            for (const sem of prim.listSemantics()) {
              const attr = prim.getAttribute(sem);
              const eSize = attr.getElementSize();
              const srcArr = attr.getArray();
              const dstArr = new srcArr.constructor(nextVert * eSize);
              for (let oldV = 0; oldV < remap.length; oldV++) {
                const nv = remap[oldV];
                if (nv !== -1) {
                  for (let c = 0; c < eSize; c++) {
                    dstArr[nv * eSize + c] = srcArr[oldV * eSize + c];
                  }
                }
              }
              attr.setArray(dstArr);
            }
            idx.setArray(compactIdx);
            console.log(`Simplified ${mName}: ${currentTris} -> ${Math.floor(compactIdx.length / 3)} tris (${nextVert} verts, err=${error.toFixed(5)})`);
          }
        }
      }
    }
  }

  await doc.transform(prune(), dedup());

  // 5b. Fix inverted triangle winding (94%+ of CAD triangles in gt40.glb have backwards index order
  // relative to their outward vertex normals, causing iOS Quick Look single-sided culling of the hood!)
  let totalFixed = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')?.getArray();
      const norm = prim.getAttribute('NORMAL')?.getArray();
      const idxAttr = prim.getIndices();
      const idx = idxAttr?.getArray();
      if (!pos || !norm || !idx) continue;
      let fixedHere = 0;
      for (let k = 0; k < idx.length; k += 3) {
        const a = idx[k], b = idx[k + 1], c = idx[k + 2];
        const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
        const ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
        const vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
        const fx = uy * vz - uz * vy;
        const fy = uz * vx - ux * vz;
        const fz = ux * vy - uy * vx;
        const nx = norm[a * 3] + norm[b * 3] + norm[c * 3];
        const ny = norm[a * 3 + 1] + norm[b * 3 + 1] + norm[c * 3 + 1];
        const nz = norm[a * 3 + 2] + norm[b * 3 + 2] + norm[c * 3 + 2];
        if (fx * nx + fy * ny + fz * nz < 0) {
          idx[k + 1] = c;
          idx[k + 2] = b;
          fixedHere++;
        }
      }
      if (fixedHere > 0) {
        idxAttr.setArray(idx);
        totalFixed += fixedHere;
      }
    }
  }
  console.log(`Fixed inverted triangle winding on ${totalFixed} triangles for solid iOS Quick Look rendering`);

  // 6. Ground flush on Y = 0 floor plane for 1:1 AR (lowest tire patch was y = -0.372)
  const carRootNode = doc.createNode('GT40_MK2_P1046_AR')
    .setTranslation([0, 0.372, 0]);
  for (const child of [...scene.listChildren()]) {
    scene.removeChild(child);
    carRootNode.addChild(child);
  }
  scene.addChild(carRootNode);

  // Summary count
  let finalTris = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      finalTris += triCount(prim);
    }
  }
  console.log(`Total final AR meshes=${root.listMeshes().length}, triangles=${finalTris}`);

  // 7. Write plain uncompressed GLB for Three.js USDZExporter
  await io.write(OUT_PLAIN_GLB, doc);
  console.log(`Wrote plain GLB (${(fs.statSync(OUT_PLAIN_GLB).size / 1024 / 1024).toFixed(2)} MB): ${OUT_PLAIN_GLB}`);

  // 8. Apply Draco compression cleanly & write dedicated web/Android AR GLB
  doc.createExtension(KHRDracoMeshCompression)
    .setRequired(true)
    .setEncoderOptions({
      method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
      encodeSpeed: 5,
      decodeSpeed: 6,
      quantizationVolume: 'MESH',
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
      quantizeGeneric: 10
    });

  await io.write(OUT_GLB, doc);
  console.log(`Wrote final compressed AR GLB (${(fs.statSync(OUT_GLB).size / 1024 / 1024).toFixed(2)} MB): ${OUT_GLB}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
