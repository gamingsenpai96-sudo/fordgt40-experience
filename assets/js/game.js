/* ============================================================
   Ford GT40 Mk II — Circuit de la Sarthe Interactive 3D Simulation
   Official 3D Models: Le Mans Circuit & Ford GT40 Mk II (GLTF/GLB)
   ============================================================ */

import * as THREE from './three.module.js';
import { createGLTFLoader } from './gltf-shared.js';
import { loadBruceMcLarenDriverGLB } from './gt40-driver.js';

export class LeMansGame {
  constructor() {
    this.container    = document.getElementById('game-container');
    this.canvas       = document.getElementById('game-canvas');
    this.overlay      = document.getElementById('game-overlay');
    this.startBtn     = document.getElementById('game-start-btn');
    this.exitBtn      = document.getElementById('game-exit-btn');
    this.hud          = document.getElementById('game-hud');
    this.speedEl      = document.getElementById('hud-speed');
    this.rpmBarEl     = document.getElementById('hud-rpm-bar');
    this.gearEl       = document.getElementById('hud-gear');
    this.loaderFill   = document.getElementById('game-loader-fill');
    this.loaderText   = document.getElementById('game-loader-text');

    if (!this.container || !this.canvas) return;

    this.isActive       = false;
    this.hasStarted     = false;
    this.modelsReady    = false;
    this.isInitialized  = false;
    this._loadPromise   = null;
    this.isVisible      = false;
    this.isLooping      = false;
    this.clock          = new THREE.Clock();

    // Scale Factor: The Le Mans track was exported at 3x scale.
    // Setting carScale to 3.0 brings the GT40 into 1:1 true scale with the track,
    // the Armco barriers, and the track marshal.
    this.carScale       = 3.0;
    this.wheelOffset    = 0.372 * this.carScale; // 1.116m wheel radius

    // Loading progress tracking
    this.loadProgress   = { car: 0, track: 0 };

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      handbrake: false
    };

    // Le Mans Start/Finish Grid Coordinates in World Space:
    // CMWLCSTART.002 start/finish line is at X: -3873.0, Road Y: -3.55, Z: -4839.7
    // Car center is placed at Y = -3.55 + 1.116 = -2.434m (tires flush on asphalt)
    // Pit straight heading is along +X axis (towards Dunlop chicane at X ~ -3300)
    this.carState = {
      position: new THREE.Vector3(-3873.0, -2.434, -4839.7),
      rotation: 0,                                // 0 rad = facing +X down pit straight
      speed: 0,                                   // m/s
      maxSpeed: 94.5,                             // ~340 km/h (Mulsanne top speed)
      maxReverseSpeed: -14.0,                     // ~50 km/h
      accel: 6.31,                                // Calibrated per-gear in updatePhysics to match audio
      brakeDecel: 22.0,                           // Authentic brake deceleration
      drag: 0.994,                                // Rolling & aerodynamic resistance
      steerAngle: 0,                              // Current steering angle
      maxSteer: 0.25,                             // Halved sensitivity (~14.3 deg lock)
      steerSpeed: 2.2,                            // Halved turn-in rate for smooth, controllable steering
      gear: 1,
      rpm: 1000
    };

    // Camera follow state (Scaled for 3x GT40 proportions)
    this.currentCamPos  = new THREE.Vector3(-3892, 2.5, -4839.7);
    this.currentCamLook = new THREE.Vector3(-3840, -1.5, -4839.7);

    // Collision & ground raycasters
    this.downRay        = new THREE.Raycaster();
    this.downDir        = new THREE.Vector3(0, -1, 0);
    this.colRay         = new THREE.Raycaster();

    // Scene references
    this.trackModel     = null;
    this.carModel       = null;
    this.carGroup       = new THREE.Group();
    this.headlights     = [];
    this.brakeLights    = [];
    this.groundMeshes   = [];
    this.barrierMeshes  = [];

    // Audio state: Startup, Looping Idle, Downshift & Acceleration
    this.audioCtx         = null;
    this.audioBuffers     = {
      startup: null,
      idle: null,
      downshift: null,
      accel: null
    };
    this.hasStartedEngine = false;
    this.isPlayingStartup = false;
    this.audioMode        = 'none';
    this.idleSource       = null;
    this.idleGain         = null;
    this.accelSource      = null;
    this.accelGain        = null;
    this.masterGain       = null;
    this.prevGear         = 'N';

    this.setupEvents();
  }

  ensureLoaded() {
    if (this._loadPromise) return this._loadPromise;
    if (!this.isInitialized) {
      this.initThree();
      this.isInitialized = true;
    }
    this.onResize();
    this._loadPromise = this.load3DModels();
    return this._loadPromise;
  }

  pause() {
    this.isVisible = false;
    this.isLooping = false;
    if (this.isActive) this.exitDriveMode(false);
  }

  resume() {
    this.isVisible = true;
    return this.ensureLoaded().then(() => {
      this.onResize();
      if (!this.isLooping) this.animate();
    });
  }

  // =================================================================
  //  Three.js Scene & Lighting
  // =================================================================

  initThree() {
    const width  = this.container.clientWidth || 1000;
    const height = this.container.clientHeight || 640;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x161d2b);
    this.scene.fog = new THREE.FogExp2(0x161d2b, 0.0004);

    // Camera FOV set to 48 degrees for authentic, undistorted racing perspective
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 12000);
    this.camera.position.set(-3892, 2.5, -4839.7);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    // Atmospheric lighting (Circuit de la Sarthe endurance race daylight)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdde8ff, 0x334455, 1.1);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff2dc, 3.25);
    this.sunLight.position.set(-3835, 56, -4865);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 140;
    this.sunLight.shadow.camera.left = -14;
    this.sunLight.shadow.camera.right = 14;
    this.sunLight.shadow.camera.top = 14;
    this.sunLight.shadow.camera.bottom = -14;
    this.sunLight.shadow.bias = -0.00022;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Subtle cool rim light for realistic bodywork edge definition
    const rimLight = new THREE.DirectionalLight(0xcbe0ff, 1.05);
    rimLight.position.set(-3920, 38, -4790);
    this.scene.add(rimLight);

    // Add car group into scene with 3.0 scale
    this.carGroup.scale.set(this.carScale, this.carScale, this.carScale);
    this.scene.add(this.carGroup);
    this.carGroup.position.copy(this.carState.position);
    this.carGroup.rotation.y = Math.PI / 2; // Face forward along +X down the pit straight

    // Responsive resize observer to prevent any aspect ratio distortion
    if (window.ResizeObserver) {
      new ResizeObserver(() => this.onResize()).observe(this.container);
    }
  }

  onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  // =================================================================
  //  Model Loading (Circuit de la Sarthe & Ford GT40 Mk II GLB)
  // =================================================================

  load3DModels() {
    const loader = createGLTFLoader();

    const updateUIProgress = () => {
      const overall = Math.round((this.loadProgress.track * 0.5) + (this.loadProgress.car * 0.5));
      if (this.loaderFill) {
        this.loaderFill.style.width = `${overall}%`;
      }
      if (this.loaderText) {
        if (overall < 100) {
          this.loaderText.textContent = `LOADING CIRCUIT & GT40... ${overall}%`;
        } else {
          this.loaderText.textContent = `CIRCUIT DE LA SARTHE READY • CLICK TO DRIVE`;
        }
      }
    };

    // 1. Load Circuit de la Sarthe track model (Reusing shared __LEMANS_GLTF_PROMISE__ when available)
    if (!window.__LEMANS_GLTF_PROMISE__) {
      window.__LEMANS_GLTF_PROMISE__ = new Promise((resolve, reject) => {
        loader.load(
          'assets/models/track/source/lemans.glb',
          (gltf) => resolve(gltf),
          (p) => {
            if (p.total) {
              this.loadProgress.track = Math.min(100, Math.round((p.loaded / p.total) * 100));
              updateUIProgress();
            }
          },
          (err) => reject(err)
        );
      });
    }

    const trackPromise = window.__LEMANS_GLTF_PROMISE__
      .then((gltf) => {
        this.trackModel = gltf.scene.clone(true);

        const groundKeywords = [
          'road', 'start', 'asphalt', 'groove', 'grass', 'sand',
          'gravel', 'curb', 'kerb', 'floor', 'tertre', 'pit',
          'run', 'white', 'rmbl', 'soil', 'ground'
        ];

        // ONLY barriers lining the main Le Mans circuit:
        // Armco steel guardrails (RAILA, GUARDA), concrete track barriers (CMWLC, WALLCA, WALLBL, WALLDG), and tire walls (TWALL)
        const mainCircuitBarrierKeywords = [
          'raila', 'guarda', 'twall', 'cmwlc', 'wallca', 'wallbl', 'walldg', 'armco'
        ];

        this.trackModel.traverse((child) => {
          if (child.isMesh) {
            child.receiveShadow = true;

            const cname = (child.name || '').toLowerCase();
            const mname = (child.material?.name || '').toLowerCase();

            // Fix 1: Hide unwanted overlays causing solid pitch-black patches across the track:
            // - The groove (tire rubber line) mesh
            // - The BLACK.004 overlay (22,000+ vertices of transparent polygons rendered opaque black)
            if (cname.includes('groove') || mname.includes('groove') ||
                cname.includes('black') || mname.includes('black')) {
              child.visible = false;
              return;
            }

            const mats = Array.isArray(child.material) ? child.material : (child.material ? [child.material] : []);
            mats.forEach((mat) => {
              const name = (mat.name || child.name || '').toLowerCase();

              // Ensure all track texture maps decode in proper sRGB color space
              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
              }

              // Fix 2: Road painted lines, edge asphalt transitions, and road detail decals
              // Seamlessly overlay without black rectangular borders
              if (name.includes('line') || name.includes('detail') || name.includes('trans') ||
                  name.includes('edga') || name.includes('overlay')) {
                mat.transparent = true;
                mat.alphaTest = 0.08;
                mat.depthWrite = false;
                mat.polygonOffset = true;
                mat.polygonOffsetFactor = -1;
                mat.polygonOffsetUnits = -1;
              }
              // Fix 3: Tree branches, oak leaves, grass, bushes, plants
              // Eliminates black cutout boxes around trees and vegetation
              else if (name.includes('tree') || name.includes('brnch') || name.includes('leaf') ||
                       name.includes('leaves') || name.includes('bush') || name.includes('plant') ||
                       name.includes('grass')) {
                mat.transparent = false;
                mat.alphaTest = 0.5;
                mat.side = THREE.DoubleSide;
                mat.depthWrite = true;
              }
              // Fix 4: Chainlink fences & barriers with alpha
              else if (name.includes('fence')) {
                mat.transparent = false;
                mat.alphaTest = 0.4;
                mat.side = THREE.DoubleSide;
                mat.depthWrite = true;
              }
              // Fix 5: Logos, signs, banners, decals
              else if (name.includes('logo') || name.includes('sign') || name.includes('decal') || name.includes('banner')) {
                mat.transparent = true;
                mat.alphaTest = 0.15;
                mat.side = THREE.DoubleSide;
              }
              // Fix 6: Curbs and rumble strips
              else if (name.includes('rmbl')) {
                mat.transparent = false;
                mat.alphaTest = 0.1;
                mat.depthWrite = true;
              }
              // Fix 7: General fallback for any texture with alpha
              else if (mat.map) {
                mat.alphaTest = 0.1;
              }

              // Fix 8: Fallback for any untextured geometry so nothing looks like an unfinished void
              if (!mat.map) {
                if (name.includes('road') || name.includes('asph')) {
                  mat.color.setHex(0x383b40);
                  mat.roughness = 0.85;
                } else if (name.includes('grass')) {
                  mat.color.setHex(0x355e2b);
                  mat.roughness = 0.9;
                }
              }
            });

            // All drivable surfaces (road, curbs, grass, sand, pit floor)
            if (groundKeywords.some(k => mname.includes(k) || cname.includes(k))) {
              this.groundMeshes.push(child);
            }

            // ONLY main circuit barriers enabled with collision
            if (mainCircuitBarrierKeywords.some(k => mname.includes(k) || cname.includes(k))) {
              this.barrierMeshes.push(child);
            }
          }
        });

        // Ensure we always have ground meshes to test against
        if (this.groundMeshes.length === 0) {
          this.groundMeshes.push(this.trackModel);
        }

        this.scene.add(this.trackModel);
        this.loadProgress.track = 100;
        updateUIProgress();
        this.checkAllLoaded();
        this.snapCarToGround();
      })
      .catch((err) => {
        console.warn('Track GLB error:', err);
        this.loadProgress.track = 100;
        updateUIProgress();
        this.checkAllLoaded();
      });

    // 2. Load Ford GT40 Mk II car model (Reusing shared __GT40_GLTF_PROMISE__ when available)
    if (!window.__GT40_GLTF_PROMISE__) {
      window.__GT40_GLTF_PROMISE__ = new Promise((resolve, reject) => {
        loader.load(
          'assets/models/car/source/gt40.glb',
          (gltf) => resolve(gltf),
          (p) => {
            if (p.total) {
              this.loadProgress.car = Math.min(100, Math.round((p.loaded / p.total) * 100));
              updateUIProgress();
            }
          },
          (err) => reject(err)
        );
      });
    }

    const carPromise = window.__GT40_GLTF_PROMISE__.then((gltf) => {
      this.carModel = gltf.scene.clone(true);
      this.setupCarMaterialsAndLights();
      this.loadProgress.car = 100;
      updateUIProgress();
      this.checkAllLoaded();
      this.snapCarToGround();
    }).catch((err) => {
      console.warn('Car GLB error:', err);
      this.loadProgress.car = 100;
      updateUIProgress();
      this.checkAllLoaded();
    });

    return Promise.all([trackPromise, carPromise]);
  }

  setupCarMaterialsAndLights() {
    if (!this.carModel) return;

    // Load authentic textures for wheels, glass, interior, and details (NOT bodywork)
    const texLoader = new THREE.TextureLoader();
    const loadTex = (file, isSRGB = true) => {
      const tex = texLoader.load(`assets/models/car/textures_web/${file}`);
      tex.flipY = false;
      if (isSRGB) {
        tex.colorSpace = THREE.SRGBColorSpace;
      }
      return tex;
    };

    // Preload textures
    const bodyLivery        = loadTex('Body_Livery_BlackWhite.png', true);
    const bodyRoughness     = loadTex('Body_Roughness.png', false);
    const bodyMetallic      = loadTex('Body_Metallic.png', false);

    const wheelsBaseColor   = loadTex('Wheels_BaseColor.png', true);
    const wheelsRoughness   = loadTex('Wheels_Roughness.png', false);
    const wheelsMetallic    = loadTex('Wheels_Metallic.png', false);
    const wheelsNormal      = loadTex('Wheels_Normal.png', false);

    const interiorBaseColor = loadTex('Interior_BaseColor.1001.png', true);
    const interiorRoughness = loadTex('Interior_Roughness.1001.png', false);
    const interiorNormal    = loadTex('Interior_Normal.1001.png', false);

    const engineBaseColor   = loadTex('Engine_BaseColor.png', true);
    const engineRoughness   = loadTex('Engine_Roughness.png', false);
    const engineMetallic    = loadTex('Engine_Metallic.png', false);

    const glassBaseColor    = loadTex('Glass_BaseColor.png', true);

    const lightsBaseColor   = loadTex('LIGHTS_BaseColor.png', true);
    const lightsRoughness   = loadTex('LIGHTS_Roughness.png', false);
    const lightsNormal      = loadTex('LIGHTS_Normal.png', false);

    const redlightBaseColor = loadTex('REDLIGHT_BaseColor.png', true);
    const redlightRoughness = loadTex('REDLIGHT_Roughness.png', false);

    const lightsNoOpacBase  = loadTex('LIGHTSnoopacity_BaseColor.png', true);

    this.carModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const name = (child.name || '').toLowerCase();

        if (name.includes('body')) {
          // Authentic 1966 Le Mans #2 Satin-Matte Black with Crisp White Racing Stripes
          const bodyMat = new THREE.MeshStandardMaterial({
            map: bodyLivery,
            roughnessMap: bodyRoughness,
            metalnessMap: bodyMetallic,
            roughness: 0.68,
            metalness: 0.04,
            envMapIntensity: 0.35,
            side: THREE.DoubleSide
          });

          // Vector-Sharp 1966 Le Mans #2 Livery Shader Injection
          bodyMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
              '#include <common>',
              `#include <common>
               varying vec3 vBodyPos;
               varying vec3 vBodyNorm;`
            ).replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
               vBodyPos = position;
               vBodyNorm = normal;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              `#include <common>
               varying vec3 vBodyPos;
               varying vec3 vBodyNorm;`
            ).replace(
              '#include <color_fragment>',
              `#include <color_fragment>
               float ax = abs(vBodyPos.x);
               bool isExteriorTop = (vBodyPos.y > 0.08) && (abs(vBodyNorm.y) > 0.12) && !(vBodyPos.z > 0.95 && vBodyPos.y < 0.26 && abs(vBodyNorm.y) < 0.4);

               bool isStripe = false;
               if (isExteriorTop) {
                 if (ax >= 0.018 && ax <= 0.128) isStripe = true;
                 if (ax >= 0.142 && ax <= 0.158) isStripe = true;
                 if (length(vec2(vBodyPos.x - 0.24, vBodyPos.z - 1.16)) < 0.16 && vBodyPos.y > 0.18 && abs(vBodyNorm.y) > 0.32) isStripe = true;
               }

               bool isRocker = (vBodyPos.y >= -0.02 && vBodyPos.y <= 0.065) && (abs(vBodyNorm.x) > 0.6) && (vBodyPos.z > -0.75 && vBodyPos.z < 0.85);
               if (isRocker && (vBodyPos.y >= 0.012 && vBodyPos.y <= 0.038)) isStripe = true;

               if (isStripe) {
                 diffuseColor.rgb = vec3(0.94, 0.94, 0.96);
               } else {
                 diffuseColor.rgb = vec3(0.022, 0.024, 0.028);
               }
              `
            ).replace(
              '#include <roughnessmap_fragment>',
              `#include <roughnessmap_fragment>
               roughnessFactor = isStripe ? 0.56 : 0.68;`
            ).replace(
              '#include <metalnessmap_fragment>',
              `#include <metalnessmap_fragment>
               metalnessFactor = 0.04;`
            );
          };
          child.material = bodyMat;

        } else if (name.includes('wheel')) {
          // Authentic Solid Goodyear Blue Streak Racing Slick Rubber Tires
          child.material = new THREE.MeshStandardMaterial({
            map: wheelsBaseColor,
            roughnessMap: wheelsRoughness,
            normalMap: wheelsNormal,
            color: 0x222428,
            roughness: 0.88,
            metalness: 0.05,
            transparent: false,
            opacity: 1.0,
            depthWrite: true,
            side: THREE.DoubleSide
          });

        } else if (name.includes('disk')) {
          // Halibrand Magnesium Vintage Le Mans Racing Gold Rims & Chrome Knockoff
          const rimMat = new THREE.MeshStandardMaterial({
            map: wheelsBaseColor,
            roughnessMap: wheelsRoughness,
            metalnessMap: wheelsMetallic,
            normalMap: wheelsNormal,
            color: 0xd4af37,
            roughness: 0.36,
            metalness: 0.78,
            transparent: false,
            opacity: 1.0,
            depthWrite: true,
            side: THREE.DoubleSide
          });

          rimMat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
              '#include <common>',
              `#include <common>
               varying vec3 vRimPos;`
            ).replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
               vRimPos = position;`
            );

            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              `#include <common>
               varying vec3 vRimPos;`
            ).replace(
              '#include <color_fragment>',
              `#include <color_fragment>
               float cz = vRimPos.z > 0.0 ? 1.23 : -1.11;
               float cy = vRimPos.z > 0.0 ? 0.02 : -0.03;
               float r = length(vec2(vRimPos.y - cy, vRimPos.z - cz));
               if (r < 0.052) diffuseColor.rgb = vec3(0.95, 0.95, 0.97);`
            ).replace(
              '#include <roughnessmap_fragment>',
              `#include <roughnessmap_fragment>
               float cz2 = vRimPos.z > 0.0 ? 1.23 : -1.11;
               float cy2 = vRimPos.z > 0.0 ? 0.02 : -0.03;
               float r2 = length(vec2(vRimPos.y - cy2, vRimPos.z - cz2));
               if (r2 < 0.052) roughnessFactor = 0.12;`
            ).replace(
              '#include <metalnessmap_fragment>',
              `#include <metalnessmap_fragment>
               float cz3 = vRimPos.z > 0.0 ? 1.23 : -1.11;
               float cy3 = vRimPos.z > 0.0 ? 0.02 : -0.03;
               float r3 = length(vec2(vRimPos.y - cy3, vRimPos.z - cz3));
               if (r3 < 0.052) metalnessFactor = 0.95;`
            );
          };
          child.material = rimMat;

        } else if (name.includes('glass')) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0xeef4f8,
            roughness: 0.06,
            metalness: 0.08,
            transmission: 0.90,
            thickness: 0.2,
            ior: 1.5,
            transparent: true,
            opacity: 0.40,
            depthWrite: false,
            side: THREE.DoubleSide
          });
        } else if (name.includes('interior')) {
          child.material = new THREE.MeshStandardMaterial({
            map: interiorBaseColor,
            roughnessMap: interiorRoughness,
            normalMap: interiorNormal,
            roughness: 0.7,
            metalness: 0.15,
            side: THREE.DoubleSide
          });
        } else if (name.includes('engine')) {
          child.material = new THREE.MeshStandardMaterial({
            map: engineBaseColor,
            roughnessMap: engineRoughness,
            metalnessMap: engineMetallic,
            roughness: 0.3,
            metalness: 0.8
          });
        } else if (name.includes('redlight')) {
          child.material = new THREE.MeshStandardMaterial({
            map: redlightBaseColor,
            roughnessMap: redlightRoughness,
            color: 0xff4444,
            emissive: 0xff1100,
            emissiveIntensity: 1.6,
            roughness: 0.2
          });
          this.brakeLights.push(child);
        } else if (name.includes('lights-noopacity') || name.includes('noopacity')) {
          child.material = new THREE.MeshStandardMaterial({
            map: lightsNoOpacBase,
            roughness: 0.25,
            metalness: 0.4
          });
        } else if (name.includes('light')) {
          child.material = new THREE.MeshStandardMaterial({
            map: lightsBaseColor,
            roughnessMap: lightsRoughness,
            normalMap: lightsNormal,
            roughness: 0.1,
            metalness: 0.2,
            emissive: 0xfffae0,
            emissiveIntensity: 1.5
          });
        }
      }
    });

    // Mount car model inside car group:
    // Car origin sits centered at bottom of wheels (Y = 0 in local space)
    this.carModel.position.set(0, 0, 0);
    this.carGroup.add(this.carModel);

    // Mount Bruce McLaren (race_car_driver.glb in Gulf cream suit) in RHD seat (1x local carModel space)
    const { group: driverGroup } = loadBruceMcLarenDriverGLB(THREE, createGLTFLoader(), {
      scale: 0.43,
      hotspotName: 'bruce_mclaren_driver'
    });
    this.carModel.add(driverGroup);

    // Soft underbody AO contact shadow so the GT40 sits grounded on the asphalt
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
    aoPlane.position.set(0, -0.355, 0.05);
    this.carModel.add(aoPlane);

    // Twin forward endurance spotlights (in local space of the 3x car group)
    const leftHeadlight = new THREE.SpotLight(0xfffae0, 8.0, 300, Math.PI / 6, 0.4, 1.2);
    leftHeadlight.position.set(-0.55, 0.55, 1.8);
    leftHeadlight.target.position.set(-0.55, 0.2, 50);
    this.carGroup.add(leftHeadlight);
    this.carGroup.add(leftHeadlight.target);
    this.headlights.push(leftHeadlight);

    const rightHeadlight = new THREE.SpotLight(0xfffae0, 8.0, 300, Math.PI / 6, 0.4, 1.2);
    rightHeadlight.position.set(0.55, 0.55, 1.8);
    rightHeadlight.target.position.set(0.55, 0.2, 50);
    this.carGroup.add(rightHeadlight);
    this.carGroup.add(rightHeadlight.target);
    this.headlights.push(rightHeadlight);

    // Rear tail glow
    const tailGlow = new THREE.PointLight(0xff1100, 2.5, 30);
    tailGlow.position.set(0, 0.55, -1.8);
    this.carGroup.add(tailGlow);
    this.brakeLightGlow = tailGlow;
  }

  // Snaps the car directly onto the asphalt surface under the spawn position
  snapCarToGround() {
    if (this.groundMeshes.length === 0) return;

    const s = this.carState;
    this.downRay.set(new THREE.Vector3(s.position.x, 30.0, s.position.z), this.downDir);
    this.downRay.far = 100.0;
    const hits = this.downRay.intersectObjects(this.groundMeshes, true);

    if (hits.length > 0) {
      s.position.y = hits[0].point.y + this.wheelOffset;
      this.carGroup.position.copy(s.position);
    }
  }

  checkAllLoaded() {
    if (this.loadProgress.car >= 100 && this.loadProgress.track >= 100) {
      this.modelsReady = true;
      if (this.loaderText) {
        this.loaderText.textContent = 'CIRCUIT DE LA SARTHE READY • CLICK TO DRIVE';
      }
      if (this.startBtn) {
        this.startBtn.classList.add('ready');
      }
    }
  }

  // =================================================================
  //  Authentic GT40 Engine Audio (Startup, Idle, Downshift & Accel)
  // =================================================================

  initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Dedicated gain node for the looping idle sound
      this.idleGain = this.audioCtx.createGain();
      this.idleGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.idleGain.connect(this.masterGain);

      // Dedicated gain node for the acceleration sound
      this.accelGain = this.audioCtx.createGain();
      this.accelGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      this.accelGain.connect(this.masterGain);

      // Load user's 4 authentic audio recordings
      this.loadEngineAudio();
    } catch (e) {
      console.warn('Web Audio error:', e);
    }
  }

  async loadEngineAudio() {
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

    this.audioBuffers.startup   = startup;
    this.audioBuffers.idle      = idle;
    this.audioBuffers.downshift = downshift;
    this.audioBuffers.accel     = accel;

    // If already in drive mode, kick off startup sequence
    if (this.isActive && !this.hasStartedEngine) {
      this.startStartupSequence();
    }
  }

  // Plays the car startup sound once on first launch, then transitions to looping idle
  startStartupSequence() {
    if (!this.audioCtx || this.hasStartedEngine) return;
    this.hasStartedEngine = true;

    if (this.audioBuffers.startup) {
      this.isPlayingStartup = true;
      try {
        const src = this.audioCtx.createBufferSource();
        src.buffer = this.audioBuffers.startup;
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);
        src.connect(gain);
        gain.connect(this.masterGain);

        src.onended = () => {
          this.isPlayingStartup = false;
          this.startIdleSound();
        };

        src.start(0);
      } catch (e) {
        this.isPlayingStartup = false;
        this.startIdleSound();
      }
    } else {
      this.startIdleSound();
    }
  }

  // Starts the neutral idle audio loop
  startIdleSound() {
    if (!this.audioCtx || !this.audioBuffers.idle || this.idleSource) return;
    try {
      const src = this.audioCtx.createBufferSource();
      src.buffer = this.audioBuffers.idle;
      src.loop = true;
      src.connect(this.idleGain);
      src.start(0);
      this.idleSource = src;
      this.idleGain.gain.setTargetAtTime(0.85, this.audioCtx.currentTime, 0.1);
    } catch (e) {}
  }

  // Plays the throttle-blip downshift audio whenever gears shift down
  playDownshiftSound() {
    if (!this.audioCtx || !this.audioBuffers.downshift) return;
    try {
      const now = this.audioCtx.currentTime;

      // Stop and silence any rev-up acceleration sound immediately so it never bleeds into downshift
      if (this.accelGain) {
        this.accelGain.gain.cancelScheduledValues(now);
        this.accelGain.gain.setValueAtTime(0, now);
      }
      if (this.accelSource) {
        try { this.accelSource.stop(); } catch(e){}
        this.accelSource = null;
      }

      const src = this.audioCtx.createBufferSource();
      src.buffer = this.audioBuffers.downshift;
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.95, now);
      src.connect(gain);
      gain.connect(this.masterGain);
      src.start(0);
    } catch (e) {}
  }

  // Maps speed (km/h) to exact playback offset (seconds) in the 19.23s audio timeline
  getAudioTimeForSpeed(kmh) {
    if (kmh <= 0) return 0;
    if (kmh < 75) {
      // 1st Gear: 0 to 75 km/h over 3.3s
      return (kmh / 75) * 3.3;
    } else if (kmh < 145) {
      // 2nd Gear: 75 to 145 km/h over 3.3s (3.3s to 6.6s)
      return 3.3 + ((kmh - 75) / 70) * 3.3;
    } else if (kmh < 225) {
      // 3rd Gear: 145 to 225 km/h over 4.7s (6.6s to 11.3s)
      return 6.6 + ((kmh - 145) / 80) * 4.7;
    } else {
      // 4th Gear: 225 to 340 km/h over 7.9s (11.3s to 19.2s)
      const ratio = Math.min(1.0, (kmh - 225) / 115);
      return 11.3 + ratio * 7.9;
    }
  }

  updateEngineAudio(kmh, throttle, isBraking) {
    if (!this.audioCtx) return;

    // Trigger startup once when starting for the first time
    if (!this.hasStartedEngine) {
      this.startStartupSequence();
      return;
    }

    if (this.isPlayingStartup) return;

    // Ensure idle loop is running in the background
    if (!this.idleSource && this.audioBuffers.idle) {
      this.startIdleSound();
    }

    const now = this.audioCtx.currentTime;

    // The idle engine sound ONLY plays while the car is on neutral gear and stationary
    const isNeutralStationary = (this.carState.gear === 'N' && kmh < 2);

    if (isNeutralStationary) {
      if (this.idleGain) {
        this.idleGain.gain.setTargetAtTime(0.85, now, 0.08);
      }
      if (this.accelGain) {
        this.accelGain.gain.setTargetAtTime(0, now, 0.04);
      }
      if (this.accelSource) {
        try { this.accelSource.stop(); } catch(e){}
        this.accelSource = null;
      }
      return;
    }

    // When in any gear (1, 2, 3, 4, R) or moving / downshifting, idle sound is strictly silenced
    if (this.idleGain) {
      this.idleGain.gain.setTargetAtTime(0, now, 0.04);
    }

    // REV-UP SOUND: ONLY plays when the car is actively pressing throttle and accelerating forward
    const isRevvingUp = (throttle > 0 && !isBraking && this.carState.gear !== 'N' && kmh >= 1);

    if (isRevvingUp) {
      // Start or maintain revving acceleration audio
      if (!this.accelSource && this.audioBuffers.accel) {
        try {
          const src = this.audioCtx.createBufferSource();
          src.buffer = this.audioBuffers.accel;
          src.loop = false; // Plays naturally during rev up; does NOT loop into downshift!
          src.connect(this.accelGain);

          const offset = this.getAudioTimeForSpeed(kmh);
          const safeOffset = Math.max(0, Math.min(src.buffer.duration - 0.2, offset));
          src.start(0, safeOffset);
          this.accelSource = src;
          src.onended = () => {
            if (this.accelSource === src) this.accelSource = null;
          };
        } catch (e) {}
      }

      if (this.accelGain) {
        this.accelGain.gain.setTargetAtTime(0.85, now, 0.06);
      }
    } else {
      // While downshifting, coasting, braking, or off-throttle:
      // Rev-up sound is completely silenced so downshift audio plays cleanly without looping
      if (this.accelGain) {
        this.accelGain.gain.setTargetAtTime(0, now, 0.04);
      }
      if (this.accelSource && (isBraking || throttle === 0)) {
        try { this.accelSource.stop(); } catch(e){}
        this.accelSource = null;
      }
    }
  }

  stopAudio() {
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.1);
    }
    if (this.idleSource) {
      try { this.idleSource.stop(); } catch(e){}
      this.idleSource = null;
    }
    if (this.accelSource) {
      try { this.accelSource.stop(); } catch(e){}
      this.accelSource = null;
    }
  }

  resumeAudio() {
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(0.75, this.audioCtx.currentTime, 0.1);
    }
  }

  // =================================================================
  //  Events & Input Routing
  // =================================================================

  setupEvents() {
    this.isVisible = false;
    this.isLooping = false;
    if (this.container && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const wasVisible = this.isVisible;
          this.isVisible = entry.isIntersecting;
          if (this.isVisible) {
            this.ensureLoaded().then(() => {
              if (!wasVisible && !this.isLooping) {
                this.animate();
              }
            });
          } else if (wasVisible) {
            this.pause();
          }
        });
      }, { threshold: 0.01, rootMargin: '200px' });
      this.observer.observe(this.container);
    } else {
      this.isVisible = false;
    }

    if (this.startBtn) {
      this.startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.enterDriveMode();
      });
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', () => {
        if (!this.isActive) this.enterDriveMode();
      });
    }

    if (this.exitBtn) {
      this.exitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitDriveMode();
      });
    }

    // Prevent page scroll when wheeling inside game canvas while driving
    this.container.addEventListener('wheel', (e) => {
      if (this.isActive) {
        e.preventDefault();
      }
    }, { passive: false });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') {
        this.keys.forward = true;
        e.preventDefault();
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        this.keys.backward = true;
        e.preventDefault();
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        this.keys.left = true;
        e.preventDefault();
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        this.keys.right = true;
        e.preventDefault();
      } else if (code === 'Space') {
        this.keys.handbrake = true;
        e.preventDefault();
      } else if (code === 'Escape') {
        this.exitDriveMode();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') {
        this.keys.forward = false;
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        this.keys.backward = false;
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        this.keys.left = false;
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        this.keys.right = false;
      } else if (code === 'Space') {
        this.keys.handbrake = false;
      }
    });

    window.addEventListener('resize', () => this.onResize());

    // iPad / Mobile Touch Controls (only active on touch devices without fine mouse/hover)
    const isTouchDevice =
      (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) &&
      (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    if (isTouchDevice) {
      document.documentElement.classList.add('is-touch-device');
    }

    const bindHoldKey = (id, keyName) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isActive) return;
        this.keys[keyName] = true;
        btn.classList.add('is-pressed');
        try { btn.setPointerCapture(e.pointerId); } catch {}
      };
      const release = (e) => {
        if (e) e.stopPropagation();
        this.keys[keyName] = false;
        btn.classList.remove('is-pressed');
      };
      btn.addEventListener('pointerdown', press, { passive: false });
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    bindHoldKey('touch-left-btn', 'left');
    bindHoldKey('touch-right-btn', 'right');
    bindHoldKey('touch-gas-btn', 'forward');
    bindHoldKey('touch-brake-btn', 'backward');
    bindHoldKey('touch-handbrake-btn', 'handbrake');

    const touchEngineBtn = document.getElementById('touch-engine-btn');
    if (touchEngineBtn) {
      touchEngineBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isActive) return;
        this.initAudio();
        this.resumeAudio();
        this.startStartupSequence();
      }, { passive: false });
    }
  }

  enterDriveMode() {
    this.isActive = true;
    this.hasStarted = true;
    window.lenisInstance?.stop?.();
    this.onResize();
    this.snapCarToGround();
    this.initAudio();
    this.resumeAudio();

    // Start engine startup sequence on first ignition
    if (!this.hasStartedEngine) {
      this.startStartupSequence();
    }

    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    if (this.hud) {
      this.hud.classList.add('active');
    }

    this.container.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  exitDriveMode(notifyOrchestrator = true) {
    this.isActive = false;
    window.lenisInstance?.start?.();
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.handbrake = false;
    this.stopAudio();

    if (this.overlay) {
      this.overlay.classList.remove('hidden');
    }
    if (this.hud) {
      this.hud.classList.remove('active');
    }

    if (notifyOrchestrator && typeof window.gt40JourneyOrchestrator?.onExitDriveMode === 'function') {
      window.gt40JourneyOrchestrator.onExitDriveMode();
    }
  }

  // =================================================================
  //  Physics, Ground Tracking & Barrier Collisions
  // =================================================================

  checkBarrierCollisions(forwardX, forwardZ, delta) {
    if (this.barrierMeshes.length === 0) return;

    const s = this.carState;
    const carX = s.position.x;
    const carZ = s.position.z;

    // High-performance spatial prune: only test main circuit barrier meshes within 35m of the car
    const nearbyBarriers = this.barrierMeshes.filter(m => {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const box = m.geometry.boundingBox;
      return (
        box.min.x * 3 - 35 <= carX && carX <= box.max.x * 3 + 35 &&
        box.min.y * 3 - 35 <= carZ && carZ <= box.max.y * 3 + 35
      );
    });

    if (nearbyBarriers.length === 0) return;

    // Origin at bumper height
    const origin = new THREE.Vector3(s.position.x, s.position.y + 0.6, s.position.z);

    // Left normal (-forwardZ, 0, forwardX)
    const leftX = -forwardZ;
    const leftZ =  forwardX;

    // Continuous collision lookahead based on speed
    const lookahead = Math.max(0, Math.abs(s.speed) * delta * 1.5);

    // 8-point perimeter cocoon around the 3x GT40 Mk II
    const probes = [
      { dir: new THREE.Vector3(forwardX, 0, forwardZ), dist: 6.6 + lookahead },                          // Front bumper
      { dir: new THREE.Vector3(-forwardX, 0, -forwardZ), dist: 6.2 + lookahead },                       // Rear bumper
      { dir: new THREE.Vector3(-leftX, 0, -leftZ), dist: 2.85 },                                        // Left door flank
      { dir: new THREE.Vector3(leftX, 0, leftZ), dist: 2.85 },                                          // Right door flank
      { dir: new THREE.Vector3(forwardX * 0.8 - leftX * 0.6, 0, forwardZ * 0.8 - leftZ * 0.6), dist: 5.6 + lookahead }, // Front-left
      { dir: new THREE.Vector3(forwardX * 0.8 + leftX * 0.6, 0, forwardZ * 0.8 + leftZ * 0.6), dist: 5.6 + lookahead }, // Front-right
      { dir: new THREE.Vector3(-forwardX * 0.8 - leftX * 0.6, 0, -forwardZ * 0.8 - leftZ * 0.6), dist: 5.4 },           // Rear-left
      { dir: new THREE.Vector3(-forwardX * 0.8 + leftX * 0.6, 0, -forwardZ * 0.8 + leftZ * 0.6), dist: 5.4 }            // Rear-right
    ];

    for (let p of probes) {
      this.colRay.set(origin, p.dir);
      this.colRay.far = p.dist;
      const hits = this.colRay.intersectObjects(nearbyBarriers, true);

      if (hits.length > 0) {
        const hit = hits[0];
        const pushMag = (p.dist - hit.distance) + 0.15;
        const pushDir = hit.face ? hit.face.normal.clone() : p.dir.clone().negate();

        s.position.x += pushDir.x * pushMag;
        s.position.z += pushDir.z * pushMag;

        // Rebound speed penalty and deflection
        s.speed = -s.speed * 0.28;

        // Impact vibration
        this.impactShake = 0.12;
        break;
      }
    }
  }

  updatePhysics(delta) {
    const s = this.carState;

    // 1. Steering Dynamics: Halved sensitivity for smooth, balanced GT40 steering
    const speedRatio = Math.min(1.0, Math.abs(s.speed) / s.maxSpeed);
    const steerLimit = s.maxSteer * (1.0 - speedRatio * 0.35);

    let targetSteer = 0;
    if (this.keys.left)  targetSteer -= steerLimit;
    if (this.keys.right) targetSteer += steerLimit;

    // Smooth, progressive steering rate
    s.steerAngle += (targetSteer - s.steerAngle) * s.steerSpeed * delta;

    // 2. Throttle & Acceleration calibrated to match the uploaded audio
    let throttle = 0;
    let isBraking = false;
    const currentKmh = Math.abs(Math.round(s.speed * 3.6));

    // Dynamic acceleration calibrated per gear to match the 19.23s audio timeline:
    // Gear 1 (0 to 75 km/h in 3.3s): 6.31 m/s^2
    // Gear 2 (75 to 145 km/h in 3.3s): 5.89 m/s^2
    // Gear 3 (145 to 225 km/h in 4.7s): 4.73 m/s^2
    // Gear 4 (225 to 340 km/h in 7.9s): 4.04 m/s^2
    let currentAccel = 6.31;
    if (currentKmh >= 225) {
      currentAccel = 4.04;
    } else if (currentKmh >= 145) {
      currentAccel = 4.73;
    } else if (currentKmh >= 75) {
      currentAccel = 5.89;
    }

    if (this.keys.forward) {
      throttle = 1.0;
      if (s.speed < s.maxSpeed) {
        s.speed += currentAccel * delta;
      }
    } else if (this.keys.backward) {
      if (s.speed > 1.0) {
        s.speed -= s.brakeDecel * delta;
        isBraking = true;
      } else {
        if (s.speed > s.maxReverseSpeed) {
          s.speed -= (currentAccel * 0.5) * delta;
        }
      }
    } else {
      s.speed *= Math.pow(s.drag, delta * 60);
      if (Math.abs(s.speed) < 0.08) s.speed = 0;
    }

    // Handbrake slide
    if (this.keys.handbrake) {
      s.speed *= Math.pow(0.94, delta * 60);
      isBraking = true;
    }

    // Tail light illumination on brake
    this.brakeLights.forEach((light) => {
      if (light.material) {
        light.material.emissiveIntensity = isBraking ? 3.5 : 1.0;
      }
    });
    if (this.brakeLightGlow) {
      this.brakeLightGlow.intensity = isBraking ? 4.5 : 1.5;
    }

    // 3. Turning dynamics: Authentic wheelbase turning radius (halved turn sharpness)
    if (Math.abs(s.speed) > 0.1) {
      const turnDir = s.speed > 0 ? 1 : -1;
      const turnRadius = 5.2 / Math.tan(Math.max(0.001, Math.abs(s.steerAngle)));
      const angularSpeed = (s.speed / turnRadius) * Math.sign(s.steerAngle) * turnDir;
      s.rotation += angularSpeed * delta;
    }

    // 4. Update Position
    // Heading: at rotation = 0, car travels along +X axis (down Le Mans pit straight)
    const forwardX = Math.cos(s.rotation);
    const forwardZ = Math.sin(s.rotation);

    s.position.x += forwardX * s.speed * delta;
    s.position.z += forwardZ * s.speed * delta;

    // Check barrier and guardrail collisions
    this.checkBarrierCollisions(forwardX, forwardZ, delta);

    // 5. Robust Ground Tracking (Prevents the car from EVER going underground)
    // Cast ray straight down from 30 meters above the car across all ground/terrain meshes
    if (this.groundMeshes.length > 0) {
      this.downRay.set(
        new THREE.Vector3(s.position.x, s.position.y + 30.0, s.position.z),
        this.downDir
      );
      this.downRay.far = 100.0;
      const hits = this.downRay.intersectObjects(this.groundMeshes, true);

      if (hits.length > 0) {
        // Prefer main asphalt/road surface so overlapping curb/line triangles don't cause bumps
        const roadHit = hits.find((h) => {
          const n = (h.object?.material?.name || h.object?.name || '').toLowerCase();
          return n.includes('road') || n.includes('asphalt') || n.includes('start');
        });
        const targetGroundY = (roadHit || hits[0]).point.y + this.wheelOffset;
        s.position.y += (targetGroundY - s.position.y) * Math.min(1.0, 6.0 * delta);
      }
    }

    // Update car group position & rotation
    this.carGroup.position.copy(s.position);
    // In car model local space, front is +Z. Map forward (+X) to local +Z:
    this.carGroup.rotation.y = -s.rotation + Math.PI / 2;

    // Suspension pitch & roll dynamics
    const rollAngle = s.steerAngle * (s.speed / s.maxSpeed) * 0.12;
    const pitchAngle = isBraking ? 0.025 : (throttle > 0 ? -0.02 : 0);
    if (this.carModel) {
      this.carModel.rotation.z = rollAngle;
      this.carModel.rotation.x = pitchAngle;
    }

    // Keep sunlight target centered on car for crisp dynamic shadows
    if (this.sunLight) {
      this.sunLight.position.set(s.position.x + 120, s.position.y + 350, s.position.z + 80);
      this.sunLight.target.position.copy(s.position);
    }

    // 6. HUD Telemetry & Gear calculation (Synchronized with uploaded audio shift points)
    const prevGear = this.prevGear;

    if (s.speed < -0.5) {
      s.gear = 'R';
      s.rpm = 1200 + (Math.abs(s.speed) / 14) * 3500;
    } else if (currentKmh < 2) {
      s.gear = 'N';
      s.rpm = throttle > 0 ? 3200 : 1000;
    } else if (currentKmh < 75) {
      // 1st Gear: 0 to 75 km/h over 3.3s
      s.gear = 1;
      s.rpm = 1400 + (currentKmh / 75) * 5600; // 1400 -> 7000 RPM
    } else if (currentKmh < 145) {
      // 2nd Gear: 75 to 145 km/h over 3.3s (shift at 3.3s)
      s.gear = 2;
      s.rpm = 3600 + ((currentKmh - 75) / 70) * 3400; // 3600 -> 7000 RPM
    } else if (currentKmh < 225) {
      // 3rd Gear: 145 to 225 km/h over 4.7s (shift at 6.6s)
      s.gear = 3;
      s.rpm = 4000 + ((currentKmh - 145) / 80) * 3000; // 4000 -> 7000 RPM
    } else {
      // 4th Gear: 225 to 340 km/h over 7.9s (shift at 11.3s)
      s.gear = 4;
      s.rpm = 4400 + Math.min(1.0, (currentKmh - 225) / 115) * 2600; // 4400 -> 7000 RPM
    }

    const newGear = s.gear;
    // Downshift sound trigger whenever a downshift occurs (4 -> 3, 3 -> 2, 2 -> 1)
    if (typeof prevGear === 'number' && typeof newGear === 'number' && newGear < prevGear) {
      this.playDownshiftSound();
    }
    this.prevGear = newGear;

    if (this.speedEl) this.speedEl.textContent = currentKmh;
    if (this.gearEl) this.gearEl.textContent = s.gear;
    if (this.rpmBarEl) {
      const rpmRatio = Math.min(1.0, Math.max(0, (s.rpm - 1000) / 6000));
      this.rpmBarEl.style.width = `${rpmRatio * 100}%`;
    }

    // Update synchronized engine sound & downshift audio
    this.updateEngineAudio(currentKmh, throttle, isBraking);
  }

  // =================================================================
  //  Third-Person POV Camera Follow System (Proportional to 3x Car)
  // =================================================================

  updateCamera(delta) {
    const s = this.carState;

    // Keep high-res directional sun shadow frustum centered on the moving GT40
    if (this.sunLight) {
      this.sunLight.position.set(s.position.x + 38, s.position.y + 58, s.position.z - 28);
      this.sunLight.target.position.copy(s.position);
      this.sunLight.target.updateMatrixWorld();
    }

    if (this.isActive) {
      // Third-Person Chase POV with authentic racing proportions
      const forwardX = Math.cos(s.rotation);
      const forwardZ = Math.sin(s.rotation);

      // Camera distance and height scaled for the 3x car
      const followDist = 17.5 + (Math.abs(s.speed) / s.maxSpeed) * 3.5;
      const followHeight = 4.8 + (Math.abs(s.speed) / s.maxSpeed) * 0.8;

      const targetCamPos = new THREE.Vector3(
        s.position.x - forwardX * followDist,
        s.position.y + followHeight,
        s.position.z - forwardZ * followDist
      );

      // Camera looks 35 meters down the track ahead of the car
      const lookDist = 35.0;
      const targetLook = new THREE.Vector3(
        s.position.x + forwardX * lookDist,
        s.position.y + 1.8,
        s.position.z + forwardZ * lookDist
      );

      const lerpSpeed = Math.min(1.0, 8.5 * delta);
      this.currentCamPos.lerp(targetCamPos, lerpSpeed);
      this.currentCamLook.lerp(targetLook, lerpSpeed);

      // Impact shake on barrier collision
      if (this.impactShake > 0.001) {
        this.currentCamPos.x += (Math.random() - 0.5) * this.impactShake * 10;
        this.currentCamPos.y += (Math.random() - 0.5) * this.impactShake * 10;
        this.impactShake *= 0.82;
      }

      // High-speed vibration over 220 km/h (Mulsanne Straight feeling)
      if (Math.abs(s.speed) > 60.0) {
        const shake = (Math.random() - 0.5) * 0.04;
        this.currentCamPos.y += shake;
      }

      this.camera.position.copy(this.currentCamPos);
      this.camera.lookAt(this.currentCamLook);

      // Subtle high-speed FOV expansion (48 deg up to 54 deg)
      const targetFov = 48 + (Math.abs(s.speed) / s.maxSpeed) * 6;
      this.camera.fov += (targetFov - this.camera.fov) * (4.0 * delta);
      this.camera.updateProjectionMatrix();

    } else {
      // Idle showcase orbit mode around the GT40 parked on the Le Mans start grid
      const time = performance.now() * 0.0003;
      const orbitDist = 24.0;
      this.camera.position.set(
        s.position.x + Math.sin(time) * orbitDist,
        s.position.y + 5.2 + Math.cos(time * 0.5) * 1.0,
        s.position.z + Math.cos(time) * orbitDist
      );
      this.camera.lookAt(s.position.x, s.position.y + 1.5, s.position.z);
    }
  }

  // =================================================================
  //  Main Render Loop
  // =================================================================

  animate() {
    if (!this.isVisible || !this.isInitialized || !this.renderer) {
      this.isLooping = false;
      return;
    }
    this.isLooping = true;
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.isActive) {
      this.updatePhysics(delta);
    }

    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

// Auto-initialize when DOM is ready (handles both static and dynamic module import)
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.leMansGame = new LeMansGame();
  });
} else {
  window.leMansGame = new LeMansGame();
}
