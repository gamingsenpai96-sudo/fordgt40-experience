/**
 * ============================================================================
 * Ford GT40 Mk II (Chassis P/1046) — Continuous Le Mans Interactive Journey
 * ============================================================================
 * Continuous real-time Le Mans circuit experience driving along the closed
 * Circuit de la Sarthe loop from lemans.glb (shared __LEMANS_GLTF_PROMISE__):
 *   - GT40 remains continuously in motion with synchronous wheel spin,
 *     road-following pitch, and subtle cornering suspension compliance
 *   - Composed cinematic 3rd-person tracking camera (no aimless orbiting)
 *   - Direct hinged physical component transitions (no generic info cards):
 *       * Right-Side Driver's Door (-X) -> swings open -> zooms into RHD
 *         driver seat -> activates existing Cockpit Simulator
 *       * Rear Engine Cover (-Z) -> lifts open -> zooms into 427 V8 ->
 *         activates existing Exploded Engineering View
 *       * Front Bonnet (+Z) -> tilts open -> in-motion front radiator, fans
 *         & aero ducting inspection with anatomical 3D callouts
 *       * Wheel (-X) -> tracks low alongside spinning Halibrand rim, Girling
 *         quick-change caliper & Koni damper + pathway to Exploded Brakes
 * ============================================================================
 */

import * as THREE from './three.module.js';
import { createGLTFLoader } from './gltf-shared.js';
import { LEMANS_WAYPOINTS } from './lemans-circuit-spline.js';
import { buildBruceMcLarenDriver, loadBruceMcLarenDriverGLB } from './gt40-driver.js';

const FRONT_BAY_CALLOUTS = [
  {
    id: 'radiator',
    title: 'DUAL CROSSFLOW RADIATOR',
    detail: 'Re-engineered by Shelby American & Ken Miles in 1965–66 to cure early prototype front-end lift and high-speed overheating down the Mulsanne Straight.',
    localPos: new THREE.Vector3(0.0, 0.06, 1.38)
  },
  {
    id: 'fans',
    title: 'DUAL COOLING FANS & EXHAUST LOUVERS',
    detail: 'Twin electric fans pull ambient air through the low-pressure nose intake and vent directly out the recessed bonnet louvers to balance front aero downforce.',
    localPos: new THREE.Vector3(0.28, 0.14, 1.18)
  },
  {
    id: 'ducts',
    title: 'FRONT BRAKE COOLING DUCTS',
    detail: 'Dedicated nose ducting channels 200+ mph airflow onto the front ventilated cast-iron rotors and quick-change Girling calipers.',
    localPos: new THREE.Vector3(-0.46, -0.02, 1.72)
  },
  {
    id: 'tub',
    title: 'SEMI-MONOCOQUE FRONT BULKHEAD',
    detail: 'Welded 24-gauge sheet-steel structural tub with front tubular pickup frames anchoring upper/lower wishbones and anti-roll hardware.',
    localPos: new THREE.Vector3(0.0, 0.18, 0.86)
  }
];

const WHEEL_CALLOUTS = [
  {
    id: 'caliper',
    title: 'PHIL REMINGTON QUICK-CHANGE GIRLING',
    detail: 'Master engineer Phil Remington invented the quick-change caliper bracket allowing crews to swap ventilated pads & rotors in ~90 seconds while competitors cracked discs.',
    localPos: new THREE.Vector3(-0.66, 0.04, 1.24)
  },
  {
    id: 'rim',
    title: 'HALIBRAND 15" MAGNESIUM WHEELS',
    detail: 'Cast lightweight magnesium pin-drive wheels secured by three-eared center-lock knockoff spinners for rapid Le Mans pit lane tire changes.',
    localPos: new THREE.Vector3(-0.78, 0.02, 1.23)
  },
  {
    id: 'tire',
    title: 'GOODYEAR BLUE STREAK RACING TIRES',
    detail: 'Low-profile endurance slick/treaded compound developed to withstand sustained 212+ mph loads across 24 unbroken hours at La Sarthe.',
    localPos: new THREE.Vector3(-0.84, 0.24, 1.23)
  },
  {
    id: 'koni',
    title: 'KONI DOUBLE-ADJUSTABLE SUSPENSION',
    detail: 'Unequal-length double wishbones paired with coilover Koni telescopic dampers tuned to soak up bumpy 1966 public French country tarmac.',
    localPos: new THREE.Vector3(-0.52, 0.14, 1.21)
  }
];

const COMPONENT_PROMPTS = {
  driver_door: {
    code: '01 // DRIVER ACCESS',
    prompt: "DRIVER'S DOOR — ENTER THE COCKPIT"
  },
  rear_engine: {
    code: '02 // POWERTRAIN BAY',
    prompt: 'REAR ENGINE COVER — EXPLORE THE ENGINEERING'
  },
  front_bonnet: {
    code: '03 // AERO & COOLING',
    prompt: 'FRONT BONNET — INSPECT THE FRONT COMPARTMENT'
  },
  wheel: {
    code: '04 // RUNNING GEAR',
    prompt: 'WHEEL — EXPLORE THE SUSPENSION'
  }
};

export function prepareLeMansTrackClone(trackScene) {
  const groundKeywords = [
    'road', 'start', 'asphalt', 'grass', 'sand',
    'gravel', 'curb', 'kerb', 'floor', 'tertre', 'pit',
    'run', 'white', 'rmbl', 'soil', 'ground'
  ];

  const groundMeshes = [];

  trackScene.traverse((child) => {
    if (!child.isMesh) return;
    child.receiveShadow = true;

    const cname = (child.name || '').toLowerCase();
    const mname = (child.material?.name || '').toLowerCase();

    // Hide problematic black overlay / groove polygons from the imported circuit model
    if (
      cname.includes('groove') ||
      mname.includes('groove') ||
      cname.includes('black') ||
      mname.includes('black')
    ) {
      child.visible = false;
      return;
    }

    const mats = Array.isArray(child.material)
      ? child.material
      : child.material
      ? [child.material]
      : [];

    let isGround = groundKeywords.some((k) => mname.includes(k) || cname.includes(k));

    mats.forEach((mat) => {
      const name = (mat.name || child.name || '').toLowerCase();
      if (groundKeywords.some((k) => name.includes(k))) {
        isGround = true;
      }

      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.anisotropy = 8;
      }

      if (
        name.includes('line') ||
        name.includes('detail') ||
        name.includes('trans') ||
        name.includes('edga') ||
        name.includes('overlay')
      ) {
        mat.transparent = true;
        mat.alphaTest = 0.08;
        mat.depthWrite = false;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -1;
      } else if (
        name.includes('tree') ||
        name.includes('brnch') ||
        name.includes('leaf') ||
        name.includes('leaves') ||
        name.includes('bush') ||
        name.includes('plant') ||
        name.includes('grass')
      ) {
        mat.transparent = false;
        mat.alphaTest = 0.5;
        mat.side = THREE.DoubleSide;
        mat.depthWrite = true;
      } else if (name.includes('fence')) {
        mat.transparent = false;
        mat.alphaTest = 0.4;
        mat.side = THREE.DoubleSide;
        mat.depthWrite = true;
      } else if (
        name.includes('logo') ||
        name.includes('sign') ||
        name.includes('decal') ||
        name.includes('banner')
      ) {
        mat.transparent = true;
        mat.alphaTest = 0.15;
        mat.side = THREE.DoubleSide;
      } else if (name.includes('rmbl')) {
        mat.transparent = false;
        mat.alphaTest = 0.1;
        mat.depthWrite = true;
      } else if (mat.map) {
        mat.alphaTest = 0.1;
      }
    });

    if (isGround) {
      groundMeshes.push(child);
    }
  });

  return groundMeshes;
}

export class GT40LeMansJourney {
  constructor() {
    this.section = document.getElementById('journey-section');
    this.canvas = document.getElementById('journey-canvas');
    if (!this.section || !this.canvas) return;

    this.loaderEl = document.getElementById('journey-loader');
    this.loaderFill = document.getElementById('journey-loader-fill');
    this.loaderStatus = document.getElementById('journey-loader-status');
    this.fallbackEl = document.getElementById('journey-webgl-fallback');
    this.hotspotsLayer = document.getElementById('journey-hotspots');
    this.calloutPinsLayer = document.getElementById('journey-callout-pins');
    this.openingCueEl = document.getElementById('journey-opening-cue');
    this.hoverPromptEl = document.getElementById('journey-hover-prompt');
    this.hoverPromptCode = document.getElementById('hover-prompt-code');
    this.hoverPromptText = document.getElementById('hover-prompt-text');
    this.inspectBarEl = document.getElementById('journey-inspect-bar');
    this.inspectTagEl = document.getElementById('inspect-bar-tag');
    this.inspectTitleEl = document.getElementById('inspect-bar-title');
    this.inspectDescEl = document.getElementById('inspect-bar-desc');
    this.inspectExtraBtn = document.getElementById('inspect-bar-exploded-btn');
    this.inspectCloseBtn = document.getElementById('inspect-bar-close-btn');
    this.speedValEl = document.getElementById('journey-speed-val');
    this.sectorValEl = document.getElementById('journey-sector-val');

    // Interactive Start Sequence, Countdown & Camera/Audio HUD Controls
    this.startHudEl = document.getElementById('journey-start-hud');
    this.startBtnEl = document.getElementById('journey-start-btn');
    this.startRingEl = document.getElementById('start-ring-progress');
    this.startSubEl = document.getElementById('journey-start-sub');
    this.countdownEl = document.getElementById('journey-countdown');
    this.countdownNumEl = document.getElementById('journey-countdown-num');
    this.speedCanvas = document.getElementById('journey-speed-canvas');
    this.speedCtx = this.speedCanvas ? this.speedCanvas.getContext('2d') : null;
    this.camCycleBtn = document.getElementById('journey-cam-btn');
    this.audioBtn = document.getElementById('journey-audio-btn');
    this.replayStartBtn = document.getElementById('journey-replay-btn');
    this.doorChoiceOverlay = document.getElementById('door-choice-overlay');
    this.doorChoiceBruceBtn = document.getElementById('door-choice-bruce');
    this.doorChoiceWheelBtn = document.getElementById('door-choice-wheel');
    this.doorChoiceCloseBtn = document.getElementById('door-choice-close');

    // Mode state:
    //   'loading' | 'idle_grid' | 'cranking' | 'countdown' | 'cruise'
    //   | 'opening_door' | 'door_open_choice' | 'entering_chronicles'
    //   | 'entering_cockpit' | 'entering_exploded'
    //   | 'exiting_cockpit' | 'exiting_exploded' | 'inspect_front' | 'inspect_wheel'
    this.mode = 'loading';
    this.isActive = true;
    this.isReady = false;
    this._rafRunning = false;
    this.hasDiscoveredAny = false;
    this.hoveredZone = null;

    // 3x scale inside lemans.glb
    this.carScale = 3.0;
    this.wheelRadius = 0.34; // calibrated from indexed wheel geometry at 1x scale
    this.tirePitch = 0.031;
    this.carFloorOffset = 0.337; // calibrated so 4 tires kiss asphalt

    // Closed Circuit de la Sarthe Path
    const vecPts = LEMANS_WAYPOINTS.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.trackCurve = new THREE.CatmullRomCurve3(vecPts, true, 'catmullrom', 0.25);
    this.trackLength = this.trackCurve.getLength();
    this.distanceAlongTrack = 0.0;

    // Stationary on grid until user cranks & completes countdown, then progressive Le Mans pace
    this.currentSpeed = 0.0;
    this.targetCruiseSpeed = 94.0;
    this.engineRunning = false;
    this.isHoldingStart = false;
    this.startHoldProgress = 0.0;
    this.startHoldDurationMs = 1150;
    this._holdStartTimestamp = 0;
    this._holdPointerId = null;
    this._countdownTimers = [];
    this.countdownValue = 0;
    this.launchElapsed = 99;
    this.lastSmoothedGroundY = vecPts[0]?.y ?? -3.5;
    this.lastFrameTime = performance.now();

    // Articulated hinged panel animations
    this.panels = {
      driverDoor: { current: 0, target: 0, maxOpen: 0.94, pivot: null, meshes: [] },
      passengerDoor: { current: 0, target: 0, maxOpen: -0.94, pivot: null, meshes: [] },
      frontBonnet: { current: 0, target: 0, maxOpen: 0.42, pivot: null, meshes: [] },
      rearCover: { current: 0, target: 0, maxOpen: -0.68, pivot: null, meshes: [] }
    };

    this.wheelPivots = {};
    this.zoneMeshes = new Map();
    this.groundMeshes = [];
    this.exteriorDriver = null;
    this.exteriorSteeringWheel = null;
    this.exhaustPuffs = [];
    this._exhaustTimer = 0;

    // Close NFS-Underground-inspired camera angles (1x local coordinates, scaled by 3x carGroup)
    this.cameraPresetIndex = 0;
    this.baseFov = 45;
    this.currentFov = 45;

    // Full front / side / rear 3/4 interactive drag orbit with smooth release return
    this.userOrbit = {
      yaw: 0,
      pitch: 0,
      dragging: false,
      lastX: 0,
      lastY: 0,
      pointerId: null,
      lastReleaseTime: 0
    };

    // Initial low front 3/4 framing in 1x car coordinates
    this.camLocalPos = new THREE.Vector3(-2.36, 0.72, 3.22);
    this.camLocalLook = new THREE.Vector3(-0.08, 0.24, 0.42);
    this.camTrans = {
      active: false,
      start: 0,
      duration: 1100,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      startLook: new THREE.Vector3(),
      endLook: new THREE.Vector3(),
      onComplete: null
    };

    // Speed-streak edge particles (screen perimeter motion energy without blurring car)
    this._speedStreaks = Array.from({ length: 34 }, (_, i) => ({
      angle: (i / 34) * Math.PI * 2,
      r: 0.36 + Math.random() * 0.42,
      speed: 0.45 + Math.random() * 0.85,
      len: 0.06 + Math.random() * 0.08,
      alpha: 0.14 + Math.random() * 0.22
    }));

    // Web Audio engine pipeline (unlocked strictly on user gesture)
    this._audioCtx = null;
    this._audioMaster = null;
    this._audioBuffers = { startup: null, idle: null, accel: null, engine: null };
    this._audioLoadingPromise = null;
    this._idleSource = null;
    this._idleGain = null;
    this._accelSource = null;
    this._accelGain = null;
    this._engineSource = null;
    this._engineGain = null;
    this._crankSource = null;
    this.audioEnabled = true;

    // Temporaries to eliminate per-frame heap garbage
    this._raycaster = new THREE.Raycaster();
    this._downRay = new THREE.Raycaster();
    this._downDir = new THREE.Vector3(0, -1, 0);
    this._pointer = new THREE.Vector2();
    this._projVec = new THREE.Vector3();
    this._camForward = new THREE.Vector3();
    this._camDir = new THREE.Vector3();
    this._posOnSpline = new THREE.Vector3();
    this._tanOnSpline = new THREE.Vector3();
    this._tanNext = new THREE.Vector3();
    this._probeFront = new THREE.Vector3();
    this._probeRear = new THREE.Vector3();
    this._upVec = new THREE.Vector3(0, 1, 0);
    this._sideVec = new THREE.Vector3();
    this._lookMat = new THREE.Matrix4();
    this._targetQuat = new THREE.Quaternion();
    this._worldCamPos = new THREE.Vector3();
    this._worldCamLook = new THREE.Vector3();
    this._pointerDown = { x: 0, y: 0, time: 0 };
    this._lastHoverTime = 0;
    this._lastHudTime = 0;

    // 4 main interactive hotspots along the exterior moving GT40
    this.hotspotDefs = [
      { key: 'driver_door', badge: '01', short: 'DOOR • COCKPIT', anchor: null, localOffset: new THREE.Vector3(-0.79, 0.24, 0.02) },
      { key: 'rear_engine', badge: '02', short: 'ENGINE • ENGINEERING 3D', anchor: null, localOffset: new THREE.Vector3(-0.34, 0.45, -1.25) },
      { key: 'front_bonnet', badge: '03', short: 'BONNET • FRONT BAY', anchor: null, localOffset: new THREE.Vector3(0.0, 0.23, 1.56) },
      { key: 'wheel', badge: '04', short: 'WHEEL • SUSPENSION', anchor: null, localOffset: new THREE.Vector3(-0.84, 0.03, 1.23) }
    ];
    this.hotspotNodes = new Map();
    this.calloutNodes = [];
    this.activeCallouts = [];

    this._audioCtx = null;
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
    this.createHotspotElements();
    this.bindEvents();
    this.animate();
    this.loadExteriorAssets();
  }

  checkWebGLSupport() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
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
    const aspect = w / h;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141b29);
    this.scene.fog = new THREE.FogExp2(0x161f30, 0.00048);

    this.camera = new THREE.PerspectiveCamera(aspect < 0.85 ? 48 : 41, aspect, 0.35, 11000);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobileViewport ? 1.5 : 1.85));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.32;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.setupLightingAndEnv();
    this.buildSkyDome();
  }

  setupLightingAndEnv() {
    // Rich Circuit de la Sarthe late-afternoon lighting — bright enough to reveal matte bodywork contours
    const hemi = new THREE.HemisphereLight(0xeef4ff, 0x383d4a, 1.55);
    this.scene.add(hemi);

    // Moving sunlight tracking the GT40 with ultra-tight 11m frustum (~1cm/texel crisp shadows)
    this.sunLight = new THREE.DirectionalLight(0xfff2dc, 3.35);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 120;
    const sBounds = 11;
    this.sunLight.shadow.camera.left = -sBounds;
    this.sunLight.shadow.camera.right = sBounds;
    this.sunLight.shadow.camera.top = sBounds;
    this.sunLight.shadow.camera.bottom = -sBounds;
    this.sunLight.shadow.bias = -0.00025;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Cool sky fill opposite sun + crisp rear rim light for fender & louver highlights
    const fillLight = new THREE.DirectionalLight(0xc2dcff, 1.35);
    fillLight.position.set(-45, 35, 50);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xeff6ff, 1.15);
    rimLight.position.set(38, 22, -45);
    this.scene.add(rimLight);

    // Le Mans horizon + forest reflection PMREM for glossy obsidian lacquer & glass
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x1b2638);

      const skyBand = new THREE.Mesh(
        new THREE.SphereGeometry(40, 24, 12),
        new THREE.MeshBasicMaterial({ color: 0x4b6287, side: THREE.BackSide })
      );
      envScene.add(skyBand);

      const sunDisk = new THREE.Mesh(
        new THREE.CircleGeometry(8, 24),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.1, 1.55) })
      );
      sunDisk.position.set(22, 18, -24);
      sunDisk.lookAt(0, 0, 0);
      envScene.add(sunDisk);

      const tarmacFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshBasicMaterial({ color: 0x181b21 })
      );
      tarmacFloor.rotation.x = -Math.PI / 2;
      tarmacFloor.position.y = -4;
      envScene.add(tarmacFloor);

      const envRT = pmrem.fromScene(envScene, 0.05);
      this.scene.environment = envRT.texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('PMREM sky env fallback:', e);
    }
  }

  buildSkyDome() {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0.0, '#0a101d');
    g.addColorStop(0.38, '#172338');
    g.addColorStop(0.50, '#2e3a4d');
    g.addColorStop(0.55, '#594238'); // Warm Le Mans horizon band
    g.addColorStop(0.60, '#1e222b');
    g.addColorStop(1.0, '#0d1016');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(8500, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(sky);
  }

  loadExteriorAssets() {
    const loader = createGLTFLoader();
    const prog = { car: 0, track: 0 };

    const updateProgress = () => {
      const pct = Math.min(100, Math.round(prog.car * 0.55 + prog.track * 0.45));
      if (this.loaderFill) this.loaderFill.style.width = `${pct}%`;
      if (this.loaderStatus) {
        this.loaderStatus.textContent =
          pct < 100
            ? `PREPARING CIRCUIT DE LA SARTHE & CHASSIS P/1046 (${pct}%)`
            : 'ENTERING PIT STRAIGHT AT LE MANS...';
      }
    };

    if (!window.__GT40_GLTF_PROMISE__) {
      window.__GT40_GLTF_PROMISE__ = new Promise((resolve, reject) => {
        loader.load(
          'assets/models/car/source/gt40.glb',
          (gltf) => resolve(gltf),
          (p) => {
            if (p.total) {
              prog.car = Math.min(100, (p.loaded / p.total) * 100);
              updateProgress();
            }
          },
          (err) => reject(err)
        );
      });
    } else {
      prog.car = 100;
    }

    if (!window.__LEMANS_GLTF_PROMISE__) {
      window.__LEMANS_GLTF_PROMISE__ = new Promise((resolve, reject) => {
        loader.load(
          'assets/models/track/source/lemans.glb?v=smooth2',
          (gltf) => resolve(gltf),
          (p) => {
            if (p.total) {
              prog.track = Math.min(100, (p.loaded / p.total) * 100);
              updateProgress();
            }
          },
          (err) => reject(err)
        );
      });
    } else {
      prog.track = 100;
    }

    Promise.all([window.__LEMANS_GLTF_PROMISE__, window.__GT40_GLTF_PROMISE__])
      .then(([trackGltf, carGltf]) => {
        this.trackModel = trackGltf.scene.clone(true);
        this.groundMeshes = prepareLeMansTrackClone(this.trackModel);
        this.scene.add(this.trackModel);

        const rawCarClone = carGltf.scene.clone(true);
        this.assembleMovingGT40(rawCarClone);

        this.isReady = true;
        this.distanceAlongTrack = 0.0;
        this.currentSpeed = 0.0;
        this.engineRunning = false;
        this.mode = 'idle_grid';
        this.updateCarPoseOnCircuit(0.016);
        this.snapCameraImmediate();

        if (this.loaderEl) this.loaderEl.classList.add('hidden');
        if (this.hotspotsLayer) this.hotspotsLayer.classList.remove('visible');
        if (this.openingCueEl) this.openingCueEl.classList.remove('visible', 'faded');
        if (this.startHudEl) this.startHudEl.classList.add('visible');
        if (this.replayStartBtn) this.replayStartBtn.hidden = true;
        this.updateStartProgressUI(0);
        this.updateHotspotPositions();
      })
      .catch((err) => {
        console.error('Failed loading Le Mans Journey assets:', err);
        if (this.loaderStatus) {
          this.loaderStatus.textContent = 'UNABLE TO LOAD LE MANS CIRCUIT OR GT40 ASSET';
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
    mesh.name = name || 'GT40Part';
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

    // Satin-matte 1966 Black #2 paint matching the realistic game simulation with balanced lighting
    const mat = new THREE.MeshStandardMaterial({
      map: bodyLiveryTex,
      roughnessMap: bodyRoughTex,
      metalnessMap: bodyMetalTex,
      roughness: 0.65,
      metalness: 0.04,
      envMapIntensity: 0.42,
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
           bool isExteriorTop = (vBodyPos.y > -0.05 && abs(vBodyNorm.y) > 0.10) && !(vBodyPos.z > 1.88 && abs(vBodyNorm.y) < 0.30);
           bool isStripe = false;
           if (isExteriorTop) {
             if (ax >= 0.018 && ax <= 0.128) isStripe = true;
             if (ax >= 0.142 && ax <= 0.158) isStripe = true;
             if (length(vec2(vBodyPos.x - 0.26, vBodyPos.z - 1.16)) < 0.16 && vBodyPos.y > 0.16 && abs(vBodyNorm.y) > 0.30) {
               isStripe = true;
             }
           }
           bool isRocker = (vBodyPos.y >= -0.02 && vBodyPos.y <= 0.065) && (abs(vBodyNorm.x) > 0.6) && (vBodyPos.z > -0.75 && vBodyPos.z < 0.85);
           if (isRocker && (vBodyPos.y >= 0.012 && vBodyPos.y <= 0.038)) {
             isStripe = true;
           }
           if (isStripe) {
             diffuseColor.rgb = vec3(0.95, 0.95, 0.97);
           } else {
             diffuseColor.rgb = vec3(0.036, 0.040, 0.046);
           }
          `
        )
        .replace(
          '#include <map_fragment>',
          `// Vector-sharp livery replaces raw UV color map`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
           roughnessFactor = isStripe ? 0.56 : 0.68;`
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
           metalnessFactor = 0.04;`
        );
    };

    return mat;
  }

  assembleMovingGT40(rawClone) {
    const texLoader = new THREE.TextureLoader();
    const loadTex = (file, srgb = true, flip = false) => {
      const t = texLoader.load(`assets/models/car/textures_web/${file}`);
      t.flipY = flip;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    const bodyBaseMat = this.createBodyPaintMaterial(texLoader);
    const driverDoorMat = this.createBodyPaintMaterial(texLoader);
    const passengerDoorMat = this.createBodyPaintMaterial(texLoader);
    const frontBonnetMat = this.createBodyPaintMaterial(texLoader);
    const rearCoverMat = this.createBodyPaintMaterial(texLoader);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef4f8,
      roughness: 0.05,
      metalness: 0.06,
      transmission: 0.86,
      thickness: 0.14,
      ior: 1.5,
      transparent: true,
      opacity: 0.36,
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
      color: 0x1e2026,
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
      envMapIntensity: 1.35,
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
           if (length(vec2(vRimPos.y - cy, vRimPos.z - cz)) < 0.052) diffuseColor.rgb = vec3(0.96, 0.96, 0.98);`
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
      envMapIntensity: 1.2,
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

    const interiorMat = new THREE.MeshStandardMaterial({
      map: loadTex('Interior_BaseColor.1001.png', true, false),
      roughnessMap: loadTex('Interior_Roughness.1001.png', false, false),
      normalMap: loadTex('Interior_Normal.1001.png', false, false),
      roughness: 0.66,
      metalness: 0.18,
      side: THREE.DoubleSide
    });

    const headlightMat = new THREE.MeshStandardMaterial({
      map: loadTex('LIGHTS_BaseColor.png', true, false),
      roughnessMap: loadTex('LIGHTS_Roughness.png', false, false),
      color: 0xffffff,
      emissive: 0xfff1d2,
      emissiveIntensity: 3.0,
      roughness: 0.15
    });

    const tailLightMat = new THREE.MeshStandardMaterial({
      map: loadTex('REDLIGHT_BaseColor.png', true, false),
      roughnessMap: loadTex('REDLIGHT_Roughness.png', false, false),
      color: 0xff2218,
      emissive: 0xd9180c,
      emissiveIntensity: 2.2,
      roughness: 0.22
    });

    const noOpacLightMat = new THREE.MeshStandardMaterial({
      map: loadTex('LIGHTSnoopacity_BaseColor.png', true, false),
      color: 0xdadfe6,
      roughness: 0.3,
      metalness: 0.45
    });

    // Root car container at 3.0x track scale
    this.carGroup = new THREE.Group();
    this.carGroup.name = 'LeMansMovingGT40';
    this.carGroup.scale.set(this.carScale, this.carScale, this.carScale);

    this.chassisGroup = new THREE.Group();
    this.chassisGroup.name = 'LeMansMovingChassis';
    this.carGroup.add(this.chassisGroup);

    // Bay reveal lights inside 1x chassis local coordinates
    this.engineBayLight = new THREE.PointLight(0xffdfa8, 0.0, 9.0, 1.5);
    this.engineBayLight.position.set(0, 1.05, -0.92);
    this.chassisGroup.add(this.engineBayLight);

    this.bonnetRevealLight = new THREE.PointLight(0xeef5ff, 0.0, 9.0, 1.5);
    this.bonnetRevealLight.position.set(0, 0.88, 1.38);
    this.chassisGroup.add(this.bonnetRevealLight);

    this.cockpitRevealLight = new THREE.PointLight(0xffe7c2, 0.0, 8.0, 1.5);
    this.cockpitRevealLight.position.set(-0.35, 0.72, 0.12);
    this.chassisGroup.add(this.cockpitRevealLight);

    // Endurance forward headlights illuminating asphalt ahead
    [-0.58, 0.58].forEach((hx) => {
      const hSpot = new THREE.SpotLight(0xfff4dc, 8.0, 260, Math.PI / 5.2, 0.45, 1.2);
      hSpot.position.set(hx, 0.22, 1.98);
      hSpot.target.position.set(hx * 0.9, -0.22, 18.0);
      this.chassisGroup.add(hSpot);
      this.chassisGroup.add(hSpot.target);
    });

    // Panel separation predicates
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

    // Unwrap GLTF scene container
    let modelContainer = rawClone;
    while (
      modelContainer.children.length === 1 &&
      !modelContainer.children[0].isMesh &&
      !modelContainer.children[0].userData?.subsystem
    ) {
      modelContainer = modelContainer.children[0];
    }
    const topNodes = [...modelContainer.children];

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
        const extrasSub = node.userData?.subsystem || '';
        if (name.includes('cockpit_details') || extrasSub === 'cockpit') {
          node.traverse((child) => {
            if (child !== node) {
              child.position.x = -child.position.x;
              child.rotation.y = -child.rotation.y;
              child.rotation.z = -child.rotation.z;
            }
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              this.zoneMeshes.set(child, 'driver_door');
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

    this.buildStructuralBackingDetails(driverDoorOffset, passengerDoorOffset);
    this.calibrateTireGrounding();

    // Soft underbody AO contact shadow for realistic road grounding
    const aoCanvas = document.createElement('canvas');
    aoCanvas.width = 128;
    aoCanvas.height = 256;
    const aoCtx = aoCanvas.getContext('2d');
    const aoGrad = aoCtx.createRadialGradient(64, 128, 12, 64, 128, 62);
    aoGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    aoGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
    aoGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    aoCtx.fillStyle = aoGrad;
    aoCtx.fillRect(0, 0, 128, 256);
    const aoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.05, 4.35),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(aoCanvas),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2
      })
    );
    aoPlane.rotation.x = -Math.PI / 2;
    aoPlane.position.set(0, -0.325, 0.05);
    this.chassisGroup.add(aoPlane);

    // Place 1966 driver Bruce McLaren (race_car_driver.glb in Gulf cream suit) in RHD bucket seat
    this.exteriorDriver = buildBruceMcLarenDriver(THREE, { cockpitObserverMode: false });
    this.exteriorDriver.root.position.y = -0.02;
    this.exteriorDriver.root.position.z = 0.02;
    this.chassisGroup.add(this.exteriorDriver.root);
    loadBruceMcLarenDriverGLB(THREE, createGLTFLoader(), {
      scale: 0.43,
      hotspotName: 'bruce_mclaren_driver',
      onLoaded: (glbGroup, model) => {
        // Replace procedural torso/head meshes with detailed 3D race_car_driver.glb while keeping pivot
        this.exteriorDriver.root.visible = false;
        this.chassisGroup.add(glbGroup);
        model.traverse((obj) => {
          if (obj.isMesh) {
            this.zoneMeshes.set(obj, 'bruce_mclaren_driver');
          }
        });
      }
    });
    this.exteriorDriver.interactives.forEach((part) => {
      this.zoneMeshes.set(part, 'bruce_mclaren_driver');
    });

    // Clickable Moto-Lita Steering Wheel synced with driver's hands at (-0.28, 0.25, 0.44)
    this.exteriorSteeringWheel = new THREE.Group();
    this.exteriorSteeringWheel.position.set(-0.28, 0.23, 0.46);
    this.exteriorSteeringWheel.rotation.x = -0.32;
    const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.42, metalness: 0.15 });
    const wheelSpokeMat = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.28, metalness: 0.85 });
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.184, 0.014, 10, 28), wheelRimMat);
    const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.024, 16), wheelSpokeMat);
    wheelHub.rotation.x = Math.PI / 2;
    const spokeAngles = [Math.PI / 2, Math.PI * 1.18, Math.PI * 1.82];
    spokeAngles.forEach((ang) => {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.17, 0.008), wheelSpokeMat);
      spoke.position.set(Math.cos(ang) * 0.085, Math.sin(ang) * 0.085, 0);
      spoke.rotation.z = ang - Math.PI / 2;
      this.exteriorSteeringWheel.add(spoke);
      this.zoneMeshes.set(spoke, 'steering_wheel');
    });
    const wheelHitDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.04, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    wheelHitDisc.rotation.x = Math.PI / 2;
    this.exteriorSteeringWheel.add(wheelRim, wheelHub, wheelHitDisc);
    this.chassisGroup.add(this.exteriorSteeringWheel);
    this.zoneMeshes.set(wheelRim, 'steering_wheel');
    this.zoneMeshes.set(wheelHub, 'steering_wheel');
    this.zoneMeshes.set(wheelHitDisc, 'steering_wheel');

    this.initExhaustPuffPool();

    const anchorMap = {
      driver_door: driverDoorOffset,
      rear_engine: rearCoverOffset,
      front_bonnet: frontBonnetOffset,
      wheel: this.chassisGroup
    };
    this.hotspotDefs.forEach((def) => {
      def.anchor = anchorMap[def.key] || this.chassisGroup;
    });

    this.scene.add(this.carGroup);
  }

  initExhaustPuffPool() {
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 64;
    texCanvas.height = 64;
    const ctx = texCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(226, 232, 240, 0.72)');
    grad.addColorStop(0.5, 'rgba(148, 163, 184, 0.34)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const puffTex = new THREE.CanvasTexture(texCanvas);
    const baseMat = new THREE.SpriteMaterial({
      map: puffTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.0
    });

    this.exhaustPuffs = [];
    for (let i = 0; i < 18; i++) {
      const sprite = new THREE.Sprite(baseMat.clone());
      sprite.visible = false;
      this.chassisGroup.add(sprite);
      this.exhaustPuffs.push({
        sprite,
        age: 0,
        life: 0.8,
        active: false,
        vx: 0,
        vy: 0,
        vz: -1
      });
    }
  }

  spawnExhaustPuff(sideSign, intensity = 1.0) {
    const slot = this.exhaustPuffs.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = 0.55 + Math.random() * 0.45;
    slot.sprite.visible = true;
    slot.sprite.position.set(sideSign * 0.16 + (Math.random() - 0.5) * 0.03, -0.06, -1.82);
    const baseScale = 0.14 + intensity * 0.12;
    slot.sprite.scale.set(baseScale, baseScale, 1);
    slot.sprite.material.opacity = 0.36 * intensity;
    slot.vx = (Math.random() - 0.5) * 0.18;
    slot.vy = 0.14 + Math.random() * 0.18;
    slot.vz = -(0.85 + intensity * 1.15);
  }

  updateExhaustEffects(dt) {
    if (!this.exhaustPuffs.length) return;
    const isCranking = this.mode === 'cranking';
    const isHotIdle = this.engineRunning && (this.mode === 'countdown' || this.launchElapsed < 2.4);

    if (isCranking || isHotIdle) {
      this._exhaustTimer += dt * (isCranking ? 16 : 9);
      while (this._exhaustTimer >= 1) {
        this._exhaustTimer -= 1;
        this.spawnExhaustPuff(-1, isCranking ? 1.15 : 0.72);
        this.spawnExhaustPuff(1, isCranking ? 1.15 : 0.72);
      }
    }

    for (let i = 0; i < this.exhaustPuffs.length; i++) {
      const p = this.exhaustPuffs[i];
      if (!p.active) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      const s = 0.16 + t * 0.46;
      p.sprite.scale.set(s, s, 1);
      p.sprite.material.opacity = (1 - t) * 0.32;
    }
  }

  buildStructuralBackingDetails(driverDoorOffset, passengerDoorOffset) {
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x111319, roughness: 0.78, metalness: 0.25 });
    const aluMat = new THREE.MeshStandardMaterial({ color: 0x8e95a3, roughness: 0.32, metalness: 0.85 });

    const drvLiner = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.28, 0.86), innerMat);
    drvLiner.position.set(-0.735, 0.19, 0.08);
    const drvHandle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.24), aluMat);
    drvHandle.position.set(-0.715, 0.24, 0.14);
    driverDoorOffset.add(drvLiner, drvHandle);
    this.zoneMeshes.set(drvLiner, 'driver_door');

    const pasLiner = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.28, 0.86), innerMat);
    pasLiner.position.set(0.735, 0.19, 0.08);
    passengerDoorOffset.add(pasLiner);

    const sillRight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.98), innerMat);
    sillRight.position.set(-0.64, -0.02, 0.05);
    const sillRivetPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.88), aluMat);
    sillRivetPlate.position.set(-0.64, 0.026, 0.05);
    this.chassisGroup.add(sillRight, sillRivetPlate);
    this.zoneMeshes.set(sillRight, 'driver_door');

    const frontBayFloor = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.04, 1.06), innerMat);
    frontBayFloor.position.set(0, -0.15, 1.38);
    const frontBulkhead = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.36, 0.04), innerMat);
    frontBulkhead.position.set(0, 0.06, 0.84);
    this.chassisGroup.add(frontBayFloor, frontBulkhead);

    const rearBulkhead = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.56, 0.04), innerMat);
    rearBulkhead.position.set(0, 0.20, -0.44);
    const rearBayPan = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.03, 1.15), innerMat);
    rearBayPan.position.set(0, -0.16, -1.04);
    this.chassisGroup.add(rearBulkhead, rearBayPan);
  }

  calibrateTireGrounding() {
    this.chassisGroup.position.set(0, 0, 0);
    this.chassisGroup.rotation.x = 0;
    this.chassisGroup.updateMatrixWorld(true);

    const boxF = new THREE.Box3().setFromObject(this.wheelPivots.FR.pivot);
    const boxR = new THREE.Box3().setFromObject(this.wheelPivots.RR.pivot);

    if (Number.isFinite(boxF.min.y) && Number.isFinite(boxR.min.y)) {
      this.tirePitch = Math.atan2(boxF.min.y - boxR.min.y, 1.23 - (-1.107));
      this.chassisGroup.rotation.x = this.tirePitch;
      this.chassisGroup.updateMatrixWorld(true);

      const allWheels = new THREE.Box3();
      ['FL', 'FR', 'RL', 'RR'].forEach((wk) => {
        allWheels.union(new THREE.Box3().setFromObject(this.wheelPivots[wk].pivot));
      });
      const avgRadius = (allWheels.max.y - allWheels.min.y) * 0.5;
      if (Number.isFinite(avgRadius) && avgRadius > 0.2) this.wheelRadius = avgRadius;
      if (Number.isFinite(allWheels.min.y)) {
        // Vertical lift in 1x local space so lowest tire contact patch hits Y = 0
        this.carFloorOffset = -allWheels.min.y;
      }
    }
    this.chassisGroup.position.y = this.carFloorOffset;
  }

  // =========================================================================
  //  CAMERA PRESETS & PHYSICAL COMPONENT TRANSITION SEQUENCES
  // =========================================================================

  getCruiseCameraLocal() {
    const aspect = (this.canvas.clientWidth || window.innerWidth) / Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const speedRatio = Math.min(1.0, this.currentSpeed / Math.max(1, this.targetCruiseSpeed));
    const isPortrait = aspect < 0.85;

    // Close Need-for-Speed Underground Front 3/4 camera presets (1x car space; multiplied 3x by carGroup)
    let basePos;
    let baseLook;
    if (this.cameraPresetIndex === 1) {
      // Low Splitter & Headlight Pursuit
      basePos = isPortrait
        ? new THREE.Vector3(-1.58, 0.62, 3.85)
        : new THREE.Vector3(-1.62, 0.50, 3.48);
      baseLook = new THREE.Vector3(0.0, 0.22, 0.55);
    } else if (this.cameraPresetIndex === 2) {
      // Side Tracking Chase
      basePos = isPortrait
        ? new THREE.Vector3(-2.85, 0.95, 2.25)
        : new THREE.Vector3(-3.38, 0.78, 0.65);
      baseLook = new THREE.Vector3(0.0, 0.26, 0.15);
    } else {
      // Hero Front 3/4 Close-Up: bumper-to-bonnet height showcasing glowing lamps, stripes & right flank
      if (isPortrait) {
        basePos = new THREE.Vector3(-2.12, 0.86, 3.92);
        baseLook = new THREE.Vector3(-0.04, 0.26, 0.45);
      } else {
        const distScale = aspect < 1.25 ? Math.min(1.18, 1.0 + (1.25 - aspect) * 0.35) : 1.0;
        basePos = new THREE.Vector3(-2.36 * distScale, 0.72 + (distScale - 1) * 0.2, 3.22 * distScale);
        baseLook = new THREE.Vector3(-0.08, 0.24, 0.42);
      }
    }

    // Dynamic launch & high-speed lead feel (keeps car close & dominant)
    if (this.mode === 'cruise') {
      basePos.z -= speedRatio * 0.14;
      basePos.y -= speedRatio * 0.04;
      baseLook.z += speedRatio * 0.12;
    }

    // Full front / side / rear 3/4 user drag orbit around car with collision-free radial clamp
    if (Math.abs(this.userOrbit.yaw) > 0.001 || Math.abs(this.userOrbit.pitch) > 0.001) {
      const offset = basePos.clone().sub(baseLook);
      offset.applyAxisAngle(this._upVec, this.userOrbit.yaw);
      offset.y = THREE.MathUtils.clamp(offset.y + this.userOrbit.pitch * 1.45, 0.36 - baseLook.y, 1.85);
      basePos.copy(baseLook).add(offset);

      // Strict collision clamp outside car hull + spinning wheels & above road surface (1x car units)
      const horizDist = Math.hypot(basePos.x, basePos.z);
      if (horizDist < 3.35) {
        const scale = 3.35 / Math.max(0.001, horizDist);
        basePos.x *= scale;
        basePos.z *= scale;
      }
      if (Math.abs(basePos.x) < 1.25 && Math.abs(basePos.z) < 2.45) {
        const pushZ = basePos.z >= 0 ? 2.55 : -2.55;
        basePos.z = pushZ;
      }
      basePos.y = Math.max(0.36, basePos.y);
    }

    return { pos: basePos, look: baseLook };
  }

  snapCameraImmediate() {
    if (!this.carGroup) return;
    const cfg = this.getCruiseCameraLocal();
    this.camLocalPos.copy(cfg.pos);
    this.camLocalLook.copy(cfg.look);
    this.applyCarLocalCamera();
  }

  applyCarLocalCamera() {
    this.carGroup.updateMatrixWorld(true);
    this._worldCamPos.copy(this.camLocalPos).applyMatrix4(this.carGroup.matrixWorld);
    this._worldCamLook.copy(this.camLocalLook).applyMatrix4(this.carGroup.matrixWorld);

    // Clamp world camera strictly above road asphalt (carGroup scaled 3x)
    const minGroundClear = this.mode === 'entering_cockpit' || this.mode === 'entering_exploded' ? 0.65 : 0.96;
    if (this._worldCamPos.y < this.carGroup.position.y + minGroundClear) {
      this._worldCamPos.y = this.carGroup.position.y + minGroundClear;
    }

    this.camera.position.copy(this._worldCamPos);
    this.camera.lookAt(this._worldCamLook);
  }

  glideLocalCamera(endPos, endLook, duration, onComplete = null) {
    this.camTrans.active = true;
    this.camTrans.start = performance.now();
    this.camTrans.duration = duration;
    this.camTrans.startPos.copy(this.camLocalPos);
    this.camTrans.endPos.copy(endPos);
    this.camTrans.startLook.copy(this.camLocalLook);
    this.camTrans.endLook.copy(endLook);
    this.camTrans.onComplete = onComplete;
  }

  triggerComponentInteraction(zoneKey) {
    if (!this.isReady) return;
    if (this.mode !== 'cruise' && this.mode !== 'inspect_front' && this.mode !== 'inspect_wheel') {
      return;
    }

    this.markFirstDiscovery();
    this.setHoveredZone(null);
    this.playLatchSound();

    // Scale offsets are in 1x car local coords (since carGroup scales 3x!)
    if (zoneKey === 'driver_door') {
      this.mode = 'opening_door';
      this.userOrbit.yaw = 0;
      this.userOrbit.pitch = 0;
      this.hideInspectUI();
      this.hideDoorChoiceUI();
      if (this.hotspotsLayer) this.hotspotsLayer.classList.remove('visible');

      // Swing open real RHD driver's door while keeping car rolling down Le Mans
      this.panels.driverDoor.target = this.panels.driverDoor.maxOpen;
      this.panels.frontBonnet.target = 0;
      this.panels.rearCover.target = 0;

      // Stage 1: Approach open doorway, then reveal two-stage choice (Bruce McLaren vs Steering Wheel)
      this.glideLocalCamera(
        new THREE.Vector3(-1.85, 0.86, -1.05),
        new THREE.Vector3(-0.22, 0.44, 0.28),
        680,
        () => {
          this.enterDoorOpenChoice();
        }
      );
    } else if (zoneKey === 'rear_engine') {
      this.mode = 'entering_exploded';
      this.userOrbit.yaw = 0;
      this.userOrbit.pitch = 0;
      this.hideInspectUI();
      if (this.hotspotsLayer) this.hotspotsLayer.classList.remove('visible');

      // Lift real rear clamshell backward while car continues down track
      this.panels.rearCover.target = this.panels.rearCover.maxOpen;
      this.panels.driverDoor.target = 0;
      this.panels.frontBonnet.target = 0;

      // Move camera close above open V8 compartment -> transition seamlessly into Exploded View
      this.glideLocalCamera(
        new THREE.Vector3(-1.45, 1.35, -0.35),
        new THREE.Vector3(0.0, 0.45, -0.82),
        780,
        () => {
          this.glideLocalCamera(
            new THREE.Vector3(-0.55, 0.92, -0.58),
            new THREE.Vector3(0.0, 0.36, -0.86),
            560,
            () => {
              window.gt40JourneyOrchestrator?.markMilestone?.('exploded');
              window.gt40JourneyOrchestrator?.enterExplodedFromMovingCar?.('engine');
            }
          );
        }
      );
    } else if (zoneKey === 'front_bonnet') {
      this.mode = 'inspect_front';
      this.userOrbit.yaw = 0;
      this.userOrbit.pitch = 0;
      this.panels.frontBonnet.target = this.panels.frontBonnet.maxOpen;
      this.panels.driverDoor.target = 0;
      this.panels.rearCover.target = 0;

      if (this.hotspotsLayer) this.hotspotsLayer.classList.remove('visible');
      window.gt40JourneyOrchestrator?.markMilestone?.('front_bay');

      this.glideLocalCamera(
        new THREE.Vector3(-2.05, 1.48, 1.85),
        new THREE.Vector3(0.0, 0.16, 1.32),
        900,
        () => {
          this.showAnatomicalInspection('front_bonnet');
        }
      );
    } else if (zoneKey === 'wheel') {
      this.mode = 'inspect_wheel';
      this.userOrbit.yaw = 0;
      this.userOrbit.pitch = 0;
      this.panels.driverDoor.target = 0;
      this.panels.frontBonnet.target = 0;
      this.panels.rearCover.target = 0;

      if (this.hotspotsLayer) this.hotspotsLayer.classList.remove('visible');
      window.gt40JourneyOrchestrator?.markMilestone?.('wheel');

      this.glideLocalCamera(
        new THREE.Vector3(-1.92, 0.48, 1.72),
        new THREE.Vector3(-0.68, 0.22, 1.23),
        900,
        () => {
          this.showAnatomicalInspection('wheel');
        }
      );
    }
  }

  enterDoorOpenChoice() {
    this.mode = 'door_open_choice';
    this.panels.driverDoor.target = this.panels.driverDoor.maxOpen;
    this.showDoorChoiceUI();
  }

  showDoorChoiceUI() {
    if (this.openingCueEl) {
      this.openingCueEl.style.opacity = '0';
    }
    if (this.doorChoiceOverlay) {
      this.doorChoiceOverlay.classList.add('visible');
    }
  }

  hideDoorChoiceUI() {
    if (this.openingCueEl) {
      this.openingCueEl.style.opacity = '';
    }
    if (this.doorChoiceOverlay) {
      this.doorChoiceOverlay.classList.remove('visible');
    }
    this.doorChoiceBruceBtn?.classList.remove('hovered');
    this.doorChoiceWheelBtn?.classList.remove('hovered');
  }

  triggerDoorChoice(choiceKey) {
    if (this.mode !== 'door_open_choice') return;
    this.setHoveredZone(null);
    this.hideDoorChoiceUI();
    this.playLatchSound();

    if (choiceKey === 'bruce_mclaren_driver') {
      this.mode = 'entering_chronicles';
      this.glideLocalCamera(
        new THREE.Vector3(-1.12, 0.64, -0.32),
        new THREE.Vector3(-0.28, 0.42, 0.04),
        520,
        () => {
          window.gt40JourneyOrchestrator?.enterDriverChroniclesFromDoor?.();
        }
      );
    } else if (choiceKey === 'steering_wheel') {
      this.mode = 'entering_cockpit';
      this.glideLocalCamera(
        new THREE.Vector3(-0.28, 0.52, 0.06),
        new THREE.Vector3(-0.22, 0.48, 1.35),
        650,
        () => {
          window.gt40JourneyOrchestrator?.markMilestone?.('cockpit');
          window.gt40JourneyOrchestrator?.enterCockpitFromMovingCar?.();
        }
      );
    }
  }

  closeDriverDoorToCruise() {
    if (this.mode !== 'door_open_choice' && this.mode !== 'opening_door') return;
    this.playLatchSound();
    this.hideDoorChoiceUI();
    this.setHoveredZone(null);
    this.panels.driverDoor.target = 0;
    const cruise = this.getCruiseCameraLocal();
    this.mode = 'exiting_cockpit';
    this.glideLocalCamera(cruise.pos, cruise.look, 850, () => {
      this.mode = 'cruise';
      if (this.hotspotsLayer) this.hotspotsLayer.classList.add('visible');
    });
  }

  returnFromChroniclesDoor() {
    this.hideInspectUI();
    if (this.hotspotsLayer) this.hotspotsLayer.classList.remove('visible');
    this.panels.driverDoor.current = this.panels.driverDoor.maxOpen;
    this.panels.driverDoor.target = this.panels.driverDoor.maxOpen;
    this.camLocalPos.set(-1.85, 0.86, -1.05);
    this.camLocalLook.set(-0.22, 0.44, 0.28);
    this.userOrbit.yaw = 0;
    this.userOrbit.pitch = 0;
    this.enterDoorOpenChoice();
  }

  returnFromCockpit() {
    this.mode = 'exiting_cockpit';
    this.hideInspectUI();
    this.panels.driverDoor.target = this.panels.driverDoor.maxOpen;
    this.camLocalPos.set(-0.28, 0.52, 0.06);
    this.camLocalLook.set(-0.22, 0.48, 1.35);

    this.glideLocalCamera(
      new THREE.Vector3(-1.95, 0.92, -1.15),
      new THREE.Vector3(-0.15, 0.38, 0.35),
      650,
      () => {
        this.panels.driverDoor.target = 0;
        const cruise = this.getCruiseCameraLocal();
        this.glideLocalCamera(cruise.pos, cruise.look, 950, () => {
          this.mode = 'cruise';
          if (this.hotspotsLayer) this.hotspotsLayer.classList.add('visible');
        });
      }
    );
  }

  returnFromExploded() {
    this.mode = 'exiting_exploded';
    this.hideInspectUI();
    this.panels.rearCover.target = this.panels.rearCover.maxOpen;
    this.camLocalPos.set(-0.75, 1.05, -0.62);
    this.camLocalLook.set(0.0, 0.38, -0.86);

    setTimeout(() => {
      this.panels.rearCover.target = 0;
      this.playLatchSound();
    }, 280);

    const cruise = this.getCruiseCameraLocal();
    this.glideLocalCamera(cruise.pos, cruise.look, 1150, () => {
      this.mode = 'cruise';
      if (this.hotspotsLayer) this.hotspotsLayer.classList.add('visible');
    });
  }

  exitCloseInspection() {
    if (this.mode !== 'inspect_front' && this.mode !== 'inspect_wheel') return;
    this.playLatchSound();
    this.hideInspectUI();
    this.panels.frontBonnet.target = 0;
    this.panels.rearCover.target = 0;
    this.panels.driverDoor.target = 0;

    const cruise = this.getCruiseCameraLocal();
    this.mode = 'exiting_exploded';
    this.glideLocalCamera(cruise.pos, cruise.look, 950, () => {
      this.mode = 'cruise';
      if (this.hotspotsLayer) this.hotspotsLayer.classList.add('visible');
    });
  }

  // =========================================================================
  //  IN-SCENE ANATOMICAL INSPECTION OVERLAYS (FRONT BAY & WHEEL SUSPENSION)
  // =========================================================================

  showAnatomicalInspection(type) {
    const list = type === 'front_bonnet' ? FRONT_BAY_CALLOUTS : WHEEL_CALLOUTS;
    this.activeCallouts = list;

    if (this.calloutPinsLayer) {
      this.calloutPinsLayer.innerHTML = '';
      this.calloutNodes = list.map((item, idx) => {
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = `journey-callout-pin ${idx === 0 ? 'active' : ''}`;
        pin.innerHTML = `<span class="cp-dot"></span><span class="cp-title">${item.title}</span>`;
        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectCallout(idx);
        });
        this.calloutPinsLayer.appendChild(pin);
        return { el: pin, item };
      });
      this.calloutPinsLayer.classList.add('visible');
    }

    this.selectCallout(0);
    if (this.inspectBarEl) {
      this.inspectBarEl.classList.add('visible');
    }
    if (this.inspectExtraBtn) {
      this.inspectExtraBtn.style.display = type === 'wheel' ? 'inline-flex' : 'none';
    }
    if (this.inspectCloseBtn) {
      this.inspectCloseBtn.textContent =
        type === 'front_bonnet' ? 'CLOSE BONNET & RESUME' : 'RETURN TO TRACK VIEW';
    }
  }

  selectCallout(idx) {
    const item = this.activeCallouts[idx];
    if (!item) return;

    this.calloutNodes.forEach((node, i) => {
      node.el.classList.toggle('active', i === idx);
    });

    if (this.inspectTagEl) {
      this.inspectTagEl.textContent =
        this.mode === 'inspect_front'
          ? 'FRONT COMPARTMENT // COOLING & AERO STRUCTURE'
          : 'MOVING RUNNING GEAR // BRAKING & SUSPENSION';
    }
    if (this.inspectTitleEl) this.inspectTitleEl.textContent = item.title;
    if (this.inspectDescEl) this.inspectDescEl.textContent = item.detail;
  }

  hideInspectUI() {
    this.activeCallouts = [];
    this.calloutNodes = [];
    if (this.calloutPinsLayer) {
      this.calloutPinsLayer.innerHTML = '';
      this.calloutPinsLayer.classList.remove('visible');
    }
    if (this.inspectBarEl) this.inspectBarEl.classList.remove('visible');
  }

  // =========================================================================
  //  DISCREET HOVER PROMPTS & 3D PROJECTED HOTSPOTS
  // =========================================================================

  markFirstDiscovery() {
    if (this.hasDiscoveredAny) return;
    this.hasDiscoveredAny = true;
    if (this.openingCueEl) {
      this.openingCueEl.classList.add('faded');
    }
  }

  createHotspotElements() {
    if (!this.hotspotsLayer) return;
    this.hotspotsLayer.innerHTML = '';

    this.hotspotDefs.forEach((def) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'journey-hotspot';
      btn.dataset.zone = def.key;
      const promptInfo = COMPONENT_PROMPTS[def.key];
      btn.setAttribute('aria-label', promptInfo ? promptInfo.prompt : def.short);
      btn.innerHTML = `
        <span class="jh-ring"></span>
        <span class="jh-dot"></span>
        <span class="jh-pill">${def.short}</span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerComponentInteraction(def.key);
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
      rearCover: 'rear_engine',
      frontBonnet: 'front_bonnet'
    };

    Object.entries(mapEmissive).forEach(([panelKey, zKey]) => {
      const meshes = this.panels[panelKey]?.meshes || [];
      meshes.forEach((m) => {
        if (m.material && m.material.emissive) {
          if (zoneKey === zKey) {
            m.material.emissive.setHex(0xfbbf24);
            m.material.emissiveIntensity = 0.08;
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

    if (this.doorChoiceBruceBtn) {
      this.doorChoiceBruceBtn.classList.toggle('hovered', zoneKey === 'bruce_mclaren_driver');
    }
    if (this.doorChoiceWheelBtn) {
      this.doorChoiceWheelBtn.classList.toggle('hovered', zoneKey === 'steering_wheel');
    }

    if (this.hoverPromptEl) {
      if (zoneKey && COMPONENT_PROMPTS[zoneKey]) {
        if (this.hoverPromptCode) this.hoverPromptCode.textContent = COMPONENT_PROMPTS[zoneKey].code;
        if (this.hoverPromptText) this.hoverPromptText.textContent = COMPONENT_PROMPTS[zoneKey].prompt;
        this.hoverPromptEl.classList.add('visible');
      } else {
        this.hoverPromptEl.classList.remove('visible');
      }
    }

    if (this.mode === 'cruise' || this.mode === 'door_open_choice') {
      this.canvas.style.cursor = zoneKey ? 'pointer' : (this.mode === 'cruise' ? 'grab' : 'default');
    }
  }

  raycastVehicle(clientX, clientY) {
    if (!this.isReady || this.zoneMeshes.size === 0) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    this._pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointer, this.camera);

    const targets = Array.from(this.zoneMeshes.keys());
    const hits = this._raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      const rawZone = this.zoneMeshes.get(hits[0].object) || null;
      if (this.mode === 'door_open_choice') {
        return (rawZone === 'bruce_mclaren_driver' || rawZone === 'steering_wheel') ? rawZone : null;
      }
      if (rawZone === 'bruce_mclaren_driver' || rawZone === 'steering_wheel') {
        return 'driver_door';
      }
      return rawZone;
    }
    return null;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    this.canvas.addEventListener('pointerdown', (e) => {
      this._pointerDown = { x: e.clientX, y: e.clientY, time: performance.now() };
      if (this.mode === 'cruise' || this.mode === 'idle_grid' || this.mode === 'countdown' || this.mode === 'inspect_front' || this.mode === 'inspect_wheel') {
        this.userOrbit.dragging = true;
        this.userOrbit.lastX = e.clientX;
        this.userOrbit.lastY = e.clientY;
        this.userOrbit.pointerId = e.pointerId;
        try { this.canvas.setPointerCapture(e.pointerId); } catch {}
        this.canvas.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.userOrbit.dragging && this.isActive) {
        const dx = e.clientX - this.userOrbit.lastX;
        const dy = e.clientY - this.userOrbit.lastY;
        this.userOrbit.lastX = e.clientX;
        this.userOrbit.lastY = e.clientY;
        const maxYaw = this.mode === 'inspect_front' || this.mode === 'inspect_wheel' ? 0.65 : 2.45;
        this.userOrbit.yaw = THREE.MathUtils.clamp(this.userOrbit.yaw - dx * 0.0052, -maxYaw, maxYaw);
        this.userOrbit.pitch = THREE.MathUtils.clamp(this.userOrbit.pitch + dy * 0.0038, -0.14, 0.44);
        return;
      }

      if (!this.isActive || (this.mode !== 'cruise' && this.mode !== 'door_open_choice') || this.isMobileViewport) return;
      const now = performance.now();
      if (now - this._lastHoverTime < 45) return;
      this._lastHoverTime = now;
      const zone = this.raycastVehicle(e.clientX, e.clientY);
      this.setHoveredZone(zone);
    });

    const releaseCanvasDrag = (e) => {
      if (this.userOrbit.dragging) {
        this.userOrbit.dragging = false;
        this.userOrbit.lastReleaseTime = performance.now();
        if (this.userOrbit.pointerId !== null) {
          try { this.canvas.releasePointerCapture(this.userOrbit.pointerId); } catch {}
          this.userOrbit.pointerId = null;
        }
        this.canvas.style.cursor = this.hoveredZone ? 'pointer' : 'grab';
      }

      if (!this.isActive || (this.mode !== 'cruise' && this.mode !== 'door_open_choice')) return;
      if (!e) return;
      const dx = (e.clientX ?? this._pointerDown.x) - this._pointerDown.x;
      const dy = (e.clientY ?? this._pointerDown.y) - this._pointerDown.y;
      if (Math.hypot(dx, dy) < 6 && performance.now() - this._pointerDown.time < 420) {
        const hitZone = this.raycastVehicle(e.clientX, e.clientY);
        if (hitZone) {
          if (this.mode === 'door_open_choice') {
            this.triggerDoorChoice(hitZone);
          } else {
            this.triggerComponentInteraction(hitZone);
          }
        }
      }
    };

    window.addEventListener('pointerup', releaseCanvasDrag);
    window.addEventListener('pointercancel', () => releaseCanvasDrag(null));
    window.addEventListener('blur', () => {
      releaseCanvasDrag(null);
      this.cancelStartHold();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        releaseCanvasDrag(null);
        this.cancelStartHold();
      }
    });

    // Click-and-hold start control (mouse + touch)
    if (this.startBtnEl) {
      this.startBtnEl.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        this._holdPointerId = e.pointerId;
        try { this.startBtnEl.setPointerCapture(e.pointerId); } catch {}
        this.beginStartHold();
      });
      this.startBtnEl.addEventListener('pointerup', (e) => {
        e.stopPropagation();
        this.cancelStartHold();
      });
      this.startBtnEl.addEventListener('pointercancel', () => this.cancelStartHold());
      this.startBtnEl.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    if (this.camCycleBtn) {
      this.camCycleBtn.addEventListener('click', () => {
        const labels = ['FRONT 3/4', 'SPLITTER LOW', 'SIDE TRACK'];
        this.cameraPresetIndex = (this.cameraPresetIndex + 1) % labels.length;
        this.userOrbit.yaw = 0;
        this.userOrbit.pitch = 0;
        this.camCycleBtn.textContent = `CAM: ${labels[this.cameraPresetIndex]}`;
        this.playLatchSound();
      });
    }

    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => this.toggleAudioMute());
    }

    if (this.replayStartBtn) {
      this.replayStartBtn.addEventListener('click', () => this.replayStartSequence());
    }

    if (this.inspectCloseBtn) {
      this.inspectCloseBtn.addEventListener('click', () => this.exitCloseInspection());
    }

    if (this.inspectExtraBtn) {
      this.inspectExtraBtn.addEventListener('click', () => {
        this.playLatchSound();
        window.gt40JourneyOrchestrator?.markMilestone?.('exploded');
        window.gt40JourneyOrchestrator?.enterExplodedFromMovingCar?.('brakes');
      });
    }

    if (this.doorChoiceBruceBtn) {
      this.doorChoiceBruceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerDoorChoice('bruce_mclaren_driver');
      });
      this.doorChoiceBruceBtn.addEventListener('mouseenter', () => this.setHoveredZone('bruce_mclaren_driver'));
      this.doorChoiceBruceBtn.addEventListener('mouseleave', () => this.setHoveredZone(null));
    }

    if (this.doorChoiceWheelBtn) {
      this.doorChoiceWheelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.triggerDoorChoice('steering_wheel');
      });
      this.doorChoiceWheelBtn.addEventListener('mouseenter', () => this.setHoveredZone('steering_wheel'));
      this.doorChoiceWheelBtn.addEventListener('mouseleave', () => this.setHoveredZone(null));
    }

    if (this.doorChoiceCloseBtn) {
      this.doorChoiceCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeDriverDoorToCruise();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if ((e.code === 'Space' || e.code === 'Enter') && (this.mode === 'idle_grid' || this.mode === 'cranking')) {
        e.preventDefault();
        if (!e.repeat) this.beginStartHold();
      }
      if (e.key === 'Escape' && (this.mode === 'inspect_front' || this.mode === 'inspect_wheel')) {
        this.exitCloseInspection();
      } else if (e.key === 'Escape' && this.mode === 'door_open_choice') {
        this.closeDriverDoorToCruise();
      }
    });

    window.addEventListener('keyup', (e) => {
      if ((e.code === 'Space' || e.code === 'Enter') && this.isHoldingStart) {
        this.cancelStartHold();
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
    this.baseFov = aspect < 0.85 ? 50 : 44;
    this.camera.fov = this.baseFov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    if (this.speedCanvas) {
      this.speedCanvas.width = w;
      this.speedCanvas.height = h;
    }
  }

  // =========================================================================
  //  AUTHENTIC ENGINE START SEQUENCE, WEB AUDIO & COUNTDOWN LAUNCH
  // =========================================================================

  ensureAudioUnlocked() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!this._audioCtx) {
        this._audioCtx = new AC();
        this._audioMaster = this._audioCtx.createGain();
        this._audioMaster.gain.setValueAtTime(this.audioEnabled ? 0.78 : 0.0, this._audioCtx.currentTime);
        this._audioMaster.connect(this._audioCtx.destination);
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume().catch(() => {});
      }
      if (!this._audioLoadingPromise) {
        const loadClip = async (url) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const buf = await res.arrayBuffer();
            return await this._audioCtx.decodeAudioData(buf);
          } catch {
            return null;
          }
        };
        this._audioLoadingPromise = Promise.all([
          loadClip('assets/audio/gt40-startup.mp3'),
          loadClip('assets/audio/gt40-idle.mp3'),
          loadClip('assets/audio/gt40-accel.mp3'),
          loadClip('assets/audio/gt40-engine.mp3')
        ]).then(([startup, idle, accel, engine]) => {
          this._audioBuffers = { startup, idle, accel, engine };
          if (this.mode === 'cranking' && this._crankSource === null) {
            this.playStarterCrankAudio();
          } else if (this.engineRunning && !this._idleSource) {
            this.startEngineAudioLoops();
          }
        });
      }
      return this._audioCtx;
    } catch {
      return null;
    }
  }

  playStarterCrankAudio() {
    if (!this._audioCtx || !this._audioMaster) return;
    if (this._crankSource) {
      try { this._crankSource.stop(); } catch {}
      this._crankSource = null;
    }
    const buf = this._audioBuffers.startup;
    if (!buf) return;
    const src = this._audioCtx.createBufferSource();
    src.buffer = buf;
    const g = this._audioCtx.createGain();
    g.gain.setValueAtTime(0.9, this._audioCtx.currentTime);
    src.connect(g);
    g.connect(this._audioMaster);
    src.start(0);
    this._crankSource = src;
  }

  startEngineAudioLoops() {
    if (!this._audioCtx || !this._audioMaster) return;
    const now = this._audioCtx.currentTime;
    this.stopEngineAudioLoops();

    if (this._audioBuffers.idle) {
      this._idleSource = this._audioCtx.createBufferSource();
      this._idleSource.buffer = this._audioBuffers.idle;
      this._idleSource.loop = true;
      this._idleGain = this._audioCtx.createGain();
      this._idleGain.gain.setValueAtTime(0.01, now);
      this._idleGain.gain.linearRampToValueAtTime(0.68, now + 0.35);
      this._idleSource.connect(this._idleGain);
      this._idleGain.connect(this._audioMaster);
      this._idleSource.start(now);
    }

    const driveBuf = this._audioBuffers.accel || this._audioBuffers.engine;
    if (driveBuf) {
      this._accelSource = this._audioCtx.createBufferSource();
      this._accelSource.buffer = driveBuf;
      this._accelSource.loop = true;
      this._accelGain = this._audioCtx.createGain();
      this._accelGain.gain.setValueAtTime(0.0, now);
      this._accelSource.connect(this._accelGain);
      this._accelGain.connect(this._audioMaster);
      this._accelSource.start(now);
    }
  }

  stopEngineAudioLoops() {
    [' _crankSource', '_idleSource', '_accelSource'].forEach((rawKey) => {
      const k = rawKey.trim();
      if (this[k]) {
        try { this[k].stop(); } catch {}
        this[k] = null;
      }
    });
  }

  updateRunningEngineAudio() {
    if (!this._audioCtx || !this._audioMaster || !this.engineRunning) return;
    const now = this._audioCtx.currentTime;
    const speedRatio = Math.min(1.0, this.currentSpeed / Math.max(1, this.targetCruiseSpeed));
    if (this._idleGain) {
      const targetIdle = this.mode === 'countdown' ? 0.72 : Math.max(0.18, 0.65 - speedRatio * 0.42);
      this._idleGain.gain.setTargetAtTime(targetIdle, now, 0.14);
    }
    if (this._accelGain && this._accelSource) {
      const targetDrive = this.mode === 'countdown' ? 0.0 : 0.14 + speedRatio * 0.56;
      this._accelGain.gain.setTargetAtTime(targetDrive, now, 0.16);
      this._accelSource.playbackRate.setTargetAtTime(0.76 + speedRatio * 0.38, now, 0.15);
    }
  }

  playCountdownTone(isGo = false) {
    try {
      const ctx = this.ensureAudioUnlocked();
      if (!ctx || !this._audioMaster || !this.audioEnabled) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isGo ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
      if (isGo) osc.frequency.exponentialRampToValueAtTime(1180, now + 0.14);
      gain.gain.setValueAtTime(isGo ? 0.22 : 0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.28 : 0.16));
      osc.connect(gain);
      gain.connect(this._audioMaster);
      osc.start(now);
      osc.stop(now + 0.30);
    } catch {}
  }

  toggleAudioMute() {
    this.ensureAudioUnlocked();
    this.audioEnabled = !this.audioEnabled;
    if (this._audioCtx && this._audioMaster) {
      this._audioMaster.gain.setTargetAtTime(this.audioEnabled ? 0.78 : 0.0, this._audioCtx.currentTime, 0.08);
    }
    if (this.audioBtn) {
      this.audioBtn.textContent = this.audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
      this.audioBtn.classList.toggle('is-muted', !this.audioEnabled);
    }
  }

  updateStartProgressUI(progress) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    if (this.startRingEl) {
      const circumference = 289.03; // 2 * PI * 46
      this.startRingEl.style.strokeDashoffset = (circumference * (1 - p)).toFixed(2);
    }
    if (this.startBtnEl) {
      this.startBtnEl.classList.toggle('is-cranking', this.isHoldingStart && p > 0);
    }
    if (this.startSubEl) {
      this.startSubEl.textContent = p > 0.05
        ? `CRANKING 427 FE V8 // ${Math.round(p * 100)}%`
        : 'PRESS & HOLD BUTTON, TOUCH OR [SPACE] FOR IGNITION';
    }
  }

  beginStartHold() {
    if (!this.isReady || !this.isActive) return;
    if (this.mode !== 'idle_grid') return;

    this.ensureAudioUnlocked();
    this.isHoldingStart = true;
    this.mode = 'cranking';
    this.startHoldProgress = 0;
    this._holdStartTimestamp = performance.now();
    this.playStarterCrankAudio();
    this.updateStartProgressUI(0.02);
  }

  cancelStartHold() {
    if (!this.isHoldingStart && this.mode !== 'cranking') return;
    this.isHoldingStart = false;
    this._holdPointerId = null;
    if (this._crankSource) {
      try { this._crankSource.stop(); } catch {}
      this._crankSource = null;
    }
    if (this.mode === 'cranking') {
      this.mode = 'idle_grid';
    }
    this.startHoldProgress = 0;
    this.updateStartProgressUI(0);
  }

  completeEngineIgnition() {
    this.isHoldingStart = false;
    this._holdPointerId = null;
    this.startHoldProgress = 1;
    this.updateStartProgressUI(1);

    this.engineRunning = true;
    this.mode = 'countdown';
    this.startEngineAudioLoops();

    if (this.startHudEl) {
      this.startHudEl.classList.remove('visible');
    }

    this.clearCountdownTimers();
    this.runCountdownStep(3);
  }

  clearCountdownTimers() {
    this._countdownTimers.forEach((id) => clearTimeout(id));
    this._countdownTimers = [];
  }

  runCountdownStep(val) {
    this.countdownValue = val;
    if (!this.countdownEl || !this.countdownNumEl) {
      this.launchAfterCountdown();
      return;
    }

    this.countdownEl.classList.add('visible');
    this.countdownNumEl.classList.remove('pop');
    void this.countdownNumEl.offsetWidth;
    this.countdownNumEl.textContent = val > 0 ? String(val) : 'GO';
    this.countdownNumEl.classList.add('pop');
    this.playCountdownTone(val === 0);

    if (val > 1) {
      this._countdownTimers.push(setTimeout(() => this.runCountdownStep(val - 1), 820));
    } else if (val === 1) {
      this._countdownTimers.push(setTimeout(() => this.launchAfterCountdown(), 820));
    }
  }

  launchAfterCountdown() {
    if (this.countdownNumEl && this.countdownEl) {
      this.countdownNumEl.classList.remove('pop');
      void this.countdownNumEl.offsetWidth;
      this.countdownNumEl.textContent = 'GO';
      this.countdownNumEl.classList.add('pop');
      this.playCountdownTone(true);
      this._countdownTimers.push(setTimeout(() => {
        if (this.countdownEl) this.countdownEl.classList.remove('visible');
      }, 650));
    }

    this.mode = 'cruise';
    this.launchElapsed = 0;
    if (this.replayStartBtn) this.replayStartBtn.hidden = false;
    if (this.hotspotsLayer) this.hotspotsLayer.classList.add('visible');
    if (this.openingCueEl) {
      this.openingCueEl.classList.remove('faded');
      this.openingCueEl.classList.add('visible');
      this._countdownTimers.push(setTimeout(() => {
        if (this.openingCueEl) this.openingCueEl.classList.add('faded');
      }, 6400));
    }
    this.updateHotspotPositions();
  }

  replayStartSequence() {
    if (!this.isReady) return;
    this.clearCountdownTimers();
    this.cancelStartHold();
    this.stopEngineAudioLoops();
    this.hideInspectUI();

    this.engineRunning = false;
    this.currentSpeed = 0.0;
    this.distanceAlongTrack = 0.0;
    this.launchElapsed = 99;
    this.countdownValue = 0;
    this.cameraPresetIndex = 0;
    this.userOrbit.yaw = 0;
    this.userOrbit.pitch = 0;
    this.panels.driverDoor.target = 0;
    this.panels.passengerDoor.target = 0;
    this.panels.frontBonnet.target = 0;
    this.panels.rearCover.target = 0;

    if (this.camCycleBtn) this.camCycleBtn.textContent = 'CAM: FRONT 3/4';
    if (this.countdownEl) this.countdownEl.classList.remove('visible');
    if (this.hotspotsLayer) this.hotspotsLayer.classList.remove('visible');
    if (this.openingCueEl) this.openingCueEl.classList.remove('visible', 'faded');
    if (this.replayStartBtn) this.replayStartBtn.hidden = true;
    if (this.startHudEl) this.startHudEl.classList.add('visible');
    this.updateStartProgressUI(0);

    this.mode = 'idle_grid';
    this.updateCarPoseOnCircuit(0.016);
    this.snapCameraImmediate();
  }

  playLatchSound() {
    try {
      const ctx = this.ensureAudioUnlocked();
      if (!ctx || !this._audioMaster || !this.audioEnabled) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.08);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(this._audioMaster);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  pause() {
    this.isActive = false;
    this.cancelStartHold();
    this.clearCountdownTimers();
    if (this._audioCtx && this._audioMaster) {
      this._audioMaster.gain.setTargetAtTime(0.0, this._audioCtx.currentTime, 0.06);
    }
  }

  resume(afterAction = null) {
    this.isActive = true;
    this.lastFrameTime = performance.now();
    this.onResize();
    if (this._audioCtx && this._audioMaster && this.audioEnabled && this.engineRunning) {
      this._audioMaster.gain.setTargetAtTime(0.78, this._audioCtx.currentTime, 0.15);
    }
    if (typeof afterAction === 'function') afterAction();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    if (!this._rafRunning) {
      this.animate();
    }
  }

  renderSpeedStreaks(dt) {
    if (!this.speedCtx || !this.speedCanvas) return;
    const ctx = this.speedCtx;
    const w = this.speedCanvas.width;
    const h = this.speedCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (this.mode !== 'cruise' || this.currentSpeed < 26) return;
    const intensity = Math.min(1.0, (this.currentSpeed - 26) / 68);
    const cx = w * 0.5;
    const cy = h * 0.52;
    const maxDim = Math.hypot(w, h) * 0.52;

    ctx.lineCap = 'round';
    for (let i = 0; i < this._speedStreaks.length; i++) {
      const s = this._speedStreaks[i];
      s.r += s.speed * intensity * dt * 1.15;
      if (s.r > 1.05) {
        s.r = 0.34 + Math.random() * 0.18;
      }
      const r0 = s.r * maxDim;
      const r1 = (s.r + s.len * intensity) * maxDim;
      const cos = Math.cos(s.angle);
      const sin = Math.sin(s.angle);
      ctx.strokeStyle = `rgba(226, 232, 240, ${(s.alpha * intensity).toFixed(3)})`;
      ctx.lineWidth = 1.0 + intensity * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + cos * r0, cy + sin * r0);
      ctx.lineTo(cx + cos * r1, cy + sin * r1);
      ctx.stroke();
    }
  }

  // =========================================================================
  //  REAL-TIME CONTINUOUS TRACK DRIVING, GROUND SNAP & 3D PIN PROJECTION
  // =========================================================================

  sampleGroundY(worldX, refY, worldZ) {
    if (this.groundMeshes.length === 0) return refY;
    this._downRay.set(new THREE.Vector3(worldX, refY + 14.0, worldZ), this._downDir);
    this._downRay.far = 36.0;
    const hits = this._downRay.intersectObjects(this.groundMeshes, false);
    if (hits.length > 0) {
      // Prefer main asphalt/road surface to avoid micro-steps from overlapping line/curb meshes
      const roadHit = hits.find((h) => {
        const n = (h.object?.material?.name || h.object?.name || '').toLowerCase();
        return n.includes('road') || n.includes('asphalt') || n.includes('start');
      });
      return (roadHit || hits[0]).point.y;
    }
    return refY;
  }

  updateCarPoseOnCircuit(dt) {
    if (!this.carGroup) return;

    // Stationary on starting grid until engine cranking & 3-2-1 countdown complete, then launch smoothly
    let goalSpeed = this.targetCruiseSpeed;
    let accelRate = 1.4;
    if (this.mode === 'idle_grid' || this.mode === 'cranking' || this.mode === 'countdown') {
      goalSpeed = 0.0;
      accelRate = 10.0;
    } else if (this.mode === 'inspect_front' || this.mode === 'inspect_wheel') {
      goalSpeed = 48.0;
    } else if (this.mode === 'entering_cockpit' || this.mode === 'entering_exploded') {
      goalSpeed = 68.0;
    } else if (this.mode === 'cruise' && this.launchElapsed < 2.5) {
      this.launchElapsed += dt;
      accelRate = 2.6;
    }
    this.currentSpeed += (goalSpeed - this.currentSpeed) * Math.min(1.0, dt * accelRate);
    if (goalSpeed === 0 && this.currentSpeed < 0.05) this.currentSpeed = 0.0;

    const ds = this.currentSpeed * dt;
    this.distanceAlongTrack = (this.distanceAlongTrack + ds) % this.trackLength;

    const u = this.distanceAlongTrack / this.trackLength;
    const uAhead = ((this.distanceAlongTrack + 36.0) % this.trackLength) / this.trackLength;

    this.trackCurve.getPointAt(u, this._posOnSpline);
    this.trackCurve.getTangentAt(u, this._tanOnSpline).normalize();
    this.trackCurve.getTangentAt(uAhead, this._tanNext).normalize();

    // Raycast road height smoothly below car (clamped near smooth spline Y to prevent spikes)
    const rawRayY = this.sampleGroundY(this._posOnSpline.x, this._posOnSpline.y, this._posOnSpline.z);
    const clampedRayY = THREE.MathUtils.clamp(rawRayY, this._posOnSpline.y - 0.35, this._posOnSpline.y + 0.35);
    this.lastSmoothedGroundY += (clampedRayY - this.lastSmoothedGroundY) * Math.min(1.0, dt * 4.5);

    this._probeFront.copy(this._posOnSpline).addScaledVector(this._tanOnSpline, 3.6);
    this._probeRear.copy(this._posOnSpline).addScaledVector(this._tanOnSpline, -3.6);
    const frontRoadY = this.sampleGroundY(this._probeFront.x, this._posOnSpline.y, this._probeFront.z);
    const rearRoadY = this.sampleGroundY(this._probeRear.x, this._posOnSpline.y, this._probeRear.z);
    const rawSlopePitch = THREE.MathUtils.clamp(Math.atan2(frontRoadY - rearRoadY, 7.2), -0.14, 0.14);
    this._smoothedSlopePitch = (this._smoothedSlopePitch ?? rawSlopePitch);
    this._smoothedSlopePitch += (rawSlopePitch - this._smoothedSlopePitch) * Math.min(1.0, dt * 4.5);
    const slopePitch = this._smoothedSlopePitch;

    // Subtle lateral cornering roll derived from cross-product of tangent change
    const cornerTurn = this._tanOnSpline.x * this._tanNext.z - this._tanOnSpline.z * this._tanNext.x;
    const speedFactor = Math.min(1.0, this.currentSpeed / Math.max(1, this.targetCruiseSpeed));
    const targetRoll = THREE.MathUtils.clamp(cornerTurn * 0.42 * speedFactor, -0.045, 0.045);

    const t = performance.now() * 0.001;
    const tarmacRipple = 0.0;

    this.carGroup.position.set(
      this._posOnSpline.x,
      this.lastSmoothedGroundY + tarmacRipple,
      this._posOnSpline.z
    );

    // Align +Z axis of GT40 model cleanly tangent along circuit
    const flatForward = new THREE.Vector3(this._tanOnSpline.x, 0, this._tanOnSpline.z).normalize();
    const rightAxis = new THREE.Vector3().crossVectors(this._upVec, flatForward).normalize();
    const upNorm = new THREE.Vector3().crossVectors(flatForward, rightAxis).normalize();
    this._lookMat.makeBasis(rightAxis, upNorm, flatForward);
    this._targetQuat.setFromRotationMatrix(this._lookMat);
    this.carGroup.quaternion.slerp(this._targetQuat, Math.min(1.0, dt * 12.0));

    // Engine starter crank vibration, V8 idle lope & launch torque squat
    let engineHeave = 0;
    let engineRoll = 0;
    let squatPitch = 0;
    if (this.mode === 'cranking') {
      engineHeave = Math.sin(t * 38) * 0.0055;
      engineRoll = Math.sin(t * 44) * 0.011;
    } else if (this.engineRunning) {
      const idleAmt = Math.max(0, 1.0 - speedFactor * 3.0);
      engineHeave = Math.sin(t * 28) * 0.0018 * idleAmt;
      engineRoll = Math.cos(t * 19) * 0.003 * idleAmt;
      if (this.mode === 'cruise' && this.launchElapsed < 1.6) {
        squatPitch = -0.024 * Math.sin((this.launchElapsed / 1.6) * Math.PI);
      }
    }

    this.chassisGroup.position.y = this.carFloorOffset + engineHeave;
    this.chassisGroup.rotation.x += (this.tirePitch - slopePitch + squatPitch - this.chassisGroup.rotation.x) * Math.min(1.0, dt * 10.0);
    this.chassisGroup.rotation.z += (targetRoll + engineRoll - this.chassisGroup.rotation.z) * Math.min(1.0, dt * 8.0);

    // Synchronous physically accurate rotation of all 4 Goodyear tires + Halibrand rims
    const dTheta = ds / Math.max(0.25, this.wheelRadius * this.carScale);
    Object.values(this.wheelPivots).forEach(({ pivot }) => {
      pivot.rotation.x += dTheta;
    });

    // Animate exterior Bruce McLaren driver inside RHD cockpit
    if (this.exteriorDriver) {
      this.exteriorDriver.update(t, {
        rpm: this.mode === 'cranking' ? 420 : this.engineRunning ? 1400 + speedFactor * 5200 : 0,
        speed: this.currentSpeed,
        steerInput: cornerTurn * 1.8,
        highlighted: this.hoveredZone === 'bruce_mclaren_driver'
      });
      if (this.exteriorSteeringWheel && this.exteriorDriver.wheelHandsPivot) {
        this.exteriorSteeringWheel.rotation.z = this.exteriorDriver.wheelHandsPivot.rotation.z;
      }
    }

    this.updateExhaustEffects(dt);
    this.updateRunningEngineAudio();

    // Dynamic FOV speed flare
    const targetFov = this.baseFov + speedFactor * 5.2;
    this.currentFov += (targetFov - this.currentFov) * Math.min(1.0, dt * 3.5);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.04) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    // Keep shadow-casting directional sun centered on moving GT40
    if (this.sunLight) {
      this.sunLight.position.set(
        this.carGroup.position.x + 38,
        this.carGroup.position.y + 56,
        this.carGroup.position.z - 28
      );
      this.sunLight.target.position.copy(this.carGroup.position);
      this.sunLight.target.updateMatrixWorld();
    }

    // Update speed / Le Mans sector HUD every ~120ms
    const now = performance.now();
    if (now - this._lastHudTime > 120) {
      this._lastHudTime = now;
      if (this.speedValEl) {
        const kmh = this.currentSpeed < 0.2 ? 0 : Math.round((this.currentSpeed / this.carScale) * 3.85);
        this.speedValEl.textContent = `${kmh}`;
      }
      if (this.sectorValEl) {
        this.sectorValEl.textContent =
          this.mode === 'idle_grid' || this.mode === 'cranking' || this.mode === 'countdown'
            ? 'STARTING GRID // ENGINE ' + (this.engineRunning ? 'IDLE' : 'OFF')
            : this.getCircuitSectorName(u);
      }
    }
  }

  getCircuitSectorName(u) {
    if (u < 0.06 || u > 0.94) return 'PIT STRAIGHT & START';
    if (u < 0.14) return 'DUNLOP BRIDGE & ESSES';
    if (u < 0.22) return 'TERTRE ROUGE';
    if (u < 0.56) return 'MULSANNE STRAIGHT';
    if (u < 0.68) return 'MULSANNE & INDIANAPOLIS';
    if (u < 0.78) return 'ARNAGE CORNER';
    return 'PORSCHE CURVES & FORD CHICANE';
  }

  updateProjectedOverlay(list, domNodes, isHotspots) {
    if (!this.isReady) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;

    this.camera.getWorldDirection(this._camForward);

    list.forEach((entry, idx) => {
      const def = isHotspots ? entry : entry.item;
      const el = isHotspots ? this.hotspotNodes.get(def.key) : entry.el;
      const anchor = isHotspots ? def.anchor : this.chassisGroup;
      if (!el || !anchor) return;

      anchor.updateMatrixWorld(true);
      const localPt = isHotspots ? def.localOffset : def.localPos;
      this._projVec.copy(localPt).applyMatrix4(anchor.matrixWorld);

      this._camDir.subVectors(this._projVec, this.camera.position);
      if (this._camDir.dot(this._camForward) <= 0.15) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      this._projVec.project(this.camera);
      const sx = (this._projVec.x * 0.5 + 0.5) * w;
      const sy = (-this._projVec.y * 0.5 + 0.5) * h;

      if (sx < 18 || sx > w - 18 || sy < 48 || sy > h - 18) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
    });
  }

  updateHotspotPositions() {
    if (this.mode === 'cruise' && this.hotspotsLayer?.classList.contains('visible')) {
      this.updateProjectedOverlay(this.hotspotDefs, this.hotspotNodes, true);
    }
    if ((this.mode === 'inspect_front' || this.mode === 'inspect_wheel') && this.calloutNodes.length > 0) {
      this.updateProjectedOverlay(this.calloutNodes, null, false);
    }
    if (this.mode === 'door_open_choice' && this.isReady && this.chassisGroup) {
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (w && h) {
        this.chassisGroup.updateMatrixWorld(true);
        const projectChoice = (btn, lx, ly, lz) => {
          if (!btn) return;
          this._projVec.set(lx, ly, lz).applyMatrix4(this.chassisGroup.matrixWorld).project(this.camera);
          const sx = (this._projVec.x * 0.5 + 0.5) * w;
          const sy = (-this._projVec.y * 0.5 + 0.5) * h;
          btn.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
        };
        projectChoice(this.doorChoiceBruceBtn, -0.28, 0.50, 0.02);
        projectChoice(this.doorChoiceWheelBtn, -0.28, 0.23, 0.46);
      }
    }
  }

  animate = () => {
    if (!this.isActive) {
      this._rafRunning = false;
      return;
    }
    this._rafRunning = true;
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    // Engine start click-and-hold timing
    if (this.isHoldingStart && this.mode === 'cranking') {
      const heldMs = now - this._holdStartTimestamp;
      this.startHoldProgress = Math.min(1.0, heldMs / this.startHoldDurationMs);
      this.updateStartProgressUI(this.startHoldProgress);
      if (this.startHoldProgress >= 1.0) {
        this.completeEngineIgnition();
      }
    }

    // Camera orbit stays freely where the user placed it (no auto-snap back while moving)
    // Reset only happens explicitly on CAM preset click or component interaction.

    if (this.isReady && this.carGroup) {
      // 1. Keep car posed (stationary on start grid or continuously driving along Circuit de la Sarthe)
      this.updateCarPoseOnCircuit(dt);

      // 2. Smooth Hinged Component Angles
      const easeRate = Math.min(1.0, dt * 6.5);
      ['driverDoor', 'passengerDoor', 'frontBonnet', 'rearCover'].forEach((k) => {
        const p = this.panels[k];
        if (!p || !p.pivot) return;
        p.current += (p.target - p.current) * easeRate;
        if (Math.abs(p.target - p.current) < 0.001) p.current = p.target;

        if (k === 'driverDoor' || k === 'passengerDoor') {
          p.pivot.rotation.y = p.current;
        } else {
          p.pivot.rotation.x = p.current;
        }
      });

      if (this.cockpitRevealLight) {
        this.cockpitRevealLight.intensity = Math.min(1, Math.abs(this.panels.driverDoor.current) / 0.8) * 3.0;
      }
      if (this.bonnetRevealLight) {
        this.bonnetRevealLight.intensity = Math.min(1, Math.abs(this.panels.frontBonnet.current) / 0.35) * 3.4;
      }
      if (this.engineBayLight) {
        this.engineBayLight.intensity = Math.min(1, Math.abs(this.panels.rearCover.current) / 0.55) * 4.2;
      }

      // 3. Camera Framing (Close Front 3/4 Tracking vs Transition Glide vs Inspection Orbit)
      if (this.camTrans.active) {
        const p = Math.min(1.0, (now - this.camTrans.start) / this.camTrans.duration);
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        this.camLocalPos.lerpVectors(this.camTrans.startPos, this.camTrans.endPos, ease);
        this.camLocalLook.lerpVectors(this.camTrans.startLook, this.camTrans.endLook, ease);

        if (p >= 1.0) {
          this.camTrans.active = false;
          const cb = this.camTrans.onComplete;
          this.camTrans.onComplete = null;
          if (typeof cb === 'function') cb();
        }
      } else if (this.mode === 'idle_grid' || this.mode === 'cranking' || this.mode === 'countdown' || this.mode === 'cruise') {
        const cfg = this.getCruiseCameraLocal();
        const followRate = this.userOrbit.dragging ? 12.0 : 6.2;
        this.camLocalPos.lerp(cfg.pos, Math.min(1.0, dt * followRate));
        this.camLocalLook.lerp(cfg.look, Math.min(1.0, dt * followRate));
      } else if (this.mode === 'inspect_front') {
        const basePos = new THREE.Vector3(-2.05, 1.48, 1.85);
        const look = new THREE.Vector3(0.0, 0.16, 1.32);
        const offset = basePos.sub(look).applyAxisAngle(this._upVec, this.userOrbit.yaw);
        offset.y = THREE.MathUtils.clamp(offset.y + this.userOrbit.pitch * 1.4, 0.45, 2.2);
        this.camLocalPos.lerp(look.clone().add(offset), Math.min(1.0, dt * 7.0));
        this.camLocalLook.lerp(look, Math.min(1.0, dt * 7.0));
      } else if (this.mode === 'inspect_wheel') {
        const basePos = new THREE.Vector3(-1.92, 0.48, 1.72);
        const look = new THREE.Vector3(-0.68, 0.22, 1.23);
        const offset = basePos.sub(look).applyAxisAngle(this._upVec, this.userOrbit.yaw * 0.8);
        offset.y = THREE.MathUtils.clamp(offset.y + this.userOrbit.pitch * 0.8, 0.12, 1.15);
        this.camLocalPos.lerp(look.clone().add(offset), Math.min(1.0, dt * 7.0));
        this.camLocalLook.lerp(look, Math.min(1.0, dt * 7.0));
      }

      this.applyCarLocalCamera();
      this.updateHotspotPositions();
      this.renderSpeedStreaks(dt);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
