/**
 * Period-Accurate 1966 Le Mans Racing Driver Character (Bruce McLaren Reference)
 * Seated in Right-Hand Drive (X = -0.28m) inside Ford GT40 Mk II Chassis P/1046.
 *
 * Historically grounded 1966 details:
 * - Period ice-blue / slate-grey fire-retardant Dunlop-style racing overalls
 * - Classic 1966 ivory-white open-face racing helmet with peak & chrome racing goggles
 * - Tan leather open-knuckle competition driving gloves gripping 9 & 3 o'clock wheel rim
 * - Black leather lace-up racing boots positioned at the clutch/brake/throttle pedals
 */

export function buildBruceMcLarenDriver(THREE, options = {}) {
  const cockpitObserverMode = Boolean(options.cockpitObserverMode);
  const tagName = options.hotspotName || 'bruce_mclaren_driver';

  const root = new THREE.Group();
  root.name = 'BruceMcLarenDriver';
  // Seated in RHD driver bucket at X = -0.28m (matching cockpit-sim.js RHD seat & wheel)
  root.position.set(-0.28, 0.0, 0.0);

  const interactives = [];
  const registerPart = (obj, label) => {
    obj.name = label || tagName;
    obj.userData.driverHotspot = true;
    obj.userData.isDriverInteractive = true;
    interactives.push(obj);
    return obj;
  };

  // Materials: authentic 1966 deep Dunlop slate-blue overalls, matte tan leather, ivory gloss helmet
  const suitMat = new THREE.MeshStandardMaterial({
    color: 0x164a96,
    roughness: 0.94,
    metalness: 0.0,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
  const suitTrimMat = new THREE.MeshStandardMaterial({
    color: 0x131d2d,
    roughness: 0.85,
    metalness: 0.04
  });
  const helmetShellMat = new THREE.MeshStandardMaterial({
    color: 0xebe6d8,
    roughness: 0.28,
    metalness: 0.04,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
  const trimBandMat = new THREE.MeshStandardMaterial({
    color: 0x164e3f, // Classic dark Cooper/McLaren racing green band
    roughness: 0.35,
    metalness: 0.1
  });
  const leatherGloveMat = new THREE.MeshStandardMaterial({
    color: 0x704224,
    roughness: 0.62,
    metalness: 0.06,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0
  });
  const bootLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.55,
    metalness: 0.12
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd6a384,
    roughness: 0.68,
    metalness: 0.02
  });
  const goggleChromeMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde4,
    metalness: 0.9,
    roughness: 0.18
  });
  const goggleLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e242c,
    roughness: 0.08,
    metalness: 0.15,
    transmission: 0.35,
    transparent: true,
    opacity: 0.82
  });

  // 1. Pelvis & Seated Torso (reclined naturally inside bucket backrest at Z = -0.10..+0.02)
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.10, 0.22), suitMat);
  pelvis.position.set(0, -0.05, 0.02);
  root.add(registerPart(pelvis, tagName));

  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.0, -0.02);
  // Subtle recline matching 1966 GT40 seat angle (backrest tilted ~14 deg back)
  torsoPivot.rotation.x = -0.22;
  root.add(torsoPivot);

  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.132, 0.36, 16), suitMat);
  torsoMesh.scale.set(1.12, 1.0, 0.72);
  torsoMesh.position.set(0, 0.18, 0);
  torsoPivot.add(registerPart(torsoMesh, tagName));

  // Period belt & silver buckle
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.036, 0.21), suitTrimMat);
  belt.position.set(0, 0.03, 0);
  torsoPivot.add(belt);

  const lapBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.044, 0.022), goggleChromeMat);
  lapBuckle.position.set(0, 0.03, 0.105);
  torsoPivot.add(lapBuckle);

  // 4-point competition racing harness shoulder straps
  const harnessMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.78, metalness: 0.08 });
  [-0.078, 0.078].forEach((sx) => {
    const strapFront = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.34, 0.016), harnessMat);
    strapFront.position.set(sx, 0.19, 0.102);
    strapFront.rotation.x = 0.04;
    torsoPivot.add(strapFront);
  });

  // Suit center brass/silver zipper seam
  const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.30, 0.008), goggleChromeMat);
  zipper.position.set(0, 0.20, 0.104);
  torsoPivot.add(zipper);

  // Race suit high mandarin collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.078, 0.055, 16), suitMat);
  collar.position.set(0, 0.36, 0.005);
  torsoPivot.add(collar);

  // Subtle Dunlop & Ford team breast patches
  const patchMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.022, 0.01), patchMat);
  patch.position.set(0.08, 0.24, 0.095);
  torsoPivot.add(patch);

  const fordPatchMat = new THREE.MeshBasicMaterial({ color: 0xf4f3ee });
  const fordPatch = new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.020, 0.01), fordPatchMat);
  fordPatch.position.set(-0.08, 0.24, 0.095);
  torsoPivot.add(fordPatch);

  // 2. Period 1966 Open-Face Helmet & Neck/Head Assembly
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.05, 12), skinMat);
  neck.position.set(0, 0.39, 0.01);
  torsoPivot.add(neck);

  const headPivot = new THREE.Group();
  // Kept slightly back along reclined torso so in cockpit forward sightline (z = +0.08) it NEVER clips camera
  headPivot.position.set(0, 0.46, 0.01);
  // Counter-tilt slightly forward so driver's gaze tracks straight down Mulsanne Straight
  headPivot.rotation.x = 0.20;
  torsoPivot.add(headPivot);

  // Ivory-white 1966 open-face fiberglass shell
  const helmetDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.104, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.72),
    helmetShellMat
  );
  helmetDome.scale.set(0.94, 1.04, 1.08);
  headPivot.add(registerPart(helmetDome, tagName));

  // Signature dark racing stripe band around lower rim
  const helmetBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.102, 0.104, 0.022, 24, 1, true),
    trimBandMat
  );
  helmetBand.position.set(0, -0.02, 0);
  helmetBand.scale.set(0.94, 1.0, 1.08);
  headPivot.add(helmetBand);

  // Short black snap-on peak visor above brow
  const peakGeo = new THREE.CylinderGeometry(0.108, 0.114, 0.010, 20, 1, false, -0.65, 1.3);
  const peak = new THREE.Mesh(peakGeo, suitTrimMat);
  peak.position.set(0, 0.038, 0.032);
  peak.rotation.x = 0.26;
  headPivot.add(peak);

  // Face jaw / chin / nose inside open-face aperture
  const faceHead = new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 14), skinMat);
  faceHead.position.set(0, -0.025, 0.025);
  faceHead.scale.set(0.86, 1.05, 0.92);
  headPivot.add(registerPart(faceHead, tagName));

  // Sculpted nose bridge & helmet ear-cup padding
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.024), skinMat);
  nose.position.set(0, -0.022, 0.094);
  nose.rotation.x = -0.18;
  headPivot.add(nose);

  [-0.095, 0.095].forEach((ex) => {
    const earCup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 12), bootLeatherMat);
    earCup.rotation.z = Math.PI / 2;
    earCup.position.set(ex, -0.022, 0.008);
    headPivot.add(earCup);
  });

  // Vintage 1960s split-bridge racing goggles
  const makeGoggleEye = (gx) => {
    const g = new THREE.Group();
    g.position.set(gx, 0.008, 0.095);
    g.rotation.y = gx < 0 ? -0.18 : 0.18;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0038, 8, 18), goggleChromeMat);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.020, 16), goggleLensMat);
    lens.position.z = 0.002;
    g.add(rim, lens);
    return g;
  };
  headPivot.add(makeGoggleEye(-0.030));
  headPivot.add(makeGoggleEye(0.030));
  const goggleBridge = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.006), goggleChromeMat);
  goggleBridge.position.set(0, 0.008, 0.098);
  headPivot.add(goggleBridge);

  // Leather goggle strap around helmet sides
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.102, 0.007, 8, 24), leatherGloveMat);
  strap.rotation.x = Math.PI / 2;
  strap.position.y = 0.008;
  strap.scale.set(0.95, 1.12, 1.0);
  headPivot.add(strap);

  // Leather chin strap
  const chinStrap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.022), bootLeatherMat);
  chinStrap.position.set(0, -0.088, 0.038);
  headPivot.add(chinStrap);

  // 3. Arms & Leather Gloved Hands Naturally Holding Moto-Lita Steering Wheel (9 & 3 o'clock)
  // Wheel center sits in local driver space at (0, 0.25, 0.44), rim radius 0.185 tilted rotation.x = -0.32
  const wheelHandsPivot = new THREE.Group();
  wheelHandsPivot.position.set(0, 0.25, 0.44);
  wheelHandsPivot.rotation.x = -0.32;
  root.add(wheelHandsPivot);

  const createArmAndHand = (sideSign) => {
    // Upper arm from shoulder down to elbow
    const shoulder = new THREE.Vector3(sideSign * 0.175, 0.265, -0.075);
    const elbow = new THREE.Vector3(sideSign * 0.205, 0.145, 0.165);
    const wristTarget = new THREE.Vector3(sideSign * 0.182, 0.25, 0.415);

    const makeLimb = (a, b, rA, rB, mat) => {
      const vec = b.clone().sub(a);
      const len = vec.length();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rA, rB, len, 12), mat);
      mesh.position.copy(a).addScaledVector(vec, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec.normalize());
      return registerPart(mesh, tagName);
    };

    const upperArm = makeLimb(shoulder, elbow, 0.052, 0.044, suitMat);
    const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 10), suitMat);
    elbowCap.position.copy(elbow);
    const foreArm = makeLimb(elbow, wristTarget, 0.042, 0.033, suitMat);

    // Shoulder joint cap
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.054, 12, 12), suitMat);
    shoulderCap.position.copy(shoulder);

    root.add(shoulderCap, upperArm, elbowCap, foreArm);

    // Gloved hand anchored on wheelHandsPivot so fingers rotate cleanly with tiny steering corrections
    const handGroup = new THREE.Group();
    handGroup.position.set(sideSign * 0.184, 0.0, 0.004);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.072, 0.036), leatherGloveMat);
    registerPart(palm, tagName);
    handGroup.add(palm);

    // Wrapped fingers around outer rim
    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.068, 10), leatherGloveMat);
    knuckle.position.set(sideSign * 0.008, 0, 0.010);
    handGroup.add(registerPart(knuckle, tagName));

    // Thumb resting inside rim spoke
    const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.010, 0.042, 8), leatherGloveMat);
    thumb.position.set(-sideSign * 0.014, 0.025, 0.004);
    thumb.rotation.z = sideSign * 0.45;
    handGroup.add(thumb);

    wheelHandsPivot.add(handGroup);
    return { foreArm, handGroup };
  };

  createArmAndHand(-1); // Right hand / sleeve (outer door side)
  createArmAndHand(1);  // Left hand / sleeve (inboard center side)

  // 4. Thighs, Knees & Racing Boots Positioned Naturally Near Pedals (Z = 0.78)
  [-0.075, 0.075].forEach((lx) => {
    const hip = new THREE.Vector3(lx, -0.06, 0.08);
    const knee = new THREE.Vector3(lx * 1.15, -0.01, 0.46);
    const ankle = new THREE.Vector3(lx * 0.9, -0.17, 0.74);

    const makeLegSeg = (a, b, rA, rB) => {
      const vec = b.clone().sub(a);
      const len = vec.length();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rA, rB, len, 12), suitMat);
      mesh.position.copy(a).addScaledVector(vec, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec.normalize());
      return registerPart(mesh, tagName);
    };

    root.add(makeLegSeg(hip, knee, 0.068, 0.056));
    const kneeCap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), suitMat);
    kneeCap.position.copy(knee);
    root.add(kneeCap);
    root.add(makeLegSeg(knee, ankle, 0.052, 0.040));

    // Narrow 1960s driving boot poised near pedal pad
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.065, 0.145), bootLeatherMat);
    boot.position.set(ankle.x, ankle.y + 0.01, ankle.z + 0.045);
    boot.rotation.x = 0.42;
    root.add(registerPart(boot, tagName));
  });

  // In cockpit observer mode, ensure rear of helmet doesn't cast hard shadow right over eye lens
  if (cockpitObserverMode) {
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = false;
        obj.receiveShadow = true;
      }
    });
  }

  // Highlight state toggle for hover & Meet the Driver interaction (keeps rich blue suit saturation!)
  const setHighlighted = (active) => {
    suitMat.emissive.setHex(active ? 0x1e60b8 : 0x000000);
    suitMat.emissiveIntensity = active ? 0.36 : 0.0;
    helmetShellMat.emissive.setHex(active ? 0xf0cc52 : 0x000000);
    helmetShellMat.emissiveIntensity = active ? 0.14 : 0.0;
    leatherGloveMat.emissive.setHex(active ? 0xf0cc52 : 0x000000);
    leatherGloveMat.emissiveIntensity = active ? 0.24 : 0.0;
  };

  // Subtle lifelike animation synced with engine vibration, speed, and micro-steering
  const update = (timeSec, { rpm = 900, speed = 0, steerInput = 0, highlighted = false } = {}) => {
    const breathe = Math.sin(timeSec * 1.9) * 0.004;
    const roadJitter = speed > 1 ? Math.sin(timeSec * 14.0) * 0.0022 : 0;
    const idleVib = rpm > 100 ? Math.sin(timeSec * 28.0) * 0.0012 : 0;

    torsoPivot.position.y = breathe + roadJitter;
    torsoPivot.rotation.x = -0.22 + (speed > 40 ? -0.015 : 0) + idleVib;

    // Gentle alert head anticipation + natural gaze toward upcoming turn or user focus
    const headScan = highlighted ? 0.18 : Math.sin(timeSec * 0.65) * 0.045 + steerInput * 0.4;
    headPivot.rotation.y += (headScan - headPivot.rotation.y) * 0.08;
    headPivot.rotation.x = 0.20 + Math.sin(timeSec * 1.1) * 0.018;

    // Micro steering inputs matching road tarmac curvature
    const targetSteer = steerInput + (speed > 2 ? Math.sin(timeSec * 1.7) * 0.032 : 0);
    wheelHandsPivot.rotation.z += (targetSteer - wheelHandsPivot.rotation.z) * 0.12;
  };

  // Anchor world-space reference inside root for Cockpit focus glide / hotspot badge
  const driverFocusLocal = new THREE.Vector3(0, 0.36, -0.02);

  return {
    root,
    interactives,
    wheelHandsPivot,
    headPivot,
    driverFocusLocal,
    setHighlighted,
    update
  };
}
