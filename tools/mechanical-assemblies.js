export function addMechanicalAssemblies(modelRoot, THREE) {
  const parts_mechanical = {
    engineDetails: new THREE.Group(),
    valveCovers: { group: new THREE.Group(), left: null, right: null },
    engineAccessories: new THREE.Group(),
    transaxleDetails: new THREE.Group(),
    exhaust: new THREE.Group(),
    suspensionDetails: { FL: new THREE.Group(), FR: new THREE.Group(), RL: new THREE.Group(), RR: new THREE.Group() },
    swayBars: new THREE.Group(),
    brakeSystem: { group: new THREE.Group(), corners: {} },
    frontCooling: new THREE.Group(),
    fuelSystem: { group: new THREE.Group(), leftBladder: null, rightBladder: null },
    cockpitDetails: new THREE.Group(),
    chassisDetails: new THREE.Group()
  };

    // Shared Engineering & Patina Materials
    const alumSpunMat = new THREE.MeshStandardMaterial({
      color: 0xd4d8df,
      metalness: 0.88,
      roughness: 0.25
    });

    const carbGoldMat = new THREE.MeshStandardMaterial({
      color: 0xbfa348,
      metalness: 0.82,
      roughness: 0.35
    });

    const finnedValveCoverMat = new THREE.MeshStandardMaterial({
      color: 0xc8ccd6,
      metalness: 0.90,
      roughness: 0.22
    });

    const ceramicExhaustMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8ea,
      metalness: 0.12,
      roughness: 0.58
    });

    const transMagnesiumMat = new THREE.MeshStandardMaterial({
      color: 0x8a929d,
      metalness: 0.85,
      roughness: 0.38
    });

    const steelShaftMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      metalness: 0.80,
      roughness: 0.40
    });

    const orangeSpringMat = new THREE.MeshStandardMaterial({
      color: 0xee5514,
      metalness: 0.20,
      roughness: 0.35
    });

    const chromeDamperMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f7,
      metalness: 0.95,
      roughness: 0.10
    });

    const caliperGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd8aa34,
      metalness: 0.85,
      roughness: 0.32
    });

    const castIronRotorMat = new THREE.MeshStandardMaterial({
      color: 0x6e7278,
      metalness: 0.70,
      roughness: 0.45
    });

    const fuelBladderMat = new THREE.MeshStandardMaterial({
      color: 0x16181c,
      metalness: 0.08,
      roughness: 0.85
    });

    const dashMat = new THREE.MeshStandardMaterial({
      color: 0x121316,
      metalness: 0.20,
      roughness: 0.75
    });

    const anFittingBlue = new THREE.MeshStandardMaterial({
      color: 0x1177ee,
      metalness: 0.85,
      roughness: 0.25
    });

    const anFittingRed = new THREE.MeshStandardMaterial({
      color: 0xdd2233,
      metalness: 0.85,
      roughness: 0.25
    });

    // 1. ENGINE INTAKE: 8 Spun-Aluminum Velocity Stacks & Twin Holley 4-BBL Carburetors
    const engGroup = parts_mechanical.engineDetails;
    engGroup.name = 'Engine_Intake_Assembly';
    engGroup.userData.subsystem = 'engine';

    // Twin Holley Carburetor Bases
    [-0.32, -0.52].forEach((carbZ) => {
      const carbBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.14), carbGoldMat);
      carbBody.position.set(0, 0.38, carbZ);
      carbBody.castShadow = true;
      engGroup.add(carbBody);

      // Float bowls
      [-0.14, 0.14].forEach((bowlX) => {
        const bowl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.10), carbGoldMat);
        bowl.position.set(bowlX, 0.37, carbZ);
        engGroup.add(bowl);
      });

      // Braided fuel line & AN fittings
      const fuelLine = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.32, 12), steelShaftMat);
      fuelLine.rotation.z = Math.PI / 2;
      fuelLine.position.set(0, 0.39, carbZ + 0.06);
      engGroup.add(fuelLine);

      const fitBlue = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), anFittingBlue);
      fitBlue.rotation.z = Math.PI / 2;
      fitBlue.position.set(-0.16, 0.39, carbZ + 0.06);
      engGroup.add(fitBlue);

      const fitRed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), anFittingRed);
      fitRed.rotation.z = Math.PI / 2;
      fitRed.position.set(0.16, 0.39, carbZ + 0.06);
      engGroup.add(fitRed);
    });

    // 8 Spun Aluminum Bellmouth Velocity Trumpets (4 per bank) with Debris Mesh
    const zStacks = [-0.26, -0.36, -0.48, -0.58];
    zStacks.forEach((zPos) => {
      [-0.075, 0.075].forEach((xPos) => {
        const trumpetGroup = new THREE.Group();
        trumpetGroup.position.set(xPos, 0.42, zPos);

        const runner = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.08, 24, 1, true), alumSpunMat);
        runner.position.y = 0.04;
        trumpetGroup.add(runner);

        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.024, 0.035, 24, 1, true), alumSpunMat);
        bell.position.y = 0.09;
        trumpetGroup.add(bell);

        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.003, 12, 24), alumSpunMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.107;
        trumpetGroup.add(rim);

        // Stainless fine wire mesh debris screen inside bellmouth
        const meshScreen = new THREE.Mesh(
          new THREE.CircleGeometry(0.035, 16),
          new THREE.MeshStandardMaterial({ color: 0x828892, metalness: 0.85, roughness: 0.35, wireframe: true, side: THREE.DoubleSide })
        );
        meshScreen.rotation.x = -Math.PI / 2;
        meshScreen.position.y = 0.092;
        trumpetGroup.add(meshScreen);

        engGroup.add(trumpetGroup);
      });
    });

    // Mallory Dual-Point Competition Distributor & 8 Red 8mm Spark Plug Ignition Cables
    const dist = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.07, 16), new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 0.4 }));
    dist.position.set(0.0, 0.38, -0.16);
    engGroup.add(dist);

    const sparkWireMat = new THREE.MeshStandardMaterial({
      color: 0xee2211,
      roughness: 0.35,
      metalness: 0.10
    });
    const sparkBootMat = new THREE.MeshStandardMaterial({
      color: 0x111114,
      roughness: 0.80
    });

    zStacks.forEach((zCyl, idx) => {
      [-1, 1].forEach((side) => {
        const startX = side * (0.012 + (idx % 2) * 0.008);
        const startY = 0.42;
        const startZ = -0.16 + (idx * 0.006 - 0.012);

        const endX = side * 0.22;
        const endY = 0.35;
        const endZ = zCyl;

        const midX = side * 0.14;
        const midY = 0.41;
        const midZ = (startZ + endZ) * 0.5;

        const wireCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(startX, startY, startZ),
          new THREE.Vector3(midX, midY, midZ),
          new THREE.Vector3(endX, endY, endZ)
        ]);
        const wireTube = new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 12, 0.0035, 6, false), sparkWireMat);
        engGroup.add(wireTube);

        const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8), sparkBootMat);
        boot.rotation.z = side * Math.PI / 4;
        boot.position.set(endX, endY, endZ);
        engGroup.add(boot);
      });
    });

    // Dual Holley Throttle Linkage Rod & Return Springs
    const linkageRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 8), carbGoldMat);
    linkageRod.rotation.x = Math.PI / 2;
    linkageRod.position.set(-0.13, 0.38, -0.42);
    engGroup.add(linkageRod);

    // Dry Sump 12-Quart Oil Tank & Aeroquip Lines
    const drySumpGroup = new THREE.Group();
    drySumpGroup.name = 'Dry_Sump_Oil_System';
    drySumpGroup.userData.subsystem = 'engine';

    const oilTank = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.30, 20), alumSpunMat);
    oilTank.position.set(0.42, 0.32, -0.75);
    oilTank.castShadow = true;
    drySumpGroup.add(oilTank);

    const tankCap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), anFittingBlue);
    tankCap.position.set(0.42, 0.48, -0.75);
    drySumpGroup.add(tankCap);

    const oilLineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.42, 0.22, -0.75),
      new THREE.Vector3(0.28, 0.26, -0.65),
      new THREE.Vector3(0.12, 0.30, -0.52)
    ]);
    const oilLine = new THREE.Mesh(new THREE.TubeGeometry(oilLineCurve, 18, 0.012, 8, false), steelShaftMat);
    drySumpGroup.add(oilLine);

    const anFitting1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 6), anFittingRed);
    anFitting1.position.set(0.42, 0.22, -0.75);
    drySumpGroup.add(anFitting1);

    engGroup.add(drySumpGroup);

    // Lucas Competition Twin Ignition Coils
    [-0.14, 0.14].forEach((coilX) => {
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.11, 12), anFittingRed);
      coil.position.set(coilX, 0.48, -0.16);
      coil.castShadow = true;
      engGroup.add(coil);

      const coilTop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 8), steelShaftMat);
      coilTop.position.set(coilX, 0.54, -0.16);
      engGroup.add(coilTop);
    });

    // push(engGroup);
    modelRoot.add(engGroup);

    // 2. ENGINE VALVE COVERS: Finned Cast Aluminum "FORD 427" on Left & Right Heads
    const vcGroup = parts_mechanical.valveCovers.group;
    vcGroup.name = 'Engine_Valve_Covers';
    vcGroup.userData.subsystem = 'engine';

    [-0.22, 0.22].forEach((vcX) => {
      const bankGroup = new THREE.Group();
      bankGroup.position.set(vcX, 0.36, -0.42);
      bankGroup.rotation.z = vcX > 0 ? -0.32 : 0.32;

      const vcBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.065, 0.46), finnedValveCoverMat);
      vcBody.castShadow = true;
      bankGroup.add(vcBody);

      for (let f = -3; f <= 3; f++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.44), finnedValveCoverMat);
        fin.position.set(f * 0.015, 0.038, 0);
        bankGroup.add(fin);
      }

      const breather = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.035, 16), chromeDamperMat);
      breather.position.set(0, 0.052, 0.12);
      bankGroup.add(breather);

      vcGroup.add(bankGroup);
      if (vcX < 0) parts_mechanical.valveCovers.left = bankGroup;
      else parts_mechanical.valveCovers.right = bankGroup;
    });
    // push(vcGroup);
    modelRoot.add(vcGroup);

    // 3. ENGINE FRONT ACCESSORIES: Lucas Alternator, Crank Pulley, Belt, Starter & Fram Filter
    const engAcc = parts_mechanical.engineAccessories;
    engAcc.name = 'Engine_Accessories';
    engAcc.userData.subsystem = 'engine';

    const altBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.075, 16), transMagnesiumMat);
    altBody.rotation.x = Math.PI / 2;
    altBody.position.set(-0.24, 0.26, -0.14);
    engAcc.add(altBody);

    const altPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.018, 16), steelShaftMat);
    altPulley.rotation.x = Math.PI / 2;
    altPulley.position.set(-0.24, 0.26, -0.095);
    engAcc.add(altPulley);

    const crankPulley = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.024, 20), steelShaftMat);
    crankPulley.rotation.x = Math.PI / 2;
    crankPulley.position.set(0.0, 0.16, -0.095);
    engAcc.add(crankPulley);

    const starter = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.14, 16), steelShaftMat);
    starter.rotation.x = Math.PI / 2;
    starter.position.set(0.24, 0.10, -0.62);
    engAcc.add(starter);

    const solenoid = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.10, 12), chromeDamperMat);
    solenoid.rotation.x = Math.PI / 2;
    solenoid.position.set(0.24, 0.145, -0.62);
    engAcc.add(solenoid);

    const oilFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.11, 16), orangeSpringMat);
    oilFilter.rotation.z = Math.PI / 3;
    oilFilter.position.set(-0.24, 0.12, -0.32);
    engAcc.add(oilFilter);

    // push(engAcc);
    modelRoot.add(engAcc);

    // 4. "BUNDLE OF SNAKES" 8-INTO-2 CERAMIC CROSSOVER EXHAUST SYSTEM
    const exhaustGroup = parts_mechanical.exhaust;
    exhaustGroup.name = 'Exhaust_Bundle_Of_Snakes';
    exhaustGroup.userData.subsystem = 'exhaust';

    for (let c = 0; c < 4; c++) {
      const zCyl = zStacks[c];

      const leftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.16, 0.22, zCyl),
        new THREE.Vector3(-0.24, 0.32, zCyl - 0.05),
        new THREE.Vector3(-0.12, 0.40, -0.65 - c * 0.08),
        new THREE.Vector3(0.04, 0.35, -0.95 - c * 0.06),
        new THREE.Vector3(0.065, 0.24, -1.45)
      ]);
      const leftTube = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 28, 0.016, 12, false), ceramicExhaustMat);
      leftTube.castShadow = true;
      exhaustGroup.add(leftTube);

      const rightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.16, 0.22, zCyl),
        new THREE.Vector3(0.24, 0.32, zCyl - 0.05),
        new THREE.Vector3(0.12, 0.40, -0.65 - c * 0.08),
        new THREE.Vector3(-0.04, 0.35, -0.95 - c * 0.06),
        new THREE.Vector3(-0.065, 0.24, -1.45)
      ]);
      const rightTube = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 28, 0.016, 12, false), ceramicExhaustMat);
      rightTube.castShadow = true;
      exhaustGroup.add(rightTube);
    }

    // Dual Megaphone Tailpipes exiting rear
    [-0.065, 0.065].forEach((tailX) => {
      const mega = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.024, 0.30, 20, 1, true),
        ceramicExhaustMat
      );
      mega.rotation.x = Math.PI / 2;
      mega.position.set(tailX, 0.24, -1.60);
      mega.castShadow = true;
      exhaustGroup.add(mega);
    });

    // push(exhaustGroup);
    modelRoot.add(exhaustGroup);

    // 5. KAR KRAFT T-44 TRANSAXLE & HALFSHAFTS
    const transGroup = parts_mechanical.transaxleDetails;
    transGroup.name = 'Transaxle_T44_Assembly';
    transGroup.userData.subsystem = 'transmission';

    const tCase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.52), transMagnesiumMat);
    tCase.position.set(0, 0.14, -1.05);
    tCase.castShadow = true;
    transGroup.add(tCase);

    const diffBell = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.28, 24), transMagnesiumMat);
    diffBell.rotation.z = Math.PI / 2;
    diffBell.position.set(0, 0.10, -0.95);
    diffBell.castShadow = true;
    transGroup.add(diffBell);

    for (let r = 0; r < 6; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.44), transMagnesiumMat);
      rib.position.set(0, 0.06 + r * 0.032, -1.05);
      transGroup.add(rib);
    }

    const rearCover = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), transMagnesiumMat);
    rearCover.rotation.x = Math.PI / 2;
    rearCover.position.set(0, 0.14, -1.33);
    transGroup.add(rearCover);

    [-1, 1].forEach((side) => {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 16), steelShaftMat);
      shaft.rotation.z = (Math.PI / 2) * side;
      shaft.position.set(side * 0.42, 0.10, -0.95);
      transGroup.add(shaft);

      const bootIn = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.024, 0.07, 16), steelShaftMat);
      bootIn.rotation.z = (Math.PI / 2) * side;
      bootIn.position.set(side * 0.20, 0.10, -0.95);
      transGroup.add(bootIn);

      const bootOut = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.036, 0.07, 16), steelShaftMat);
      bootOut.rotation.z = (Math.PI / 2) * side;
      bootOut.position.set(side * 0.62, 0.10, -0.95);
      transGroup.add(bootOut);
    });

    // push(transGroup);
    modelRoot.add(transGroup);

    // 6. PHIL REMINGTON QUICK-CHANGE LE MANS BRAKE SYSTEM (All 4 Corners)
    const brakeGroup = parts_mechanical.brakeSystem.group;
    brakeGroup.name = 'Brake_System_QuickChange';
    brakeGroup.userData.subsystem = 'brakes';

    const brakeCorners = [
      { key: 'FL', x: -0.76, y: 0.02, z: 1.25, rotY: 0 },
      { key: 'FR', x: 0.76,  y: 0.02, z: 1.25, rotY: Math.PI },
      { key: 'RL', x: -0.76, y: 0.02, z: -1.10, rotY: 0 },
      { key: 'RR', x: 0.76,  y: 0.02, z: -1.10, rotY: Math.PI }
    ];

    brakeCorners.forEach((bc) => {
      const cornerGroup = new THREE.Group();
      cornerGroup.name = `Brake_${bc.key}`;
      cornerGroup.position.set(bc.x, bc.y, bc.z);
      cornerGroup.rotation.y = bc.rotY;

      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.028, 28), castIronRotorMat);
      rotor.rotation.z = Math.PI / 2;
      cornerGroup.add(rotor);

      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.035, 20), alumSpunMat);
      hat.rotation.z = Math.PI / 2;
      cornerGroup.add(hat);

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.16), caliperGoldMat);
      caliper.position.set(0.02, 0.11, 0.04);
      cornerGroup.add(caliper);

      const pin1 = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 6), chromeDamperMat);
      pin1.position.set(0.055, 0.13, 0.02);
      cornerGroup.add(pin1);
      const pin2 = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 6), chromeDamperMat);
      pin2.position.set(0.055, 0.13, 0.07);
      cornerGroup.add(pin2);

      parts_mechanical.brakeSystem.corners[bc.key] = cornerGroup;
      brakeGroup.add(cornerGroup);
    });

    // push(brakeGroup);
    modelRoot.add(brakeGroup);

    // 7. SUSPENSION: KONI COILOVERS & TUBULAR A-ARMS AT ALL 4 CORNERS
    const corners = [
      { key: 'FL', x: -0.68, y: 0.05, z: 1.25, tiltZ: 0.22 },
      { key: 'FR', x: 0.68,  y: 0.05, z: 1.25, tiltZ: -0.22 },
      { key: 'RL', x: -0.66, y: 0.08, z: -1.08, tiltZ: 0.26 },
      { key: 'RR', x: 0.66,  y: 0.08, z: -1.08, tiltZ: -0.26 }
    ];

    corners.forEach((c) => {
      const coilGroup = new THREE.Group();
      coilGroup.name = `Suspension_${c.key}`;
      coilGroup.position.set(c.x, c.y, c.z);
      coilGroup.userData.subsystem = 'suspension';

      const damper = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.28, 16), chromeDamperMat);
      damper.rotation.z = c.tiltZ;
      coilGroup.add(damper);

      const springPts = [];
      const turns = 7;
      const totalH = 0.22;
      const radius = 0.036;
      for (let s = 0; s <= 90; s++) {
        const u = s / 90;
        const theta = u * turns * Math.PI * 2;
        const sy = (u - 0.5) * totalH;
        const sx = Math.cos(theta) * radius;
        const sz = Math.sin(theta) * radius;
        springPts.push(new THREE.Vector3(sx, sy, sz));
      }
      const springCurve = new THREE.CatmullRomCurve3(springPts);
      const springTube = new THREE.Mesh(new THREE.TubeGeometry(springCurve, 72, 0.007, 8, false), orangeSpringMat);
      springTube.rotation.z = c.tiltZ;
      springTube.castShadow = true;
      coilGroup.add(springTube);

      [-0.08, 0.08].forEach((armY) => {
        const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.26, 8), steelShaftMat);
        arm1.rotation.set(0, 0.35, Math.PI / 2 * Math.sign(-c.x));
        arm1.position.set(-c.x * 0.12, armY, 0.05);
        coilGroup.add(arm1);

        const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.26, 8), steelShaftMat);
        arm2.rotation.set(0, -0.35, Math.PI / 2 * Math.sign(-c.x));
        arm2.position.set(-c.x * 0.12, armY, -0.05);
        coilGroup.add(arm2);
      });

      parts_mechanical.suspensionDetails[c.key] = coilGroup;
      // push(coilGroup);
      modelRoot.add(coilGroup);
    });

    // 8. FRONT & REAR TUBULAR ANTI-ROLL SWAY BARS
    const swayBarGroup = parts_mechanical.swayBars;
    swayBarGroup.name = 'Suspension_SwayBars';
    swayBarGroup.userData.subsystem = 'suspension';

    const fSwayPts = [
      new THREE.Vector3(-0.62, 0.06, 1.28),
      new THREE.Vector3(-0.52, -0.02, 1.38),
      new THREE.Vector3(0.0, -0.02, 1.40),
      new THREE.Vector3(0.52, -0.02, 1.38),
      new THREE.Vector3(0.62, 0.06, 1.28)
    ];
    const fSwayMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fSwayPts), 24, 0.011, 8, false), steelShaftMat);
    swayBarGroup.add(fSwayMesh);

    [-0.62, 0.62].forEach((xL) => {
      const dropLink = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.09, 8), carbGoldMat);
      dropLink.position.set(xL, 0.02, 1.28);
      swayBarGroup.add(dropLink);
    });

    const rSwayPts = [
      new THREE.Vector3(-0.60, 0.08, -1.04),
      new THREE.Vector3(-0.48, 0.00, -1.00),
      new THREE.Vector3(0.0, 0.00, -0.98),
      new THREE.Vector3(0.48, 0.00, -1.00),
      new THREE.Vector3(0.60, 0.08, -1.04)
    ];
    const rSwayMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rSwayPts), 24, 0.011, 8, false), steelShaftMat);
    swayBarGroup.add(rSwayMesh);

    // push(swayBarGroup);
    modelRoot.add(swayBarGroup);

    // 9. FRONT COOLING RADIATOR, EXPANSION TANK & BRAKE DUCTING
    const coolingGroup = parts_mechanical.frontCooling;
    coolingGroup.name = 'Cooling_Assembly';
    coolingGroup.userData.subsystem = 'cooling';

    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.06), new THREE.MeshStandardMaterial({
      color: 0x363a42,
      roughness: 0.70,
      metalness: 0.55
    }));
    rad.rotation.x = -Math.PI / 5;
    rad.position.set(0, 0.08, 1.48);
    rad.castShadow = true;
    coolingGroup.add(rad);

    [-0.18, 0.18].forEach((fanX) => {
      const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 12, 24), alumSpunMat);
      shroud.rotation.x = -Math.PI / 5;
      shroud.position.set(fanX, 0.09, 1.50);
      coolingGroup.add(shroud);
    });

    const swirlTank = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.22, 20), alumSpunMat);
    swirlTank.position.set(0.32, 0.18, 1.25);
    coolingGroup.add(swirlTank);

    [-0.32, 0.32].forEach((ductX) => {
      const ductCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ductX * 0.7, 0.05, 1.50),
        new THREE.Vector3(ductX * 1.1, 0.08, 1.35),
        new THREE.Vector3(ductX * 1.7, 0.12, 1.25)
      ]);
      const duct = new THREE.Mesh(new THREE.TubeGeometry(ductCurve, 20, 0.026, 8, false), orangeSpringMat);
      duct.castShadow = true;
      coolingGroup.add(duct);
    });

    // Twin Front Auxiliary Oil Coolers ahead of radiator
    [-0.24, 0.24].forEach((ocX) => {
      const oilCooler = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.035), alumSpunMat);
      oilCooler.position.set(ocX, 0.02, 1.62);
      coolingGroup.add(oilCooler);
    });

    // push(coolingGroup);
    modelRoot.add(coolingGroup);

    // 10. FUEL SYSTEM: DUAL SILL BLADDERS, MONZA FILLERS & BENDIX PUMPS
    const fuelGroup = parts_mechanical.fuelSystem.group;
    fuelGroup.name = 'Fuel_System_Assembly';
    fuelGroup.userData.subsystem = 'fuel';

    // Endurance Sill Bladders inside side pontoons
    [-0.66, 0.66].forEach((fuelX) => {
      const bladder = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, 1.15), fuelBladderMat);
      bladder.position.set(fuelX, 0.12, 0.10);
      bladder.castShadow = true;
      fuelGroup.add(bladder);

      if (fuelX < 0) parts_mechanical.fuelSystem.leftBladder = bladder;
      else parts_mechanical.fuelSystem.rightBladder = bladder;
    });

    // Dual Monza Quick-Fill Le Mans Fuel Caps
    [-0.72, 0.72].forEach((fuelX) => {
      const fillerNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.05, 16), alumSpunMat);
      fillerNeck.position.set(fuelX, 0.28, 0.65);
      fillerNeck.rotation.z = fuelX > 0 ? -0.25 : 0.25;
      fillerNeck.castShadow = true;
      fuelGroup.add(fillerNeck);

      const flipLatch = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.06), chromeDamperMat);
      flipLatch.position.set(fuelX, 0.31, 0.65);
      fuelGroup.add(flipLatch);
    });

    // Twin Bendix High-Pressure Cylindrical Electric Fuel Pumps
    [-0.10, 0.10].forEach((pX) => {
      const bendix = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 14), alumSpunMat);
      bendix.rotation.z = Math.PI / 2;
      bendix.position.set(pX, 0.18, -0.16);
      fuelGroup.add(bendix);
    });

    // push(fuelGroup);
    modelRoot.add(fuelGroup);

    // 11. RACE COCKPIT: GAUGES, STEERING WHEEL, PEDALS, SILL SHIFTER & FIRE BOTTLE
    const cockpitDetails = parts_mechanical.cockpitDetails;
    cockpitDetails.name = 'Cockpit_Details';
    cockpitDetails.userData.subsystem = 'cockpit';

    // Right-Hand Sill Gated Shifter & Knob
    const shiftGate = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.018, 0.12), alumSpunMat);
    shiftGate.position.set(0.48, 0.18, -0.05);
    cockpitDetails.add(shiftGate);

    const shiftLever = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8), chromeDamperMat);
    shiftLever.position.set(0.48, 0.25, -0.05);
    shiftLever.rotation.x = -0.15;
    cockpitDetails.add(shiftLever);

    const shiftKnob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), steelShaftMat);
    shiftKnob.position.set(0.48, 0.33, -0.07);
    cockpitDetails.add(shiftKnob);

    // Graviner Halon Fire Bottle
    const fireBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.20, 14), anFittingRed);
    fireBottle.rotation.z = Math.PI / 2;
    fireBottle.position.set(-0.25, 0.14, 0.32);
    cockpitDetails.add(fireBottle);

    const fireValve = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.035, 8), carbGoldMat);
    fireValve.position.set(-0.14, 0.14, 0.32);
    fireValve.rotation.z = Math.PI / 2;
    cockpitDetails.add(fireValve);

    // Stewart-Warner Analog Instrument Cluster
    const dashPanel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.035), dashMat);
    dashPanel.position.set(0.0, 0.35, 0.45);
    cockpitDetails.add(dashPanel);

    const tach = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.015, 20), alumSpunMat);
    tach.rotation.x = Math.PI / 2;
    tach.position.set(0.24, 0.36, 0.47);
    cockpitDetails.add(tach);

    [-0.12, -0.04, 0.04, 0.12].forEach((gX) => {
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 14), alumSpunMat);
      dial.rotation.x = Math.PI / 2;
      dial.position.set(gX, 0.36, 0.47);
      cockpitDetails.add(dial);
    });

    // 14" Dished 3-Spoke Competition Steering Wheel
    const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 12), steelShaftMat);
    steerCol.rotation.x = -Math.PI / 4;
    steerCol.position.set(0.24, 0.28, 0.34);
    cockpitDetails.add(steerCol);

    const steerRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.011, 12, 28), steelShaftMat);
    steerRim.rotation.x = -Math.PI / 4;
    steerRim.position.set(0.24, 0.34, 0.26);
    cockpitDetails.add(steerRim);

    // Triple Drilled Aluminum Pedal Box
    [-0.04, 0.0, 0.04].forEach((pX) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), steelShaftMat);
      arm.position.set(0.24 + pX, 0.12, 0.62);
      arm.rotation.x = 0.25;
      cockpitDetails.add(arm);

      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.038, 0.006), alumSpunMat);
      pad.position.set(0.24 + pX, 0.07, 0.60);
      cockpitDetails.add(pad);
    });

    // push(cockpitDetails);
    modelRoot.add(cockpitDetails);

    // 12. CHASSIS TUB & AERODYNAMICS: ROLLOVER HOOP & REAR DUCKTAIL SPOILER
    const chassisGroup = parts_mechanical.chassisDetails;
    chassisGroup.name = 'Chassis_Aerodynamics_Details';
    chassisGroup.userData.subsystem = 'chassis';

    const hoopCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, 0.15, -0.10),
      new THREE.Vector3(-0.35, 0.44, -0.10),
      new THREE.Vector3(0.0, 0.47, -0.10),
      new THREE.Vector3(0.35, 0.44, -0.10),
      new THREE.Vector3(0.35, 0.15, -0.10)
    ]);
    const hoop = new THREE.Mesh(new THREE.TubeGeometry(hoopCurve, 20, 0.018, 12, false), steelShaftMat);
    hoop.castShadow = true;
    chassisGroup.add(hoop);

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.048, 0.008), alumSpunMat);
    spoiler.position.set(0.0, 0.42, -1.62);
    spoiler.rotation.x = 0.20;
    chassisGroup.add(spoiler);

    [-0.32, 0.32].forEach((tbX) => {
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 6), chromeDamperMat);
      tb.position.set(tbX, 0.39, -1.60);
      tb.rotation.x = -0.45;
      chassisGroup.add(tb);
    });

    // push(chassisGroup);
    modelRoot.add(chassisGroup);
  return parts_mechanical;
}
