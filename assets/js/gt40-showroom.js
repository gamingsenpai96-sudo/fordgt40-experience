/**
 * ============================================================================
 * Ford GT40 Mk II (Chassis P/1046) — Interactive 3D Automotive Showroom
 * ============================================================================
 * Recreates the cinematic luxury detailing showroom atmosphere & choreography:
 *   - Glowing hexagonal LED ceiling tube grid reflected on wet-look dark epoxy
 *   - American walnut timber left wall & smoked panoramic steel/glass bay door
 *   - Glass-walled right viewing lounge with cognac leather chairs & table
 *   - Existing gt40.glb partitioned cleanly (no source mutation) into hinged
 *     RHD driver door, passenger door, front clamshell bonnet, rear engine cover,
 *     and 4 synchronized rolling wheels/rims
 *   - 4-sequence arrival choreography -> interactive navigation into all site modes
 * ============================================================================
 */

import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { OrbitControls } from './OrbitControls.js';

const INTERACTION_DATA = {
  driver_door: {
    tag: "01 // DRIVER'S DOOR & COCKPIT",
    title: 'RIGHT-HAND DRIVE MONOCOQUE',
    desc: 'Built strictly right-hand drive for high-speed Le Mans corner apexes and rapid driver changes. Swing back the roof-cut competition door to inspect the Stewart-Warner 8-gauge instrument cluster, Moto-Lita wheel, and right-sill gated shifter.',
    specs: [
      { label: 'CHASSIS', val: 'P/1046 (1966 Winner)' },
      { label: 'ROOF HEIGHT', val: '40.0 Inches (1,016 mm)' },
      { label: 'SEATING', val: 'Right-Hand Drive Tub' },
      { label: 'TRANSMISSION', val: 'Right-Sill 4-Speed Gated' }
    ],
    primaryCta: { label: 'ENTER THE COCKPIT', action: 'portal', destination: 'cockpit' },
    secondaryCta: { label: 'CLOSE DOOR', action: 'toggle_door' }
  },
  front_bonnet: {
    tag: '02 // FRONT BONNET & RADIATOR BAY',
    title: 'CLAMSHELL NOSE & COOLING',
    desc: 'Quick-release front fiberglass clamshell hinges forward to expose the dual crossflow radiator core, twin cooling fans, front brake air ducting, and tubular steel subframe designed for 212+ mph Mulsanne stability.',
    specs: [
      { label: 'CLAMSHELL', val: 'Forward-Tilting Nose Clip' },
      { label: 'COOLING', val: 'Crossflow Radiator & Fans' },
      { label: 'DRAG COEFF.', val: 'Cd 0.35 Aero Nose' },
      { label: 'BRAKE DUCTING', val: 'Front NACA Nose Intakes' }
    ],
    primaryCta: { label: 'INSPECT COOLING & AERO', action: 'portal', destination: 'exploded', system: 'cooling' },
    secondaryCta: { label: 'CLOSE BONNET', action: 'toggle_bonnet' }
  },
  rear_engine: {
    tag: '03 // REAR ENGINE CLAMSHELL',
    title: '427 FE 7.0L V8 & T-44',
    desc: "Twin-latched rear bodywork pivots back over the tail, unveiling Shelby American's cross-bolted 427 cu in FE big-block V8, Holley 4-barrel carbs, white ceramic Bundle of Snakes headers, and the Kar Kraft T-44 transaxle.",
    specs: [
      { label: 'ENGINE', val: '7.0L (427 cu in) FE V8' },
      { label: 'OUTPUT', val: '485 BHP @ 6,200 RPM' },
      { label: 'TORQUE', val: '475 lb-ft' },
      { label: 'TRANSAXLE', val: 'Kar Kraft T-44 4-Speed' }
    ],
    primaryCta: { label: 'EXPLORE THE ENGINEERING', action: 'portal', destination: 'exploded', system: 'engine' },
    secondaryCta: { label: 'CLOSE ENGINE COVER', action: 'toggle_rear' },
    audioCta: { label: 'REV 427 V8', action: 'rev_audio' }
  },
  steering_wheel: {
    tag: "04 // DRIVER'S CONTROLS",
    title: 'MOTO-LITA HELM & STEERING',
    desc: 'A 15-inch 3-spoke competition steering wheel framed directly behind the right-hand windscreen pillar, flanking tactile toggle switches and competition dials engineered to endure 24 relentless hours at Le Mans.',
    specs: [
      { label: 'CONFIGURATION', val: 'Right-Hand Drive Helm' },
      { label: 'TOP SPEED', val: '212+ mph (341 km/h)' },
      { label: 'DRIVERS', val: 'B. McLaren / C. Amon' },
      { label: 'CIRCUIT', val: '13.46 km La Sarthe (1966)' }
    ],
    primaryCta: { label: 'TAKE CONTROL', action: 'portal', destination: 'game' },
    secondaryCta: { label: 'ENTER COCKPIT', action: 'portal', destination: 'cockpit' }
  },
  wheel: {
    tag: '05 // WHEELS, BRAKES & SUSPENSION',
    title: 'HALIBRAND & QUICK-CHANGE GIRLING',
    desc: "15-inch cast Halibrand magnesium center-lock wheels wrapped in solid Goodyear Blue Streak rubber, housing Phil Remington's quick-change Girling brake calipers engineered for 90-second pad changes at 750°C.",
    specs: [
      { label: 'WHEELS', val: 'Halibrand 15" Magnesium' },
      { label: 'TIRES', val: 'Goodyear Blue Streak' },
      { label: 'CALIPERS', val: 'Remington Quick-Change' },
      { label: 'SUSPENSION', val: 'Koni Adjustable Coilovers' }
    ],
    primaryCta: { label: 'INSPECT BRAKES & SUSPENSION', action: 'portal', destination: 'exploded', system: 'brakes' },
    secondaryCta: { label: 'RESET STANCE VIEW', action: 'overview' }
  },
  exterior: {
    tag: '06 // FULL EXTERIOR STANCE',
    title: 'CHASSIS P/1046 • GO LIKE HELL',
    desc: 'Single-stage gloss black lacquer bisected by twin white Le Mans racing stripes over a 40-inch steel semi-monocoque. Drag to orbit freely around the showroom bay or launch into historical dossiers and 1:1 Augmented Reality.',
    specs: [
      { label: 'CHASSIS', val: 'Ford GT40 Mk II P/1046' },
      { label: 'OVERALL HEIGHT', val: '40.0 Inches (1,016 mm)' },
      { label: 'BODY LENGTH', val: '4.09 m Low-Drag Shell' },
      { label: '1966 FINISH', val: '1-2-3 Historic Sweep' }
    ],
    primaryCta: { label: 'OPEN 1:1 AUGMENTED REALITY', action: 'portal', destination: 'ar' },
    secondaryCta: { label: 'READ 1966 CHRONICLES', action: 'portal', destination: 'chronicles' }
  }
};

// Lightweight Planar Floor Reflector tuned for Three.js r160
class ShowroomReflector extends THREE.Mesh {
  constructor(geometry, options = {}) {
    const color = new THREE.Color(options.color !== undefined ? options.color : 0x383d48);
    const textureWidth = options.textureWidth || 1024;
    const textureHeight = options.textureHeight || 1024;
    const clipBias = options.clipBias !== undefined ? options.clipBias : 0.002;
    const shader = {
      uniforms: {
        color: { value: color },
        tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() }
      },
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        void main() {
          vUv = textureMatrix * modelMatrix * vec4( position, 1.0 );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        uniform sampler2D tDiffuse;
        varying vec4 vUv;
        void main() {
          vec4 base = texture2DProj( tDiffuse, vUv );
          gl_FragColor = vec4( base.rgb * color, 1.0 );
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `
    };

    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader
    });

    super(geometry, material);

    this.type = 'ShowroomReflector';
    this.isReflector = true;
    this.hiddenForReflection = options.hiddenDuringPass || [];

    const renderTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight, {
      samples: 2,
      type: THREE.HalfFloatType
    });

    const virtualCamera = new THREE.PerspectiveCamera();
    const reflectorPlane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const reflectorWorldPosition = new THREE.Vector3();
    const cameraWorldPosition = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    const lookAtPosition = new THREE.Vector3(0, 0, -1);
    const clipPlane = new THREE.Vector4();
    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const q = new THREE.Vector4();
    const textureMatrix = new THREE.Matrix4();

    material.uniforms.tDiffuse.value = renderTarget.texture;
    material.uniforms.textureMatrix.value = textureMatrix;

    this.onBeforeRender = (renderer, scene, camera) => {
      reflectorWorldPosition.setFromMatrixPosition(this.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);

      rotationMatrix.extractRotation(this.matrixWorld);
      normal.set(0, 0, 1).applyMatrix4(rotationMatrix);

      view.subVectors(reflectorWorldPosition, cameraWorldPosition);
      if (view.dot(normal) > 0) return;

      view.reflect(normal).negate().add(reflectorWorldPosition);

      rotationMatrix.extractRotation(camera.matrixWorld);
      lookAtPosition.set(0, 0, -1).applyMatrix4(rotationMatrix).add(cameraWorldPosition);

      target.subVectors(reflectorWorldPosition, lookAtPosition).reflect(normal).negate().add(reflectorWorldPosition);

      virtualCamera.position.copy(view);
      virtualCamera.up.set(0, 1, 0).applyMatrix4(rotationMatrix).reflect(normal);
      virtualCamera.lookAt(target);
      virtualCamera.far = camera.far;
      virtualCamera.near = camera.near;
      virtualCamera.fov = camera.fov;
      virtualCamera.aspect = camera.aspect;
      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

      textureMatrix.set(
        0.5, 0.0, 0.0, 0.5,
        0.0, 0.5, 0.0, 0.5,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0
      );
      textureMatrix.multiply(virtualCamera.projectionMatrix);
      textureMatrix.multiply(virtualCamera.matrixWorldInverse);
      textureMatrix.multiply(this.matrixWorld);

      // Oblique near-clip plane at the floor mirror surface
      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
      reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

      clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant);
      const projectionMatrix = virtualCamera.projectionMatrix;
      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
      q.z = -1.0;
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];
      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
      projectionMatrix.elements[2] = clipPlane.x;
      projectionMatrix.elements[6] = clipPlane.y;
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
      projectionMatrix.elements[14] = clipPlane.w;

      // Render mirror scene cleanly without self/floor overlays
      const prevVisStates = [];
      for (const obj of this.hiddenForReflection) {
        if (obj) {
          prevVisStates.push([obj, obj.visible]);
          obj.visible = false;
        }
      }
      this.visible = false;

      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(renderTarget);
      renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, virtualCamera);

      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.setRenderTarget(currentRenderTarget);

      this.visible = true;
      for (const [obj, wasVis] of prevVisStates) {
        obj.visible = wasVis;
      }
    };

    this.getRenderTarget = () => renderTarget;
    this.dispose = () => {
      renderTarget.dispose();
      material.dispose();
    };
  }
}

export class GT40Showroom {
  constructor() {
    this.section = document.getElementById('showroom-section');
    this.canvas = document.getElementById('showroom-canvas');
    if (!this.section || !this.canvas) return;

    this.loaderEl = document.getElementById('showroom-loader');
    this.loaderFill = document.getElementById('showroom-loader-fill');
    this.loaderStatus = document.getElementById('showroom-loader-status');
    this.fallbackEl = document.getElementById('showroom-webgl-fallback');
    this.hotspotsLayer = document.getElementById('showroom-hotspots');
    this.exploreCue = document.getElementById('showroom-explore-cue');
    this.skipIntroBtn = document.getElementById('showroom-skip-intro');
    this.resetCarBtn = document.getElementById('showroom-reset-car');
    this.inspectorCard = document.getElementById('showroom-inspector-card');
    this.sequenceTag = document.getElementById('showroom-sequence-tag');

    // State machine: loading -> establish -> approach -> settle -> inspect -> interactive
    this.phase = 'loading';
    this.phaseStart = performance.now();
    this.isActive = true;
    this.isModelReady = false;
    this.activeInteraction = null;
    this.hoveredZone = null;

    // Car positioning & animation parameters
    this.carStartZ = -8.2;
    this.carFinalZ = 0.0;
    this.carCurrentZ = this.carStartZ;
    this.carFloorY = 0.34;
    this.wheelRadius = 0.34;
    this.tirePitch = 0.0;

    // Articulated panel animation states (current -> target)
    this.panels = {
      driverDoor: { current: 0, target: 0, maxOpen: 0.94, pivot: null, meshes: [], baseMat: null },
      passengerDoor: { current: 0, target: 0, maxOpen: -0.94, pivot: null, meshes: [], baseMat: null },
      frontBonnet: { current: 0, target: 0, maxOpen: 0.38, pivot: null, meshes: [], baseMat: null },
      rearCover: { current: 0, target: 0, maxOpen: -0.66, pivot: null, meshes: [], baseMat: null }
    };

    // Synchronized wheel pivots (FL, FR, RL, RR)
    this.wheelPivots = {};
    this.zoneMeshes = new Map(); // mesh -> zoneKey
    this.hoverMaterials = [];

    // Smooth Camera Transition State
    this.cameraAnim = {
      active: false,
      start: 0,
      duration: 1100,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      startTarget: new THREE.Vector3(),
      endTarget: new THREE.Vector3(),
      onComplete: null
    };

    // Reusable math temporaries (zero per-frame GC allocation)
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._projVec = new THREE.Vector3();
    this._camDir = new THREE.Vector3();
    this._camForward = new THREE.Vector3();
    this._pointerDown = { x: 0, y: 0, time: 0 };
    this._lastHoverCheck = 0;

    // Web Audio Sound Effects (subtle mechanical latch & ambient V8)
    this.revAudio = new Audio('assets/audio/ford-rev.wav');
    this.revAudio.volume = 0.85;
    this._audioCtx = null;

    // 3D Hotspot descriptors (spatially staggered for zero 2D label overlap)
    this.hotspotDefs = [
      { key: 'driver_door', label: 'DRIVER DOOR', sub: 'RHD COCKPIT', anchor: null, localOffset: new THREE.Vector3(-0.79, 0.22, -0.02) },
      { key: 'front_bonnet', label: 'FRONT BONNET', sub: 'RADIATOR & DUCTS', anchor: null, localOffset: new THREE.Vector3(0.0, 0.22, 1.56) },
      { key: 'rear_engine', label: 'ENGINE BAY', sub: '427 FE 7.0L V8', anchor: null, localOffset: new THREE.Vector3(-0.38, 0.44, -1.25) },
      { key: 'steering_wheel', label: 'STEERING HELM', sub: 'TAKE CONTROL', anchor: null, localOffset: new THREE.Vector3(-0.26, 0.36, 0.42) },
      { key: 'wheel', label: 'WHEELS & BRAKES', sub: 'HALIBRAND • GIRLING', anchor: null, localOffset: new THREE.Vector3(-0.84, 0.02, 1.23) },
      { key: 'exterior', label: 'EXTERIOR STANCE', sub: 'P/1046 • AR', anchor: null, localOffset: new THREE.Vector3(0.14, 0.70, 0.02) }
    ];
    this.hotspotNodes = new Map();

    // Responsive sizing state
    this.isMobileViewport = window.innerWidth <= 768;

    this.init();
  }

  init() {
    if (!this.checkWebGLSupport()) {
      this.showWebGLFallback();
      return;
    }

    if (this.fallbackEl) {
      this.fallbackEl.hidden = true;
      this.fallbackEl.style.display = 'none';
    }

    this.initThree();
    this.buildShowroomEnvironment();
    this.createHotspotElements();
    this.bindEvents();
    this.animate();
    this.loadGT40();
  }

  checkWebGLSupport() {
    try {
      const testCanvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')));
    } catch {
      return false;
    }
  }

  showWebGLFallback() {
    if (this.loaderEl) this.loaderEl.classList.add('hidden');
    if (this.fallbackEl) {
      this.fallbackEl.hidden = false;
      this.fallbackEl.style.display = 'flex';
    }
  }

  initThree() {
    const w = this.section.clientWidth || window.innerWidth || 1440;
    const h = this.section.clientHeight || window.innerHeight || 900;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0c10);
    this.scene.fog = new THREE.FogExp2(0x0b0c10, 0.018);

    const aspect = w / h;
    const baseFov = aspect < 0.85 ? 48 : 39;
    this.camera = new THREE.PerspectiveCamera(baseFov, aspect, 0.12, 80);

    // Sequence 01 Establish camera: centered low-eye showroom view facing entrance bay
    this.camera.position.set(0.32, 1.06, 5.25);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobileViewport ? 1.5 : 1.85));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // OrbitControls — unlocked once car settles (Sequence 04)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.45;
    this.controls.maxDistance = 6.9;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Never sink into floor
    this.controls.enabled = false;
    this.controls.target.set(0, 0.42, -3.5);
    this.controls.update();

    this.setupLightingAndEnvMap();
  }

  setupLightingAndEnvMap() {
    // Architectural Showbay Lighting matching reference video:
    // Clean cool-warm neutral overhead studio diffusion + subtle warm sunset bay accent + lounge glow
    const hemi = new THREE.HemisphereLight(0xf6f1e6, 0x171920, 0.65);
    this.scene.add(hemi);

    // Overhead Hexagonal Ceiling Area Fill (warm studio daylight)
    const ceilingMain = new THREE.DirectionalLight(0xfffaf0, 1.95);
    ceilingMain.position.set(-1.5, 3.4, 2.2);
    ceilingMain.castShadow = true;
    ceilingMain.shadow.mapSize.set(2048, 2048);
    ceilingMain.shadow.camera.near = 0.5;
    ceilingMain.shadow.camera.far = 16;
    const d = 5.2;
    ceilingMain.shadow.camera.left = -d;
    ceilingMain.shadow.camera.right = d;
    ceilingMain.shadow.camera.top = d;
    ceilingMain.shadow.camera.bottom = -d;
    ceilingMain.shadow.bias = -0.0004;
    this.scene.add(ceilingMain);

    // Front-Right Key Spot (Sculpts gloss black curves & white Le Mans stripes)
    const keySpot = new THREE.SpotLight(0xfff9ee, 28, 18, Math.PI / 4, 0.55, 1.4);
    keySpot.position.set(-3.2, 3.25, 3.5);
    keySpot.target.position.set(0, 0.35, 0.2);
    this.scene.add(keySpot);
    this.scene.add(keySpot.target);

    // Rear Rim Spot (Edge-lights rear haunches & louvre lines as car pulls forward)
    const rearRim = new THREE.SpotLight(0xffcf94, 18, 20, Math.PI / 3.2, 0.65, 1.4);
    rearRim.position.set(1.8, 3.15, -5.8);
    rearRim.target.position.set(0, 0.45, -1.0);
    this.scene.add(rearRim);
    this.scene.add(rearRim.target);

    // Front Nose Accent Fill (illuminates crisp white twin racing stripes down the bonnet)
    const noseFill = new THREE.SpotLight(0xf8fafc, 16, 12, Math.PI / 3.4, 0.75, 1.3);
    noseFill.position.set(0.4, 2.85, 4.1);
    noseFill.target.position.set(0, 0.22, 1.35);
    this.scene.add(noseFill);
    this.scene.add(noseFill.target);

    // Subtle Lounge Warm Fill (+X right side glass wall)
    const loungeFill = new THREE.PointLight(0xffb86b, 1.8, 8.0, 1.6);
    loungeFill.position.set(5.4, 2.2, -0.5);
    this.scene.add(loungeFill);

    // Engine Bay Inspection Light (only illuminates strongly when Rear Cover opens)
    this.engineBayLight = new THREE.PointLight(0xffdfa8, 0.0, 2.5, 1.8);
    this.engineBayLight.position.set(0, 1.15, -0.85);
    this.scene.add(this.engineBayLight);

    // Cockpit Interior Subtle Reveal Light (illuminates inside RHD tub when door opens)
    this.cockpitRevealLight = new THREE.PointLight(0xffe7c2, 0.0, 2.4, 1.8);
    this.cockpitRevealLight.position.set(-0.35, 0.78, 0.10);
    this.scene.add(this.cockpitRevealLight);

    // Front Bonnet Inspection Light (illuminates crossflow radiator/fans when bonnet opens)
    this.bonnetRevealLight = new THREE.PointLight(0xeef5ff, 0.0, 2.2, 1.8);
    this.bonnetRevealLight.position.set(0.0, 0.85, 1.38);
    this.scene.add(this.bonnetRevealLight);

    // Bake Custom Diffused Showroom Environment Map (PMREM) so obsidian gloss lacquer
    // shows silky architectural highlights without harsh copper wall tint or zebra banding
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x090b10);

      // Cool slate architectural wall reflections
      const wallBack = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 6),
        new THREE.MeshBasicMaterial({ color: 0x1a1e28 })
      );
      wallBack.position.set(0, 2.0, -11);
      envScene.add(wallBack);

      const wallLeft = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 5),
        new THREE.MeshBasicMaterial({ color: 0x121012 })
      );
      wallLeft.position.set(-6.5, 2.0, 0);
      wallLeft.rotation.y = Math.PI / 2;
      envScene.add(wallLeft);

      const wallRight = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 5),
        new THREE.MeshBasicMaterial({ color: 0x18171a })
      );
      wallRight.position.set(6.5, 2.0, 0);
      wallRight.rotation.y = -Math.PI / 2;
      envScene.add(wallRight);

      // Soft overhead diffused studio canopy + broad cool-white ceiling ribs
      const canopy = new THREE.Mesh(
        new THREE.PlaneGeometry(8.5, 12.0),
        new THREE.MeshBasicMaterial({ color: 0x2b313e })
      );
      canopy.rotation.x = Math.PI / 2;
      canopy.position.set(0, 3.55, 0);
      envScene.add(canopy);

      const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 1.08, 1.14) });
      const hexR = 0.82;
      for (let row = -2; row <= 2; row++) {
        for (let col = -2; col <= 2; col++) {
          const cx = col * hexR * 1.62;
          const cz = row * hexR * 1.86 + (col % 2 === 0 ? 0 : hexR * 0.93);
          for (let e = 0; e < 6; e++) {
            const a1 = (e * Math.PI) / 3;
            const a2 = ((e + 1) * Math.PI) / 3;
            const mx = cx + ((Math.cos(a1) + Math.cos(a2)) * 0.5) * hexR;
            const mz = cz + ((Math.sin(a1) + Math.sin(a2)) * 0.5) * hexR;
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, hexR), tubeMat);
            bar.position.set(mx, 3.40, mz);
            bar.rotation.y = -Math.atan2(Math.sin(a2) - Math.sin(a1), Math.cos(a2) - Math.cos(a1)) + Math.PI / 2;
            envScene.add(bar);
          }
        }
      }

      const envRT = pmrem.fromScene(envScene, 0.068);
      this.scene.environment = envRT.texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('Showroom PMREM env fallback:', e);
    }
  }

  createWalnutTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#2d1c12';
    ctx.fillRect(0, 0, 512, 512);

    const planks = 8;
    const pw = 512 / planks;
    for (let i = 0; i < planks; i++) {
      const x = i * pw;
      const shade = 34 + ((i * 19) % 24);
      const grad = ctx.createLinearGradient(x, 0, x + pw, 0);
      grad.addColorStop(0, `rgb(${shade + 12}, ${Math.round(shade * 0.62)}, ${Math.round(shade * 0.38)})`);
      grad.addColorStop(0.5, `rgb(${shade + 24}, ${Math.round(shade * 0.72)}, ${Math.round(shade * 0.45)})`);
      grad.addColorStop(1, `rgb(${shade + 6}, ${Math.round(shade * 0.55)}, ${Math.round(shade * 0.34)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, pw - 2, 512);

      // Subtle vertical walnut grain lines
      ctx.strokeStyle = 'rgba(18, 9, 4, 0.28)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 18; g++) {
        const gx = x + 4 + ((g * 7 + i * 5) % (pw - 8));
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + 3, 170, gx - 3, 340, gx + 1, 512);
        ctx.stroke();
      }

      // Vertical shadow reveal between architectural wood panels
      ctx.fillStyle = '#0d0907';
      ctx.fillRect(x + pw - 3, 0, 3, 512);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  createEpoxyFloorTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#15181f';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle concrete epoxy mineral aggregate specks
    for (let i = 0; i < 4200; i++) {
      const x = (i * 97 + (i % 13) * 31) % 512;
      const y = (i * 53 + (i % 17) * 41) % 512;
      const alpha = 0.03 + ((i % 7) * 0.01);
      ctx.fillStyle = i % 3 === 0 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.4})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Subtle control joint lines
    ctx.strokeStyle = 'rgba(0,0,0,0.42)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(9, 10);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  createContactShadowTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 512, 512);

    // Soft under-chassis AO gradient
    const gBody = ctx.createRadialGradient(256, 256, 40, 256, 256, 235);
    gBody.addColorStop(0, 'rgba(0,0,0,0.92)');
    gBody.addColorStop(0.6, 'rgba(0,0,0,0.68)');
    gBody.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gBody;
    ctx.save();
    ctx.translate(256, 256);
    ctx.scale(0.55, 1.0);
    ctx.beginPath();
    ctx.arc(0, 0, 230, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4 dark tire contact pads
    const pads = [
      [172, 138], [340, 138],
      [170, 368], [342, 368]
    ];
    pads.forEach(([px, py]) => {
      const gp = ctx.createRadialGradient(px, py, 6, px, py, 44);
      gp.addColorStop(0, 'rgba(0,0,0,0.95)');
      gp.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gp;
      ctx.beginPath();
      ctx.arc(px, py, 44, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildShowroomEnvironment() {
    const room = new THREE.Group();
    room.name = 'ShowroomArchitecture';

    // 1. Dark Polished Epoxy Floor Overlay + Real-Time Planar Floor Mirror
    const floorW = 14.0;
    const floorD = 22.0;
    const epoxyTex = this.createEpoxyFloorTexture();
    const floorOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(floorW, floorD),
      new THREE.MeshStandardMaterial({
        map: epoxyTex,
        color: 0x0a0c12,
        roughness: 0.22,
        metalness: 0.25,
        transparent: true,
        opacity: 0.60,
        depthWrite: false
      })
    );
    floorOverlay.rotation.x = -Math.PI / 2;
    floorOverlay.position.set(0, 0.001, -1.5);
    floorOverlay.receiveShadow = true;
    room.add(floorOverlay);
    this.floorOverlay = floorOverlay;

    const reflector = new ShowroomReflector(new THREE.PlaneGeometry(floorW, floorD), {
      color: 0x566070,
      textureWidth: this.isMobileViewport ? 512 : 1024,
      textureHeight: this.isMobileViewport ? 512 : 1024,
      clipBias: 0.002,
      hiddenDuringPass: [floorOverlay]
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.set(0, 0, -1.5);
    room.add(reflector);
    this.reflector = reflector;

    // 2. Dark Matte Architectural Ceiling Plenum (Y = 3.46m intimate detailing bay height)
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.92, metalness: 0.15 });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 22.0), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.46, -1.5);
    room.add(ceiling);

    // 3. Illuminated Hexagonal LED Ceiling Grid (Signature Visual from Reference Video)
    const hexLedMat = new THREE.MeshBasicMaterial({ color: 0xfbf6ea });
    const hexFrameMat = new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.5, metalness: 0.7 });
    const hexGroup = new THREE.Group();
    const hexRadius = 0.66;
    const dx = hexRadius * 1.54;
    const dz = hexRadius * 1.78;
    const tubeGeo = new THREE.BoxGeometry(0.045, 0.052, hexRadius * 0.98);
    const housingGeo = new THREE.BoxGeometry(0.070, 0.032, hexRadius * 1.02);

    for (let col = -3; col <= 3; col++) {
      for (let row = -5; row <= 4; row++) {
        const cx = col * dx;
        const cz = -1.2 + row * dz + (Math.abs(col) % 2 === 1 ? dz * 0.5 : 0);
        if (Math.abs(cx) > 4.65 || cz < -10.5 || cz > 6.8) continue;

        for (let edge = 0; edge < 6; edge++) {
          const a1 = (edge * Math.PI) / 3;
          const a2 = ((edge + 1) * Math.PI) / 3;
          const x1 = Math.cos(a1) * hexRadius;
          const z1 = Math.sin(a1) * hexRadius;
          const x2 = Math.cos(a2) * hexRadius;
          const z2 = Math.sin(a2) * hexRadius;

          const mx = cx + (x1 + x2) * 0.5;
          const mz = cz + (z1 + z2) * 0.5;
          const yaw = Math.atan2(x2 - x1, z2 - z1);

          const led = new THREE.Mesh(tubeGeo, hexLedMat);
          led.position.set(mx, 3.38, mz);
          led.rotation.y = yaw;
          hexGroup.add(led);

          const backing = new THREE.Mesh(housingGeo, hexFrameMat);
          backing.position.set(mx, 3.42, mz);
          backing.rotation.y = yaw;
          hexGroup.add(backing);
        }
      }
    }
    room.add(hexGroup);

    // 4. Left Wall (X = -5.5m) — Architectural Smoked American Walnut Timber Paneling + Baseboard
    const walnutTex = this.createWalnutTexture();
    const walnutMat = new THREE.MeshStandardMaterial({
      map: walnutTex,
      color: 0x8b6c5c,
      roughness: 0.56,
      metalness: 0.04
    });
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(22.0, 3.55), walnutMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-5.5, 1.77, -1.5);
    leftWall.receiveShadow = true;
    room.add(leftWall);

    // Black architectural baseboard & ceiling shadow-gap channel on left wall
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.45, metalness: 0.75 });
    const leftBaseTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 22.0), trimMat);
    leftBaseTrim.position.set(-5.47, 0.07, -1.5);
    room.add(leftBaseTrim);

    const leftCoveStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 21.6),
      new THREE.MeshBasicMaterial({ color: 0xffd7a3 })
    );
    leftCoveStrip.position.set(-5.46, 3.40, -1.5);
    room.add(leftCoveStrip);

    // 5. Rear Entrance Panoramic Black Steel & Smoked Glass Bay Door (Z = -11.4m)
    const backWallBg = new THREE.Mesh(
      new THREE.PlaneGeometry(14.5, 4.4),
      new THREE.MeshBasicMaterial({ color: 0x1b1512 })
    );
    backWallBg.position.set(0, 2.2, -11.9);
    room.add(backWallBg);

    // Subtle slate twilight glow diffusing through the smoked bay door panes
    const bayBackGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 3.1),
      new THREE.MeshBasicMaterial({ color: 0xb67b52, transparent: true, opacity: 0.15 })
    );
    bayBackGlow.position.set(0, 1.85, -11.65);
    room.add(bayBackGlow);

    const bayGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(8.6, 3.3),
      new THREE.MeshPhysicalMaterial({
        color: 0x1e242e,
        roughness: 0.14,
        metalness: 0.1,
        transparent: true,
        opacity: 0.72,
        reflectivity: 0.85
      })
    );
    bayGlass.position.set(0, 1.85, -11.45);
    room.add(bayGlass);

    // Side concrete pillars flanking the panoramic bay door
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.75, metalness: 0.2 });
    [-4.95, 4.95].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.25, 0.45), pillarMat);
      pillar.position.set(px, 2.12, -11.4);
      room.add(pillar);
    });

    // Horizontal & Vertical Black Steel Bay Mullions (signature garage glass grid)
    const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0e1015, roughness: 0.35, metalness: 0.8 });
    [-3.15, -1.05, 1.05, 3.15].forEach((mx) => {
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.55, 0.12), mullionMat);
      vBar.position.set(mx, 1.78, -11.4);
      room.add(vBar);
    });
    [0.08, 1.15, 2.22, 3.35, 3.72].forEach((my) => {
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.08, 0.14), mullionMat);
      hBar.position.set(0, my, -11.4);
      room.add(hBar);
    });

    // 6. Right Wall (X = +5.3m) — Floor-to-Ceiling Glass Partition + Luxury Viewing Lounge
    const loungeGroup = new THREE.Group();
    const partitionGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(16.0, 3.85),
      new THREE.MeshPhysicalMaterial({
        color: 0xdce6f2,
        roughness: 0.08,
        metalness: 0.05,
        transparent: true,
        opacity: 0.16
      })
    );
    partitionGlass.rotation.y = -Math.PI / 2;
    partitionGlass.position.set(5.32, 1.95, -2.0);
    loungeGroup.add(partitionGlass);

    // Steel mullions along right glass partition
    for (let z = -9.5; z <= 5.5; z += 2.5) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.46, 0.09), mullionMat);
      post.position.set(5.3, 1.73, z);
      loungeGroup.add(post);
    }
    const headerBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 22.0), mullionMat);
    headerBeam.position.set(5.3, 3.36, -1.5);
    loungeGroup.add(headerBeam);

    // Adjacent Viewing Lounge Interior (X = +5.3 .. +9.2m)
    const loungeBackWall = new THREE.Mesh(
      new THREE.PlaneGeometry(17.5, 4.2),
      new THREE.MeshStandardMaterial({ map: walnutTex, color: 0x6b472f, roughness: 0.6 })
    );
    loungeBackWall.rotation.y = -Math.PI / 2;
    loungeBackWall.position.set(9.1, 2.1, -2.0);
    loungeGroup.add(loungeBackWall);

    const loungeFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 17.5),
      new THREE.MeshStandardMaterial({ color: 0x1f2026, roughness: 0.72, metalness: 0.1 })
    );
    loungeFloor.rotation.x = -Math.PI / 2;
    loungeFloor.position.set(7.2, 0.003, -2.0);
    loungeGroup.add(loungeFloor);

    // Warm Sconces on Lounge Back Wall
    const sconceMat = new THREE.MeshBasicMaterial({ color: 0xffcc88 });
    [-4.5, -1.5, 1.5].forEach((sz) => {
      const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.14), sconceMat);
      sconce.position.set(9.02, 2.15, sz);
      loungeGroup.add(sconce);
    });

    // Two Mid-Century Cognac Leather Lounge Chairs + Smoked Glass Table (Matching Reference Video)
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x6b3a22, roughness: 0.58, metalness: 0.08 });
    const chairMetalMat = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.35, metalness: 0.8 });
    const createChair = (x, z, rotY) => {
      const chair = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.72), leatherMat);
      seat.position.y = 0.40;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.52, 0.15), leatherMat);
      back.position.set(0, 0.66, -0.29);
      back.rotation.x = -0.18;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.32, 0.64), chairMetalMat);
      base.position.y = 0.16;
      chair.add(seat, back, base);
      chair.position.set(x, 0, z);
      chair.rotation.y = rotY;
      loungeGroup.add(chair);
    };
    createChair(7.1, -2.2, -1.35);
    createChair(7.15, -0.35, -1.92);

    const coffeeTableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.25, metalness: 0.65 })
    );
    coffeeTableTop.position.set(6.7, 0.38, -1.25);
    const coffeeTableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.36, 16), chairMetalMat);
    coffeeTableBase.position.set(6.7, 0.18, -1.25);
    loungeGroup.add(coffeeTableTop, coffeeTableBase);

    room.add(loungeGroup);

    // 7. Front Wall (Z = +8.8m behind landing camera) for seamless 360° orbit enclosure
    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(15.0, 4.3),
      new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.85, metalness: 0.15 })
    );
    frontWall.rotation.y = Math.PI;
    frontWall.position.set(0, 2.15, 8.8);
    room.add(frontWall);

    this.scene.add(room);
  }

  loadGT40() {
    const loader = new GLTFLoader();
    if (!window.__GT40_GLTF_PROMISE__) {
      window.__GT40_GLTF_PROMISE__ = new Promise((resolve, reject) => {
        loader.load(
          'assets/models/car/source/gt40.glb',
          (gltf) => resolve(gltf),
          (p) => {
            if (p.total && this.loaderFill) {
              const pct = Math.min(100, Math.round((p.loaded / p.total) * 100));
              this.loaderFill.style.width = `${pct}%`;
              if (this.loaderStatus) {
                this.loaderStatus.textContent = `PREPARING CHASSIS P/1046 IN SHOWROOM (${pct}%)`;
              }
            }
          },
          (err) => reject(err)
        );
      });
    }

    window.__GT40_GLTF_PROMISE__
      .then((gltf) => {
        // Clone hierarchy WITHOUT mutating source GLTF geometries
        const rawClone = gltf.scene.clone(true);
        this.assembleShowroomCar(rawClone);
        this.isModelReady = true;

        if (this.loaderEl) {
          this.loaderEl.classList.add('hidden');
        }

        // Start Sequence 01: Establish Showroom
        this.enterPhase('establish');
      })
      .catch((err) => {
        console.error('Failed to load GT40 showroom model:', err);
        if (this.loaderStatus) {
          this.loaderStatus.textContent = 'UNABLE TO LOAD GT40 MODEL ASSET';
        }
      });
  }

  extractTriangles(sourceMesh, predicate, material, name) {
    const geo = sourceMesh.geometry;
    const pos = geo.attributes.position;
    const index = geo.index;
    if (!pos || !index) return null;

    const arr = index.array;
    const bucket = [];
    const minB = new THREE.Vector3(Infinity, Infinity, Infinity);
    const maxB = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    for (let i = 0; i < arr.length; i += 3) {
      const i0 = arr[i];
      const i1 = arr[i + 1];
      const i2 = arr[i + 2];
      const x0 = pos.getX(i0), y0 = pos.getY(i0), z0 = pos.getZ(i0);
      const x1 = pos.getX(i1), y1 = pos.getY(i1), z1 = pos.getZ(i1);
      const x2 = pos.getX(i2), y2 = pos.getY(i2), z2 = pos.getZ(i2);
      const cx = (x0 + x1 + x2) / 3.0;
      const cy = (y0 + y1 + y2) / 3.0;
      const cz = (z0 + z1 + z2) / 3.0;
      if (predicate(cx, cy, cz)) {
        bucket.push(i0, i1, i2);
        minB.x = Math.min(minB.x, x0, x1, x2);
        minB.y = Math.min(minB.y, y0, y1, y2);
        minB.z = Math.min(minB.z, z0, z1, z2);
        maxB.x = Math.max(maxB.x, x0, x1, x2);
        maxB.y = Math.max(maxB.y, y0, y1, y2);
        maxB.z = Math.max(maxB.z, z0, z1, z2);
      }
    }

    if (bucket.length === 0) return null;

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', pos);
    if (geo.attributes.normal) newGeo.setAttribute('normal', geo.attributes.normal);
    if (geo.attributes.uv) newGeo.setAttribute('uv', geo.attributes.uv);
    newGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(bucket), 1));
    newGeo.boundingBox = new THREE.Box3(minB, maxB);
    newGeo.boundingSphere = new THREE.Sphere();
    newGeo.boundingBox.getBoundingSphere(newGeo.boundingSphere);

    const mesh = new THREE.Mesh(newGeo, material);
    mesh.name = name || 'ShowroomPart';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  createBodyPaintMaterial(texLoader) {
    const loadTex = (file, srgb) => {
      const t = texLoader.load(`assets/models/car/textures_web/${file}`);
      t.flipY = false;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    const bodyLiveryTex = loadTex('Body_Livery_BlackWhite.png', true);
    const bodyRoughTex = loadTex('Body_Roughness.png', false);
    const bodyMetalTex = loadTex('Body_Metallic.png', false);

    // Deep obsidian gloss automotive paint with vector-sharp Le Mans #2 stripes
    const mat = new THREE.MeshPhysicalMaterial({
      map: bodyLiveryTex,
      roughnessMap: bodyRoughTex,
      metalnessMap: bodyMetalTex,
      roughness: 0.28,
      metalness: 0.04,
      clearcoat: 0.48,
      clearcoatRoughness: 0.14,
      reflectivity: 0.55,
      envMapIntensity: 0.78,
      side: THREE.DoubleSide
    });

    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vBodyPos;
           varying vec3 vBodyNorm;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vBodyPos = position;
           vBodyNorm = normal;`
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vBodyPos;
           varying vec3 vBodyNorm;`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float ax = abs(vBodyPos.x);
           bool isExteriorTop = (vBodyPos.y > 0.04 && vBodyNorm.y > 0.12) && !(vBodyPos.z > 1.85 && vBodyNorm.y < 0.35);
           bool isStripe = false;
           if (isExteriorTop) {
             // Bold twin white Le Mans stripes + crisp pinstripes along nose, hood, roof, rear deck
             if (ax >= 0.014 && ax <= 0.088) isStripe = true;
             if (ax >= 0.098 && ax <= 0.108) isStripe = true;
             if (length(vec2(vBodyPos.x - 0.26, vBodyPos.z - 1.16)) < 0.16 && vBodyPos.y > 0.18 && vBodyNorm.y > 0.32) {
               isStripe = true;
             }
           }
           bool isRocker = (vBodyPos.y >= -0.02 && vBodyPos.y <= 0.065) && (abs(vBodyNorm.x) > 0.6) && (vBodyPos.z > -0.75 && vBodyPos.z < 0.85);
           if (isRocker && (vBodyPos.y >= 0.012 && vBodyPos.y <= 0.038)) {
             isStripe = true;
           }
           if (isStripe) {
             diffuseColor.rgb = vec3(0.97, 0.98, 1.0);
           } else {
             diffuseColor.rgb = vec3(0.014, 0.016, 0.022);
           }
          `
        )
        .replace(
          '#include <map_fragment>',
          `// Vector-sharp livery injected in color_fragment overrides low-res UV body map`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           roughnessFactor = isStripe ? 0.24 : 0.22;`
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
           metalnessFactor = isStripe ? 0.02 : 0.05;`
        );
    };

    return mat;
  }

  assembleShowroomCar(rawClone) {
    const texLoader = new THREE.TextureLoader();
    const loadTex = (file, srgb = true, flip = false) => {
      const t = texLoader.load(`assets/models/car/textures_web/${file}`);
      t.flipY = flip;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    // Build shared materials matching Chassis P/1046
    const bodyBaseMat = this.createBodyPaintMaterial(texLoader);
    const createHighlightedBodyMat = () => {
      const m = this.createBodyPaintMaterial(texLoader);
      this.hoverMaterials.push(m);
      return m;
    };

    const driverDoorMat = createHighlightedBodyMat();
    const passengerDoorMat = createHighlightedBodyMat();
    const frontBonnetMat = createHighlightedBodyMat();
    const rearCoverMat = createHighlightedBodyMat();

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef4f8,
      roughness: 0.04,
      metalness: 0.05,
      transmission: 0.88,
      thickness: 0.14,
      ior: 1.5,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const wheelsBaseColor = loadTex('Wheels_BaseColor.png', true, false);
    const wheelsRoughness = loadTex('Wheels_Roughness.png', false, false);
    const wheelsMetallic = loadTex('Wheels_Metallic.png', false, false);
    const wheelsNormal = loadTex('Wheels_Normal.png', false, false);

    const tireMat = new THREE.MeshStandardMaterial({
      map: wheelsBaseColor,
      roughnessMap: wheelsRoughness,
      normalMap: wheelsNormal,
      color: 0x1f2126,
      roughness: 0.86,
      metalness: 0.06,
      side: THREE.DoubleSide
    });

    const rimMat = new THREE.MeshStandardMaterial({
      map: wheelsBaseColor,
      roughnessMap: wheelsRoughness,
      metalnessMap: wheelsMetallic,
      normalMap: wheelsNormal,
      color: 0xd4af37,
      roughness: 0.28,
      metalness: 0.84,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide
    });
    rimMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRimPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRimPos = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vRimPos;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float cz = vRimPos.z > 0.0 ? 1.23 : -1.11;
           float cy = vRimPos.z > 0.0 ? 0.02 : -0.03;
           float r = length(vec2(vRimPos.y - cy, vRimPos.z - cz));
           if (r < 0.052) diffuseColor.rgb = vec3(0.96, 0.96, 0.98);`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           float cz2 = vRimPos.z > 0.0 ? 1.23 : -1.11;
           float cy2 = vRimPos.z > 0.0 ? 0.02 : -0.03;
           if (length(vec2(vRimPos.y - cy2, vRimPos.z - cz2)) < 0.052) roughnessFactor = 0.08;`
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
           float cz3 = vRimPos.z > 0.0 ? 1.23 : -1.11;
           float cy3 = vRimPos.z > 0.0 ? 0.02 : -0.03;
           if (length(vec2(vRimPos.y - cy3, vRimPos.z - cz3)) < 0.052) metalnessFactor = 0.96;`
        );
    };

    const engineBaseColor = loadTex('Engine_BaseColor.png', true, true);
    const engineRoughness = loadTex('Engine_Roughness.png', false, true);
    const engineMetallic = loadTex('Engine_Metallic.png', false, true);
    const engineMat = new THREE.MeshStandardMaterial({
      map: engineBaseColor,
      roughnessMap: engineRoughness,
      metalnessMap: engineMetallic,
      roughness: 0.34,
      metalness: 0.78,
      envMapIntensity: 1.25,
      side: THREE.DoubleSide
    });
    engineMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vEngPos;\nvarying vec3 vEngNorm;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEngPos = position;\nvEngNorm = normal;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vEngPos;\nvarying vec3 vEngNorm;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
           float ax = abs(vEngPos.x);
           float y = vEngPos.y;
           float z = vEngPos.z;
           vec3 baseTex = diffuseColor.rgb;
           vec3 partColor = baseTex;
           if (z >= -0.75 && z <= -0.15) {
             if (y > 0.40 && ax < 0.14) partColor = mix(baseTex, vec3(0.84, 0.67, 0.25), 0.78);
             else if (y > 0.36 && ax >= 0.14 && ax <= 0.32) {
               float finP = sin(z * 180.0);
               partColor = finP > 0.2 ? mix(baseTex, vec3(0.92, 0.94, 0.96), 0.85) : mix(baseTex, vec3(0.15, 0.17, 0.22), 0.85);
             } else if (y >= 0.08 && y <= 0.40) partColor = mix(baseTex, vec3(0.12, 0.17, 0.26), 0.80);
             else partColor = mix(baseTex, vec3(0.10, 0.11, 0.14), 0.80);
           } else if (z < -0.75 && z >= -1.45) {
             if (y > 0.18 && ax < 0.15) partColor = mix(baseTex, vec3(0.90, 0.90, 0.92), 0.85);
             else partColor = mix(baseTex, vec3(0.42, 0.44, 0.48), 0.72);
           } else if (z < -1.45) {
             partColor = ax < 0.15 ? mix(baseTex, vec3(0.84, 0.84, 0.86), 0.80) : mix(baseTex, vec3(0.38, 0.40, 0.44), 0.75);
           } else if (z > 0.80) {
             partColor = (ax < 0.42 && y > -0.15 && y < 0.30) ? mix(baseTex, vec3(0.22, 0.24, 0.28), 0.80) : mix(baseTex, vec3(0.48, 0.50, 0.54), 0.75);
           }
           if (ax > 0.58) {
             partColor = y > 0.06 ? mix(baseTex, vec3(0.76, 0.58, 0.22), 0.82) : mix(baseTex, vec3(0.62, 0.65, 0.69), 0.75);
           }
           diffuseColor.rgb = partColor;`
        );
    };

    const interiorBaseColor = loadTex('Interior_BaseColor.1001.png', true, false);
    const interiorRoughness = loadTex('Interior_Roughness.1001.png', false, false);
    const interiorNormal = loadTex('Interior_Normal.1001.png', false, false);
    const interiorMat = new THREE.MeshStandardMaterial({
      map: interiorBaseColor,
      roughnessMap: interiorRoughness,
      normalMap: interiorNormal,
      roughness: 0.66,
      metalness: 0.18,
      side: THREE.DoubleSide
    });

    const headlightMat = new THREE.MeshStandardMaterial({
      map: loadTex('LIGHTS_BaseColor.png', true, false),
      roughnessMap: loadTex('LIGHTS_Roughness.png', false, false),
      color: 0xffffff,
      emissive: 0xfff0d4,
      emissiveIntensity: 3.4,
      roughness: 0.15
    });
    this.headlightMat = headlightMat;

    const tailLightMat = new THREE.MeshStandardMaterial({
      map: loadTex('REDLIGHT_BaseColor.png', true, false),
      roughnessMap: loadTex('REDLIGHT_Roughness.png', false, false),
      color: 0xff2218,
      emissive: 0xd9180c,
      emissiveIntensity: 2.1,
      roughness: 0.22
    });
    this.tailLightMat = tailLightMat;

    const noOpacLightMat = new THREE.MeshStandardMaterial({
      map: loadTex('LIGHTSnoopacity_BaseColor.png', true, false),
      color: 0xdadfe6,
      roughness: 0.3,
      metalness: 0.45
    });

    // Build Car World & Chassis Hierarchy
    this.carRoot = new THREE.Group();
    this.carRoot.name = 'ShowroomGT40Root';
    this.carRoot.position.set(0, this.carFloorY, this.carCurrentZ);

    this.chassisGroup = new THREE.Group();
    this.chassisGroup.name = 'ShowroomGT40Chassis';
    this.carRoot.add(this.chassisGroup);

    // Contact shadow moving directly with car at floor Y=0
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.65, 5.15),
      new THREE.MeshBasicMaterial({
        map: this.createContactShadowTexture(),
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -this.carFloorY + 0.004, 0.22);
    this.carRoot.add(shadowPlane);
    this.contactShadow = shadowPlane;
    if (this.reflector) {
      this.reflector.hiddenForReflection.push(shadowPlane);
    }

    // Dual Warm Volumetric Headlight Floor Pool Spotlights attached to car nose
    [-0.59, 0.59].forEach((hx) => {
      const hSpot = new THREE.SpotLight(0xfff1d6, 12.0, 14.0, Math.PI / 5.5, 0.65, 1.5);
      hSpot.position.set(hx, 0.12, 1.98);
      hSpot.target.position.set(hx * 0.9, -0.35, 7.6);
      this.chassisGroup.add(hSpot);
      this.chassisGroup.add(hSpot.target);
      if (!this.headlightBeams) this.headlightBeams = [];
      this.headlightBeams.push(hSpot);
    });

    // Predicates separating GT40 Body panels cleanly
    const isDriverDoorTri = (cx, cy, cz) => {
      if (cz >= -0.45 && cz <= 0.57 && cx < -0.50 && cy > 0.05) return true;
      if (cz >= -0.44 && cz <= 0.36 && cy >= 0.56 && cx < -0.22 && cx >= -0.70) return true;
      return false;
    };
    const isPassengerDoorTri = (cx, cy, cz) => {
      if (cz >= -0.45 && cz <= 0.57 && cx > 0.50 && cy > 0.05) return true;
      if (cz >= -0.44 && cz <= 0.36 && cy >= 0.56 && cx > 0.22 && cx <= 0.70) return true;
      return false;
    };
    const isFrontBonnetTri = (cx, cy, cz) => cz > 0.89 && cy > -0.15;
    const isRearCoverTri = (cx, cy, cz) => cz < -0.50 && cy > -0.02;

    // Create Pivots with inverse offset children so shader coordinates remain aligned
    const makePivotPanel = (key, px, py, pz) => {
      const pivot = new THREE.Group();
      pivot.position.set(px, py, pz);
      const offset = new THREE.Group();
      offset.position.set(-px, -py, -pz);
      pivot.add(offset);
      this.chassisGroup.add(pivot);
      this.panels[key].pivot = pivot;
      this.panels[key].offset = offset;
      return offset;
    };

    const driverDoorOffset = makePivotPanel('driverDoor', -0.78, 0.16, 0.56);
    const passengerDoorOffset = makePivotPanel('passengerDoor', 0.78, 0.16, 0.56);
    const frontBonnetOffset = makePivotPanel('frontBonnet', 0.0, 0.06, 2.06);
    const rearCoverOffset = makePivotPanel('rearCover', 0.0, 0.16, -1.68);

    // Wheel centers for FL, FR, RL, RR
    const WHEEL_CENTERS = {
      FL: new THREE.Vector3(0.699, 0.019, 1.230),
      FR: new THREE.Vector3(-0.699, 0.019, 1.230),
      RL: new THREE.Vector3(0.703, -0.027, -1.107),
      RR: new THREE.Vector3(-0.703, -0.027, -1.107)
    };
    Object.entries(WHEEL_CENTERS).forEach(([wk, wc]) => {
      const pivot = new THREE.Group();
      pivot.position.copy(wc);
      const inv = new THREE.Group();
      inv.position.copy(wc).multiplyScalar(-1);
      pivot.add(inv);
      this.chassisGroup.add(pivot);
      this.wheelPivots[wk] = { pivot, inv };
    });

    // Unwrap GLTF root wrapper node(s) so topNodes contains Body, Wheels, Disk, Interior, Engine, etc.
    let modelContainer = rawClone;
    while (
      modelContainer.children.length === 1 &&
      !modelContainer.children[0].isMesh &&
      !modelContainer.children[0].userData?.subsystem
    ) {
      modelContainer = modelContainer.children[0];
    }
    const topNodes = [...modelContainer.children];

    // Helper to split wheels/disks into the 4 wheel pivots
    const attachQuadrantMesh = (srcMesh, mat, zoneKey) => {
      ['FL', 'FR', 'RL', 'RR'].forEach((wk) => {
        const pred = (cx, _cy, cz) => {
          const isFront = cz >= 0;
          const isLeft = cx >= 0;
          return (isFront ? 'F' : 'R') + (isLeft ? 'L' : 'R') === wk;
        };
        const part = this.extractTriangles(srcMesh, pred, mat, `Wheel_${wk}_${srcMesh.name}`);
        if (part) {
          this.wheelPivots[wk].inv.add(part);
          this.zoneMeshes.set(part, zoneKey);
        }
      });
    };

    topNodes.forEach((node) => {
      const name = (node.name || '').toLowerCase();

      if (node.isMesh && name === 'body') {
        const driverPart = this.extractTriangles(node, isDriverDoorTri, driverDoorMat, 'DriverDoorBody');
        const passPart = this.extractTriangles(node, isPassengerDoorTri, passengerDoorMat, 'PassengerDoorBody');
        const frontPart = this.extractTriangles(node, isFrontBonnetTri, frontBonnetMat, 'FrontBonnetBody');
        const rearPart = this.extractTriangles(node, isRearCoverTri, rearCoverMat, 'RearCoverBody');
        const restPart = this.extractTriangles(
          node,
          (cx, cy, cz) =>
            !isDriverDoorTri(cx, cy, cz) &&
            !isPassengerDoorTri(cx, cy, cz) &&
            !isFrontBonnetTri(cx, cy, cz) &&
            !isRearCoverTri(cx, cy, cz),
          bodyBaseMat,
          'MainMonocoqueBody'
        );

        if (driverPart) {
          driverDoorOffset.add(driverPart);
          this.panels.driverDoor.meshes.push(driverPart);
          this.zoneMeshes.set(driverPart, 'driver_door');
        }
        if (passPart) {
          passengerDoorOffset.add(passPart);
          this.panels.passengerDoor.meshes.push(passPart);
          this.zoneMeshes.set(passPart, 'exterior');
        }
        if (frontPart) {
          frontBonnetOffset.add(frontPart);
          this.panels.frontBonnet.meshes.push(frontPart);
          this.zoneMeshes.set(frontPart, 'front_bonnet');
        }
        if (rearPart) {
          rearCoverOffset.add(rearPart);
          this.panels.rearCover.meshes.push(rearPart);
          this.zoneMeshes.set(rearPart, 'rear_engine');
        }
        if (restPart) {
          this.chassisGroup.add(restPart);
          this.zoneMeshes.set(restPart, 'exterior');
        }
      } else if (node.isMesh && name === 'glass') {
        const drvGlass = this.extractTriangles(
          node,
          (cx, cy, cz) => cx < -0.45 && cz > -0.40 && cz < 0.55 && cy > 0.35,
          glassMat,
          'DriverDoorGlass'
        );
        const pasGlass = this.extractTriangles(
          node,
          (cx, cy, cz) => cx > 0.45 && cz > -0.40 && cz < 0.55 && cy > 0.35,
          glassMat,
          'PassengerDoorGlass'
        );
        const frontGlass = this.extractTriangles(node, (_cx, _cy, cz) => cz > 0.90, glassMat, 'FrontHeadlightGlass');
        const rearGlass = this.extractTriangles(node, (_cx, _cy, cz) => cz < -0.51, glassMat, 'RearLouverGlass');
        const windGlass = this.extractTriangles(
          node,
          (cx, cy, cz) =>
            !(cx < -0.45 && cz > -0.40 && cz < 0.55 && cy > 0.35) &&
            !(cx > 0.45 && cz > -0.40 && cz < 0.55 && cy > 0.35) &&
            cz <= 0.90 &&
            cz >= -0.51,
          glassMat,
          'WindshieldGlass'
        );

        if (drvGlass) {
          driverDoorOffset.add(drvGlass);
          this.zoneMeshes.set(drvGlass, 'driver_door');
        }
        if (pasGlass) passengerDoorOffset.add(pasGlass);
        if (frontGlass) {
          frontBonnetOffset.add(frontGlass);
          this.zoneMeshes.set(frontGlass, 'front_bonnet');
        }
        if (rearGlass) {
          rearCoverOffset.add(rearGlass);
          this.zoneMeshes.set(rearGlass, 'rear_engine');
        }
        if (windGlass) {
          this.chassisGroup.add(windGlass);
          this.zoneMeshes.set(windGlass, 'exterior');
        }
      } else if (node.isMesh && name === 'lights') {
        const fLights = this.extractTriangles(node, (_x, _y, cz) => cz > 0.89, headlightMat, 'FrontLights');
        const rLights = this.extractTriangles(node, (_x, _y, cz) => cz <= 0.89, noOpacLightMat, 'OtherLights');
        if (fLights) {
          frontBonnetOffset.add(fLights);
          this.zoneMeshes.set(fLights, 'front_bonnet');
        }
        if (rLights) this.chassisGroup.add(rLights);
      } else if (node.isMesh && name === 'redlight') {
        node.material = tailLightMat;
        node.castShadow = false;
        rearCoverOffset.add(node);
        this.zoneMeshes.set(node, 'rear_engine');
      } else if (node.isMesh && name === 'lights-noopacity') {
        const fNo = this.extractTriangles(node, (_x, _y, cz) => cz > 0.89, noOpacLightMat, 'FrontHousings');
        const rNo = this.extractTriangles(node, (_x, _y, cz) => cz < -0.51, noOpacLightMat, 'RearHousings');
        const mNo = this.extractTriangles(node, (_x, _y, cz) => cz >= -0.51 && cz <= 0.89, noOpacLightMat, 'MidHousings');
        if (fNo) frontBonnetOffset.add(fNo);
        if (rNo) rearCoverOffset.add(rNo);
        if (mNo) this.chassisGroup.add(mNo);
      } else if (node.isMesh && name === 'wheels') {
        attachQuadrantMesh(node, tireMat, 'wheel');
      } else if (node.isMesh && name === 'disk') {
        attachQuadrantMesh(node, rimMat, 'wheel');
      } else if (node.isMesh && name === 'interior') {
        node.material = interiorMat;
        node.castShadow = true;
        node.receiveShadow = true;
        this.chassisGroup.add(node);
        this.zoneMeshes.set(node, 'driver_door');
      } else if (node.isMesh && name === 'engine') {
        node.material = engineMat;
        node.castShadow = true;
        node.receiveShadow = true;
        this.chassisGroup.add(node);
        this.zoneMeshes.set(node, 'rear_engine');
      } else {
        // Procedural assemblies from gt40.glb (427 intake, valve covers, headers, cooling, suspension, cockpit)
        const extrasSub = node.userData?.subsystem || '';

        if (name.includes('cockpit_details') || extrasSub === 'cockpit') {
          // Mirror Cockpit_Details from +X to true Right-Hand Drive (-X)
          node.traverse((child) => {
            if (child !== node) {
              child.position.x = -child.position.x;
              child.rotation.y = -child.rotation.y;
              child.rotation.z = -child.rotation.z;
            }
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              this.zoneMeshes.set(child, 'steering_wheel');
            }
          });
          this.chassisGroup.add(node);
        } else {
          node.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (extrasSub === 'brakes' || extrasSub === 'suspension') {
                this.zoneMeshes.set(child, 'wheel');
              } else if (extrasSub === 'cooling') {
                this.zoneMeshes.set(child, 'front_bonnet');
              } else {
                this.zoneMeshes.set(child, 'rear_engine');
              }
            }
          });
          this.chassisGroup.add(node);
        }
      }
    });

    // Add finished structural details (sealed bay trays, RHD sill & door inner cards, Moto-Lita rim accent)
    this.buildStructuralBackingDetails(driverDoorOffset, passengerDoorOffset);

    // Compute exact tire stance & pitch so all 4 Goodyear tires rest flush on floor Y = 0
    this.calibrateShowroomStance();

    // Wire 3D hotspots to follow hinged doors/bonnet/rear cover in real time
    const anchorMap = {
      driver_door: driverDoorOffset,
      front_bonnet: frontBonnetOffset,
      rear_engine: rearCoverOffset,
      steering_wheel: this.chassisGroup,
      wheel: this.chassisGroup,
      exterior: this.chassisGroup
    };
    this.hotspotDefs.forEach((def) => {
      def.anchor = anchorMap[def.key] || this.chassisGroup;
    });

    this.scene.add(this.carRoot);
  }

  buildStructuralBackingDetails(driverDoorOffset, passengerDoorOffset) {
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.78, metalness: 0.25 });
    const aluMat = new THREE.MeshStandardMaterial({ color: 0x8e95a3, roughness: 0.32, metalness: 0.85 });

    // Inner quilted door liner panels so open doors have real thickness inside
    const drvLiner = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.28, 0.86), innerMat);
    drvLiner.position.set(-0.735, 0.19, 0.08);
    const drvHandle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.24), aluMat);
    drvHandle.position.set(-0.715, 0.24, 0.14);
    driverDoorOffset.add(drvLiner, drvHandle);
    this.zoneMeshes.set(drvLiner, 'driver_door');

    const pasLiner = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.28, 0.86), innerMat);
    pasLiner.position.set(0.735, 0.19, 0.08);
    passengerDoorOffset.add(pasLiner);

    // RHD Right-Hand Door Sill Top Deck & Rivet Plate (exposes cleanly when door opens)
    const sillRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.98), innerMat);
    sillRight.position.set(-0.64, -0.02, 0.05);
    const sillRivetPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.88), aluMat);
    sillRivetPlate.position.set(-0.64, 0.026, 0.05);
    this.chassisGroup.add(sillRight, sillRivetPlate);
    this.zoneMeshes.set(sillRight, 'driver_door');

    // Front Radiator Bay Structural Tray & Sealed Footwell Bulkhead (visible when bonnet tilts forward)
    const frontBayFloor = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.04, 1.06), innerMat);
    frontBayFloor.position.set(0, -0.15, 1.38);
    const frontBulkhead = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.36, 0.04), innerMat);
    frontBulkhead.position.set(0, 0.06, 0.84);
    this.chassisGroup.add(frontBayFloor, frontBulkhead);

    // Rear Engine Bay Heat-Shield Pan & Cockpit Rear Bulkhead (visible when rear clamshell opens)
    const rearBulkhead = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.56, 0.04), innerMat);
    rearBulkhead.position.set(0, 0.20, -0.44);
    const rearBayPan = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.03, 1.15), innerMat);
    rearBayPan.position.set(0, -0.16, -1.04);
    this.chassisGroup.add(rearBulkhead, rearBayPan);
  }

  calibrateShowroomStance() {
    this.carRoot.position.set(0, 0, this.carCurrentZ);
    this.chassisGroup.rotation.x = 0;
    this.carRoot.updateMatrixWorld(true);

    const boxF = new THREE.Box3().setFromObject(this.wheelPivots.FR.pivot);
    const boxR = new THREE.Box3().setFromObject(this.wheelPivots.RR.pivot);

    if (!Number.isFinite(boxF.min.y) || !Number.isFinite(boxR.min.y)) {
      this.tirePitch = 0.031;
      this.chassisGroup.rotation.x = this.tirePitch;
      this.carFloorY = 0.34;
      this.carRoot.position.y = this.carFloorY;
      return;
    }

    // Natural Le Mans nose rake aligns both front and rear tires to touch floor Y=0 simultaneously
    const frontZ = 1.23;
    const rearZ = -1.107;
    const dy = boxF.min.y - boxR.min.y;
    const dz = frontZ - rearZ;
    this.tirePitch = Math.atan2(dy, dz);
    this.chassisGroup.rotation.x = this.tirePitch;

    this.carRoot.updateMatrixWorld(true);
    const allWheels = new THREE.Box3();
    ['FL', 'FR', 'RL', 'RR'].forEach((wk) => {
      allWheels.union(new THREE.Box3().setFromObject(this.wheelPivots[wk].pivot));
    });
    const avgRadius = (allWheels.max.y - allWheels.min.y) * 0.5;
    if (Number.isFinite(avgRadius) && avgRadius > 0.2) this.wheelRadius = avgRadius;

    // Reset baseline cleanly from Y=0 so lowest tire tread rests flush on epoxy floor Y=0.000
    if (Number.isFinite(allWheels.min.y)) {
      this.carFloorY = -allWheels.min.y;
    }
    this.carRoot.position.y = this.carFloorY;
    if (this.contactShadow) {
      this.contactShadow.position.y = -this.carFloorY + 0.002;
    }
  }

  // =========================================================================
  //  4-SEQUENCE OPENING CHOREOGRAPHY & HINGED PANEL CONTROL
  // =========================================================================

  enterPhase(nextPhase) {
    this.phase = nextPhase;
    this.phaseStart = performance.now();

    if (nextPhase === 'establish') {
      this.setSequenceTag('SHOWROOM // ESTABLISHING SCENE');
      this.carCurrentZ = this.carStartZ;
      this.carRoot.position.z = this.carStartZ;
      this.camera.position.set(0.32, 1.06, 5.25);
      this.controls.target.set(0, 0.42, -3.5);
      this.controls.enabled = false;
      this.setHeadlightStrength(3.8, 12.0);
    } else if (nextPhase === 'approach') {
      this.setSequenceTag('CHASSIS P/1046 // APPROACHING');
    } else if (nextPhase === 'settle') {
      this.setSequenceTag('CHASSIS P/1046 // SETTLED');
      this.carCurrentZ = this.carFinalZ;
      this.carRoot.position.z = this.carFinalZ;
    } else if (nextPhase === 'inspect') {
      this.setSequenceTag('SHOWROOM // INSPECTION ANGLE');
      const inspectAngle = this.getInspectCamera();
      this.glideCameraTo(inspectAngle.pos, inspectAngle.target, 1400, () => {
        this.enterPhase('interactive');
      });
    } else if (nextPhase === 'interactive') {
      this.setSequenceTag('INTERACTIVE SHOWROOM • CLICK VEHICLE PARTS');
      this.controls.enabled = true;
      this.setHeadlightStrength(2.6, 7.5);
      if (this.skipIntroBtn) this.skipIntroBtn.classList.add('hidden');
      if (this.exploreCue) this.exploreCue.classList.add('visible');
      if (this.hotspotsLayer) this.hotspotsLayer.classList.add('visible');
      this.updateHotspotPositions();
    }
  }

  skipIntro() {
    if (!this.isModelReady) return;
    if (this.phase === 'interactive') return;

    this.carCurrentZ = this.carFinalZ;
    this.carRoot.position.z = this.carFinalZ;
    this.chassisGroup.rotation.x = this.tirePitch;
    this.chassisGroup.position.y = 0;

    const inspectAngle = this.getInspectCamera();
    this.cameraAnim.active = false;
    this.camera.position.copy(inspectAngle.pos);
    this.controls.target.copy(inspectAngle.target);
    this.controls.update();
    this.enterPhase('interactive');
  }

  getInspectCamera() {
    const aspect = (this.canvas.clientWidth || window.innerWidth) / Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const distScale = aspect < 1.35 ? Math.min(1.62, 1.0 + (1.35 - aspect) * 0.58) : 1.0;
    return {
      // Front-right 3/4 view frames entire black GT40, white racing stripes, RHD side & hex ceiling
      pos: new THREE.Vector3(-2.65 * distScale, 1.12 + (distScale - 1) * 0.25, 3.85 * distScale),
      target: new THREE.Vector3(0.0, 0.36, -0.05)
    };
  }

  getInteractionCamera(zoneKey) {
    const aspect = (this.canvas.clientWidth || window.innerWidth) / Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const d = aspect < 1.35 ? Math.min(1.38, 1.0 + (1.35 - aspect) * 0.42) : 1.0;

    const presets = {
      driver_door: {
        // Angle behind open RHD door framing swung door + interior steering/shifter cleanly on left half
        pos: new THREE.Vector3(-2.12 * d, 0.98, -1.78 * d),
        target: new THREE.Vector3(0.18, 0.38, 0.62)
      },
      front_bonnet: {
        // Elevated front-side view placing open front nose & radiator fans cleanly on left beside inspector
        pos: new THREE.Vector3(-2.45 * d, 1.54, 1.85 * d),
        target: new THREE.Vector3(0.28, 0.16, 1.05)
      },
      rear_engine: {
        // Elevated side-front view looking under lifted rear deck at 427 V8 & T-44 on left half
        pos: new THREE.Vector3(-2.55 * d, 1.48, -0.18 * d),
        target: new THREE.Vector3(0.25, 0.36, -1.25)
      },
      steering_wheel: {
        // Aimed cleanly past open doorway toward RHD Moto-Lita wheel & Stewart-Warner gauges
        pos: new THREE.Vector3(-1.68 * d, 0.90, -1.42 * d),
        target: new THREE.Vector3(0.06, 0.36, 0.56)
      },
      wheel: {
        pos: new THREE.Vector3(-2.35 * d, 0.58, 2.28 * d),
        target: new THREE.Vector3(-0.22, 0.24, 1.05)
      },
      exterior: this.getInspectCamera()
    };

    return presets[zoneKey] || presets.exterior;
  }

  selectInteraction(zoneKey, skipCameraGlide = false) {
    if (!this.isModelReady) return;
    if (this.phase !== 'interactive') this.skipIntro();

    this.setHoveredZone(null);
    this.playLatchSound();
    this.activeInteraction = zoneKey;

    // Fade initial instruction cue after user engages
    if (this.exploreCue) {
      this.exploreCue.classList.add('engaged');
    }

    // Open / Close hinged geometry intelligently for each interactive zone
    if (zoneKey === 'driver_door') {
      this.panels.driverDoor.target = this.panels.driverDoor.maxOpen;
      this.panels.frontBonnet.target = 0;
      this.panels.rearCover.target = 0;
    } else if (zoneKey === 'steering_wheel') {
      this.panels.driverDoor.target = this.panels.driverDoor.maxOpen;
      this.panels.frontBonnet.target = 0;
      this.panels.rearCover.target = 0;
    } else if (zoneKey === 'front_bonnet') {
      this.panels.frontBonnet.target = this.panels.frontBonnet.maxOpen;
      this.panels.driverDoor.target = 0;
      this.panels.rearCover.target = 0;
    } else if (zoneKey === 'rear_engine') {
      this.panels.rearCover.target = this.panels.rearCover.maxOpen;
      this.panels.driverDoor.target = 0;
      this.panels.frontBonnet.target = 0;
    } else if (zoneKey === 'wheel') {
      // Keep panels shut cleanly or leave current state; closing panels makes fender flare cleaner
      this.panels.driverDoor.target = 0;
      this.panels.frontBonnet.target = 0;
      this.panels.rearCover.target = 0;
    }

    // Highlight active hotspot pill
    this.hotspotNodes.forEach((el, k) => {
      el.classList.toggle('active', k === zoneKey);
    });

    if (!skipCameraGlide) {
      const camCfg = this.getInteractionCamera(zoneKey);
      this.glideCameraTo(camCfg.pos, camCfg.target, 1050);
    }

    this.renderInspectorCard(zoneKey);
    this.setSequenceTag(INTERACTION_DATA[zoneKey]?.tag || 'SHOWROOM // INSPECT');
  }

  resetAllPanelsAndView() {
    this.panels.driverDoor.target = 0;
    this.panels.passengerDoor.target = 0;
    this.panels.frontBonnet.target = 0;
    this.panels.rearCover.target = 0;
    this.activeInteraction = null;
    this.hotspotNodes.forEach((el) => el.classList.remove('active'));
    if (this.inspectorCard) this.inspectorCard.classList.remove('open');
    const inspectAngle = this.getInspectCamera();
    this.glideCameraTo(inspectAngle.pos, inspectAngle.target, 1100);
    this.setSequenceTag('INTERACTIVE SHOWROOM • CLICK VEHICLE PARTS');
  }

  togglePanel(panelKey) {
    const p = this.panels[panelKey];
    if (!p) return;
    this.playLatchSound();
    const isCurrentlyOpen = Math.abs(p.target) > 0.05;
    p.target = isCurrentlyOpen ? 0 : p.maxOpen;
    this.renderInspectorCard(this.activeInteraction || 'exterior');
  }

  renderInspectorCard(zoneKey) {
    const card = this.inspectorCard;
    const data = INTERACTION_DATA[zoneKey];
    if (!card || !data) return;

    const tagEl = card.querySelector('#inspector-tag');
    const titleEl = card.querySelector('#inspector-title');
    const descEl = card.querySelector('#inspector-desc');
    const specsEl = card.querySelector('#inspector-specs');
    const actionsEl = card.querySelector('#inspector-actions');

    if (tagEl) tagEl.textContent = data.tag;
    if (titleEl) titleEl.textContent = data.title;
    if (descEl) descEl.textContent = data.desc;

    if (specsEl) {
      specsEl.innerHTML = data.specs
        .map(
          (s) => `
          <div class="insp-spec">
            <span class="insp-spec-label">${s.label}</span>
            <strong class="insp-spec-val">${s.val}</strong>
          </div>`
        )
        .join('');
    }

    // Build dynamic context action buttons
    const btns = [];
    if (data.primaryCta) {
      btns.push(
        `<button class="insp-btn-primary" type="button" data-insp-action="${data.primaryCta.action}" data-dest="${data.primaryCta.destination || ''}" data-sys="${data.primaryCta.system || ''}">
          <span>${data.primaryCta.label}</span>
          <span class="arrow">&rarr;</span>
        </button>`
      );
    }

    if (data.audioCta) {
      btns.push(
        `<button class="insp-btn-secondary" type="button" data-insp-action="${data.audioCta.action}">
          <span>🔊 ${data.audioCta.label}</span>
        </button>`
      );
    }

    if (data.secondaryCta) {
      let label = data.secondaryCta.label;
      if (data.secondaryCta.action === 'toggle_door') {
        label = Math.abs(this.panels.driverDoor.target) > 0.05 ? 'CLOSE DOOR' : 'OPEN DOOR';
      } else if (data.secondaryCta.action === 'toggle_bonnet') {
        label = Math.abs(this.panels.frontBonnet.target) > 0.05 ? 'CLOSE BONNET' : 'OPEN BONNET';
      } else if (data.secondaryCta.action === 'toggle_rear') {
        label = Math.abs(this.panels.rearCover.target) > 0.05 ? 'CLOSE ENGINE COVER' : 'OPEN ENGINE COVER';
      }
      btns.push(
        `<button class="insp-btn-secondary" type="button" data-insp-action="${data.secondaryCta.action}" data-dest="${data.secondaryCta.destination || ''}">
          <span>${label}</span>
        </button>`
      );
    }

    if (actionsEl) {
      actionsEl.innerHTML = btns.join('');
    }

    card.classList.add('open');
  }

  glideCameraTo(endPos, endTarget, duration = 1000, onComplete = null) {
    this.cameraAnim.active = true;
    this.cameraAnim.start = performance.now();
    this.cameraAnim.duration = duration;
    this.cameraAnim.startPos.copy(this.camera.position);
    this.cameraAnim.endPos.copy(endPos);
    this.cameraAnim.startTarget.copy(this.controls.target);
    this.cameraAnim.endTarget.copy(endTarget);
    this.cameraAnim.onComplete = onComplete;
  }

  setHeadlightStrength(emissiveInt, beamInt) {
    if (this.headlightMat) this.headlightMat.emissiveIntensity = emissiveInt;
    if (this.headlightBeams) {
      this.headlightBeams.forEach((b) => {
        b.intensity = beamInt;
      });
    }
  }

  setSequenceTag(txt) {
    if (this.sequenceTag) this.sequenceTag.textContent = txt;
  }

  // =========================================================================
  //  3D HOTSPOTS, RAYCASTING & INPUT HANDLERS
  // =========================================================================

  createHotspotElements() {
    if (!this.hotspotsLayer) return;
    this.hotspotsLayer.innerHTML = '';

    this.hotspotDefs.forEach((def) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'showroom-hotspot';
      btn.dataset.zone = def.key;
      btn.setAttribute('aria-label', `${def.label} — ${def.sub}`);
      btn.innerHTML = `
        <span class="hs-ring"></span>
        <span class="hs-dot"></span>
        <span class="hs-label-pill">
          <span class="hs-title">${def.label}</span>
          <span class="hs-sub">${def.sub}</span>
        </span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectInteraction(def.key);
      });
      btn.addEventListener('mouseenter', () => this.setHoveredZone(def.key));
      btn.addEventListener('mouseleave', () => this.setHoveredZone(null));

      this.hotspotsLayer.appendChild(btn);
      this.hotspotNodes.set(def.key, btn);
    });
  }

  setHoveredZone(zoneKey) {
    if (this.hoveredZone === zoneKey) return;
    this.hoveredZone = zoneKey;

    const mapEmissive = {
      driverDoor: 'driver_door',
      frontBonnet: 'front_bonnet',
      rearCover: 'rear_engine'
    };

    Object.entries(mapEmissive).forEach(([panelKey, zKey]) => {
      const meshes = this.panels[panelKey]?.meshes || [];
      meshes.forEach((m) => {
        if (m.material && m.material.emissive) {
          if (zoneKey === zKey) {
            m.material.emissive.setHex(0xffffff);
            m.material.emissiveIntensity = 0.05;
          } else {
            m.material.emissive.setHex(0x000000);
            m.material.emissiveIntensity = 0.0;
          }
        }
      });
    });

    this.hotspotNodes.forEach((el, k) => {
      el.classList.toggle('hovered', k === zoneKey);
    });

    if (this.phase === 'interactive') {
      this.canvas.style.cursor = zoneKey ? 'pointer' : 'grab';
    }
  }

  raycastShowroom(clientX, clientY) {
    if (!this.isModelReady || this.zoneMeshes.size === 0) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointer, this.camera);

    const targets = Array.from(this.zoneMeshes.keys());
    const hits = this._raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      return this.zoneMeshes.get(hits[0].object) || null;
    }
    return null;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    this.canvas.addEventListener('pointerdown', (e) => {
      this._pointerDown = { x: e.clientX, y: e.clientY, time: performance.now() };
      // Interrupt camera glide smoothly if user grabs orbit manually
      if (this.phase === 'interactive' && this.cameraAnim.active) {
        this.cameraAnim.active = false;
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isActive || this.phase !== 'interactive' || this.isMobileViewport) return;
      const now = performance.now();
      if (now - this._lastHoverCheck < 50) return;
      this._lastHoverCheck = now;
      const zone = this.raycastShowroom(e.clientX, e.clientY);
      this.setHoveredZone(zone);
    });

    this.canvas.addEventListener('pointerup', (e) => {
      if (this.phase !== 'interactive') return;
      const dx = e.clientX - this._pointerDown.x;
      const dy = e.clientY - this._pointerDown.y;
      if (Math.hypot(dx, dy) < 6 && performance.now() - this._pointerDown.time < 420) {
        const hitZone = this.raycastShowroom(e.clientX, e.clientY);
        if (hitZone) {
          this.selectInteraction(hitZone);
        }
      }
    });

    if (this.skipIntroBtn) {
      this.skipIntroBtn.addEventListener('click', () => this.skipIntro());
    }

    if (this.resetCarBtn) {
      this.resetCarBtn.addEventListener('click', () => {
        if (this.phase !== 'interactive') this.skipIntro();
        this.resetAllPanelsAndView();
      });
    }

    // Inspector Card Delegation
    if (this.inspectorCard) {
      const closeBtn = this.inspectorCard.querySelector('#inspector-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.resetAllPanelsAndView());
      }

      this.inspectorCard.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-insp-action]');
        if (!btn) return;
        const action = btn.dataset.inspAction;
        if (action === 'portal') {
          const dest = btn.dataset.dest;
          const sys = btn.dataset.sys;
          if (typeof window.enterShowroomDestination === 'function') {
            window.enterShowroomDestination(dest, sys ? { system: sys } : {});
          }
        } else if (action === 'rev_audio') {
          this.playRevAudio();
        } else if (action === 'toggle_door') {
          this.togglePanel('driverDoor');
        } else if (action === 'toggle_bonnet') {
          this.togglePanel('frontBonnet');
        } else if (action === 'toggle_rear') {
          this.togglePanel('rearCover');
        } else if (action === 'overview') {
          this.resetAllPanelsAndView();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!this.isActive || this.phase !== 'interactive') return;
      if (e.key === 'Escape' && this.activeInteraction) {
        this.resetAllPanelsAndView();
      } else if (e.key === '1') {
        this.selectInteraction('driver_door');
      } else if (e.key === '2') {
        this.selectInteraction('front_bonnet');
      } else if (e.key === '3') {
        this.selectInteraction('rear_engine');
      } else if (e.key === '4') {
        this.selectInteraction('steering_wheel');
      } else if (e.key === '5') {
        this.selectInteraction('wheel');
      } else if (e.key === '6' || e.key === 'r' || e.key === 'R') {
        this.resetAllPanelsAndView();
      }
    });
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.section) return;
    const w = this.section.clientWidth || window.innerWidth;
    const h = this.section.clientHeight || window.innerHeight;
    if (!w || !h) return;

    this.isMobileViewport = window.innerWidth <= 768;
    const aspect = w / h;
    this.camera.fov = aspect < 0.85 ? 48 : 39;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  playLatchSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this._audioCtx) this._audioCtx = new AC();
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
      const ctx = this._audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  playRevAudio() {
    try {
      this.revAudio.currentTime = 0;
      this.revAudio.play().catch(() => {});
    } catch {}
  }

  pause() {
    this.isActive = false;
  }

  resume() {
    this.isActive = true;
    this.onResize();
    this.updateHotspotPositions();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(() => {
      this.onResize();
      this.updateHotspotPositions();
    });
    if (!this._rafRunning) {
      this.animate();
    }
  }

  // =========================================================================
  //  FRAME UPDATE, PHYSICS SETTLE, HINGE EASING & ROOM BOUND CLAMPING
  // =========================================================================

  updateHotspotPositions() {
    if (!this.isModelReady || this.phase !== 'interactive' || !this.hotspotsLayer) return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;

    this.camera.getWorldDirection(this._camForward);

    this.hotspotDefs.forEach((def) => {
      const el = this.hotspotNodes.get(def.key);
      if (!el || !def.anchor) return;

      def.anchor.updateMatrixWorld(true);
      this._projVec.copy(def.localOffset).applyMatrix4(def.anchor.matrixWorld);

      // Hide hotspots behind camera plane
      this._camDir.subVectors(this._projVec, this.camera.position);
      if (this._camDir.dot(this._camForward) <= 0.15) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      this._projVec.project(this.camera);
      const sx = (this._projVec.x * 0.5 + 0.5) * w;
      const sy = (-this._projVec.y * 0.5 + 0.5) * h;

      if (sx < 24 || sx > w - 24 || sy < 44 || sy > h - 24) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    });
  }

  animate = () => {
    if (!this.isActive) {
      this._rafRunning = false;
      return;
    }
    this._rafRunning = true;
    requestAnimationFrame(this.animate);

    const now = performance.now();

    if (this.isModelReady && this.carRoot) {
      // 1. Opening Sequence State Machine
      const elapsed = now - this.phaseStart;

      if (this.phase === 'establish') {
        if (elapsed >= 700) {
          this.enterPhase('approach');
        }
      } else if (this.phase === 'approach') {
        const dur = 4100;
        const rawT = Math.min(1.0, elapsed / dur);
        // Smooth S-curve launch out of bay & monotonic deceleration onto center mark
        const clampedEase = rawT >= 1.0 ? 1.0 : Math.pow(Math.sin((rawT * Math.PI) / 2), 1.35);
        const prevZ = this.carCurrentZ;
        this.carCurrentZ = THREE.MathUtils.lerp(this.carStartZ, this.carFinalZ, clampedEase);
        this.carRoot.position.z = this.carCurrentZ;

        // Physically synchronize all 4 wheels with delta distance travelled (+Z forward)
        const dz = this.carCurrentZ - prevZ;
        if (Math.abs(dz) > 0.00001) {
          const dTheta = dz / Math.max(0.25, this.wheelRadius);
          Object.values(this.wheelPivots).forEach(({ pivot }) => {
            pivot.rotation.x += dTheta;
          });
        }

        // Subtle braking weight-transfer pitch & suspension squat near final stop
        const brakeEnv = rawT > 0.72 ? Math.sin(((rawT - 0.72) / 0.28) * Math.PI) : 0;
        this.chassisGroup.rotation.x = this.tirePitch + brakeEnv * 0.013;
        this.chassisGroup.position.y = -brakeEnv * 0.011;

        // Composed subtle camera pullback during arrival (non-erratic)
        const camT = Math.min(1.0, rawT * 1.0);
        this.camera.position.set(
          THREE.MathUtils.lerp(0.32, 1.05, camT),
          THREE.MathUtils.lerp(1.06, 1.12, camT),
          THREE.MathUtils.lerp(5.25, 4.45, camT)
        );
        this.controls.target.set(0, 0.39, this.carCurrentZ * 0.45 + 0.15);
        this.camera.lookAt(this.controls.target);

        if (rawT >= 1.0) {
          this.enterPhase('settle');
        }
      } else if (this.phase === 'settle') {
        // Brief suspension settle rebound (0.65s) before orbiting to hero 3/4 inspection angle
        const t = Math.min(1.0, elapsed / 650);
        const settleBounce = Math.sin(t * Math.PI * 1.5) * (1 - t) * 0.007;
        this.chassisGroup.rotation.x = this.tirePitch + settleBounce;
        this.chassisGroup.position.y = -Math.abs(settleBounce) * 0.4;
        this.camera.lookAt(this.controls.target);
        if (elapsed >= 650) {
          this.chassisGroup.rotation.x = this.tirePitch;
          this.chassisGroup.position.y = 0;
          this.enterPhase('inspect');
        }
      }

      // 2. Smooth Hinged Component Interpolation (Doors, Front Bonnet, Rear Cover)
      const easeSpeed = 0.095;
      ['driverDoor', 'passengerDoor', 'frontBonnet', 'rearCover'].forEach((k) => {
        const p = this.panels[k];
        if (!p || !p.pivot) return;
        p.current += (p.target - p.current) * easeSpeed;
        if (Math.abs(p.target - p.current) < 0.001) p.current = p.target;

        if (k === 'driverDoor' || k === 'passengerDoor') {
          p.pivot.rotation.y = p.current;
        } else {
          p.pivot.rotation.x = p.current;
        }
      });

      // Dynamic internal bay reveal lighting proportional to door/clamshell open fraction
      if (this.cockpitRevealLight) {
        const doorFrac = Math.min(1, Math.abs(this.panels.driverDoor.current) / 0.85);
        this.cockpitRevealLight.intensity = doorFrac * 2.2;
      }
      if (this.bonnetRevealLight) {
        const bonFrac = Math.min(1, Math.abs(this.panels.frontBonnet.current) / 0.42);
        this.bonnetRevealLight.intensity = bonFrac * 2.4;
      }
      if (this.engineBayLight) {
        const rearFrac = Math.min(1, Math.abs(this.panels.rearCover.current) / 0.55);
        this.engineBayLight.intensity = rearFrac * 3.1;
      }
    }

    // 3. Smooth Camera Glide
    if (this.cameraAnim.active) {
      const p = Math.min(1.0, (now - this.cameraAnim.start) / this.cameraAnim.duration);
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this.camera.position.lerpVectors(this.cameraAnim.startPos, this.cameraAnim.endPos, ease);
      this.controls.target.lerpVectors(this.cameraAnim.startTarget, this.cameraAnim.endTarget, ease);
      this.camera.lookAt(this.controls.target);

      if (p >= 1.0) {
        this.cameraAnim.active = false;
        const cb = this.cameraAnim.onComplete;
        this.cameraAnim.onComplete = null;
        this.controls.update();
        if (typeof cb === 'function') cb();
      }
    } else if (this.controls && this.controls.enabled) {
      this.controls.update();
    }

    // Clamp Camera cleanly inside Architectural Showroom Bounds (Never clip walls, bay door, lounge, or ceiling)
    if (this.phase === 'interactive' || this.phase === 'inspect') {
      this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -4.85, 4.75);
      this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, 0.24, 3.05);
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -8.2, 7.3);
    }

    this.updateHotspotPositions();
    this.renderer.render(this.scene, this.camera);
  };
}
