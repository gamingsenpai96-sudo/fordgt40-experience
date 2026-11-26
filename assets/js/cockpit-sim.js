/* =================================================================
   Ford GT40 Mk II (Chassis P/1046) — Ultra-Detailed 1st-Person Cockpit Simulator
   =================================================================
   - True 1st-person driver eye position inside authentic 1966 RHD GT40 Mk II
   - Stewart-Warner 8-gauge cluster with procedural canvas faces & animated needles
   - Tactile interactive 3D switchgear: Starter button, toggle switches, gated shifter
   - Interactive Web Audio engine acoustic synthesis (starter crank, idle, rev roar, shifter clack)
   - Moto-Lita 15" competition steering wheel with 18 countersunk rim rivets
   - Sill-mounted 4-speed Kar-Kraft T-44 gated shifter with physical H-pattern movement
   - Drilled aluminum pedals, Willans 4-point harness, and tubular roll cage
   - Rotating side window Plexiglas air scoops, Ken Miles lap clipboard, wiper assembly
   - Rear bulkhead glass window looking directly into 7.0L FE V8 velocity stacks
   - 1966 Circuit de la Sarthe exterior with mechanics, pit wall, grandstands & Dunlop bridge
   ================================================================= */

import * as THREE from 'three';
import { createGLTFLoader } from './gltf-shared.js';
import { buildBruceMcLarenDriver, loadBruceMcLarenDriverGLB } from './gt40-driver.js';
import { prepareLeMansTrackClone } from './gt40-journey.js';

export class GT40CockpitSimulator {
  constructor() {
    this.canvas = document.getElementById('cockpit-canvas');
    if (!this.canvas) return;

    this.container = document.getElementById('cockpit-sim-container');
    this.lookIndicator = document.getElementById('cockpit-look-indicator');
    this.dragHint = document.getElementById('cockpit-drag-hint');
    this.btnReset = document.getElementById('cockpit-reset-btn');
    this.presetBtns = document.querySelectorAll('.cockpit-preset-btn');
    this.loader = document.getElementById('cockpit-loader');
    this.loaderFill = document.getElementById('cockpit-loader-fill');
    this.loaderSub = document.getElementById('cockpit-loader-sub');

    // Interactive Action Controls in HUD
    this.btnStart = document.getElementById('cockpit-start-btn');
    this.btnAccel = document.getElementById('cockpit-accel-btn');
    this.btnShift = document.getElementById('cockpit-shift-btn');
    this.btnLights = document.getElementById('cockpit-lights-btn');
    this.btnWipers = document.getElementById('cockpit-wipers-btn');

    // Telemetry DOM readouts
    this.telemetryRPM = document.getElementById('cockpit-rpm-val');
    this.telemetrySpeed = document.getElementById('cockpit-speed-val');
    this.telemetryGear = document.getElementById('cockpit-gear-val');
    this.telemetryStatus = document.getElementById('cockpit-engine-status');

    // Stationary driver eye position inside Ford GT40 Mk II (Right-Hand Drive)
    // Positioned back in the driver's seat pocket so windshield, A-pillars,
    // full Stewart-Warner cluster, Moto-Lita wheel, gated shifter & Telemetry Screen frame naturally.
    this.eyePosition = new THREE.Vector3(-0.23, 0.535, 0.16);
    this.lookTarget = new THREE.Vector3();

    // Look-around rotation angles (radians)
    // Forward is +Z direction (yaw = 0); default -0.08 pitch centers windshield, dash & rim
    this.currentYaw = 0;
    this.targetYaw = 0;
    this.currentPitch = -0.08;
    this.targetPitch = -0.08;

    // Rotational boundaries - allow full cabin inspection (windshield, side windows, passenger seat, V8 glass)
    this.yawMin = -3.14;   // -180 deg
    this.yawMax = 3.14;    // +180 deg
    this.pitchMin = -1.16; // -66 deg (pedals & gated shifter without dash mesh clip)
    this.pitchMax = 0.72;  // +41 deg (roof header & Gurney bubble without roof clip)

    // Interaction state
    this.isDragging = false;
    this.dragPointerId = null;
    this.pointerDownX = 0;
    this.pointerDownY = 0;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.hasInteracted = false;
    this.isInitialized = false;
    this.isVisible = false;
    this._loadPromise = null;
    this.animationFrameId = null;

    // Integrated In-Car Telemetry Screen, Interactive Driver & Drive Takeover State
    this.baseEyePosition = this.eyePosition.clone();
    this.targetEyePosition = this.eyePosition.clone();
    this.baseFov = 64;
    this.targetFov = 64;
    this.screenZoomActive = false;
    this.screenTakeoverTriggered = false;
    this.screenTakeoverTimer = null;
    this.driver = null;
    this.wheelGroup = null;
    this.driverHovered = false;
    this.driverMeetTriggered = false;
    this.driverMeetTimer = null;
    this.meetDriverBanner = document.getElementById('cockpit-meet-driver-banner');
    this.driverBadgeBtn = document.getElementById('cockpit-driver-badge');
    this.screenGroup = null;
    this.screenMesh = null;
    this.screenFrameMat = null;
    this.screenCanvas = null;
    this.screenCtx = null;
    this.screenTex = null;
    this.screenLastDraw = 0;
    this.screenHovered = false;
    this.takeoverBanner = document.getElementById('cockpit-takeover-banner');

    // Physical Engine Simulation State
    this.engineRunning = false;
    this.isCranking = false;
    this.currentRPM = 0;
    this.targetRPM = 0;
    this.currentSpeed = 0;
    this.currentGear = 'N'; // N, 1, 2, 3, 4
    this.gearIndex = 0; // 0=N, 1=1st, 2=2nd, 3=3rd, 4=4th
    this.isAccelerating = false;
    this.headlightsOn = false;
    this.wipersOn = false;
    this.fuelPumpOn = true;
    this.ignitionOn = true;
    this.ventOpen = false;

    // 3D Animated Components Registry
    this.needles = {};
    this.interactiveObjects = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Authentic Recorded Audio Engine (Same as Game Simulator)
    this.audioCtx = null;
    this.audioBuffers = {
      startup: null,
      idle: null,
      downshift: null,
      accel: null
    };
    this.idleSource = null;
    this.idleGain = null;
    this.accelSource = null;
    this.accelGain = null;
    this.masterGain = null;

    this.bindEvents();
    this.setupIntersectionObserver();
  }

  ensureLoaded() {
    if (this._loadPromise) return this._loadPromise;
    this.initThree();
    this.onResize();
    this._loadPromise = this.loadModel();
    return this._loadPromise;
  }

  pause() {
    this.isVisible = false;
    this.isDragging = false;
    this.dragPointerId = null;
    if (this.screenTakeoverTimer) {
      clearTimeout(this.screenTakeoverTimer);
      this.screenTakeoverTimer = null;
    }
    if (this.driverMeetTimer) {
      clearTimeout(this.driverMeetTimer);
      this.driverMeetTimer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stopEngineAudioLoop();
  }

  resume() {
    this.isVisible = true;
    this.resetView();
    return this.ensureLoaded().then(() => {
      this.onResize();
      this.render();
      this.startLoop();
    });
  }

  resetView() {
    if (this.screenTakeoverTimer) {
      clearTimeout(this.screenTakeoverTimer);
      this.screenTakeoverTimer = null;
    }
    if (this.driverMeetTimer) {
      clearTimeout(this.driverMeetTimer);
      this.driverMeetTimer = null;
    }
    this.screenZoomActive = false;
    this.screenTakeoverTriggered = false;
    this.screenHovered = false;
    this.driverHovered = false;
    this.driverMeetTriggered = false;
    this.isDragging = false;
    this.dragPointerId = null;
    if (this.driver) this.driver.setHighlighted(false);

    this.targetEyePosition.copy(this.baseEyePosition);
    this.eyePosition.copy(this.baseEyePosition);
    this.targetFov = this.baseFov;
    this.targetYaw = 0;
    this.targetPitch = -0.08;
    this.currentYaw = 0;
    this.currentPitch = -0.08;
    if (this.camera) {
      this.camera.fov = this.baseFov;
      this.camera.updateProjectionMatrix();
    }
    if (this.screenFrameMat) {
      this.screenFrameMat.emissive.setHex(0xf0cc52);
      this.screenFrameMat.emissiveIntensity = 0.12;
    }
    if (!this.takeoverBanner) {
      this.takeoverBanner = document.getElementById('cockpit-takeover-banner');
    }
    if (this.takeoverBanner) {
      this.takeoverBanner.classList.remove('active');
    }
    if (!this.meetDriverBanner) {
      this.meetDriverBanner = document.getElementById('cockpit-meet-driver-banner');
    }
    if (this.meetDriverBanner) {
      this.meetDriverBanner.classList.remove('active');
    }
    if (this.driverBadgeBtn) {
      this.driverBadgeBtn.classList.remove('highlighted');
    }
    this.drawDriveScreenTexture(performance.now());
  }

  setupIntersectionObserver() {
    if (!this.container || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const wasVisible = this.isVisible;
        this.isVisible = entry.isIntersecting;
        if (this.isVisible) {
          this.ensureLoaded().then(() => {
            if (!wasVisible) {
              this.onResize();
              this.render();
              this.startLoop();
            }
          });
        } else if (wasVisible) {
          this.pause();
        }
      });
    }, { threshold: 0.01, rootMargin: '200px' });
    obs.observe(this.container);
  }

  // =================================================================
  //  Authentic GT40 Engine Audio (Startup, Idle, Downshift & Accel)
  // =================================================================

  initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      this.audioCtx = new AudioCtxClass();

      // Master Cockpit Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Dedicated Gain for Idle Loop
      this.idleGain = this.audioCtx.createGain();
      this.idleGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.idleGain.connect(this.masterGain);

      // Dedicated Gain for Full-Throttle Acceleration Sound
      this.accelGain = this.audioCtx.createGain();
      this.accelGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.accelGain.connect(this.masterGain);

      this.loadAudioFiles();
    } catch (e) {
      console.warn('Web Audio initialization fallback:', e);
    }
  }

  async loadAudioFiles() {
    if (!this.audioCtx) return;
    const loadBuf = async (url) => {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        return await this.audioCtx.decodeAudioData(arr);
      } catch (e) {
        console.warn('Audio decode error for', url, e);
        return null;
      }
    };

    const [startup, idle, downshift, accel] = await Promise.all([
      loadBuf('assets/audio/gt40-startup.mp3'),
      loadBuf('assets/audio/gt40-idle.mp3'),
      loadBuf('assets/audio/gt40-downshift.mp3'),
      loadBuf('assets/audio/gt40-accel.mp3')
    ]);

    this.audioBuffers.startup = startup;
    this.audioBuffers.idle = idle;
    this.audioBuffers.downshift = downshift;
    this.audioBuffers.accel = accel;
  }

  playClickSound() {
    if (!this.audioCtx) this.initAudio();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  playGearClackSound() {
    if (!this.audioCtx) this.initAudio();
    if (!this.audioCtx) return;

    // Use authentic downshift audio (blip & mechanical clack from game section)
    if (this.audioBuffers.downshift) {
      try {
        const src = this.audioCtx.createBufferSource();
        src.buffer = this.audioBuffers.downshift;
        const g = this.audioCtx.createGain();
        g.gain.setValueAtTime(0.85, this.audioCtx.currentTime);
        src.connect(g);
        g.connect(this.masterGain);
        src.start();
        return;
      } catch (e) {}
    }

    try {
      const t = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(680, t);
      osc1.frequency.exponentialRampToValueAtTime(120, t + 0.07);
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc1.connect(gain);
      gain.connect(this.masterGain);
      osc1.start(t);
      osc1.stop(t + 0.08);
    } catch (e) {}
  }

  startEngineAudioLoop() {
    if (!this.audioCtx) this.initAudio();
    if (!this.audioCtx) return;

    if (this.audioBuffers.idle && !this.idleSource) {
      try {
        this.idleSource = this.audioCtx.createBufferSource();
        this.idleSource.buffer = this.audioBuffers.idle;
        this.idleSource.loop = true;
        this.idleSource.connect(this.idleGain);
        this.idleSource.start();
        this.idleGain.gain.setTargetAtTime(0.85, this.audioCtx.currentTime, 0.15);
      } catch (e) {}
    }
  }

  stopEngineAudioLoop() {
    if (this.idleGain && this.audioCtx) {
      this.idleGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.08);
    }
    if (this.accelGain && this.audioCtx) {
      this.accelGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.08);
    }
    setTimeout(() => {
      if (this.idleSource) {
        try { this.idleSource.stop(); this.idleSource.disconnect(); } catch (e) {}
        this.idleSource = null;
      }
      if (this.accelSource) {
        try { this.accelSource.stop(); this.accelSource.disconnect(); } catch (e) {}
        this.accelSource = null;
      }
    }, 150);
  }

  updateEngineAudio() {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    if (this.isAccelerating) {
      // Throttle is active: bring down idle and bring up authentic accel roar
      if (this.idleGain) this.idleGain.gain.setTargetAtTime(0.15, now, 0.1);

      if (!this.accelSource && this.audioBuffers.accel) {
        try {
          this.accelSource = this.audioCtx.createBufferSource();
          this.accelSource.buffer = this.audioBuffers.accel;
          this.accelSource.loop = true;
          this.accelSource.connect(this.accelGain);
          this.accelSource.start();
        } catch (e) {}
      }

      if (this.accelGain) {
        this.accelGain.gain.setTargetAtTime(0.90, now, 0.1);
      }
      if (this.accelSource) {
        const rate = Math.max(0.75, Math.min(1.45, 0.82 + (this.currentRPM / 6200) * 0.42));
        this.accelSource.playbackRate.setTargetAtTime(rate, now, 0.08);
      }
    } else {
      // Throttle released: restore pure GT40 big-block idle rumble
      if (this.accelGain) this.accelGain.gain.setTargetAtTime(0.0, now, 0.15);
      if (this.idleGain) this.idleGain.gain.setTargetAtTime(0.85, now, 0.15);
    }
  }

  // =================================================================
  //  Three.js Scene, Camera, Lighting & Track Setup
  // =================================================================

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7389a3); // Authentic overcast 1966 Le Mans sky
    this.scene.fog = new THREE.FogExp2(0x7389a3, 0.0035);

    // 2. Camera: Wide immersive cockpit perspective with near clipping set to 4cm
    const width = this.canvas.clientWidth || (this.container ? this.container.clientWidth : 0) || window.innerWidth || 1440;
    const height = this.canvas.clientHeight || (this.container ? this.container.clientHeight : 0) || 680;
    this.camera = new THREE.PerspectiveCamera(64, width / height, 0.04, 350);
    this.camera.position.copy(this.eyePosition);

    // 3. Renderer with HDR ACES Filmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Exterior Paddock & Circuit Environment Map
    this.setupEnvironment();

    // 5. Authentic Cockpit Interior & Track Lighting
    this.setupLighting();

    // 6. Photorealistic 1966 Le Mans Circuit de la Sarthe Pit Straight Exterior
    this.setupTrackEnvironment();

    // 7. Viewport Visibility Observer (Resource Optimization)
    this.setupVisibilityObserver();
  }

  setupVisibilityObserver() {
    this.isVisible = true;
    const target = this.container || this.canvas;
    if (!target || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        this.isVisible = entry.isIntersecting;
        if (this.isVisible && !this.animationFrameId) {
          this.startLoop();
        }
      });
    }, { threshold: 0.05 });

    observer.observe(target);
  }

  setupEnvironment() {
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      pmrem.compileEquirectangularShader();

      const envScene = new THREE.Scene();
      envScene.background = new THREE.Color(0x6b8098);

      // Overcast Le Mans sky dome
      const skyGeo = new THREE.SphereGeometry(180, 24, 16);
      const skyMat = new THREE.MeshBasicMaterial({
        color: 0x7389a3,
        side: THREE.BackSide
      });
      envScene.add(new THREE.Mesh(skyGeo, skyMat));

      // Ground plane in env
      const groundMat = new THREE.MeshBasicMaterial({ color: 0x1a1e24 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -2;
      envScene.add(ground);

      // Soft natural daylight warmth in horizon
      const sunWarm = new THREE.Mesh(
        new THREE.SphereGeometry(25, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff0dd })
      );
      sunWarm.position.set(45, 60, 35);
      envScene.add(sunWarm);

      this.scene.environment = pmrem.fromScene(envScene).texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('Cockpit environment fallback:', e);
    }
  }

  setupLighting() {
    // 1. Natural daylight overcast ambient base (balanced so driver suit never blows out)
    const ambient = new THREE.AmbientLight(0xffffff, 0.44);
    this.scene.add(ambient);

    // 2. Realistic sky/ground hemisphere light (cool sky, dark tarmac bounce)
    const hemiLight = new THREE.HemisphereLight(0xdde8f5, 0x181a20, 0.50);
    this.scene.add(hemiLight);

    // 3. Primary Key Sunlight through Windscreen and Side Windows
    const keyLight = new THREE.DirectionalLight(0xfff8ea, 1.35);
    keyLight.position.set(6.5, 12.0, 7.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 40;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0002;
    this.scene.add(keyLight);

    // 4. Dedicated Interior Gauge & Dashboard Inspection Warm Light
    const dashWarmLight = new THREE.PointLight(0xffeedb, 0.85, 1.6);
    dashWarmLight.position.set(0.28, 0.32, 0.45);
    this.scene.add(dashWarmLight);

    // 5. Soft cabin bounce (kept subtle so driver's cream Nomex suit retains rich fabric shading)
    const cabinLight = new THREE.PointLight(0xbad4ea, 0.20, 2.0);
    cabinLight.position.set(-0.20, 0.40, 0.12);
    this.scene.add(cabinLight);

    // 6. Rear engine bulkhead soft warm glow
    const engineBayGlow = new THREE.PointLight(0xff9933, 1.45, 2.8);
    engineBayGlow.position.set(0.0, 0.42, -0.65);
    this.scene.add(engineBayGlow);

    // 7. Headlight Beams (Visible when Headlights are switched ON)
    this.headlightSpotL = new THREE.SpotLight(0xfffae0, 0, 120, Math.PI / 6, 0.45, 1.2);
    this.headlightSpotL.position.set(0.65, 0.25, 2.1);
    this.headlightSpotL.target.position.set(0.65, -0.2, 45);
    this.scene.add(this.headlightSpotL);
    this.scene.add(this.headlightSpotL.target);

    this.headlightSpotR = new THREE.SpotLight(0xfffae0, 0, 120, Math.PI / 6, 0.45, 1.2);
    this.headlightSpotR.position.set(-0.65, 0.25, 2.1);
    this.headlightSpotR.target.position.set(-0.65, -0.2, 45);
    this.scene.add(this.headlightSpotR);
    this.scene.add(this.headlightSpotR.target);
  }

  setupTrackEnvironment() {
    const trackGroup = new THREE.Group();
    trackGroup.name = 'LeMansPitStraightTrack';

    const texLoader = new THREE.TextureLoader();
    const asphaltTex = texLoader.load('assets/models/car/textures_web/floor_asphalt.png');
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.repeat.set(16, 64);

    // 1. Pit Straight Asphalt Surface
    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.90,
      metalness: 0.08,
      color: 0x242830
    });
    const roadGeo = new THREE.PlaneGeometry(36, 320);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(-4.0, -0.375, 40);
    road.receiveShadow = true;
    trackGroup.add(road);

    // 2. Rubbered-in Racing Line
    const grooveMat = new THREE.MeshBasicMaterial({
      color: 0x111317,
      transparent: true,
      opacity: 0.45
    });
    const groove = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 320), grooveMat);
    groove.rotation.x = -Math.PI / 2;
    groove.position.set(0.28, -0.373, 40);
    trackGroup.add(groove);

    // 3. Starting Grid Slot #2 & Checkered Start/Finish Line
    const sfCanvas = document.createElement('canvas');
    sfCanvas.width = 512;
    sfCanvas.height = 128;
    const sfCtx = sfCanvas.getContext('2d');
    const sq = 32;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 16; c++) {
        sfCtx.fillStyle = (r + c) % 2 === 0 ? '#e5e7eb' : '#111827';
        sfCtx.fillRect(c * sq, r * sq, sq, sq);
      }
    }
    const sfTex = new THREE.CanvasTexture(sfCanvas);
    sfTex.colorSpace = THREE.SRGBColorSpace;
    sfTex.wrapS = THREE.RepeatWrapping;
    sfTex.repeat.set(3, 1);
    const sfLine = new THREE.Mesh(
      new THREE.PlaneGeometry(16.0, 1.1),
      new THREE.MeshStandardMaterial({ map: sfTex, roughness: 0.85, metalness: 0.05 })
    );
    sfLine.rotation.x = -Math.PI / 2;
    sfLine.position.set(-5.4, -0.371, 6.2);
    sfLine.receiveShadow = true;
    trackGroup.add(sfLine);

    const gridMat = new THREE.MeshBasicMaterial({ color: 0xdedede });
    const frontLine = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.22), gridMat);
    frontLine.rotation.x = -Math.PI / 2;
    frontLine.position.set(0.28, -0.372, 2.8);
    trackGroup.add(frontLine);

    const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 5.5), gridMat);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(-1.32, -0.372, 0.05);
    trackGroup.add(leftLine);

    const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 5.5), gridMat);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(1.88, -0.372, 0.05);
    trackGroup.add(rightLine);

    // Painted Le Mans Red/White Trackside Curbs (Kerbs)
    const kerbCanvas = document.createElement('canvas');
    kerbCanvas.width = 64;
    kerbCanvas.height = 512;
    const kCtx = kerbCanvas.getContext('2d');
    for (let i = 0; i < 8; i++) {
      kCtx.fillStyle = i % 2 === 0 ? '#b91c1c' : '#e2e8f0';
      kCtx.fillRect(0, i * 64, 64, 64);
    }
    const kerbTex = new THREE.CanvasTexture(kerbCanvas);
    kerbTex.colorSpace = THREE.SRGBColorSpace;
    kerbTex.wrapS = THREE.RepeatWrapping;
    kerbTex.wrapT = THREE.RepeatWrapping;
    kerbTex.repeat.set(1, 45);
    const kerbMat = new THREE.MeshStandardMaterial({ map: kerbTex, roughness: 0.85, metalness: 0.05 });

    const leftKerb = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 220), kerbMat);
    leftKerb.position.set(-13.4, -0.355, 30);
    leftKerb.receiveShadow = true;
    trackGroup.add(leftKerb);

    const rightKerb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 220), kerbMat);
    rightKerb.position.set(2.55, -0.355, 30);
    rightKerb.receiveShadow = true;
    trackGroup.add(rightKerb);

    // Grid Slot numeral "2" on track
    const canvasSlot = document.createElement('canvas');
    canvasSlot.width = 256;
    canvasSlot.height = 256;
    const ctxSlot = canvasSlot.getContext('2d');
    ctxSlot.fillStyle = '#1e2229';
    ctxSlot.fillRect(0, 0, 256, 256);
    ctxSlot.font = 'bold 160px sans-serif';
    ctxSlot.fillStyle = '#ffffff';
    ctxSlot.textAlign = 'center';
    ctxSlot.textBaseline = 'middle';
    ctxSlot.fillText('2', 128, 128);
    const numTex = new THREE.CanvasTexture(canvasSlot);
    numTex.colorSpace = THREE.SRGBColorSpace;
    const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true, opacity: 0.85 });
    const numMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), numMat);
    numMesh.rotation.x = -Math.PI / 2;
    numMesh.position.set(0.28, -0.371, 3.8);
    trackGroup.add(numMesh);

    // 4. White Pit Boundary Line
    const pitLineMat = new THREE.MeshBasicMaterial({ color: 0xe5e7eb });
    const pitLine = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 320), pitLineMat);
    pitLine.rotation.x = -Math.PI / 2;
    pitLine.position.set(2.4, -0.372, 40);
    trackGroup.add(pitLine);

    // 5. 1966 Low Concrete Pit Wall (Driver's Right Side)
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      roughness: 0.94,
      metalness: 0.05
    });
    const pitWall = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 180), concreteMat);
    pitWall.position.set(3.4, 0.10, 30);
    pitWall.castShadow = true;
    pitWall.receiveShadow = true;
    trackGroup.add(pitWall);

    // Shelby American Pit Stall Board
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 512;
    boardCanvas.height = 256;
    const bCtx = boardCanvas.getContext('2d');
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 512, 256);
    bCtx.strokeStyle = '#d4af37';
    bCtx.lineWidth = 10;
    bCtx.strokeRect(8, 8, 496, 240);
    bCtx.font = 'bold 36px Oswald, sans-serif';
    bCtx.fillStyle = '#ffffff';
    bCtx.textAlign = 'center';
    bCtx.fillText('SHELBY AMERICAN INC.', 256, 55);
    bCtx.font = 'bold 64px Oswald, sans-serif';
    bCtx.fillStyle = '#d4af37';
    bCtx.fillText('#2 GT40 MK II', 256, 125);
    bCtx.font = '28px Space Mono, monospace';
    bCtx.fillStyle = '#94a3b8';
    bCtx.fillText('B. McLAREN / C. AMON', 256, 175);
    bCtx.font = 'bold 22px Space Mono, monospace';
    bCtx.fillStyle = '#ef4444';
    bCtx.fillText('CHASSIS P/1046 • 7.0L FE V8', 256, 215);

    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: boardTex }));
    boardMesh.position.set(3.08, 0.40, 2.2);
    boardMesh.rotation.y = -Math.PI / 2;
    trackGroup.add(boardMesh);

    // 6. Stack of Goodyear Tires by the Pit Wall (with painted sidewall stripes)
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.92 });
    const tireStripeMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.65 });
    for (let stackIdx = 0; stackIdx < 2; stackIdx++) {
      const zOff = stackIdx === 0 ? 0.5 : 8.5;
      for (let i = 0; i < 4; i++) {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 22), tireMat);
        tire.position.set(3.9, -0.23 + (i * 0.29), zOff);
        tire.castShadow = true;
        trackGroup.add(tire);
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.015, 6, 20), tireStripeMat);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(3.9, -0.09 + (i * 0.29), zOff);
        trackGroup.add(stripe);
      }
    }

    // 7. Trackside Double-Rail Armco Steel Guardrail, Posts & 1966 Banners (Driver's Left Side)
    const armcoMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.85, roughness: 0.35 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.75, roughness: 0.45 });
    const armcoUpper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 220), armcoMat);
    armcoUpper.position.set(-14.2, 0.22, 30);
    trackGroup.add(armcoUpper);
    const armcoLower = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 220), armcoMat);
    armcoLower.position.set(-14.2, -0.08, 30);
    trackGroup.add(armcoLower);
    for (let pz = -40; pz <= 130; pz += 5) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.12), postMat);
      post.position.set(-14.32, 0.0, pz);
      trackGroup.add(post);
    }

    // Historic Sponsor Banners
    const makeBanner = (brand, bgColor, textColor, zPos) => {
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 512;
      bCanvas.height = 128;
      const ctx = bCanvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 512, 128);
      ctx.font = 'bold 56px Oswald, sans-serif';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(brand, 256, 64);
      const tex = new THREE.CanvasTexture(bCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6.0, 1.5),
        new THREE.MeshBasicMaterial({ map: tex })
      );
      mesh.position.set(-14.1, 0.95, zPos);
      mesh.rotation.y = Math.PI / 2;
      trackGroup.add(mesh);
    };

    makeBanner('DUNLOP', '#facc15', '#0f172a', 15);
    makeBanner('TOTAL', '#dc2626', '#ffffff', 25);
    makeBanner('FERODO', '#7f1d1d', '#ffffff', 35);
    makeBanner('BP ENERGOL', '#15803d', '#facc15', 45);
    makeBanner('SEV MARCHAL', '#0f172a', '#38bdf8', 5);
    makeBanner('CHAMPION', '#ffffff', '#dc2626', -5);

    // 8. Covered Main Grandstand with Tiered Seating, Columns & Floodlight Towers
    const standMat = new THREE.MeshStandardMaterial({ color: 0x3f4c5e, roughness: 0.85 });
    const standStepMat = new THREE.MeshStandardMaterial({ color: 0x283241, roughness: 0.9 });
    const standRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.70 });

    const standBody = new THREE.Mesh(new THREE.BoxGeometry(8.0, 6.5, 140), standMat);
    standBody.position.set(-20.2, 2.9, 30);
    trackGroup.add(standBody);

    for (let tier = 0; tier < 4; tier++) {
      const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 138), standStepMat);
      tierMesh.position.set(-15.8 - tier * 1.1, 0.9 + tier * 0.85, 30);
      trackGroup.add(tierMesh);
    }
    for (let cz = -30; cz <= 90; cz += 15) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 6.4, 8), postMat);
      col.position.set(-14.8, 2.8, cz);
      trackGroup.add(col);
    }

    const standRoof = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.45, 142), standRoofMat);
    standRoof.position.set(-18.5, 6.3, 30);
    standRoof.rotation.z = -0.15;
    trackGroup.add(standRoof);

    // Trackside Night-Race Floodlight Towers
    const floodLampMat = new THREE.MeshBasicMaterial({ color: 0xfff3d1 });
    [-10, 28, 68].forEach((fz) => {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 12.5, 8), postMat);
      mast.position.set(-15.2, 5.8, fz);
      trackGroup.add(mast);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 1.4), postMat);
      head.position.set(-14.5, 12.1, fz);
      head.rotation.z = -0.35;
      trackGroup.add(head);
      const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), floodLampMat);
      lamp.position.set(-13.8, 11.85, fz);
      lamp.rotation.y = Math.PI / 2;
      lamp.rotation.x = 0.35;
      trackGroup.add(lamp);
    });

    // 9. Iconic Dunlop Tire Bridge with Tire Tread Texture & Sidewalk Railings
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(-4.0, 0.0, 115);
    const treadCanvas = document.createElement('canvas');
    treadCanvas.width = 256;
    treadCanvas.height = 256;
    const trCtx = treadCanvas.getContext('2d');
    trCtx.fillStyle = '#181c24';
    trCtx.fillRect(0, 0, 256, 256);
    trCtx.strokeStyle = '#2d3442';
    trCtx.lineWidth = 10;
    for (let y = 16; y < 256; y += 32) {
      trCtx.beginPath();
      trCtx.moveTo(0, y);
      trCtx.lineTo(128, y + 18);
      trCtx.lineTo(256, y);
      trCtx.stroke();
    }
    const treadTex = new THREE.CanvasTexture(treadCanvas);
    treadTex.wrapS = THREE.RepeatWrapping;
    treadTex.wrapT = THREE.RepeatWrapping;
    treadTex.repeat.set(12, 3);
    const bridgeArchMat = new THREE.MeshStandardMaterial({ map: treadTex, metalness: 0.25, roughness: 0.75 });
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 4.5, 36, 1, false, 0, Math.PI), bridgeArchMat);
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.set(0, 2.5, 0);
    bridgeGroup.add(arch);

    const dunlopCanvas = document.createElement('canvas');
    dunlopCanvas.width = 512;
    dunlopCanvas.height = 128;
    const dCtx = dunlopCanvas.getContext('2d');
    dCtx.fillStyle = '#0f172a';
    dCtx.fillRect(0, 0, 512, 128);
    dCtx.strokeStyle = '#facc15';
    dCtx.lineWidth = 6;
    dCtx.strokeRect(6, 6, 500, 116);
    dCtx.font = 'bold 72px Oswald, sans-serif';
    dCtx.fillStyle = '#facc15';
    dCtx.textAlign = 'center';
    dCtx.textBaseline = 'middle';
    dCtx.fillText('DUNLOP', 256, 64);
    const dunlopTex = new THREE.CanvasTexture(dunlopCanvas);
    dunlopTex.colorSpace = THREE.SRGBColorSpace;
    const dunlopBanner = new THREE.Mesh(new THREE.PlaneGeometry(16, 4.0), new THREE.MeshBasicMaterial({ map: dunlopTex }));
    dunlopBanner.position.set(0, 8.2, -0.5);
    bridgeGroup.add(dunlopBanner);
    trackGroup.add(bridgeGroup);

    // 10. Multi-layered Countryside Trees
    const treeMatA = new THREE.MeshStandardMaterial({ color: 0x1a3a21, roughness: 0.95 });
    const treeMatB = new THREE.MeshStandardMaterial({ color: 0x224829, roughness: 0.92 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.90 });

    for (let i = 0; i < 18; i++) {
      const z = -40 + (i * 18);
      const lx = -28 + (Math.sin(i) * 3);
      const treeL1 = new THREE.Mesh(new THREE.DodecahedronGeometry(3.2, 1), treeMatA);
      treeL1.position.set(lx, 5.2, z);
      const treeL2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.4, 1), treeMatB);
      treeL2.position.set(lx + 1.2, 6.8, z - 0.8);
      trackGroup.add(treeL1, treeL2);

      const trunkL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8), trunkMat);
      trunkL.position.set(lx, 1.2, z);
      trackGroup.add(trunkL);

      const rx = 16 + (Math.cos(i) * 3);
      const treeR = new THREE.Mesh(new THREE.DodecahedronGeometry(3.0, 1), treeMatA);
      treeR.position.set(rx, 4.8, z);
      const trunkR = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 3.0, 8), trunkMat);
      trunkR.position.set(rx, 1.1, z);
      trackGroup.add(treeR, trunkR);
    }

    this.scene.add(trackGroup);

    // Mount real 3D Circuit de la Sarthe (source/lemans.glb) scaled 1:1 with the cockpit car
    // and aligned directly to the Mulsanne Straight tarmac
    const mountRealMulsanneTrack = (gltf) => {
      if (!gltf?.scene || !this.scene) return;
      const trackClone = prepareLeMansTrackClone(gltf.scene);
      const p0x = 2268.33, p0y = -20.545, p0z = -2005.54;
      const p1x = 2368.91, p1z = -1698.39;
      const yaw = Math.atan2(p1x - p0x, p1z - p0z);

      const mulsanneAnchor = new THREE.Group();
      mulsanneAnchor.name = 'MulsanneStraightRealTrack';
      mulsanneAnchor.scale.setScalar(1 / 3);
      mulsanneAnchor.rotation.y = -yaw;
      trackClone.position.set(-p0x, -p0y - 0.378 * 3, -p0z);
      mulsanneAnchor.add(trackClone);
      this.scene.add(mulsanneAnchor);
      // Hide procedural fallback road once real Mulsanne track is mounted
      road.visible = false;
      groove.visible = false;
    };

    if (window.__LEMANS_GLTF_PROMISE__) {
      window.__LEMANS_GLTF_PROMISE__.then(mountRealMulsanneTrack).catch(() => {});
    } else {
      const trackLoader = createGLTFLoader();
      window.__LEMANS_GLTF_PROMISE__ = new Promise((resolve, reject) => {
        trackLoader.load('assets/models/track/source/lemans.glb?v=smooth2', resolve, undefined, reject);
      });
      window.__LEMANS_GLTF_PROMISE__.then(mountRealMulsanneTrack).catch(() => {});
    }
  }

  loadModel() {
    const loader = createGLTFLoader();

    if (!window.__GT40_GLTF_PROMISE__) {
      window.__GT40_GLTF_PROMISE__ = new Promise((resolve, reject) => {
        loader.load(
          'assets/models/car/source/gt40.glb',
          (gltf) => resolve(gltf),
          (p) => {
            if (p.total && this.loaderFill) {
              const pct = Math.min(100, Math.round((p.loaded / p.total) * 100));
              this.loaderFill.style.width = `${pct}%`;
              if (this.loaderSub) this.loaderSub.textContent = `Streaming GT40 Mk II Geometry (${pct}%)`;
            }
          },
          (err) => reject(err)
        );
      });
    }

    return window.__GT40_GLTF_PROMISE__.then((gltf) => {
      if (this.isInitialized) return;
      this.carRoot = gltf.scene.clone(true);
      this.setupCarMaterials();
      this.buildDetailedInterior();
      this.scene.add(this.carRoot);

      if (this.loader) {
        this.loader.classList.add('hidden');
      }

      this.isInitialized = true;
      this.render();
      this.startLoop();
    }).catch((err) => {
      console.error('Failed to load GT40 model for cockpit view:', err);
      if (this.loader) this.loader.classList.add('hidden');
    });
  }

  setupCarMaterials() {
    const texLoader = new THREE.TextureLoader();
    const loadTex = (file, isSRGB = true, flip = false) => {
      const tex = texLoader.load(`assets/models/car/textures_web/${file}`);
      tex.flipY = flip;
      if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const bodyLiveryTex     = loadTex('Body_Livery_BlackWhite.png', true, false);
    const bodyRoughnessTex  = loadTex('Body_Roughness.png', false, false);
    const bodyMetallicTex   = loadTex('Body_Metallic.png', false, false);

    const wheelsBaseColor   = loadTex('Wheels_BaseColor.png', true, false);
    const wheelsRoughness   = loadTex('Wheels_Roughness.png', false, false);
    const wheelsMetallic    = loadTex('Wheels_Metallic.png', false, false);
    const wheelsNormal      = loadTex('Wheels_Normal.png', false, false);

    const engineBaseColor   = loadTex('Engine_BaseColor.png', true, true);
    const engineRoughness   = loadTex('Engine_Roughness.png', false, true);
    const engineMetallic    = loadTex('Engine_Metallic.png', false, true);

    const interiorBaseColor = loadTex('Interior_BaseColor.1001.png', true, false);
    const interiorRoughness = loadTex('Interior_Roughness.1001.png', false, false);
    const interiorNormal    = loadTex('Interior_Normal.1001.png', false, false);

    const bodyMat = new THREE.MeshStandardMaterial({
      map: bodyLiveryTex,
      roughnessMap: bodyRoughnessTex,
      metalnessMap: bodyMetallicTex,
      roughness: 0.32,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const interiorMat = new THREE.MeshStandardMaterial({
      map: interiorBaseColor,
      roughnessMap: interiorRoughness,
      normalMap: interiorNormal,
      roughness: 0.72,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xedf4f8,
      roughness: 0.05,
      metalness: 0.05,
      transmission: 0.90,
      thickness: 0.12,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });

    const engineMat = new THREE.MeshStandardMaterial({
      map: engineBaseColor,
      roughnessMap: engineRoughness,
      metalnessMap: engineMetallic,
      roughness: 0.40,
      metalness: 0.75,
      side: THREE.DoubleSide
    });

    const wheelMat = new THREE.MeshStandardMaterial({
      map: wheelsBaseColor,
      roughnessMap: wheelsRoughness,
      normalMap: wheelsNormal,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    this.carRoot.traverse((child) => {
      const name = (child.name || '').toLowerCase();

      // Hide both the stock low-poly Interior mesh AND the LHD Cockpit_Details assembly
      // so the authentic 1966 RHD cockpit, Stewart-Warner gauges, and telemetry screen are completely unobstructed.
      if (name.includes('interior') || name.includes('cockpit_details')) {
        child.visible = false;
        return;
      }

      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;

      if (name.includes('body')) {
        child.material = bodyMat;
      } else if (name.includes('glass')) {
        child.material = glassMat;
      } else if (name.includes('engine')) {
        child.material = engineMat;
      } else if (name.includes('wheel')) {
        child.material = wheelMat;
      }
    });
  }

  // =================================================================
  //  Ultra-Detailed 1966 GT40 Mk II Cockpit Interior Hardware
  // =================================================================

  buildDetailedInterior() {
    const cockpitGroup = new THREE.Group();
    cockpitGroup.name = 'GT40AuthenticInterior';

    // Materials Library matching 1966 Ford GT40 Mk II competition cockpit
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf0f2f5,
      metalness: 0.94,
      roughness: 0.12
    });

    const brushedAlumMat = new THREE.MeshStandardMaterial({
      color: 0xc8cdd4,
      metalness: 0.82,
      roughness: 0.32
    });

    const darkAlumMat = new THREE.MeshStandardMaterial({
      color: 0x8a929e,
      metalness: 0.78,
      roughness: 0.38
    });

    const flockedDashMat = new THREE.MeshStandardMaterial({
      color: 0x121418,
      roughness: 0.96, // Flocked matte crinkle anti-glare finish
      metalness: 0.02
    });

    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x14161a,
      roughness: 0.88,
      metalness: 0.08
    });

    const tubBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e12,
      roughness: 0.75,
      metalness: 0.25
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x16181c,
      roughness: 0.78,
      metalness: 0.04
    });

    const gaugeGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.95,
      roughness: 0.04,
      transparent: true,
      opacity: 0.35
    });

    // ----------------------------------------------------
    // 1. CENTER CYLINDRICAL VENTILATION CONDUIT (Between Seats)
    // As seen prominently in 1966 GT40 Mk II cockpit reference photograph
    // ----------------------------------------------------
    const centerDuctGroup = new THREE.Group();
    centerDuctGroup.name = 'CenterVentilationTunnel';

    const ductRadius = 0.068; // ~13.6 cm diameter
    const ductLength = 0.92;
    const ductGeo = new THREE.CylinderGeometry(ductRadius, ductRadius * 1.05, ductLength, 32);
    const ductMesh = new THREE.Mesh(ductGeo, brushedAlumMat);
    ductMesh.rotation.x = Math.PI / 2;
    ductMesh.position.set(0.0, -0.04, 0.15);
    centerDuctGroup.add(ductMesh);

    // Front intake bellmouth / elbow under dash
    const intakeElbowGeo = new THREE.TorusGeometry(ductRadius * 0.95, 0.015, 16, 32, Math.PI / 2);
    const intakeElbow = new THREE.Mesh(intakeElbowGeo, brushedAlumMat);
    intakeElbow.rotation.y = Math.PI / 2;
    intakeElbow.position.set(0.0, -0.01, 0.58);
    centerDuctGroup.add(intakeElbow);

    // Stainless hose clamp bands around ventilation tube
    [-0.15, 0.15, 0.42].forEach((bz) => {
      const clampBand = new THREE.Mesh(
        new THREE.TorusGeometry(ductRadius + 0.003, 0.0035, 8, 32),
        chromeMat
      );
      clampBand.position.set(0.0, -0.04, bz);
      centerDuctGroup.add(clampBand);

      // Clamp tightening screw block
      const screwBlock = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.010, 0.010), chromeMat);
      screwBlock.position.set(0.0, -0.04 + ductRadius + 0.003, bz);
      centerDuctGroup.add(screwBlock);
    });

    cockpitGroup.add(centerDuctGroup);

    // ----------------------------------------------------
    // 2. RIGHT SILL, RAISED GATED SHIFTER, LINKAGE & OVAL HATCH
    // Right-Hand Drive (RHD) layout matching reference photograph
    // ----------------------------------------------------
    const sillGroup = new THREE.Group();
    sillGroup.name = 'RightDoorSillAssembly';

    // Flat wide top sill tub plate
    const sillPlateGeo = new THREE.BoxGeometry(0.20, 0.02, 0.90);
    const sillPlate = new THREE.Mesh(sillPlateGeo, tubBlackMat);
    sillPlate.position.set(-0.56, -0.11, 0.22);
    sillGroup.add(sillPlate);

    // 2A. Raised Stamped Aluminum Shifter Pedestal Bracket
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(-0.52, 0.03, 0.14);

    // Elevated horizontal mounting plate
    const pedPlate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.13), brushedAlumMat);
    pedPlate.position.set(0, 0, 0);
    pedestalGroup.add(pedPlate);

    // 4 vertical standoff support posts
    [[-0.035, -0.05], [0.035, -0.05], [-0.035, 0.05], [0.035, 0.05]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 12), brushedAlumMat);
      post.position.set(px, -0.045, pz);
      pedestalGroup.add(post);
    });

    // 4-Speed Gated H-Pattern Plate
    const gateCanvas = document.createElement('canvas');
    gateCanvas.width = 256;
    gateCanvas.height = 256;
    const gCtx = gateCanvas.getContext('2d');
    gCtx.fillStyle = '#b0b8c4';
    gCtx.fillRect(0, 0, 256, 256);
    gCtx.fillStyle = '#0f172a';
    gCtx.fillRect(40, 40, 24, 176);  // R - 1
    gCtx.fillRect(116, 40, 24, 176); // 2 - 3
    gCtx.fillRect(192, 40, 24, 176); // 4
    gCtx.fillRect(40, 116, 176, 24); // crossbar
    gCtx.font = 'bold 32px Space Mono, monospace';
    gCtx.fillStyle = '#1e293b';
    gCtx.fillText('R', 42, 32);
    gCtx.fillText('1', 42, 245);
    gCtx.fillText('2', 118, 32);
    gCtx.fillText('3', 118, 245);
    gCtx.fillText('4', 194, 245);

    const gateTex = new THREE.CanvasTexture(gateCanvas);
    gateTex.colorSpace = THREE.SRGBColorSpace;
    const gateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.08, 0.11),
      new THREE.MeshStandardMaterial({ map: gateTex, metalness: 0.88, roughness: 0.22 })
    );
    gateMesh.rotation.x = -Math.PI / 2;
    gateMesh.position.set(0, 0.005, 0);
    pedestalGroup.add(gateMesh);

    // Interactive Shifter Lever with Reverse Lockout Ring & Finger Trigger
    this.shifterLever = new THREE.Group();
    this.shifterLever.name = 'gated_shifter_lever';

    const leverRod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.17, 16), chromeMat);
    leverRod.position.set(0, 0.085, 0);
    this.shifterLever.add(leverRod);

    // Black spherical Bakelite shift knob
    const knobMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.017, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.12, metalness: 0.15 })
    );
    knobMesh.position.set(0, 0.175, 0);
    this.shifterLever.add(knobMesh);

    // Reverse Lockout Collar / Latch trigger rod along shifter shaft
    const lockoutCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.022, 16), chromeMat);
    lockoutCollar.position.set(0, 0.125, 0);
    this.shifterLever.add(lockoutCollar);

    const lockoutLatch = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.025), chromeMat);
    lockoutLatch.position.set(0, 0.125, -0.012);
    this.shifterLever.add(lockoutLatch);

    this.interactiveObjects.push(this.shifterLever);
    pedestalGroup.add(this.shifterLever);
    sillGroup.add(pedestalGroup);

    // Exposed cylindrical mechanical shift linkage rod running rearward along sill
    const linkageRodGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.52, 16);
    const linkageRod = new THREE.Mesh(linkageRodGeo, brushedAlumMat);
    linkageRod.rotation.x = Math.PI / 2;
    linkageRod.position.set(-0.52, -0.06, -0.06);
    sillGroup.add(linkageRod);

    // Linkage guide support pillow block
    const pillowBlock = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.035, 0.024), darkAlumMat);
    pillowBlock.position.set(-0.52, -0.07, -0.16);
    sillGroup.add(pillowBlock);

    // 2B. Stamped Aluminum Horizontal Oval Inspection Plate with Hex Perimeter Bolts
    const hatchGroup = new THREE.Group();
    hatchGroup.position.set(-0.55, -0.095, 0.22);

    // Oval plate: cylinder scaled non-uniformly in Z
    const ovalGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.006, 32);
    const ovalMesh = new THREE.Mesh(ovalGeo, brushedAlumMat);
    ovalMesh.scale.set(1.0, 1.0, 1.85); // creates 0.11m x 0.20m oval
    hatchGroup.add(ovalMesh);

    // 12 Chrome Hex Perimeter Bolts around oval edge
    const boltGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.005, 6);
    for (let b = 0; b < 12; b++) {
      const ang = (b / 12) * Math.PI * 2;
      const bx = Math.sin(ang) * 0.046;
      const bz = Math.cos(ang) * 0.088;
      const bolt = new THREE.Mesh(boltGeo, chromeMat);
      bolt.position.set(bx, 0.004, bz);
      hatchGroup.add(bolt);
    }
    sillGroup.add(hatchGroup);

    cockpitGroup.add(sillGroup);

    // ----------------------------------------------------
    // 3. MOTO-LITA 15" COMPETITION STEERING WHEEL
    // 3-spoke design with drilled holes and "FORD G.T." circular medallion
    // ----------------------------------------------------
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(-0.28, 0.25, 0.44);
    wheelGroup.rotation.x = -0.32;

    // Steering Column
    const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 16), matteBlackMat);
    colMesh.position.set(0, -0.12, 0.12);
    colMesh.rotation.x = Math.PI / 2;
    wheelGroup.add(colMesh);

    // Dark vintage stitched leather rim with 12 o'clock marker & countersunk rivets
    const rimRadius = 0.185;
    const rimTube = 0.0155;
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(rimRadius, rimTube, 22, 64), leatherMat);
    wheelGroup.add(rimMesh);

    const topMarker = new THREE.Mesh(
      new THREE.TorusGeometry(rimRadius, rimTube + 0.0008, 12, 16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5, metalness: 0.05 })
    );
    topMarker.rotation.z = Math.PI / 2 - 0.08;
    wheelGroup.add(topMarker);

    // 18 Countersunk aluminum rivets around rim perimeter
    const rivetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.2 });
    for (let r = 0; r < 18; r++) {
      const ang = (r / 18) * Math.PI * 2;
      const rx = Math.cos(ang) * rimRadius;
      const ry = Math.sin(ang) * rimRadius;
      const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.004, 8), rivetMat);
      rivet.position.set(rx, ry, 0.013);
      rivet.rotation.x = Math.PI / 2;
      wheelGroup.add(rivet);
    }

    // Central Brushed Hub
    const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.025, 24), brushedAlumMat);
    hubMesh.rotation.x = Math.PI / 2;
    wheelGroup.add(hubMesh);

    // Authentic Circular "FORD G.T." Medallion
    // Top Half: Red (#dc2626)
    // Bottom Half: Blue (#1d4ed8)
    // Center Bar: White with bold black "FORD G.T."
    const emblemCanvas = document.createElement('canvas');
    emblemCanvas.width = 512;
    emblemCanvas.height = 512;
    const eCtx = emblemCanvas.getContext('2d');

    // Outer circle
    eCtx.fillStyle = '#0a0d14';
    eCtx.beginPath();
    eCtx.arc(256, 256, 250, 0, Math.PI * 2);
    eCtx.fill();

    // Red upper hemisphere
    eCtx.fillStyle = '#dc2626';
    eCtx.beginPath();
    eCtx.arc(256, 256, 230, Math.PI, 0, false);
    eCtx.fill();

    // Blue lower hemisphere
    eCtx.fillStyle = '#1d4ed8';
    eCtx.beginPath();
    eCtx.arc(256, 256, 230, 0, Math.PI, false);
    eCtx.fill();

    // White center horizontal band
    eCtx.fillStyle = '#ffffff';
    eCtx.fillRect(26, 206, 460, 100);

    // Dividing border lines
    eCtx.strokeStyle = '#0f172a';
    eCtx.lineWidth = 6;
    eCtx.strokeRect(26, 206, 460, 100);

    // Chrome outer border ring
    eCtx.strokeStyle = '#e2e8f0';
    eCtx.lineWidth = 14;
    eCtx.beginPath();
    eCtx.arc(256, 256, 236, 0, Math.PI * 2);
    eCtx.stroke();

    // Bold "FORD G.T." typography
    eCtx.font = '900 68px "Oswald", "Impact", sans-serif';
    eCtx.fillStyle = '#0a0c10';
    eCtx.textAlign = 'center';
    eCtx.textBaseline = 'middle';
    eCtx.fillText('FORD  G. T.', 256, 258);

    const emblemTex = new THREE.CanvasTexture(emblemCanvas);
    emblemTex.colorSpace = THREE.SRGBColorSpace;
    const emblemMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.042, 32),
      new THREE.MeshStandardMaterial({
        map: emblemTex,
        roughness: 0.25,
        metalness: 0.45,
        side: THREE.DoubleSide
      })
    );
    emblemMesh.rotation.y = Math.PI;
    emblemMesh.position.z = -0.018;
    wheelGroup.add(emblemMesh);

    // 4 hub allen screws
    for (let s = 0; s < 4; s++) {
      const sang = (s / 4) * Math.PI * 2 + Math.PI / 4;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.003, 8), darkAlumMat);
      screw.position.set(Math.cos(sang) * 0.038, Math.sin(sang) * 0.038, 0.0145);
      screw.rotation.x = Math.PI / 2;
      wheelGroup.add(screw);
    }

    // 3 Stamped Lightening Spokes:
    // Left Horizontal (9 o'clock = Math.PI)
    // Right Horizontal (3 o'clock = 0)
    // Bottom Vertical (6 o'clock = -Math.PI / 2)
    const makeSpoke = (angle) => {
      const spGroup = new THREE.Group();
      spGroup.rotation.z = angle;

      const spokeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.038, rimRadius * 0.88, 0.005), brushedAlumMat);
      spokeBlade.position.y = (rimRadius * 0.88) / 2 + 0.015;
      spGroup.add(spokeBlade);

      // 3 drilled circular holes per spoke, increasing in size towards rim
      for (let h = 0; h < 3; h++) {
        const holeR = 0.007 + (h * 0.0025);
        const holeMesh = new THREE.Mesh(new THREE.CylinderGeometry(holeR, holeR, 0.007, 16), new THREE.MeshBasicMaterial({ color: 0x07090e }));
        holeMesh.rotation.x = Math.PI / 2;
        holeMesh.position.set(0, 0.065 + (h * 0.045), 0);
        spGroup.add(holeMesh);
      }
      return spGroup;
    };

    wheelGroup.add(makeSpoke(0));             // 3 o'clock (Right)
    wheelGroup.add(makeSpoke(Math.PI));       // 9 o'clock (Left)
    wheelGroup.add(makeSpoke(-Math.PI / 2));  // 6 o'clock (Bottom)

    this.wheelGroup = wheelGroup;
    cockpitGroup.add(wheelGroup);

    // ----------------------------------------------------
    // 4. DASHBOARD HOUSING & RECESSED INSTRUMENT POD
    // ----------------------------------------------------
    const dashGroup = new THREE.Group();
    dashGroup.position.set(0, 0.28, 0.62);

    // Main curved cowl with anti-glare flocked finish (upper visor shelf)
    const cowlGeo = new THREE.BoxGeometry(1.24, 0.035, 0.22);
    const dashCowl = new THREE.Mesh(cowlGeo, flockedDashMat);
    dashCowl.position.set(0, 0.14, -0.04);
    dashCowl.rotation.x = 0.18;
    dashGroup.add(dashCowl);

    // Twin Defroster Louvers along windscreen base
    const louverMat = new THREE.MeshBasicMaterial({ color: 0x080a0e });
    [-0.34, 0.34].forEach((lx) => {
      for (let l = 0; l < 4; l++) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.005, 0.015), louverMat);
        louver.position.set(lx, 0.142, 0.04 + (l * 0.025));
        louver.rotation.x = 0.18;
        dashGroup.add(louver);
      }
    });

    // Stamped aluminum driver instrument plate directly behind steering wheel
    const alumPlateGeo = new THREE.BoxGeometry(0.56, 0.18, 0.015);
    const alumPlate = new THREE.Mesh(alumPlateGeo, darkAlumMat);
    alumPlate.position.set(-0.28, 0.05, 0.06);
    alumPlate.rotation.x = 0.18;
    dashGroup.add(alumPlate);

    // Red High-Intensity Shift Warning Light (top of cowl)
    const shiftLightGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.018, 16);
    this.shiftLightMat = new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      emissive: new THREE.Color(0x000000),
      roughness: 0.3
    });
    this.shiftLight = new THREE.Mesh(shiftLightGeo, this.shiftLightMat);
    this.shiftLight.rotation.x = 0.18;
    this.shiftLight.position.set(-0.28, 0.09, 0.09);
    dashGroup.add(this.shiftLight);

    // Red Emergency Pull Knob (to left of steering column)
    const pullKnobGroup = new THREE.Group();
    pullKnobGroup.position.set(-0.14, -0.075, 0.12);
    pullKnobGroup.rotation.x = 0.18;

    const pullBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.006, 24), chromeMat);
    pullBezel.rotation.x = Math.PI / 2;
    pullKnobGroup.add(pullBezel);

    const pullShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.018, 16), chromeMat);
    pullShaft.rotation.x = Math.PI / 2;
    pullShaft.position.z = 0.010;
    pullKnobGroup.add(pullShaft);

    const pullKnob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.016, 24),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25, metalness: 0.15 })
    );
    pullKnob.rotation.x = Math.PI / 2;
    pullKnob.position.z = 0.022;
    pullKnob.name = 'emergency_fire_pull';
    pullKnobGroup.add(pullKnob);
    this.interactiveObjects.push(pullKnob);
    dashGroup.add(pullKnobGroup);

    // Period Shelby Chassis Plaque on passenger side
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 512;
    plaqueCanvas.height = 128;
    const pCtx = plaqueCanvas.getContext('2d');
    pCtx.fillStyle = '#b89728';
    pCtx.fillRect(0, 0, 512, 128);
    pCtx.strokeStyle = '#332408';
    pCtx.lineWidth = 6;
    pCtx.strokeRect(6, 6, 500, 116);
    pCtx.font = 'bold 32px Oswald, sans-serif';
    pCtx.fillStyle = '#1c1503';
    pCtx.textAlign = 'center';
    pCtx.fillText('SHELBY AMERICAN INC. • LOS ANGELES', 256, 42);
    pCtx.font = 'bold 38px Space Mono, monospace';
    pCtx.fillText('CHASSIS NO. P/1046', 256, 85);
    pCtx.font = '22px Oswald, sans-serif';
    pCtx.fillText('24 HEURES DU MANS 1966 WINNER', 256, 115);

    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    plaqueTex.colorSpace = THREE.SRGBColorSpace;
    const plaqueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.06),
      new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.4, metalness: 0.7 })
    );
    plaqueMesh.position.set(0.25, 0.02, 0.105);
    plaqueMesh.rotation.x = 0.18;
    plaqueMesh.rotation.y = Math.PI;
    dashGroup.add(plaqueMesh);

    // ----------------------------------------------------
    // PASSENGER DASH: MASTER DISCONNECT & CIRCUIT BREAKERS
    // ----------------------------------------------------
    // 1. Large Circular Master Battery Disconnect Switch
    const masterSwGroup = new THREE.Group();
    masterSwGroup.position.set(0.36, 0.02, 0.105);
    masterSwGroup.rotation.x = 0.18;

    const masterCanvas = document.createElement('canvas');
    masterCanvas.width = 256;
    masterCanvas.height = 256;
    const mCtx = masterCanvas.getContext('2d');
    mCtx.fillStyle = '#0f172a';
    mCtx.beginPath();
    mCtx.arc(128, 128, 122, 0, Math.PI * 2);
    mCtx.fill();
    mCtx.strokeStyle = '#94a3b8';
    mCtx.lineWidth = 8;
    mCtx.stroke();
    mCtx.font = 'bold 22px Oswald, sans-serif';
    mCtx.fillStyle = '#e2e8f0';
    mCtx.textAlign = 'center';
    mCtx.fillText('MASTER SWITCH', 128, 52);
    mCtx.font = 'bold 20px Space Mono, monospace';
    mCtx.fillStyle = '#ef4444';
    mCtx.fillText('OFF', 60, 200);
    mCtx.fillStyle = '#22c55e';
    mCtx.fillText('ON', 196, 200);

    const masterTex = new THREE.CanvasTexture(masterCanvas);
    masterTex.colorSpace = THREE.SRGBColorSpace;
    const masterPlate = new THREE.Mesh(
      new THREE.CircleGeometry(0.045, 32),
      new THREE.MeshStandardMaterial({ map: masterTex, metalness: 0.6, roughness: 0.4 })
    );
    masterPlate.rotation.y = Math.PI;
    masterSwGroup.add(masterPlate);

    // Pointer Knob
    const masterPointer = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.042, 0.016),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 })
    );
    masterPointer.position.z = 0.012;
    masterPointer.rotation.z = 0.45; // pointing to ON
    masterSwGroup.add(masterPointer);
    dashGroup.add(masterSwGroup);

    // 2. Two-Tier Matrix of Push-Button Circuit Breakers
    const cbPanelGroup = new THREE.Group();
    cbPanelGroup.position.set(0.48, -0.045, 0.105);
    cbPanelGroup.rotation.x = 0.18;

    // Outer silver frame
    const cbFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.01), brushedAlumMat);
    cbPanelGroup.add(cbFrame);

    // Recessed dark socket insert
    const cbSocket = new THREE.Mesh(new THREE.BoxGeometry(0.165, 0.065, 0.012), matteBlackMat);
    cbSocket.position.z = 0.002;
    cbPanelGroup.add(cbSocket);

    // 2 rows of 8 chrome push buttons
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        const cbBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.008, 12), chromeMat);
        cbBtn.rotation.x = Math.PI / 2;
        const bx = -0.07 + (col * 0.020);
        const by = 0.018 - (row * 0.036);
        cbBtn.position.set(bx, by, 0.008);
        cbPanelGroup.add(cbBtn);
      }
    }
    dashGroup.add(cbPanelGroup);

    // Eyeball circular air vents
    [-0.58, 0.58].forEach((vx) => {
      const ventRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 12, 24), chromeMat);
      ventRing.position.set(vx, 0.01, 0.11);
      ventRing.rotation.x = 0.18;
      dashGroup.add(ventRing);

      const ventSphere = new THREE.Mesh(new THREE.SphereGeometry(0.029, 16, 16), matteBlackMat);
      ventSphere.position.set(vx, 0.01, 0.10);
      dashGroup.add(ventSphere);
    });

    // ----------------------------------------------------
    // 5. STEWART-WARNER ANALOG GAUGES & ANIMATED NEEDLES
    // ----------------------------------------------------
    const createGauge = (type, title, unit, min, max, redlineStart, needleVal, size) => {
      const gGroup = new THREE.Group();

      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const ctx = c.getContext('2d');
      ctx.scale(2, 2);

      const dialGrad = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
      dialGrad.addColorStop(0, '#131720');
      dialGrad.addColorStop(0.85, '#090b10');
      dialGrad.addColorStop(1, '#040507');
      ctx.fillStyle = dialGrad;
      ctx.beginPath();
      ctx.arc(256, 256, 250, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 238, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '600 14px Space Mono, monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('STEWART-WARNER', 256, 338);

      const startAngle = Math.PI * 0.75;
      const endAngle = Math.PI * 2.25;
      const sweep = endAngle - startAngle;

      const numTicks = 32;
      for (let i = 0; i <= numTicks; i++) {
        const t = i / numTicks;
        const angle = startAngle + t * sweep;
        const val = min + t * (max - min);

        const isMajor = i % 4 === 0;
        const innerR = isMajor ? 185 : 205;
        const outerR = 228;

        const x1 = 256 + Math.cos(angle) * innerR;
        const y1 = 256 + Math.sin(angle) * innerR;
        const x2 = 256 + Math.cos(angle) * outerR;
        const y2 = 256 + Math.sin(angle) * outerR;

        if (redlineStart !== null && val >= redlineStart) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = isMajor ? 8 : 4;
        } else {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = isMajor ? 6 : 3;
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (isMajor) {
          const numR = 155;
          const nx = 256 + Math.cos(angle) * numR;
          const ny = 256 + Math.sin(angle) * numR;
          ctx.font = 'bold 36px Oswald, sans-serif';
          ctx.fillStyle = (redlineStart !== null && val >= redlineStart) ? '#ef4444' : '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const labelText = type === 'tach' ? (val / 1000).toString() : Math.round(val).toString();
          ctx.fillText(labelText, nx, ny);
        }
      }

      ctx.font = 'bold 28px Oswald, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(title, 256, 310);

      ctx.font = 'bold 18px Space Mono, monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(unit, 256, 345);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#d4af37';
      ctx.fillText('STEWART-WARNER', 256, 395);

      const dialTex = new THREE.CanvasTexture(c);
      dialTex.colorSpace = THREE.SRGBColorSpace;

      const depth = 0.025;
      const bezelGeo = new THREE.CylinderGeometry(size, size * 1.04, depth, 32);
      const bezelMesh = new THREE.Mesh(bezelGeo, chromeMat);
      bezelMesh.rotation.x = Math.PI / 2;
      gGroup.add(bezelMesh);

      const faceGeo = new THREE.CircleGeometry(size * 0.94, 32);
      const faceMat = new THREE.MeshStandardMaterial({
        map: dialTex,
        roughness: 0.65,
        emissive: new THREE.Color(0x333845),
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide
      });
      const faceMesh = new THREE.Mesh(faceGeo, faceMat);
      faceMesh.position.z = -depth * 0.45;
      faceMesh.rotation.y = Math.PI;
      gGroup.add(faceMesh);

      // 3D Needle
      const needleT = Math.min(1, Math.max(0, (needleVal - min) / (max - min)));
      const needleAngle = startAngle + needleT * sweep;
      const needleGroup = new THREE.Group();
      needleGroup.position.z = -depth * 0.48;
      needleGroup.rotation.y = Math.PI;

      const needleBlade = new THREE.Mesh(
        new THREE.BoxGeometry(size * 0.82, 0.003, 0.0015),
        new THREE.MeshBasicMaterial({ color: (type === 'tach' ? 0xff3b30 : 0xffffff) })
      );
      needleBlade.position.x = (size * 0.82) / 2;
      needleGroup.add(needleBlade);

      const needleHub = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.16, size * 0.16, 0.005, 16),
        chromeMat
      );
      needleHub.rotation.x = Math.PI / 2;
      needleGroup.add(needleHub);

      needleGroup.rotation.z = needleAngle;
      gGroup.add(needleGroup);

      const glassMesh = new THREE.Mesh(new THREE.CircleGeometry(size * 0.96, 32), gaugeGlassMat);
      glassMesh.position.z = -depth * 0.52;
      glassMesh.rotation.y = Math.PI;
      gGroup.add(glassMesh);

      // Save needle reference and metadata for dynamic physics animation
      this.needles[type] = {
        group: needleGroup,
        min,
        max,
        startAngle,
        sweep,
        currentVal: needleVal,
        targetVal: needleVal
      };

      return gGroup;
    };

    // 1. Tachometer (Large Central Dial directly behind wheel - 0-8000 RPM, redline 6200)
    const tach = createGauge('tach', 'RPM', 'x1000', 0, 8000, 6200, 0, 0.055);
    tach.position.set(-0.28, 0.06, 0.03);
    tach.rotation.x = 0.18;
    dashGroup.add(tach);

    // 2. Speedometer (Left of Tachometer towards center dash - 0-220 MPH)
    const speedo = createGauge('speedo', 'SPEED', 'MPH', 0, 220, null, 0, 0.046);
    speedo.position.set(-0.06, 0.06, 0.03);
    speedo.rotation.x = 0.18;
    dashGroup.add(speedo);

    // 3. Oil Pressure (Left Inner - 0-100 PSI)
    const oilPress = createGauge('oilp', 'OIL P', 'PSI', 0, 100, 20, 0, 0.033);
    oilPress.position.set(-0.15, 0.06, 0.03);
    oilPress.rotation.x = 0.18;
    dashGroup.add(oilPress);

    // 4. Water Temp (Left Mid - 100-240 °F)
    const waterTemp = createGauge('watert', 'WATER', '°F', 100, 240, 220, 110, 0.032);
    waterTemp.position.set(-0.21, 0.06, 0.03);
    waterTemp.rotation.x = 0.18;
    dashGroup.add(waterTemp);

    // 5. Oil Temp (Right Inner - 100-300 °F)
    const oilTemp = createGauge('oilt', 'OIL T', '°F', 100, 300, 260, 120, 0.030);
    oilTemp.position.set(-0.35, 0.06, 0.03);
    oilTemp.rotation.x = 0.18;
    dashGroup.add(oilTemp);

    // 6. Fuel Gauge (Right Outer - 0-100%)
    const fuelG = createGauge('fuel', 'FUEL', '%', 0, 100, 15, 85, 0.030);
    fuelG.position.set(-0.42, 0.06, 0.03);
    fuelG.rotation.x = 0.18;
    dashGroup.add(fuelG);

    // ----------------------------------------------------
    // 6. INTERACTIVE AVIATION TOGGLE SWITCHES & STARTER
    // ----------------------------------------------------
    const switchRow = new THREE.Group();
    switchRow.position.set(-0.28, -0.045, 0.035);
    switchRow.rotation.x = 0.18;

    this.toggleMeshes = [];
    const toggleGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.022, 12);
    const redGuardGeo = new THREE.BoxGeometry(0.016, 0.028, 0.014);
    const redGuardMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });

    const switchLabels = ['IGNITION', 'FUEL PUMP', 'HEADLIGHTS', 'WIPERS', 'AUX FAN', 'PIT RADIO'];

    for (let i = 0; i < 6; i++) {
      const swGroup = new THREE.Group();
      const x = -0.15 + (i * 0.06);
      swGroup.position.set(x, 0, 0);

      const baseNut = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 6), chromeMat);
      baseNut.rotation.x = Math.PI / 2;
      swGroup.add(baseNut);

      const lever = new THREE.Mesh(toggleGeo, chromeMat);
      lever.rotation.x = 0.35; // UP (ON)
      lever.position.set(0, 0.006, 0.01);
      lever.name = `toggle_${i}_${switchLabels[i]}`;
      swGroup.add(lever);
      this.toggleMeshes.push(lever);
      this.interactiveObjects.push(lever);

      if (i < 2) {
        const guard = new THREE.Mesh(redGuardGeo, redGuardMat);
        guard.position.set(0, 0.012, 0.014);
        guard.rotation.x = -0.3;
        swGroup.add(guard);
      }

      switchRow.add(swGroup);
    }
    dashGroup.add(switchRow);

    // Big Red "ENGINE START" push-button
    this.starterBtnMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.015, 24),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.2 })
    );
    this.starterBtnMesh.name = 'starter_button';
    this.starterBtnMesh.rotation.x = 0.18;
    this.starterBtnMesh.position.set(-0.06, -0.045, 0.035);
    this.interactiveObjects.push(this.starterBtnMesh);
    dashGroup.add(this.starterBtnMesh);

    const startBezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.008, 24),
      chromeMat
    );
    startBezel.rotation.x = 0.18;
    startBezel.position.set(-0.06, -0.045, 0.035);
    dashGroup.add(startBezel);

    // ----------------------------------------------------
    // 6B. INTEGRATED CENTER TELEMETRY SCREEN (LE MANS DRIVE TRIGGER)
    // ----------------------------------------------------
    const screenLocalPos = new THREE.Vector3(0.045, 0.022, -0.026);
    const dashWorldPos = new THREE.Vector3(0, 0.28, 0.62);
    const screenWorldApprox = dashWorldPos.clone().add(screenLocalPos);
    const lookMat = new THREE.Matrix4().lookAt(
      this.baseEyePosition,
      screenWorldApprox,
      new THREE.Vector3(0, 1, 0)
    );

    this.screenGroup = new THREE.Group();
    this.screenGroup.name = 'cockpit_drive_screen_pod';
    this.screenGroup.position.copy(screenLocalPos);
    this.screenGroup.quaternion.setFromRotationMatrix(lookMat);

    this.screenFrameMat = new THREE.MeshStandardMaterial({
      color: 0x222936,
      metalness: 0.78,
      roughness: 0.25,
      emissive: new THREE.Color(0xf0cc52),
      emissiveIntensity: 0.12
    });

    const screenBezel = new THREE.Mesh(
      new THREE.BoxGeometry(0.162, 0.104, 0.014),
      this.screenFrameMat
    );
    screenBezel.name = 'cockpit_drive_screen';
    this.screenGroup.add(screenBezel);

    const screenRecess = new THREE.Mesh(
      new THREE.BoxGeometry(0.148, 0.090, 0.004),
      matteBlackMat
    );
    screenRecess.position.z = 0.0065;
    this.screenGroup.add(screenRecess);

    this.screenCanvas = document.createElement('canvas');
    this.screenCanvas.width = 512;
    this.screenCanvas.height = 320;
    this.screenCtx = this.screenCanvas.getContext('2d');
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    this.drawDriveScreenTexture(0);

    const screenFaceMat = new THREE.MeshBasicMaterial({
      map: this.screenTex,
      toneMapped: false
    });
    this.screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.142, 0.084),
      screenFaceMat
    );
    this.screenMesh.position.z = 0.0092;
    this.screenMesh.name = 'cockpit_drive_screen';
    this.screenGroup.add(this.screenMesh);

    // Subtle status LED & machined aluminum corner rivets on screen frame
    const statusLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.0026, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xf0cc52 })
    );
    statusLed.position.set(0.068, 0.043, 0.0085);
    this.screenGroup.add(statusLed);

    [
      [-0.072, 0.044],
      [0.056, 0.044],
      [-0.072, -0.044],
      [0.072, -0.044]
    ].forEach(([rx, ry]) => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.004, 8), chromeMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(rx, ry, 0.008);
      this.screenGroup.add(bolt);
    });

    // Articulated bracket strut anchoring screen housing into center dash cowl
    const bracketStrut = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.018, 0.078),
      darkAlumMat
    );
    bracketStrut.position.set(0.062, 0.014, 0.018);
    bracketStrut.rotation.y = -0.18;
    dashGroup.add(bracketStrut);

    this.interactiveObjects.push(screenBezel);
    this.interactiveObjects.push(this.screenMesh);
    dashGroup.add(this.screenGroup);

    cockpitGroup.add(dashGroup);

    // ----------------------------------------------------
    // 7. DRIVER & PASSENGER QUILTED SEATS WITH VENT GROMMETS
    // ----------------------------------------------------
    const grommetMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.92, roughness: 0.18 });
    const grommetHoleMat = new THREE.MeshBasicMaterial({ color: 0x05070a });
    const harnessMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.85, metalness: 0.05 });

    const createGT40Seat = (xPos, isDriver) => {
      const sGroup = new THREE.Group();
      sGroup.position.set(xPos, 0.02, -0.06);

      // Seat base cushion
      const sBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.48), leatherMat);
      sBase.position.set(0, -0.18, 0.10);
      sGroup.add(sBase);

      // Seat backrest tilted back
      const sBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.54, 0.09), leatherMat);
      sBack.position.set(0, 0.12, -0.12);
      sBack.rotation.x = 0.24;
      sGroup.add(sBack);

      // 4 Columns of chrome grommets on bottom cushion (4 x 6 = 24)
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
          const gx = -0.135 + (c * 0.09);
          const gz = -0.08 + (r * 0.07);

          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 8, 16), grommetMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(gx, -0.118, gz);
          sGroup.add(ring);

          const hole = new THREE.Mesh(new THREE.CircleGeometry(0.010, 16), grommetHoleMat);
          hole.rotation.x = -Math.PI / 2;
          hole.position.set(gx, -0.117, gz);
          sGroup.add(hole);
        }
      }

      // 4 Columns of chrome grommets on backrest (4 x 5 = 20)
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          const gx = -0.135 + (c * 0.09);
          const gy = -0.05 + (r * 0.085);
          const gz = -0.075 - (r * 0.02);

          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 8, 16), grommetMat);
          ring.rotation.x = 0.24;
          ring.position.set(gx, gy, gz);
          sGroup.add(ring);

          const hole = new THREE.Mesh(new THREE.CircleGeometry(0.010, 16), grommetHoleMat);
          hole.rotation.x = 0.24;
          hole.position.set(gx, gy, gz + 0.001);
          sGroup.add(hole);
        }
      }

      // Willans blue racing harness shoulder straps
      const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.44, 0.006), harnessMat);
      strapL.position.set(-0.11, 0.18, -0.04);
      strapL.rotation.x = 0.38;
      sGroup.add(strapL);

      const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.44, 0.006), harnessMat);
      strapR.position.set(0.11, 0.18, -0.04);
      strapR.rotation.x = 0.38;
      sGroup.add(strapR);

      // Blue side bolsters at front of cushion
      const bolsterL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.16), harnessMat);
      bolsterL.position.set(-0.19, -0.12, 0.18);
      sGroup.add(bolsterL);

      const bolsterR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.16), harnessMat);
      bolsterR.position.set(0.19, -0.12, 0.18);
      sGroup.add(bolsterR);

      // Central quick-release rotary cam-lock buckle
      const camLock = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.014, 24), chromeMat);
      camLock.rotation.x = 0.45;
      camLock.position.set(0, -0.02, 0.08);
      sGroup.add(camLock);

      return sGroup;
    };

    cockpitGroup.add(createGT40Seat(-0.28, true));  // Driver Seat (Right Side of Car)
    cockpitGroup.add(createGT40Seat(0.28, false));  // Passenger Seat (Left Side of Car)

    // ----------------------------------------------------
    // 8. WINDSCREEN SCRUTINEERING DECALS & MIRROR
    // ----------------------------------------------------
    // Scrutineering sticker 1: 24 Heures du Mans 1966 Oval Decal
    const decal1Canvas = document.createElement('canvas');
    decal1Canvas.width = 256;
    decal1Canvas.height = 160;
    const d1Ctx = decal1Canvas.getContext('2d');
    d1Ctx.fillStyle = '#ffffff';
    d1Ctx.beginPath();
    d1Ctx.ellipse(128, 80, 120, 72, 0, 0, Math.PI * 2);
    d1Ctx.fill();
    d1Ctx.strokeStyle = '#1e3a8a';
    d1Ctx.lineWidth = 8;
    d1Ctx.stroke();
    d1Ctx.font = 'bold 22px Oswald, sans-serif';
    d1Ctx.fillStyle = '#dc2626';
    d1Ctx.textAlign = 'center';
    d1Ctx.fillText('24 HEURES DU MANS', 128, 62);
    d1Ctx.font = 'bold 36px Oswald, sans-serif';
    d1Ctx.fillStyle = '#0f172a';
    d1Ctx.fillText('1966', 128, 105);
    d1Ctx.font = 'bold 16px Space Mono, monospace';
    d1Ctx.fillStyle = '#1e3a8a';
    d1Ctx.fillText('SCRUTINEERING № 2', 128, 132);

    const decal1Tex = new THREE.CanvasTexture(decal1Canvas);
    decal1Tex.colorSpace = THREE.SRGBColorSpace;
    const decal1Mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.075),
      new THREE.MeshBasicMaterial({ map: decal1Tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    decal1Mesh.position.set(-0.15, 0.62, 0.64);
    decal1Mesh.rotation.x = -0.42;
    cockpitGroup.add(decal1Mesh);

    // Scrutineering sticker 2: Le Mans Classic Circular Decal
    const decal2Canvas = document.createElement('canvas');
    decal2Canvas.width = 256;
    decal2Canvas.height = 256;
    const d2Ctx = decal2Canvas.getContext('2d');
    d2Ctx.fillStyle = '#ffffff';
    d2Ctx.beginPath();
    d2Ctx.arc(128, 128, 120, 0, Math.PI * 2);
    d2Ctx.fill();
    d2Ctx.strokeStyle = '#dc2626';
    d2Ctx.lineWidth = 10;
    d2Ctx.stroke();
    d2Ctx.font = 'bold 24px Oswald, sans-serif';
    d2Ctx.fillStyle = '#1e3a8a';
    d2Ctx.textAlign = 'center';
    d2Ctx.fillText('LE MANS', 128, 95);
    d2Ctx.font = 'bold 28px Oswald, sans-serif';
    d2Ctx.fillStyle = '#dc2626';
    d2Ctx.fillText('CLASSIC', 128, 135);
    d2Ctx.font = 'bold 18px Space Mono, monospace';
    d2Ctx.fillStyle = '#475569';
    d2Ctx.fillText('OFFICIAL', 128, 175);

    const decal2Tex = new THREE.CanvasTexture(decal2Canvas);
    decal2Tex.colorSpace = THREE.SRGBColorSpace;
    const decal2Mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.085, 0.085),
      new THREE.MeshBasicMaterial({ map: decal2Tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide })
    );
    decal2Mesh.position.set(-0.13, 0.53, 0.61);
    decal2Mesh.rotation.x = -0.42;
    cockpitGroup.add(decal2Mesh);

    // Windshield Mirror
    const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 12), chromeMat);
    mirrorStem.position.set(0.12, 0.60, 0.58);
    mirrorStem.rotation.x = 0.35;
    cockpitGroup.add(mirrorStem);

    const mirrorBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.02), chromeMat);
    mirrorBody.position.set(0.12, 0.62, 0.56);
    mirrorBody.rotation.y = 0.18;
    cockpitGroup.add(mirrorBody);

    const mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.11, 0.038),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.98, roughness: 0.02 })
    );
    mirrorGlass.position.set(0.12, 0.62, 0.55);
    mirrorGlass.rotation.y = 0.18;
    cockpitGroup.add(mirrorGlass);

    // ----------------------------------------------------
    // 9. DRILLED ALUMINUM ENDURANCE PEDALS
    // ----------------------------------------------------
    const pedalGroup = new THREE.Group();
    pedalGroup.position.set(-0.28, -0.16, 0.82);

    const makePedal = (xOffset, width, height, name) => {
      const p = new THREE.Group();
      p.name = name;
      p.position.set(xOffset, 0, 0);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.14, 0.008), matteBlackMat);
      arm.position.y = 0.05;
      arm.rotation.x = 0.28;
      p.add(arm);

      const pad = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.006), brushedAlumMat);
      pad.position.set(0, 0, 0.02);
      pad.rotation.x = -0.22;
      p.add(pad);

      this.interactiveObjects.push(p);
      return p;
    };

    this.pedalClutch = makePedal(0.065, 0.038, 0.065, 'pedal_clutch');
    this.pedalBrake = makePedal(0.000, 0.042, 0.070, 'pedal_brake');
    this.pedalThrottle = makePedal(-0.075, 0.032, 0.110, 'pedal_throttle');

    pedalGroup.add(this.pedalClutch);
    pedalGroup.add(this.pedalBrake);
    pedalGroup.add(this.pedalThrottle);
    cockpitGroup.add(pedalGroup);

    // ----------------------------------------------------
    // 10. PASSENGER SIDE KEN MILES LAP LOG CLIPBOARD
    // ----------------------------------------------------
    const clipCanvas = document.createElement('canvas');
    clipCanvas.width = 512;
    clipCanvas.height = 512;
    const cctx = clipCanvas.getContext('2d');
    cctx.fillStyle = '#f8fafc';
    cctx.fillRect(0, 0, 512, 512);
    cctx.fillStyle = '#0f172a';
    cctx.font = 'bold 24px Oswald, sans-serif';
    cctx.fillText('SHELBY AMERICAN INC. // LE MANS 1966', 20, 45);
    cctx.font = 'bold 20px Space Mono, monospace';
    cctx.fillText('CAR #2 : McLAREN / AMON  (CHASSIS P/1046)', 20, 80);
    cctx.fillStyle = '#475569';
    cctx.fillRect(20, 95, 472, 2);
    cctx.font = '18px Space Mono, monospace';
    cctx.fillText('04:00 - RAIN BEGINS. T-44 GEARBOX SMOOTH', 20, 135);
    cctx.fillText('08:00 - FERRARI P3 RETIREMENTS MOUNTING', 20, 175);
    cctx.fillText('12:00 - MILES LEADS. OIL PRESS 65 PSI OK', 20, 215);
    cctx.fillText('18:00 - MULSANNE TOP TRAP: 212.4 MPH', 20, 255);
    cctx.fillText('22:00 - FORD 1-2-3 FORMATION ORDERED', 20, 295);
    cctx.fillStyle = '#b91c1c';
    cctx.font = 'bold 22px Space Mono, monospace';
    cctx.fillText('NOTE: B. McLAREN DECLARED WINNER P1', 20, 360);

    const clipTex = new THREE.CanvasTexture(clipCanvas);
    clipTex.colorSpace = THREE.SRGBColorSpace;
    const clipboard = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.32),
      new THREE.MeshStandardMaterial({ map: clipTex, roughness: 0.7 })
    );
    clipboard.position.set(0.28, 0.02, 0.32);
    clipboard.rotation.x = -0.42;
    clipboard.rotation.y = 0.22;
    cockpitGroup.add(clipboard);

    // ----------------------------------------------------
    // 11. CIRCULAR PLEXIGLAS WINDOW AIR SCOOPS (Interactive)
    // ----------------------------------------------------
    const ventMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.45
    });

    this.ventScoopR = new THREE.Group();
    this.ventScoopR.name = 'vent_scoop_rhd';
    this.ventScoopR.position.set(-0.60, 0.36, 0.18);
    const ventOuter = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 12, 24), chromeMat);
    this.ventScoopR.add(ventOuter);
    const scoopFlap = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), ventMat);
    scoopFlap.rotation.y = 0.35;
    this.ventScoopR.add(scoopFlap);
    this.interactiveObjects.push(this.ventScoopR);
    cockpitGroup.add(this.ventScoopR);

    // ----------------------------------------------------
    // 12. WINDSHIELD WIPER ASSEMBLY
    // ----------------------------------------------------
    const wiperMotor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), chromeMat);
    wiperMotor.position.set(0.0, 0.26, 0.72);
    cockpitGroup.add(wiperMotor);

    this.wiperArm = new THREE.Group();
    this.wiperArm.position.set(0.0, 0.27, 0.72);
    const armRod = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.32, 0.004), matteBlackMat);
    armRod.position.y = 0.16;
    this.wiperArm.add(armRod);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.28, 0.008), matteBlackMat);
    blade.position.set(0, 0.16, 0.006);
    this.wiperArm.add(blade);
    this.wiperArm.rotation.x = -0.45;
    cockpitGroup.add(this.wiperArm);

    // ----------------------------------------------------
    // 13. TUBULAR STEEL ROLL CAGE & BULKHEAD
    // ----------------------------------------------------
    const rollCageGroup = new THREE.Group();
    const cageMat = new THREE.MeshStandardMaterial({ color: 0x181b22, roughness: 0.55, metalness: 0.65 });
    const tubeR = 0.022;

    // Windshield Header & A-Pillars
    const hoopTop = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, 1.05, 16), cageMat);
    hoopTop.position.set(0, 0.52, -0.26);
    hoopTop.rotation.z = Math.PI / 2;
    rollCageGroup.add(hoopTop);

    const uprightL = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, 0.65, 16), cageMat);
    uprightL.position.set(-0.52, 0.22, -0.26);
    rollCageGroup.add(uprightL);

    const uprightR = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, 0.65, 16), cageMat);
    uprightR.position.set(0.52, 0.22, -0.26);
    rollCageGroup.add(uprightR);

    // Right door sill longitudinal roll cage tube
    const sillTube = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, 0.85, 16), cageMat);
    sillTube.position.set(-0.56, -0.06, 0.15);
    sillTube.rotation.x = Math.PI / 2;
    rollCageGroup.add(sillTube);

    // Rear Engine Bulkhead Framed Window
    const winFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
    const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 0.02), winFrameMat);
    windowFrame.position.set(0, 0.34, -0.38);
    rollCageGroup.add(windowFrame);

    const divGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.26),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.92,
        roughness: 0.05,
        transparent: true,
        opacity: 0.28
      })
    );
    divGlass.position.set(0, 0.34, -0.37);
    rollCageGroup.add(divGlass);

    // 8 Velocity Stacks (Air Horns) of 427 V8 visible through rear glass
    const stackMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
    for (let s = 0; s < 8; s++) {
      const col = s % 2 === 0 ? -0.09 : 0.09;
      const row = Math.floor(s / 2);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.020, 0.14, 16, 1, true), stackMat);
      stack.position.set(col, 0.32, -0.55 - (row * 0.12));
      rollCageGroup.add(stack);
    }

    cockpitGroup.add(rollCageGroup);

    // 14. 1966 LE MANS WINNER — BRUCE MCLAREN (RHD SEAT)
    this.driver = buildBruceMcLarenDriver(THREE, {
      cockpitObserverMode: true,
      hotspotName: 'bruce_mclaren_driver'
    });
    cockpitGroup.add(this.driver.root);
    this.interactiveObjects.push(...this.driver.interactives);

    loadBruceMcLarenDriverGLB(THREE, createGLTFLoader(), {
      scale: 0.43,
      hotspotName: 'bruce_mclaren_driver',
      onLoaded: (glbGroup, holder, suitMat) => {
        this.driver.root.visible = false;
        if (suitMat) {
          // Calibrated matte Nomex cloth weave texture & muted cream albedo so driver never looks blown out
          const weaveCanvas = document.createElement('canvas');
          weaveCanvas.width = 128;
          weaveCanvas.height = 128;
          const wCtx = weaveCanvas.getContext('2d');
          wCtx.fillStyle = '#808080';
          wCtx.fillRect(0, 0, 128, 128);
          for (let y = 0; y < 128; y += 2) {
            for (let x = 0; x < 128; x += 2) {
              const v = ((x + y) % 4 === 0) ? 148 : 108;
              wCtx.fillStyle = `rgb(${v},${v},${v})`;
              wCtx.fillRect(x, y, 2, 2);
            }
          }
          const weaveTex = new THREE.CanvasTexture(weaveCanvas);
          weaveTex.wrapS = THREE.RepeatWrapping;
          weaveTex.wrapT = THREE.RepeatWrapping;
          weaveTex.repeat.set(16, 16);
          suitMat.color.setHex(0xb5aa95);
          suitMat.bumpMap = weaveTex;
          suitMat.bumpScale = 0.008;
          suitMat.roughnessMap = weaveTex;
          suitMat.envMapIntensity = 0.08;
          suitMat.roughness = 0.96;
          suitMat.needsUpdate = true;
        }
        cockpitGroup.add(glbGroup);
        holder.traverse((obj) => {
          if (obj.isMesh) {
            this.interactiveObjects.push(obj);
          }
        });
        const origHighlight = this.driver.setHighlighted;
        this.driver.setHighlighted = (active) => {
          origHighlight(active);
          if (suitMat && suitMat.emissive) {
            suitMat.emissive.setHex(active ? 0x1e40af : 0x000000);
            suitMat.emissiveIntensity = active ? 0.22 : 0.0;
          }
        };
      }
    });

    this.carRoot.add(cockpitGroup);

    // Ultra-realistic interior accessories: Rear-View Mirror, Jewel Indicator Lamps, Halon Fire Extinguisher & Instrument Backlight
    const centerMirrorGroup = new THREE.Group();
    centerMirrorGroup.position.set(0.0, 0.61, 0.56);
    const centerMirrorStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.055, 8), chromeMat);
    centerMirrorStalk.position.set(0, 0.025, 0.008);
    centerMirrorGroup.add(centerMirrorStalk);
    const centerMirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.044, 0.016), matteBlackMat);
    centerMirrorGroup.add(centerMirrorHousing);
    const centerMirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.135, 0.036),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.96, roughness: 0.05 })
    );
    centerMirrorGlass.position.z = -0.0085;
    centerMirrorGlass.rotation.y = Math.PI;
    centerMirrorGroup.add(centerMirrorGlass);
    cockpitGroup.add(centerMirrorGroup);

    // Glowing jewel warning lamps above toggle row (Red Oil, Amber Fuel, Green Ignition)
    [
      { x: -0.34, color: 0xef4444 },
      { x: -0.28, color: 0xf59e0b },
      { x: -0.22, color: 0x22c55e }
    ].forEach(({ x, color }) => {
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 12), chromeMat);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(x, 0.315, 0.585);
      cockpitGroup.add(bezel);
      const jewel = new THREE.Mesh(
        new THREE.SphereGeometry(0.0042, 12, 12),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.4, roughness: 0.15 })
      );
      jewel.position.set(x, 0.315, 0.581);
      cockpitGroup.add(jewel);
    });

    // Red Halon competition fire extinguisher on passenger sill
    const extGroup = new THREE.Group();
    extGroup.position.set(0.28, -0.14, 0.24);
    extGroup.rotation.x = Math.PI / 2;
    const extBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.26, 20),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.28, metalness: 0.35 })
    );
    const extValve = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.04, 12), chromeMat);
    extValve.position.y = 0.145;
    extGroup.add(extBody, extValve);
    cockpitGroup.add(extGroup);

    // Subtle warm incandescent instrument cluster backlight
    const dashGlow = new THREE.PointLight(0xffd28a, 0.55, 0.95);
    dashGlow.position.set(-0.24, 0.42, 0.52);
    cockpitGroup.add(dashGlow);
  }

  // =================================================================
  //  Interactive Simulator Actions & Physics Engine
  // =================================================================

  startEngine() {
    this.initAudio();
    if (this.engineRunning) {
      // Cut ignition
      this.engineRunning = false;
      this.isAccelerating = false;
      this.targetRPM = 0;
      this.stopEngineAudioLoop();
      this.playClickSound();
      if (this.telemetryStatus) {
        this.telemetryStatus.textContent = 'ENGINE: OFF';
        this.telemetryStatus.classList.remove('running');
      }
      if (this.btnStart) {
        this.btnStart.classList.remove('running');
        this.btnStart.innerHTML = '<span class="action-icon">⚡</span><span class="action-text">START ENGINE</span>';
      }
      return;
    }

    if (this.isCranking) return;
    this.isCranking = true;

    // Play authentic GT40 startup sound (exact recording from game section)
    if (this.audioCtx && this.audioBuffers.startup) {
      try {
        const src = this.audioCtx.createBufferSource();
        src.buffer = this.audioBuffers.startup;
        src.connect(this.masterGain);
        src.start();
      } catch (e) {}
    } else {
      this.playClickSound();
    }

    if (this.telemetryStatus) {
      this.telemetryStatus.textContent = 'STARTER CRANKING...';
      this.telemetryStatus.classList.remove('running');
    }
    if (this.btnStart) {
      this.btnStart.innerHTML = '<span class="action-icon">⏳</span><span class="action-text">CRANKING...</span>';
    }

    setTimeout(() => {
      this.isCranking = false;
      this.engineRunning = true;
      this.targetRPM = 1150; // Idle RPM
      this.startEngineAudioLoop();

      if (this.telemetryStatus) {
        this.telemetryStatus.textContent = 'ENGINE: 7.0L V8 IDLE';
        this.telemetryStatus.classList.add('running');
      }
      if (this.btnStart) {
        this.btnStart.classList.add('running');
        this.btnStart.innerHTML = '<span class="action-icon">🛑</span><span class="action-text">CUT IGNITION</span>';
      }
    }, 1100);
  }

  accelerate(active) {
    this.isAccelerating = active;
    if (!this.engineRunning) {
      if (active) this.startEngine();
      return;
    }

    if (active) {
      this.targetRPM = 6200 + Math.random() * 80; // Full 7.0L throttle
      if (this.pedalThrottle) this.pedalThrottle.rotation.x = 0.12;
    } else {
      this.targetRPM = 1150; // Return to idle
      if (this.pedalThrottle) this.pedalThrottle.rotation.x = 0.0;
    }
    this.updateEngineAudio();
  }

  shiftGear() {
    this.playGearClackSound();
    const gears = ['N', '1', '2', '3', '4'];
    this.gearIndex = (this.gearIndex + 1) % gears.length;
    this.currentGear = gears[this.gearIndex];

    if (this.telemetryGear) this.telemetryGear.textContent = this.currentGear;
    if (this.btnShift) this.btnShift.innerHTML = `<span class="action-icon">⚙️</span><span class="action-text">GEAR: ${this.currentGear}</span>`;

    // Physically animate 3D gated shifter position
    if (this.shifterLever) {
      const positions = {
        'N': { x: 0, z: 0 },
        '1': { x: -0.015, z: 0.025 },
        '2': { x: -0.015, z: -0.025 },
        '3': { x: 0.015, z: 0.025 },
        '4': { x: 0.015, z: -0.025 }
      };
      const p = positions[this.currentGear] || { x: 0, z: 0 };
      this.shifterLever.position.set(p.x, 0.08, p.z);
    }
  }

  toggleHeadlights() {
    this.playClickSound();
    this.headlightsOn = !this.headlightsOn;
    const intensity = this.headlightsOn ? 2.8 : 0;
    if (this.headlightSpotL) this.headlightSpotL.intensity = intensity;
    if (this.headlightSpotR) this.headlightSpotR.intensity = intensity;

    if (this.btnLights) {
      this.btnLights.classList.toggle('active', this.headlightsOn);
    }
  }

  toggleWipers() {
    this.playClickSound();
    this.wipersOn = !this.wipersOn;
    if (this.btnWipers) {
      this.btnWipers.classList.toggle('active', this.wipersOn);
    }
  }

  toggleVent() {
    this.playClickSound();
    this.ventOpen = !this.ventOpen;
    if (this.ventScoopR) {
      this.ventScoopR.rotation.z = this.ventOpen ? Math.PI / 2 : 0;
    }
  }

  // =================================================================
  //  Event Binding & 3D Raycasting
  // =================================================================

  bindEvents() {
    const onPointerDown = (e) => {
      if (this.screenTakeoverTriggered || this.driverMeetTriggered) return;
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      this.isDragging = true;
      this.dragPointerId = e.pointerId;
      this.pointerDownX = e.clientX;
      this.pointerDownY = e.clientY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      try { this.canvas.setPointerCapture(e.pointerId); } catch {}
      if (this.canvas) this.canvas.style.cursor = 'grabbing';
      if (this.dragHint && !this.hasInteracted) {
        this.dragHint.classList.add('faded');
        this.hasInteracted = true;
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) {
        if (this.isVisible && !this.screenTakeoverTriggered && !this.driverMeetTriggered) {
          this.updateHoverState(e);
        }
        return;
      }
      if (this.screenTakeoverTriggered || this.driverMeetTriggered) return;

      const deltaX = e.clientX - this.lastPointerX;
      const deltaY = e.clientY - this.lastPointerY;

      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      const sensitivity = 0.0042;
      this.targetYaw -= deltaX * sensitivity;
      this.targetPitch -= deltaY * sensitivity;

      this.targetYaw = Math.max(this.yawMin, Math.min(this.yawMax, this.targetYaw));
      this.targetPitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.targetPitch));
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (this.dragPointerId !== null) {
        try { this.canvas.releasePointerCapture(this.dragPointerId); } catch {}
        this.dragPointerId = null;
      }
      if (e) {
        const travel = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
        if (travel < 8 && !this.screenTakeoverTriggered && !this.driverMeetTriggered) {
          this.checkRaycastClick({ clientX: e.clientX || this.pointerDownX, clientY: e.clientY || this.pointerDownY });
        }
      }
      if (this.canvas) this.canvas.style.cursor = (this.screenHovered || this.driverHovered) ? 'pointer' : 'grab';
    };

    if (this.canvas) {
      this.canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', () => onPointerUp(null));
      window.addEventListener('blur', () => onPointerUp(null));
    }

    if (this.driverBadgeBtn) {
      this.driverBadgeBtn.addEventListener('click', () => this.meetDriver());
    }

    // Interactive Action Buttons
    if (this.btnStart) this.btnStart.addEventListener('click', () => this.startEngine());
    if (this.btnShift) this.btnShift.addEventListener('click', () => this.shiftGear());
    if (this.btnLights) this.btnLights.addEventListener('click', () => this.toggleHeadlights());
    if (this.btnWipers) this.btnWipers.addEventListener('click', () => this.toggleWipers());

    if (this.btnAccel) {
      this.btnAccel.addEventListener('mousedown', () => this.accelerate(true));
      window.addEventListener('mouseup', () => this.accelerate(false));
      this.btnAccel.addEventListener('touchstart', () => this.accelerate(true), { passive: true });
      window.addEventListener('touchend', () => this.accelerate(false), { passive: true });
    }

    // Keyboard Shortcuts (Scoped to active visible cockpit view)
    window.addEventListener('keydown', (e) => {
      if (!this.isVisible || !this.isInitialized || e.repeat) return;
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.accelerate(true);
      } else if (e.code === 'ShiftLeft' || e.code === 'KeyG') {
        this.shiftGear();
      } else if (e.code === 'KeyE') {
        this.startEngine();
      } else if (e.code === 'KeyL') {
        this.toggleHeadlights();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isVisible || !this.isInitialized) return;
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        this.accelerate(false);
      }
    });

    // Reset View Button
    if (this.btnReset) {
      this.btnReset.addEventListener('click', () => {
        this.targetEyePosition.copy(this.baseEyePosition);
        this.targetFov = this.baseFov;
        this.setCameraPreset(0, -0.10, 'FORWARD');
      });
    }

    // Preset View Buttons
    if (this.presetBtns && this.presetBtns.length) {
      this.presetBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const name = btn.dataset.preset || btn.textContent.trim() || 'PRESET';
          if (btn.dataset.preset === 'TELEMETRY SCREEN') {
            this.targetEyePosition.copy(this.baseEyePosition);
            this.targetFov = this.baseFov;
            this.focusTelemetryScreen();
          } else if (btn.dataset.preset === 'BRUCE MCLAREN') {
            this.focusDriver();
          } else {
            this.targetEyePosition.copy(this.baseEyePosition);
            this.targetFov = this.baseFov;
            const yaw = parseFloat(btn.dataset.yaw || '0');
            const pitch = parseFloat(btn.dataset.pitch || '0');
            this.setCameraPreset(yaw, pitch, name);
          }

          this.presetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }

    window.addEventListener('resize', () => this.onResize());
  }

  getDriverAimAngles(fromPos) {
    const driverFocus = this.driver?.driverFocusLocal || new THREE.Vector3(-0.28, 0.36, -0.02);
    const delta = driverFocus.clone().sub(fromPos);
    const horiz = Math.hypot(delta.x, delta.z) || 1;
    return {
      yaw: Math.atan2(delta.x, delta.z),
      pitch: Math.atan2(delta.y, horiz)
    };
  }

  focusDriver() {
    const previewEye = new THREE.Vector3(0.20, 0.48, 0.34);
    this.targetEyePosition.copy(previewEye);
    this.targetFov = 54;
    const { yaw, pitch } = this.getDriverAimAngles(previewEye);
    this.setCameraPreset(yaw, pitch, 'BRUCE MCLAREN');
    if (this.driver) this.driver.setHighlighted(true);
    if (this.driverBadgeBtn) this.driverBadgeBtn.classList.add('highlighted');
  }

  meetDriver() {
    if (this.driverMeetTriggered || this.screenTakeoverTriggered) return;
    this.driverMeetTriggered = true;
    this.isDragging = false;
    this.playClickSound();

    if (this.driver) this.driver.setHighlighted(true);
    if (this.driverBadgeBtn) this.driverBadgeBtn.classList.add('highlighted');

    const closeEye = new THREE.Vector3(0.18, 0.48, 0.34);
    this.targetEyePosition.copy(closeEye);
    this.targetFov = 50;
    const { yaw, pitch } = this.getDriverAimAngles(closeEye);
    this.setCameraPreset(yaw, pitch, 'MEET THE DRIVER');

    if (!this.meetDriverBanner) {
      this.meetDriverBanner = document.getElementById('cockpit-meet-driver-banner');
    }
    if (this.meetDriverBanner) {
      this.meetDriverBanner.classList.add('active');
    }

    this.driverMeetTimer = setTimeout(() => {
      this.driverMeetTimer = null;
      window.gt40JourneyOrchestrator?.enterDriverChronicles?.();
    }, 850);
  }

  getDriveScreenYawPitch() {
    if (!this.screenMesh) return { yaw: 0.56, pitch: -0.34, dir: new THREE.Vector3(0.49, -0.33, 0.80) };
    const worldPos = new THREE.Vector3();
    this.screenMesh.getWorldPosition(worldPos);
    const delta = worldPos.sub(this.baseEyePosition);
    const horiz = Math.hypot(delta.x, delta.z) || 1;
    const yaw = Math.atan2(delta.x, delta.z);
    const pitch = Math.atan2(delta.y, horiz);
    return { yaw, pitch, dir: delta.normalize() };
  }

  focusTelemetryScreen() {
    const { yaw, pitch } = this.getDriveScreenYawPitch();
    this.setCameraPreset(yaw, pitch, 'TELEMETRY SCREEN');
  }

  drawDriveScreenTexture(now = 0) {
    if (!this.screenCtx || !this.screenTex) return;
    const ctx = this.screenCtx;
    const w = 512;
    const h = 320;
    const hovered = this.screenHovered || this.screenZoomActive;

    // Obsidian telemetry backdrop
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, w, h);

    // Subtle header rule
    ctx.fillStyle = hovered ? 'rgba(240, 204, 82, 0.16)' : 'rgba(56, 189, 248, 0.08)';
    ctx.fillRect(0, 0, w, 48);
    ctx.strokeStyle = hovered ? '#f0cc52' : 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(w, 48);
    ctx.stroke();

    ctx.font = 'bold 18px Space Mono, monospace';
    ctx.fillStyle = hovered ? '#f0cc52' : '#7dd3fc';
    ctx.textAlign = 'left';
    ctx.fillText('SARTHE TELEMETRY // P/1046', 20, 30);

    ctx.font = 'bold 15px Space Mono, monospace';
    ctx.fillStyle = this.engineRunning ? '#22c55e' : '#f0cc52';
    ctx.textAlign = 'right';
    ctx.fillText(this.engineRunning ? 'V8 ARMED' : 'STANDBY', w - 20, 30);

    // Circuit loop schematic on left
    ctx.save();
    ctx.translate(122, 148);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    const pts = [
      [-55, -62], [-30, -68], [32, -52], [68, -10],
      [78, 36], [42, 62], [-22, 58], [-64, 24], [-68, -22]
    ];
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = hovered ? '#f0cc52' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Animated car cursor traveling loop
    const t = ((now * 0.00028) % 1 + 1) % 1;
    const segF = t * pts.length;
    const idxA = Math.floor(segF) % pts.length;
    const idxB = (idxA + 1) % pts.length;
    const frac = segF - Math.floor(segF);
    const dotX = pts[idxA][0] + (pts[idxB][0] - pts[idxA][0]) * frac;
    const dotY = pts[idxA][1] + (pts[idxB][1] - pts[idxA][1]) * frac;
    ctx.fillStyle = '#f0cc52';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right live readouts
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px Space Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('RPM', 252, 86);
    ctx.fillText('GEAR', 385, 86);

    ctx.font = 'bold 34px Oswald, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(Math.round(this.currentRPM || 2400).toString(), 252, 124);
    ctx.fillStyle = '#f0cc52';
    ctx.fillText(this.currentGear || 'N', 385, 124);

    // Bar graph
    const rpmFrac = Math.min(1, Math.max(0.18, (this.currentRPM || 2200) / 7000));
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(252, 140, 236, 10);
    ctx.fillStyle = rpmFrac > 0.8 ? '#ef4444' : '#38bdf8';
    ctx.fillRect(252, 140, Math.round(236 * rpmFrac), 10);

    ctx.font = '13px Space Mono, monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('CIRCUIT: LA SARTHE 13.6KM', 252, 178);
    ctx.fillText('MODE: LIVE DRIVER SIM', 252, 200);

    // Prominent CTA Pill along bottom of display
    const btnGrad = ctx.createLinearGradient(20, 234, w - 20, 296);
    if (hovered) {
      btnGrad.addColorStop(0, '#f0cc52');
      btnGrad.addColorStop(1, '#d97706');
    } else {
      btnGrad.addColorStop(0, '#1e293b');
      btnGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = btnGrad;
    ctx.fillRect(20, 234, w - 40, 62);
    ctx.strokeStyle = '#f0cc52';
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.strokeRect(20, 234, w - 40, 62);

    ctx.font = 'bold 23px Oswald, sans-serif';
    ctx.fillStyle = hovered ? '#070a10' : '#f0cc52';
    ctx.textAlign = 'center';
    const ctaText = this.screenTakeoverTriggered
      ? 'ENGAGING CIRCUIT // TAKE CONTROL'
      : 'TAKE CONTROL  •  DRIVE LE MANS →';
    ctx.fillText(ctaText, w / 2, 273);

    this.screenTex.needsUpdate = true;
  }

  updateHoverState(e) {
    if (!this.canvas || !this.camera || this.interactiveObjects.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    let hitScreen = false;
    let hitDriver = false;
    let hitAny = false;
    if (intersects.length > 0) {
      hitAny = true;
      let hitObj = intersects[0].object;
      while (hitObj && !hitObj.name && hitObj.parent) hitObj = hitObj.parent;
      if (hitObj && hitObj.name.includes('cockpit_drive_screen')) {
        hitScreen = true;
      } else if (hitObj && (hitObj.name.includes('bruce_mclaren_driver') || hitObj.userData?.isDriverInteractive)) {
        hitDriver = true;
      }
    }

    if (hitScreen !== this.screenHovered) {
      this.screenHovered = hitScreen;
      if (this.screenFrameMat) {
        this.screenFrameMat.emissive.setHex(0xf0cc52);
        this.screenFrameMat.emissiveIntensity = hitScreen ? 0.45 : 0.12;
      }
      this.drawDriveScreenTexture(performance.now());
    }

    if (hitDriver !== this.driverHovered) {
      this.driverHovered = hitDriver;
      if (this.driver) this.driver.setHighlighted(hitDriver || this.driverMeetTriggered);
      if (this.driverBadgeBtn) this.driverBadgeBtn.classList.toggle('highlighted', hitDriver);
    }

    this.canvas.style.cursor = hitAny ? 'pointer' : 'grab';
  }

  activateDriveScreenTakeover() {
    if (this.screenTakeoverTriggered) return;
    this.screenTakeoverTriggered = true;
    this.screenZoomActive = true;
    this.playClickSound();

    const { yaw, pitch, dir } = this.getDriveScreenYawPitch();
    this.targetYaw = yaw;
    this.targetPitch = pitch;
    this.targetEyePosition.copy(this.baseEyePosition).addScaledVector(dir, 0.22);
    this.targetFov = 32;

    if (this.screenFrameMat) {
      this.screenFrameMat.emissive.setHex(0xf0cc52);
      this.screenFrameMat.emissiveIntensity = 0.72;
    }
    this.drawDriveScreenTexture(performance.now());

    if (!this.takeoverBanner) {
      this.takeoverBanner = document.getElementById('cockpit-takeover-banner');
    }
    if (this.takeoverBanner) {
      this.takeoverBanner.classList.add('active');
    }

    window.gt40JourneyOrchestrator?.markMilestone?.('drive');

    this.screenTakeoverTimer = setTimeout(() => {
      this.screenTakeoverTimer = null;
      window.gt40JourneyOrchestrator?.enterDriveFromCockpit?.();
    }, 520);
  }

  checkRaycastClick(e) {
    if (!this.canvas || !this.camera || this.interactiveObjects.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      let hitObj = intersects[0].object;
      while (hitObj && !hitObj.name && hitObj.parent) {
        hitObj = hitObj.parent;
      }
      const name = hitObj ? hitObj.name : '';

      if (name.includes('cockpit_drive_screen')) {
        this.activateDriveScreenTakeover();
      } else if (name.includes('bruce_mclaren_driver') || intersects[0].object?.userData?.isDriverInteractive) {
        const hitPt = intersects[0].point;
        if (hitPt && (hitPt.z > 0.18 || hitPt.y < 0.16)) {
          // Clicking driver's legs / pedal footwell fires up & accelerates the GT40!
          if (!this.engineRunning) {
            this.startEngine();
          }
          if (this._legAccelTimer) clearTimeout(this._legAccelTimer);
          this.accelerate(true);
          this._legAccelTimer = setTimeout(() => {
            this.accelerate(false);
            this._legAccelTimer = null;
          }, 1600);
        } else {
          this.meetDriver();
        }
      } else if (name.includes('starter')) {
        this.startEngine();
      } else if (name.includes('emergency')) {
        this.playClickSound();
        if (this.engineRunning) this.startEngine();
      } else if (name.includes('shifter')) {
        this.shiftGear();
      } else if (name.includes('throttle')) {
        this.accelerate(true);
        setTimeout(() => this.accelerate(false), 500);
      } else if (name.includes('toggle')) {
        this.playClickSound();
        if (name.includes('HEADLIGHT')) this.toggleHeadlights();
        else if (name.includes('WIPER')) this.toggleWipers();
      } else if (name.includes('vent')) {
        this.toggleVent();
      }
    }
  }

  setCameraPreset(yaw, pitch, name) {
    this.targetYaw = Math.max(this.yawMin, Math.min(this.yawMax, yaw));
    this.targetPitch = Math.max(this.pitchMin, Math.min(this.pitchMax, pitch));

    if (this.dragHint) {
      this.dragHint.classList.add('faded');
      this.dragHint.style.display = 'none';
      this.hasInteracted = true;
    }

    if (this.lookIndicator) {
      this.lookIndicator.textContent = `LOOK: ${name} • YAW: ${Math.round(THREE.MathUtils.radToDeg(yaw))}° • PITCH: ${Math.round(THREE.MathUtils.radToDeg(pitch))}°`;
    }
  }

  onResize() {
    if (!this.canvas || !this.camera || !this.renderer) return;
    const width = this.canvas.clientWidth || (this.container ? this.container.clientWidth : 0) || window.innerWidth || 1440;
    const height = this.canvas.clientHeight || (this.container ? this.container.clientHeight : 0) || 680;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  startLoop() {
    if (this.animationFrameId) return;
    const animate = () => {
      if (!this.isVisible) {
        this.animationFrameId = null;
        return;
      }
      this.animationFrameId = requestAnimationFrame(animate);
      this.update();
      this.render();
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  update() {
    const now = performance.now();

    // 1. Smooth camera position, FOV & rotation interpolation (clamped safely inside cabin bounds)
    this.targetEyePosition.x = THREE.MathUtils.clamp(this.targetEyePosition.x, -0.44, 0.44);
    this.targetEyePosition.y = THREE.MathUtils.clamp(this.targetEyePosition.y, 0.24, 0.62);
    this.targetEyePosition.z = THREE.MathUtils.clamp(this.targetEyePosition.z, -0.18, 0.54);
    this.eyePosition.lerp(this.targetEyePosition, 0.12);
    this.camera.position.copy(this.eyePosition);

    if (Math.abs(this.camera.fov - this.targetFov) > 0.05) {
      this.camera.fov += (this.targetFov - this.camera.fov) * 0.14;
      this.camera.updateProjectionMatrix();
    }

    const rotLerp = this.screenZoomActive ? 0.16 : 0.12;
    this.currentYaw += (this.targetYaw - this.currentYaw) * rotLerp;
    this.currentPitch += (this.targetPitch - this.currentPitch) * rotLerp;

    const cosPitch = Math.cos(this.currentPitch);
    const dirX = Math.sin(this.currentYaw) * cosPitch;
    const dirY = Math.sin(this.currentPitch);
    const dirZ = Math.cos(this.currentYaw) * cosPitch;

    // Subtle engine idle lope micro-vibration in camera
    let vibeY = 0;
    if (this.engineRunning && !this.screenZoomActive) {
      vibeY = Math.sin(now * 0.035) * 0.0008;
    }

    this.lookTarget.set(
      this.eyePosition.x + dirX,
      this.eyePosition.y + dirY + vibeY,
      this.eyePosition.z + dirZ
    );
    this.camera.lookAt(this.lookTarget);

    if (now - this.screenLastDraw > 130) {
      this.screenLastDraw = now;
      this.drawDriveScreenTexture(now);
    }

    // 2. Physical Engine RPM & Speed Dynamics
    if (this.engineRunning) {
      this.currentRPM += (this.targetRPM - this.currentRPM) * 0.12;
      // Add natural lope flutter
      const lope = (Math.sin(now * 0.02) + Math.cos(now * 0.045)) * 25;
      const displayRPM = Math.round(this.currentRPM + lope);

      // Gear speed multipliers (MPH)
      const gearRatios = { 'N': 0, '1': 0.011, '2': 0.018, '3': 0.026, '4': 0.034 };
      const ratio = gearRatios[this.currentGear] || 0;
      this.currentSpeed += ((this.currentRPM * ratio) - this.currentSpeed) * 0.08;

      // Update Shift Warning Light
      if (this.shiftLightMat) {
        if (this.currentRPM > 6000) {
          const flash = Math.sin(now * 0.03) > 0;
          this.shiftLightMat.emissive.setHex(flash ? 0xff0000 : 0x000000);
        } else {
          this.shiftLightMat.emissive.setHex(0x000000);
        }
      }

      this.updateEngineAudio();

      // Update DOM Telemetry
      if (this.telemetryRPM) this.telemetryRPM.textContent = displayRPM.toLocaleString();
      if (this.telemetrySpeed) this.telemetrySpeed.textContent = Math.round(this.currentSpeed);
    } else {
      this.currentRPM += (0 - this.currentRPM) * 0.15;
      this.currentSpeed += (0 - this.currentSpeed) * 0.15;
      if (this.shiftLightMat) this.shiftLightMat.emissive.setHex(0x000000);
      if (this.telemetryRPM) this.telemetryRPM.textContent = '0';
      if (this.telemetrySpeed) this.telemetrySpeed.textContent = '0';
    }

    // 3. Update Stewart-Warner Analog Gauge Needles
    this.updateGauges();

    // 4. Animate Windshield Wiper, Steering Wheel & Driver Bruce McLaren
    if (this.wipersOn && this.wiperArm) {
      const sweep = Math.sin(now * 0.007) * 0.65;
      this.wiperArm.rotation.z = sweep;
    }
    const steerOsc = Math.sin(now * 0.0014) * (this.engineRunning ? 0.11 : 0.035);
    if (this.wheelGroup) {
      this.wheelGroup.rotation.z = steerOsc * 0.28;
    }
    if (this.driver) {
      this.driver.update(now * 0.001, {
        rpm: this.currentRPM,
        speed: this.currentSpeed,
        steerInput: steerOsc,
        highlighted: this.driverHovered || this.driverMeetTriggered
      });
    }

    // 5. Rate-limited Telemetry Look Indicator
    if (this.lookIndicator && (!this.lastTelemetryTime || now - this.lastTelemetryTime > 80)) {
      this.lastTelemetryTime = now;
      const degYaw = Math.round(THREE.MathUtils.radToDeg(this.currentYaw));
      const degPitch = Math.round(THREE.MathUtils.radToDeg(this.currentPitch));

      let dirName = 'FORWARD TRACK';
      if (degYaw < -35 && degYaw > -120) dirName = 'GATED SHIFTER & SILL';
      else if (degYaw > 35 && degYaw < 120) dirName = 'PASSENGER & BREAKER MATRIX';
      else if (Math.abs(degYaw) >= 120) dirName = 'REAR 427 V8 BULKHEAD';
      else if (degPitch < -22) dirName = 'STEWART-WARNER GAUGES';
      else if (degPitch > 18) dirName = 'GURNEY BUBBLE & ROOF';

      this.lookIndicator.textContent = `LOOK: ${dirName} • YAW: ${degYaw}° • PITCH: ${degPitch}°`;
    }
  }

  updateGauges() {
    const updateNeedle = (needleMeta, targetVal) => {
      if (!needleMeta || !needleMeta.group) return;
      needleMeta.currentVal += (targetVal - needleMeta.currentVal) * 0.14;
      const t = Math.min(1, Math.max(0, (needleMeta.currentVal - needleMeta.min) / (needleMeta.max - needleMeta.min)));
      const angle = needleMeta.startAngle + t * needleMeta.sweep;
      needleMeta.group.rotation.z = angle;
    };

    // Tachometer
    updateNeedle(this.needles.tach, this.currentRPM);

    // Speedometer
    updateNeedle(this.needles.speedo, this.currentSpeed);

    // Oil Pressure: 65 PSI when running, 0 when off
    const targetOilP = this.engineRunning ? (55 + (this.currentRPM / 6500) * 25) : 0;
    updateNeedle(this.needles.oilp, targetOilP);

    // Water & Oil Temp: climbs to operating temperature when running
    const targetWaterT = this.engineRunning ? 185 : 100;
    updateNeedle(this.needles.watert, targetWaterT);

    const targetOilT = this.engineRunning ? 210 : 100;
    updateNeedle(this.needles.oilt, targetOilT);

    // Fuel level (slow burn)
    updateNeedle(this.needles.fuel, 82);
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.stopEngineAudioLoop();
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
