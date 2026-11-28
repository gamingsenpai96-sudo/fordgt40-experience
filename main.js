/* ============================================================
   Ford GT40 — Go Like Hell  |  Cinematic Native Video Engine
   ============================================================
   - Direct hardware-accelerated HTML5 Video playback (Zero lag)
   - "SCROLL TO BEGIN" prompt displayed on initial site visit
   - Smooth unmuted native video audio playback on first interaction
   - Pauses on the final heroic forward stance with headlights ablaze
   - Staggered entrance for hero typography, HUD specs, & navigation chips
   - Seamless unlocked scrolling into Slide 2 Showroom & Slide 3 Game
   ============================================================ */

(() => {
  'use strict';

  // ---- DOM Elements ----
  const preloader         = document.getElementById('preloader');
  const percentEl         = document.getElementById('preloader-percent');
  const soundBtn          = document.getElementById('sound-btn');
  const soundBtnText      = document.getElementById('sound-btn-text');
  const soundSvgMuted     = document.getElementById('sound-svg-muted');
  const soundSvgOn        = document.getElementById('sound-svg-on');
  const engineIndicator   = document.getElementById('engine-indicator');
  const indicatorText     = engineIndicator ? engineIndicator.querySelector('.engine-indicator-text') : null;
  const storyContainer    = document.getElementById('story-container');

  // ---- State ----
  let storyUnlocked  = false;
  let currentPortalMode = 'journey';
  let driveReturnTarget = 'journey';
  let arReturnTarget = 'journey';
  let chroniclesReturnTarget = 'journey';
  let portalBusy     = false;
  const journeyMilestones = new Set();

  // ---- Creative Engine State ----
  let lenisInstance  = null;
  const eqBars       = document.querySelectorAll('.eq-bar');

  // =================================================================
  //  Victory Celebration Confetti & Rolling Odometer Numbers
  // =================================================================

  function triggerVictoryConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.75 },
        colors: ['#e3262e', '#ffffff', '#151515', '#b8b8b8', '#858585']
      });
    }
  }

  function animateSpecNumbers() {
    const specNums = document.querySelectorAll('.spec-num');
    specNums.forEach((el) => {
      const target = parseFloat(el.getAttribute('data-target') || '0');
      const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      const hasComma = el.getAttribute('data-comma') === 'true';
      const duration = 1200;
      const startTime = performance.now();

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = target * ease;

        if (hasComma) {
          el.textContent = Math.round(current).toLocaleString();
        } else {
          el.textContent = current.toFixed(decimals);
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          if (hasComma) {
            el.textContent = target.toLocaleString();
          } else {
            el.textContent = target.toFixed(decimals);
          }
        }
      }
      requestAnimationFrame(step);
    });
  }

  // =================================================================
  //  Engine Indicator & Sound Management
  // =================================================================

  function setIndicator(text, active = true) {
    if (!engineIndicator) return;
    if (active) {
      if (indicatorText) indicatorText.textContent = text;
      engineIndicator.classList.add('active');
    } else {
      engineIndicator.classList.remove('active');
    }
  }

  // =================================================================
  //  Showroom Portal Orchestrator & Story Unlock Architecture
  // =================================================================

  function unlockStory() {
    if (storyUnlocked) return;
    storyUnlocked = true;
    window.__storyUnlocked = true;
    if (storyContainer) {
      storyContainer.classList.add('unlocked');
    }
  }

  function pauseAllSubExperiences() {
    window.gt40Journey?.pause?.();
    window.gt40Cockpit?.pause?.();
    window.gt40ExplodedViewer?.pause?.();
    window.leMansGame?.pause?.();
  }

  const MILESTONE_KEYS = ['cockpit', 'drive', 'exploded', 'front_bay', 'wheel'];

  function markJourneyMilestone(key) {
    if (!key) return;
    if (MILESTONE_KEYS.includes(key)) {
      journeyMilestones.add(key);
      document.querySelectorAll(`.jp-pip[data-milestone="${key}"]`).forEach((el) => {
        el.classList.add('done');
      });
      const countEl = document.getElementById('journey-progress-count');
      if (countEl) {
        countEl.textContent = `${journeyMilestones.size} / ${MILESTONE_KEYS.length}`;
      }
    }

    // Mirror discovery progress onto preserved Act stamps
    const actMap = {
      cockpit: 3,
      drive: 3,
      exploded: 2,
      front_bay: 2,
      wheel: 2,
      ar: 5
    };
    const actNum = actMap[key];
    if (actNum && typeof window.markActComplete === 'function') {
      window.markActComplete(actNum);
    }
  }

  function updateReturnBarLabel() {
    const backLabelEl = document.getElementById('portal-back-label');
    if (!backLabelEl) return;

    if (currentPortalMode === 'game' && driveReturnTarget === 'cockpit') {
      backLabelEl.textContent = 'RETURN TO COCKPIT';
    } else if (currentPortalMode === 'chronicles' && chroniclesReturnTarget === 'cockpit') {
      backLabelEl.textContent = 'RETURN TO COCKPIT';
    } else if (currentPortalMode === 'chronicles' && chroniclesReturnTarget === 'journey_door') {
      backLabelEl.textContent = 'RETURN TO GT40 DOORWAY';
    } else if (currentPortalMode === 'ar' && arReturnTarget && arReturnTarget !== 'journey' && arReturnTarget !== 'ar') {
      const names = {
        cockpit: 'RETURN TO COCKPIT',
        exploded: 'RETURN TO ENGINEERING 3D',
        game: 'RETURN TO LE MANS DRIVE',
        chronicles: 'RETURN TO CHRONICLES'
      };
      backLabelEl.textContent = names[arReturnTarget] || 'RETURN TO LE MANS JOURNEY';
    } else {
      backLabelEl.textContent = 'RETURN TO LE MANS JOURNEY';
    }
  }

  function enterJourneyDestination(dest, opts = {}) {
    if (portalBusy) return;
    if (dest === 'showroom' || dest === 'journey') {
      returnToJourney();
      return;
    }

    const validDests = ['cockpit', 'exploded', 'game', 'ar', 'chronicles'];
    if (!validDests.includes(dest)) return;

    const prevMode = currentPortalMode;
    if (dest === 'game') {
      if (opts.fromCockpit || prevMode === 'cockpit') {
        driveReturnTarget = 'cockpit';
      } else if (prevMode !== 'game') {
        driveReturnTarget = 'journey';
      }
    } else if (dest === 'chronicles') {
      if (opts.fromDoorChoice) {
        chroniclesReturnTarget = 'journey_door';
      } else if (opts.fromCockpit || prevMode === 'cockpit') {
        chroniclesReturnTarget = 'cockpit';
      } else if (prevMode !== 'chronicles') {
        chroniclesReturnTarget = 'journey';
      }
    } else if (dest === 'ar') {
      if (prevMode && prevMode !== 'ar') {
        arReturnTarget = prevMode;
      }
    }

    if (dest !== 'ar') {
      window.ensureExperiencesInitialized?.();
    }

    portalBusy = true;
    currentPortalMode = dest;
    const curtain = document.getElementById('portal-curtain');
    if (curtain) curtain.classList.add('active');

    setTimeout(() => {
      pauseAllSubExperiences();
      closeExperienceModal();

      document.body.classList.remove(
        'mode-journey',
        'dest-cockpit',
        'dest-exploded',
        'dest-game',
        'dest-ar',
        'dest-chronicles'
      );
      document.body.classList.add('mode-destination', `dest-${dest}`);
      unlockStory();

      document.querySelectorAll('#portal-return-bar .portal-pill').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.portalDest === dest);
      });
      updateReturnBarLabel();

      window.scrollTo(0, 0);

      if (dest === 'cockpit') {
        markJourneyMilestone('cockpit');
        if (lenisInstance) lenisInstance.start();
        window.gt40Cockpit?.resume?.();
        if (typeof ScrollTrigger !== 'undefined') {
          setTimeout(() => ScrollTrigger.refresh(), 80);
        }
      } else if (dest === 'exploded') {
        markJourneyMilestone('exploded');
        if (lenisInstance) lenisInstance.start();
        const viewer = window.gt40ExplodedViewer;
        if (viewer && typeof viewer.resume === 'function') {
          viewer.resume().then(() => {
            if (opts.system && typeof viewer.setSystem === 'function') {
              viewer.setSystem(opts.system, { silent: Boolean(opts.fromMovingCar) ? false : true });
            } else if (typeof viewer.setSystem === 'function') {
              viewer.setSystem('all', { silent: true });
            }
          });
        }
      } else if (dest === 'game') {
        markJourneyMilestone('drive');
        if (lenisInstance) lenisInstance.start();
        window.leMansGame?.resume?.().then(() => {
          if (opts.autoStartDrive) {
            setTimeout(() => {
              window.leMansGame?.enterDriveMode?.();
            }, 60);
          }
        });
      } else if (dest === 'ar') {
        markJourneyMilestone('ar');
        if (lenisInstance) lenisInstance.start();
        const arViewer = document.getElementById('gt40-ar-viewer');
        if (arViewer && !arViewer.getAttribute('src') && arViewer.dataset.deferredSrc) {
          arViewer.setAttribute('src', arViewer.dataset.deferredSrc);
        }
      } else if (dest === 'chronicles') {
        if (lenisInstance) lenisInstance.start();
        if (typeof ScrollTrigger !== 'undefined') {
          setTimeout(() => ScrollTrigger.refresh(), 60);
        }
        if (opts.anchor) {
          const scrollToAnchor = () => {
            const t = document.querySelector(opts.anchor);
            if (!t) return;
            const topY = Math.max(0, t.getBoundingClientRect().top + window.scrollY - 115);
            if (lenisInstance && typeof lenisInstance.scrollTo === 'function') {
              lenisInstance.scrollTo(topY, { immediate: true });
            }
            window.scrollTo(0, topY);
          };
          setTimeout(scrollToAnchor, 90);
          setTimeout(scrollToAnchor, 220);
        }
      }

      setTimeout(() => {
        if (curtain) curtain.classList.remove('active');
        portalBusy = false;
      }, 30);
    }, 130);
  }

  function returnToJourney(sourceMode = currentPortalMode) {
    if (portalBusy) return;
    window.ensureExperiencesInitialized?.();

    portalBusy = true;

    const finalizeReturn = () => {
      const leavingMode = sourceMode || currentPortalMode;
      currentPortalMode = 'journey';
      const curtain = document.getElementById('portal-curtain');
      if (curtain) curtain.classList.add('active');

      setTimeout(() => {
        pauseAllSubExperiences();
        closeExperienceModal();

        document.body.classList.remove(
          'mode-destination',
          'dest-cockpit',
          'dest-exploded',
          'dest-game',
          'dest-ar',
          'dest-chronicles'
        );
        document.body.classList.add('mode-journey');
        if (lenisInstance) lenisInstance.stop();
        window.scrollTo(0, 0);

        if (leavingMode === 'cockpit') {
          window.gt40Journey?.resume?.(() => window.gt40Journey?.returnFromCockpit?.());
        } else if (leavingMode === 'game') {
          window.gt40Journey?.resume?.(() => window.gt40Journey?.returnFromGame?.());
        } else if (leavingMode === 'exploded') {
          window.gt40Journey?.resume?.(() => window.gt40Journey?.returnFromExploded?.());
        } else if (leavingMode === 'chronicles' && chroniclesReturnTarget === 'journey_door') {
          chroniclesReturnTarget = 'journey';
          window.gt40Journey?.resume?.(() => window.gt40Journey?.returnFromChroniclesDoor?.());
        } else {
          window.gt40Journey?.resume?.();
        }

        setTimeout(() => {
          if (curtain) curtain.classList.remove('active');
          portalBusy = false;
        }, 30);
      }, 130);
    };

    if (sourceMode === 'exploded' && typeof window.gt40ExplodedViewer?.reassembleForReturn === 'function') {
      window.gt40ExplodedViewer.reassembleForReturn(320).then(finalizeReturn);
    } else {
      finalizeReturn();
    }
  }

  function handleContextReturn() {
    if (portalBusy) return;
    if (currentPortalMode === 'game' && driveReturnTarget === 'cockpit') {
      driveReturnTarget = 'journey';
      enterJourneyDestination('cockpit');
      return;
    }
    if (currentPortalMode === 'chronicles' && chroniclesReturnTarget === 'cockpit') {
      chroniclesReturnTarget = 'journey';
      enterJourneyDestination('cockpit');
      return;
    }
    if (currentPortalMode === 'ar' && arReturnTarget && arReturnTarget !== 'journey' && arReturnTarget !== 'ar') {
      const target = arReturnTarget;
      arReturnTarget = 'journey';
      enterJourneyDestination(target);
      return;
    }
    returnToJourney(currentPortalMode);
  }

  function setupShowroomPortal() {
    const returnBtn = document.getElementById('portal-return-journey');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        playClickSound();
        handleContextReturn();
      });
    }

    document.addEventListener('click', (e) => {
      const backCockpitBtn = e.target.closest('[data-return-cockpit]');
      if (!backCockpitBtn) return;
      playClickSound();
      chroniclesReturnTarget = 'journey';
      enterJourneyDestination('cockpit');
    });

    document.querySelectorAll('.jp-pip[data-milestone]').forEach((pip) => {
      pip.addEventListener('click', () => {
        const key = pip.dataset.milestone;
        playClickSound();
        window.gt40Journey?.dismissGlhCard?.();
        if (key === 'cockpit') {
          window.gt40Journey?.triggerComponentInteraction?.('driver_door');
        } else if (key === 'exploded') {
          window.gt40Journey?.triggerComponentInteraction?.('rear_engine');
        } else if (key === 'front_bay') {
          window.gt40Journey?.triggerComponentInteraction?.('front_bonnet');
        } else if (key === 'wheel') {
          window.gt40Journey?.triggerComponentInteraction?.('wheel');
        } else if (key === 'drive') {
          enterJourneyDestination('game', { autoStartDrive: true });
        }
      });
    });

    document.addEventListener('click', (e) => {
      const portalBtn = e.target.closest('[data-portal-dest]');
      if (!portalBtn) return;
      const dest = portalBtn.dataset.portalDest;
      const sys = portalBtn.dataset.portalSys || '';
      if (dest) {
        playClickSound();
        window.gt40Journey?.dismissGlhCard?.();
        enterJourneyDestination(dest, sys ? { system: sys } : {});
      }
    });
  }

  window.enterShowroomDestination = enterJourneyDestination;
  window.enterJourneyDestination = enterJourneyDestination;
  window.returnToShowroom = returnToJourney;
  window.gt40JourneyOrchestrator = {
    markMilestone: markJourneyMilestone,
    enterCockpitFromMovingCar: () => enterJourneyDestination('cockpit', { fromMovingCar: true }),
    enterExplodedFromMovingCar: (sys) => enterJourneyDestination('exploded', { system: sys || 'engine', fromMovingCar: true }),
    enterDriveFromCockpit: () => enterJourneyDestination('game', { fromCockpit: true, autoStartDrive: true }),
    enterDriverChronicles: () => enterJourneyDestination('chronicles', { fromCockpit: true, anchor: '#bruce-mclaren-dossier' }),
    enterDriverChroniclesFromDoor: () => enterJourneyDestination('chronicles', { fromDoorChoice: true, anchor: '#act-1' }),
    onExitDriveMode: () => {
      if (portalBusy) return;
      driveReturnTarget = 'journey';
      returnToJourney('game');
    },
    returnToJourney
  };

  function observeSections() {
    const sections = document.querySelectorAll('.content-section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.15 }
    );
    sections.forEach((s) => observer.observe(s));
  }

  // =================================================================
  //  Slide 2: Showroom Split & Audio Synthesizer & Experience Modals
  // =================================================================

  // Preload authentic recorded audio for Ford GT40 and Ferrari 330 P3
  let fordRevAudio = null;
  let ferrariRevAudio = null;

  function initRevAudioElements() {
    if (!fordRevAudio) {
      fordRevAudio = new Audio();
      fordRevAudio.preload = 'auto';
      // Support m4a and wav
      const canM4A = fordRevAudio.canPlayType('audio/mp4');
      fordRevAudio.src = canM4A ? 'assets/audio/ford-rev.m4a' : 'assets/audio/ford-rev.wav';
    }
    if (!ferrariRevAudio) {
      ferrariRevAudio = new Audio();
      ferrariRevAudio.preload = 'auto';
      const canM4A = ferrariRevAudio.canPlayType('audio/mp4');
      ferrariRevAudio.src = canM4A ? 'assets/audio/ferrari-rev.m4a' : 'assets/audio/ferrari-rev.wav';
    }
  }

  let audioSynthCtx = null;
  function getSynthCtx() {
    if (!audioSynthCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioSynthCtx = new AudioCtx();
      }
    }
    if (audioSynthCtx && audioSynthCtx.state === 'suspended') {
      audioSynthCtx.resume().catch(() => {});
    }
    return audioSynthCtx;
  }

  function playClickSound() {
    try {
      const ctx = getSynthCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {}
  }

  function playFordV8Rev() {
    try {
      initRevAudioElements();
      if (ferrariRevAudio && !ferrariRevAudio.paused) {
        ferrariRevAudio.pause();
        ferrariRevAudio.currentTime = 0;
      }
      if (fordRevAudio) {
        fordRevAudio.currentTime = 0;
        fordRevAudio.play().catch(() => playFordV8Synth());
      } else {
        playFordV8Synth();
      }
    } catch (e) {
      playFordV8Synth();
    }
  }

  function playFerrariV12Rev() {
    try {
      initRevAudioElements();
      if (fordRevAudio && !fordRevAudio.paused) {
        fordRevAudio.pause();
        fordRevAudio.currentTime = 0;
      }
      if (ferrariRevAudio) {
        ferrariRevAudio.currentTime = 0;
        ferrariRevAudio.play().catch(() => playFerrariV12Synth());
      } else {
        playFerrariV12Synth();
      }
    } catch (e) {
      playFerrariV12Synth();
    }
  }

  function playFordV8Synth() {
    try {
      const ctx = getSynthCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(48, t);
      osc1.frequency.exponentialRampToValueAtTime(140, t + 0.6);
      osc1.frequency.exponentialRampToValueAtTime(52, t + 1.8);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(96, t);
      osc2.frequency.exponentialRampToValueAtTime(280, t + 0.6);
      osc2.frequency.exponentialRampToValueAtTime(104, t + 1.8);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, t);
      filter.frequency.exponentialRampToValueAtTime(950, t + 0.6);
      filter.frequency.exponentialRampToValueAtTime(350, t + 1.8);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 2.1);
      osc2.stop(t + 2.1);
    } catch (e) {
      console.warn('Ford synth audio error:', e);
    }
  }

  function playFerrariV12Synth() {
    try {
      const ctx = getSynthCtx();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(160, t);
      osc1.frequency.exponentialRampToValueAtTime(580, t + 0.5);
      osc1.frequency.exponentialRampToValueAtTime(220, t + 1.7);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(320, t);
      osc2.frequency.exponentialRampToValueAtTime(1160, t + 0.5);
      osc2.frequency.exponentialRampToValueAtTime(440, t + 1.7);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(2800, t + 0.5);
      filter.frequency.exponentialRampToValueAtTime(900, t + 1.7);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.48, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.9);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 2.0);
      osc2.stop(t + 2.0);
    } catch (e) {
      console.warn('Ferrari synth audio error:', e);
    }
  }

  function openExperienceModal(type) {
    const modalId = type === 'ford' ? 'ford-modal' : 'ferrari-modal';
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeExperienceModal(modalId) {
    const modals = modalId ? [document.getElementById(modalId)] : Array.from(document.querySelectorAll('.exp-modal'));
    modals.forEach((m) => {
      if (m) m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }

  function setupShowroomSplit() {
    const container = document.getElementById('showroom-split-container');
    const fordHalf = document.getElementById('showroom-half-ford');
    const ferrariHalf = document.getElementById('showroom-half-ferrari');

    if (!container || !fordHalf || !ferrariHalf) return;

    fordHalf.addEventListener('mouseenter', () => {
      container.classList.remove('hover-ferrari');
      container.classList.add('hover-ford');
    });

    ferrariHalf.addEventListener('mouseenter', () => {
      container.classList.remove('hover-ford');
      container.classList.add('hover-ferrari');
    });

    container.addEventListener('mouseleave', () => {
      container.classList.remove('hover-ford', 'hover-ferrari');
    });

    const handleFordAction = () => {
      playFordV8Rev();
      openExperienceModal('ford');
    };
    fordHalf.addEventListener('click', handleFordAction);
    fordHalf.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFordAction();
      }
    });

    const handleFerrariAction = () => {
      playFerrariV12Rev();
      openExperienceModal('ferrari');
    };
    ferrariHalf.addEventListener('click', handleFerrariAction);
    ferrariHalf.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFerrariAction();
      }
    });
  }

  function setupExperienceModals() {
    // Close buttons
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeExperienceModal(modalId);
      });
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeExperienceModal();
      }
    });

    // Rev buttons
    const fordRevBtn = document.getElementById('btn-modal-ford-rev');
    if (fordRevBtn) {
      fordRevBtn.addEventListener('click', () => playFordV8Rev());
    }
    const ferrariRevBtn = document.getElementById('btn-modal-ferrari-rev');
    if (ferrariRevBtn) {
      ferrariRevBtn.addEventListener('click', () => playFerrariV12Rev());
    }

    // Tab switching inside modals
    document.querySelectorAll('.subnav-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const group = pill.getAttribute('data-tab-group');
        const tab = pill.getAttribute('data-tab');
        if (!group || !tab) return;

        // Update pills
        document.querySelectorAll(`.subnav-pill[data-tab-group="${group}"]`).forEach((p) => {
          p.classList.remove('active', `active-${group}`);
        });
        pill.classList.add('active', `active-${group}`);

        // Update panels
        const modal = document.getElementById(`${group}-modal`);
        if (modal) {
          modal.querySelectorAll('.exp-tab-content').forEach((panel) => {
            panel.classList.remove('active');
          });
          const targetPanel = document.getElementById(`${group}-tab-${tab}`);
          if (targetPanel) {
            targetPanel.classList.add('active');
          }
        }
      });
    });

    // Quick jump cards
    document.querySelectorAll('[data-jump-tab]').forEach((card) => {
      card.addEventListener('click', () => {
        const group = card.getAttribute('data-tab-group');
        const tab = card.getAttribute('data-jump-tab');
        if (!group || !tab) return;

        const pill = document.querySelector(`.subnav-pill[data-tab-group="${group}"][data-tab="${tab}"]`);
        if (pill) {
          pill.click();
        }
      });
    });
  }

  // =================================================================
  //  Interactive Deck Handlers: Specs Unit Toggle
  // =================================================================

  function setupSpecsUnitToggle() {
    const toggle = document.getElementById('specs-unit-toggle');
    if (!toggle) return;
    const buttons = toggle.querySelectorAll('.unit-toggle-btn');
    const specList = document.querySelector('.specs-list');
    if (!specList) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const unit = btn.getAttribute('data-unit');
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        playClickSound();

        if (unit === 'metric') {
          specList.innerHTML = `
            <div class="spec-row">
              <dt>ENGINE</dt>
              <dd><span class="spec-num" data-target="7.0" data-decimals="1">0.0</span>L FE V8</dd>
            </div>
            <div class="spec-row">
              <dt>POWER</dt>
              <dd><span class="spec-num" data-target="485" data-decimals="0">0</span> BHP</dd>
            </div>
            <div class="spec-row">
              <dt>WEIGHT</dt>
              <dd><span class="spec-num" data-target="1080" data-decimals="0" data-comma="true">0</span> KG</dd>
            </div>
            <div class="spec-row">
              <dt>TOP SPEED</dt>
              <dd><span class="spec-num" data-target="330" data-decimals="0">0</span> KM/H</dd>
            </div>
          `;
        } else {
          specList.innerHTML = `
            <div class="spec-row">
              <dt>ENGINE</dt>
              <dd><span class="spec-num" data-target="427" data-decimals="0">0</span> CU IN V8</dd>
            </div>
            <div class="spec-row">
              <dt>POWER</dt>
              <dd><span class="spec-num" data-target="485" data-decimals="0">0</span> BHP</dd>
            </div>
            <div class="spec-row">
              <dt>WEIGHT</dt>
              <dd><span class="spec-num" data-target="2380" data-decimals="0" data-comma="true">0</span> LBS</dd>
            </div>
            <div class="spec-row">
              <dt>TOP SPEED</dt>
              <dd><span class="spec-num" data-target="205" data-decimals="0">0</span> MPH</dd>
            </div>
          `;
        }
        animateSpecNumbers();
      });
    });
  }

  // =================================================================
  //  Creative Engines: Lenis, Vanilla-Tilt, Cursor, Particles
  // =================================================================

  function initLenis() {
    if (typeof Lenis !== 'undefined') {
      try {
        lenisInstance = new Lenis({
          duration: 1.25,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          syncTouch: false
        });

        function raf(time) {
          lenisInstance.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      } catch (e) {
        console.warn('Lenis init error:', e);
      }
    }
  }

  // =================================================================
  //  GSAP, ScrollTrigger & Continuous Motion Design Architecture
  // =================================================================

  function initGSAPMotionDesign() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // 1. Synchronize Lenis and ScrollTrigger for buttery 120Hz scrubbing
    if (lenisInstance) {
      lenisInstance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    // 2. Continuous Telemetry Wayfinder Tracker & Needle
    const wayfinder = document.getElementById('telemetry-wayfinder');
    const needle = document.getElementById('wayfinder-needle');
    const nodes = document.querySelectorAll('.wayfinder-node');

    const sections = [
      { id: 'story', index: 0 },
      { id: 'slide-2-showroom', index: 1 },
      { id: 'exploded-section', index: 2 },
      { id: 'cockpit-sim-section', index: 3 },
      { id: 'game-section', index: 4 },
      { id: 'circuit-section', index: 5 },
      { id: 'race-clock-section', index: 6 },
      { id: 'ar-section', index: 7 }
    ];

    function setActiveWayfinder(idx) {
      nodes.forEach((n, i) => {
        n.classList.toggle('active', i === idx);
      });
      if (needle && nodes[idx]) {
        const nodeTop = nodes[idx].offsetTop;
        needle.style.transform = `translateY(${Math.max(0, nodeTop - 14)}px)`;
      }
    }

    function syncWayfinderByViewport() {
      if (!storyUnlocked || window.scrollY < window.innerHeight * 0.6) {
        setActiveWayfinder(0);
        return;
      }
      const focusY = window.innerHeight * 0.45;
      let matchedIdx = 0;
      let bestDist = Infinity;
      sections.forEach((sec, idx) => {
        if (idx === 0) return;
        const el = document.getElementById(sec.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top <= focusY && r.bottom >= focusY) {
          matchedIdx = idx;
          bestDist = -1;
        } else if (bestDist >= 0) {
          const centerDist = Math.abs((r.top + r.bottom) * 0.5 - focusY);
          if (centerDist < bestDist) {
            bestDist = centerDist;
            matchedIdx = idx;
          }
        }
      });
      setActiveWayfinder(matchedIdx);
    }

    window.addEventListener('scroll', () => requestAnimationFrame(syncWayfinderByViewport), { passive: true });
    if (lenisInstance) {
      lenisInstance.on('scroll', syncWayfinderByViewport);
    }
    syncWayfinderByViewport();

    // Wayfinder interactive click navigation
    nodes.forEach((node, idx) => {
      node.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = node.dataset.target;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          if (lenisInstance) {
            lenisInstance.scrollTo(targetEl, { duration: 1.4, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
          } else {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
          setActiveWayfinder(idx);
        }
      });
    });

    // 3. Kinetic Showroom Car Faceoff Stagger
    const fordCar = document.querySelector('.split-half-ford .showroom-car-cutout');
    const ferrariCar = document.querySelector('.split-half-ferrari .showroom-car-cutout');
    if (fordCar && ferrariCar) {
      gsap.fromTo(fordCar, 
        { x: -100, opacity: 0 },
        { 
          x: 0, opacity: 1, duration: 1.3, ease: 'power3.out',
          scrollTrigger: {
            trigger: '#slide-2-showroom',
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
      gsap.fromTo(ferrariCar, 
        { x: 100, opacity: 0 },
        { 
          x: 0, opacity: 1, duration: 1.3, ease: 'power3.out',
          scrollTrigger: {
            trigger: '#slide-2-showroom',
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    }

    // 4. Keep 3D Simulator containers crisp inside Portal destination views (only animate in Chronicles)
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gsap.set(gameContainer, { opacity: 1, scale: 1, y: 0 });
    }

    const explodedContainer = document.getElementById('exploded-container');
    if (explodedContainer) {
      gsap.set(explodedContainer, { opacity: 1, scale: 1, y: 0 });
    }

    // 6. Continuous Timeline Bead Animation
    const timelineBead = document.getElementById('timeline-glow-bead');
    const timelineWrap = document.querySelector('.chronicles-timeline-wrap');
    if (timelineBead && timelineWrap) {
      ScrollTrigger.create({
        trigger: timelineWrap,
        start: 'top 70%',
        end: 'bottom 80%',
        scrub: 0.3,
        onUpdate: (self) => {
          const totalHeight = timelineWrap.offsetHeight - 160;
          timelineBead.style.transform = `translateY(${self.progress * totalHeight}px)`;
        }
      });
    }

    // 7. Staggered Chronicle Cards Reveal
    const chronicleCards = document.querySelectorAll('.chronicle-card');
    chronicleCards.forEach((card) => {
      gsap.fromTo(card,
        { opacity: 0, y: 40, scale: 0.98 },
        {
          opacity: 1, y: 0, scale: 1.0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });

    // 8. Streamline Laser Pulses along Flow Bridges
    document.querySelectorAll('.velocity-bridge').forEach((bridge) => {
      gsap.fromTo(bridge.querySelector('.bridge-telemetry-badge'),
        { opacity: 0, y: 15, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.5)',
          scrollTrigger: {
            trigger: bridge,
            start: 'top 90%',
            toggleActions: 'play none none reverse'
          }
        }
      );
    });
  }

  function initVanillaTilt() {
    if (typeof VanillaTilt !== 'undefined') {
      try {
        const tiltTargets = document.querySelectorAll('[data-tilt]:not(.chronicle-card)');
        if (!tiltTargets.length) return;
        VanillaTilt.init(tiltTargets, {
          max: 8,
          speed: 400,
          glare: false,
          perspective: 1000
        });
      } catch (e) {
        console.warn('VanillaTilt init error:', e);
      }
    }
  }

  function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    const label = document.getElementById('cursor-label');
    if (!cursor || window.matchMedia('(hover: none) or (pointer: coarse)').matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let isMoving = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isMoving) {
        cursor.classList.add('active');
        isMoving = true;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      cursor.classList.remove('active');
      isMoving = false;
    });

    function updateCursorLoop() {
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      requestAnimationFrame(updateCursorLoop);
    }
    requestAnimationFrame(updateCursorLoop);

    const hoverElements = document.querySelectorAll('[data-cursor], a, button, [role="button"]');
    hoverElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const customText = el.getAttribute('data-cursor');
        if (customText && label) {
          label.textContent = customText;
          cursor.classList.add('has-label');
        }
        if (el.classList.contains('split-half-ford') || el.classList.contains('sound-banner')) {
          cursor.classList.add('hovering-red');
        } else {
          cursor.classList.add('hovering');
        }
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('hovering', 'hovering-red', 'has-label');
      });
    });
  }

  async function initParticles() {
    if (typeof tsParticles === 'undefined') return;
    try {
      const container = await tsParticles.load('tsparticles', {
        fullScreen: { enable: false },
        fpsLimit: 60,
        particles: {
          number: { value: 32, density: { enable: true, value_area: 850 } },
          color: { value: ['#ff4422', '#ff8833', '#38bdf8', '#ffffff'] },
          shape: { type: 'circle' },
          opacity: {
            value: 0.45,
            random: true,
            anim: { enable: true, speed: 0.6, opacity_min: 0.1, sync: false }
          },
          size: {
            value: 2.2,
            random: true,
            anim: { enable: true, speed: 1.2, size_min: 0.5, sync: false }
          },
          move: {
            enable: true,
            speed: 1.2,
            direction: 'top-right',
            random: true,
            straight: false,
            out_mode: 'out',
            bounce: false
          }
        },
        interactivity: {
          detect_on: 'canvas',
          events: {
            onhover: { enable: true, mode: 'repulse' },
            resize: true
          },
          modes: {
            repulse: { distance: 75, duration: 0.4 }
          }
        },
        retina_detect: false
      });

      if (container && 'IntersectionObserver' in window) {
        const heroEl = document.getElementById('hero-container');
        if (heroEl) {
          const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                container.play();
              } else {
                container.pause();
              }
            });
          }, { threshold: 0.05 });
          obs.observe(heroEl);
        }
      }
    } catch (e) {
      console.warn('tsParticles init error:', e);
    }
  }

  function dismissPreloader() {
    if (preloader) {
      if (percentEl) percentEl.textContent = '100%';
      preloader.classList.add('done');
      setTimeout(() => {
        preloader.style.display = 'none';
      }, 600);
    }
  }

  function setupAugmentedReality() {
    const qrContainer = document.getElementById('ar-qr-code');
    const urlText = document.getElementById('ar-url-text');
    const directTrigger = document.getElementById('ar-direct-trigger');
    const modelViewer = document.getElementById('gt40-ar-viewer');
    const mobileInstructions = document.getElementById('ar-mobile-instructions');
    const desktopInstructions = document.getElementById('ar-desktop-instructions');
    const arSection = document.getElementById('ar-section');
    const preparingOverlay = document.getElementById('ar-preparing-overlay');
    const progressBar = document.getElementById('ar-progress-bar');
    const progressPct = document.getElementById('ar-progress-pct');
    const compatStatus = document.getElementById('ar-compat-status');
    const isARDirect = new URLSearchParams(window.location.search).has('ar') || window.location.hash === '#ar-section';

    function updateCompatStatus(overrideText, stateClass = '') {
      if (!compatStatus) return;
      compatStatus.classList.remove('is-ready', 'is-error');
      if (stateClass) compatStatus.classList.add(stateClass);
      if (overrideText) {
        compatStatus.textContent = overrideText;
        return;
      }
      const ua = navigator.userAgent || '';
      const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isAndroid = /Android/i.test(ua);
      if (isIOS) {
        compatStatus.textContent = 'iOS QUICK LOOK READY (USDZ)';
        compatStatus.classList.add('is-ready');
      } else if (isAndroid) {
        compatStatus.textContent = modelViewer?.canActivateAR
          ? 'ANDROID SCENE VIEWER / WEBXR READY'
          : 'ANDROID 3D PREVIEW READY';
        compatStatus.classList.add('is-ready');
      } else if (modelViewer?.canActivateAR) {
        compatStatus.textContent = 'WEBXR AR READY';
        compatStatus.classList.add('is-ready');
      } else {
        compatStatus.textContent = '3D PREVIEW ACTIVE • SCAN QR FOR MOBILE AR';
      }
    }

    function ensureArModelLoaded() {
      if (!modelViewer) return;
      const absGlb = new URL('assets/models/ar/gt40-ar.glb', window.location.href).href;
      const curSrc = modelViewer.getAttribute('src');
      if (!curSrc || curSrc !== absGlb) {
        modelViewer.setAttribute('src', absGlb);
      }
      const absUsdz = new URL('assets/models/ar/gt40-ar.usdz', window.location.href).href;
      if (modelViewer.getAttribute('ios-src') !== absUsdz) {
        modelViewer.setAttribute('ios-src', absUsdz);
      }
    }

    // Dynamic target URL pointing directly to AR section
    const targetUrl = `${window.location.origin}${window.location.pathname}?ar=true#ar-section`;

    if (urlText) {
      urlText.textContent = targetUrl;
    }

    // Dynamic High-Contrast Monochrome QR Code Generation
    const renderArQr = () => {
      if (!qrContainer || typeof QRCode === 'undefined') return false;
      try {
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
          text: targetUrl,
          width: 170,
          height: 170,
          colorDark: '#0a0d14',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        return true;
      } catch (e) {
        console.warn('QR Code generation notice:', e);
        return false;
      }
    };
    if (!renderArQr()) {
      window.addEventListener('DOMContentLoaded', renderArQr, { once: true });
    }

    // Mobile / Touch Device Detection
    const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    if (isMobileDevice) {
      if (desktopInstructions) desktopInstructions.style.display = 'none';
      if (mobileInstructions) mobileInstructions.style.display = 'flex';
    }

    // Direct Mobile AR Trigger Button Hook
    if (directTrigger && modelViewer) {
      directTrigger.addEventListener('click', () => {
        ensureArModelLoaded();
        if (typeof modelViewer.activateAR === 'function') {
          modelViewer.activateAR();
        } else {
          const slotBtn = modelViewer.querySelector('button[slot="ar-button"]');
          if (slotBtn) slotBtn.click();
        }
      });
    }

    // Auto-launch AR when visiting via QR scan on a mobile device
    if (window.location.search.includes('ar=true') && isMobileDevice && modelViewer) {
      ensureArModelLoaded();
      setTimeout(() => {
        if (typeof modelViewer.activateAR === 'function') {
          modelViewer.activateAR();
        }
      }, 900);
    }

    if (modelViewer) {
      updateCompatStatus();

      modelViewer.addEventListener('progress', (event) => {
        const rawProgress = typeof event?.detail?.totalProgress === 'number' ? event.detail.totalProgress : 0;
        const pct = Math.max(0, Math.min(100, Math.round(rawProgress * 100)));
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPct) progressPct.textContent = `${pct}%`;
      });

      modelViewer.addEventListener('load', async () => {
        if (progressBar) progressBar.style.width = '100%';
        if (progressPct) progressPct.textContent = '100%';
        if (preparingOverlay) {
          preparingOverlay.classList.add('hidden');
          setTimeout(() => {
            preparingOverlay.style.display = 'none';
          }, 360);
        }
        if (typeof modelViewer.dismissPoster === 'function') {
          modelViewer.dismissPoster();
        }
        updateCompatStatus();

        modelViewer.exposure = 0.65;
        if (modelViewer.model?.materials) {
          for (const m of modelViewer.model.materials) {
            try {
              if (typeof m.ensureLoaded === 'function') await m.ensureLoaded();
            } catch (e) {}
          }
        }
      });

      modelViewer.addEventListener('error', (event) => {
        console.warn('AR model-viewer load error:', event?.detail || event);
        if (preparingOverlay) {
          preparingOverlay.classList.remove('hidden');
          preparingOverlay.style.display = 'flex';
          const titleEl = preparingOverlay.querySelector('.ar-preparing-title');
          if (titleEl) titleEl.textContent = 'FAILED TO LOAD 3D MODEL';
        }
        if (progressPct) progressPct.textContent = 'Check connection & retry';
        updateCompatStatus('AR MODEL LOAD ERROR', 'is-error');
      });

      modelViewer.addEventListener('ar-status', (event) => {
        const status = event?.detail?.status;
        if (status === 'session-started') {
          updateCompatStatus('AR SESSION ACTIVE', 'is-ready');
        } else if (status === 'failed') {
          updateCompatStatus('AR SESSION UNAVAILABLE ON THIS DEVICE', 'is-error');
        } else if (status === 'not-presenting') {
          modelViewer.cameraOrbit = '36deg 74deg 6.8m';
          modelViewer.fieldOfView = '36deg';
          updateCompatStatus();
        }
      });

      if (isARDirect) {
        ensureArModelLoaded();
        currentPortalMode = 'ar';
        document.body.classList.remove('mode-journey', 'dest-cockpit', 'dest-exploded', 'dest-game', 'dest-chronicles');
        document.body.classList.add('mode-destination', 'dest-ar');
        unlockStory();
        updateReturnBarLabel();
        if (lenisInstance) lenisInstance.start();
      } else if (arSection && 'IntersectionObserver' in window) {
        const arLoadObs = new IntersectionObserver((entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            ensureArModelLoaded();
            arLoadObs.disconnect();
          }
        }, { rootMargin: '400px' });
        arLoadObs.observe(arSection);
      }
    }
  }

  function init() {
    // Instant dismiss of legacy preloader; Showroom uses its own progressive stage loader
    dismissPreloader();

    // Creative Frontend Engines Initialization
    initLenis();
    if (lenisInstance) lenisInstance.stop();
    initGSAPMotionDesign();
    initVanillaTilt();
    initCustomCursor();
    initParticles();

    setupShowroomPortal();
    setupSpecsUnitToggle();
    setupShowroomSplit();
    setupExperienceModals();
    setupAugmentedReality();
    setupFiveActExperience();

    observeSections();

    window.unlockStory = unlockStory;
    window.lenisInstance = lenisInstance;

    // Auto-route direct AR QR scans (`?ar=true`) straight to 1:1 AR portal
    if (window.location.search.includes('ar=true') || window.location.hash === '#ar-section') {
      enterShowroomDestination('ar');
      return;
    }

    if (window.location.hash) {
      const hash = window.location.hash;
      if (hash === '#cockpit-sim-section' || hash === '#act-3') {
        enterShowroomDestination('cockpit');
      } else if (hash === '#exploded-section' || hash === '#act-2') {
        enterShowroomDestination('exploded');
      } else if (hash === '#game-section') {
        enterShowroomDestination('game');
      } else if (hash === '#ford' || hash.startsWith('#ford-')) {
        enterShowroomDestination('chronicles');
        setTimeout(() => {
          openExperienceModal('ford');
          const tabPart = hash.replace('#ford-', '').replace('#ford', '');
          if (tabPart) {
            document.querySelector(`.subnav-pill[data-tab-group="ford"][data-tab="${tabPart}"]`)?.click();
          }
        }, 280);
      } else if (hash === '#ferrari' || hash.startsWith('#ferrari-')) {
        enterShowroomDestination('chronicles');
        setTimeout(() => {
          openExperienceModal('ferrari');
          const tabPart = hash.replace('#ferrari-', '').replace('#ferrari', '');
          if (tabPart) {
            document.querySelector(`.subnav-pill[data-tab-group="ferrari"][data-tab="${tabPart}"]`)?.click();
          }
        }, 280);
      } else if (document.querySelector(hash)) {
        enterShowroomDestination('chronicles', { anchor: hash });
      }
    }
  }

  // =================================================================
  //  Stage 1: 5-Act Progressive Experience & Choreography Engine
  // =================================================================

  function setupFiveActExperience() {
    const topBar = document.getElementById('mission-top-bar');
    const topActLabel = document.getElementById('mission-top-act-label');
    const actPills = document.querySelectorAll('.mission-act-pill');
    const wayfinderNodes = document.querySelectorAll('.wayfinder-node');
    const progressCount = document.getElementById('mission-progress-count');

    const actionPill = document.getElementById('mission-action-pill');
    const pillKicker = document.getElementById('pill-act-kicker');
    const pillStatus = document.getElementById('pill-act-status');
    const pillPrimaryBtn = document.getElementById('pill-primary-btn');
    const pillPrimaryLabel = document.getElementById('pill-primary-label');
    const pillNextBtn = document.getElementById('pill-next-btn');
    const pillNextLabel = document.getElementById('pill-next-label');

    let currentAct = 1;
    let currentAct2Beat = 1;
    let directorAuto = true;
    const stampedActs = new Set();

    const ACT_META = {
      1: {
        topLabel: 'ACT I // 1963–1964 • THE RIVALRY',
        kicker: 'ACT I // CONFRONTATION',
        status: '7.0L V8 VS 4.0L V12',
        primaryText: 'REV GT40 V8',
        nextText: 'ACT II',
        nextTarget: '#act-2'
      },
      2: {
        topLabel: 'ACT II // SHELBY HANGAR • RE-ENGINEERING',
        kicker: 'ACT II // ANATOMY 3D',
        status: '01 PEEL BACK SHELL',
        primaryText: 'NEXT BEAT // 750°C',
        nextText: 'ACT III',
        nextTarget: '#act-3'
      },
      3: {
        topLabel: 'ACT III // LA SARTHE TEST & COCKPIT',
        kicker: 'ACT III // DRIVER SEAT',
        status: 'RHD 427 IGNITION',
        primaryText: 'START 427 ENGINE',
        nextText: 'ACT IV',
        nextTarget: '#act-4'
      },
      4: {
        topLabel: 'ACT IV // JUNE 18–19 • 24H CRUCIBLE',
        kicker: 'ACT IV // 24H SIEGE',
        status: '16:00 SAT → 16:00 SUN',
        primaryText: 'ADVANCE RACE HOUR',
        nextText: 'ACT V',
        nextTarget: '#act-5'
      },
      5: {
        topLabel: 'ACT V // KEYS BACK • P/1046 1:1 AR',
        kicker: 'ACT V // DELIVERANCE',
        status: 'CHASSIS P/1046 READY',
        primaryText: '1966 SUNSET REVEAL',
        nextText: 'SHOWROOM',
        nextTarget: 'showroom'
      }
    };

    function scrollToElement(selector) {
      if (selector === 'showroom') {
        returnToShowroom();
        return;
      }
      const target = document.querySelector(selector);
      if (!target) return;
      if (lenisInstance) {
        lenisInstance.scrollTo(target, { duration: 1.25 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }

    function markActComplete(actNum) {
      if (stampedActs.has(actNum)) return;
      stampedActs.add(actNum);
      actPills.forEach((p) => {
        if (parseInt(p.dataset.act, 10) === actNum) p.classList.add('completed');
      });
      wayfinderNodes.forEach((n) => {
        if (parseInt(n.dataset.act, 10) === actNum) n.classList.add('completed');
      });
      if (progressCount) {
        progressCount.textContent = `${stampedActs.size} / 5 STAMPS`;
      }
    }
    window.markActComplete = markActComplete;

    function setActiveAct(actNum) {
      if (!ACT_META[actNum]) return;
      currentAct = actNum;
      const meta = ACT_META[actNum];

      if (topActLabel) topActLabel.textContent = meta.topLabel;
      actPills.forEach((p) => {
        p.classList.toggle('active', parseInt(p.dataset.act, 10) === actNum);
      });

      if (pillKicker) pillKicker.textContent = meta.kicker;
      if (pillStatus) {
        pillStatus.textContent = actNum === 2 ? getBeatStatusLabel(currentAct2Beat) : meta.status;
      }
      if (pillPrimaryLabel) {
        pillPrimaryLabel.textContent = actNum === 2 ? getBeatPrimaryCta(currentAct2Beat) : meta.primaryText;
      }
      if (pillNextLabel) pillNextLabel.textContent = meta.nextText;
    }

    function getBeatStatusLabel(beat) {
      if (beat === 1) return '01 X-RAY CHASSIS PEEL';
      if (beat === 2) return '02 750°C ROTOR STRESS';
      return '03 QUICK-CHANGE LOCKED';
    }

    function getBeatPrimaryCta(beat) {
      if (beat === 1) return 'INSPECT 750°C FADE';
      if (beat === 2) return 'LOCK QUICK-CHANGE';
      return 'REPLAY TEARDOWN';
    }

    // Track visibility only while browsing Chronicles mode
    function updateHudVisibility() {
      const isChronicles = document.body.classList.contains('dest-chronicles');
      const belowHero = isChronicles && storyUnlocked;
      const anyModalOpen = document.querySelector('.exp-modal.open');
      const gameHud = document.getElementById('game-hud');
      const isDriving = Boolean(gameHud && gameHud.classList.contains('active'));

      if (topBar) {
        topBar.classList.toggle('visible', belowHero && !anyModalOpen && !isDriving);
      }

      if (actionPill) {
        let shouldAvoid = false;
        const dockEls = [
          document.querySelector('.exploded-quick-hud'),
          document.querySelector('.cockpit-quick-hud'),
          document.getElementById('game-container'),
          document.getElementById('showroom-vs-hud'),
          document.getElementById('act2-beat-hud')
        ];
        for (const el of dockEls) {
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.bottom > window.innerHeight - 105 && r.top < window.innerHeight - 12) {
            shouldAvoid = true;
            break;
          }
        }
        actionPill.classList.toggle('visible', belowHero && !anyModalOpen && !isDriving);
        actionPill.classList.toggle('avoid-stage-hud', shouldAvoid);
      }
    }

    function syncActiveActByViewport() {
      const chapters = document.querySelectorAll('.act-chapter');
      const focusY = window.innerHeight * 0.45;
      let matchedAct = 1;
      let bestDist = Infinity;
      chapters.forEach((ch) => {
        const actNum = parseInt(ch.dataset.act, 10);
        const r = ch.getBoundingClientRect();
        if (r.top <= focusY && r.bottom >= focusY) {
          matchedAct = actNum;
          bestDist = -1;
        } else if (bestDist >= 0) {
          const dist = Math.abs((r.top + r.bottom) * 0.5 - focusY);
          if (dist < bestDist) {
            bestDist = dist;
            matchedAct = actNum;
          }
        }
      });
      if (matchedAct !== currentAct) {
        setActiveAct(matchedAct);
      }
    }

    window.addEventListener('scroll', () => {
      requestAnimationFrame(() => {
        updateHudVisibility();
        syncActiveActByViewport();
      });
    }, { passive: true });
    if (lenisInstance) {
      lenisInstance.on('scroll', () => {
        updateHudVisibility();
        syncActiveActByViewport();
      });
    }
    setInterval(updateHudVisibility, 450);

    // Top Act Pill Clicks
    actPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        playClickSound();
        const targetSel = pill.dataset.actTarget;
        if (targetSel) scrollToElement(targetSel);
      });
    });

    syncActiveActByViewport();

    // ---- ACT I: Showroom Duel Audio Pill ----
    const showroomContainer = document.getElementById('showroom-split-container');
    const vsFordBtn = document.getElementById('btn-vs-ford-rev');
    const vsFerrariBtn = document.getElementById('btn-vs-ferrari-rev');

    if (vsFordBtn) {
      vsFordBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playFordV8Rev();
        markActComplete(1);
        if (showroomContainer) {
          showroomContainer.classList.remove('hover-ferrari');
          showroomContainer.classList.add('hover-ford');
          setTimeout(() => showroomContainer.classList.remove('hover-ford'), 2200);
        }
      });
    }

    if (vsFerrariBtn) {
      vsFerrariBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playFerrariV12Rev();
        markActComplete(1);
        if (showroomContainer) {
          showroomContainer.classList.remove('hover-ford');
          showroomContainer.classList.add('hover-ferrari');
          setTimeout(() => showroomContainer.classList.remove('hover-ferrari'), 2200);
        }
      });
    }

    document.getElementById('showroom-half-ford')?.addEventListener('click', () => markActComplete(1));
    document.getElementById('showroom-half-ferrari')?.addEventListener('click', () => markActComplete(1));

    // ---- ACT II: Scroll & Click Choreography Engine (X-Ray Peel + 750°C Look Closer) ----
    const xrayCurtain = document.getElementById('exploded-xray-curtain');
    const beatHud = document.getElementById('act2-beat-hud');
    const beatKicker = document.getElementById('act2-beat-kicker');
    const beatSolid = document.getElementById('act2-headline-solid');
    const beatOutline = document.getElementById('act2-headline-outline');
    const beatSub = document.getElementById('act2-beat-sub');
    const beatChips = document.querySelectorAll('.beat-chip[data-beat]');
    const directorToggle = document.getElementById('act2-director-toggle');

    const BEAT_COPY = {
      1: {
        kicker: 'ACT II // BEAT 01 • SHELBY TEARDOWN',
        solid: 'PEEL BACK',
        outline: 'THE SHELL.',
        sub: 'Under 212 mph, standard street iron fails. Laser X-ray telemetry separates the monocoque and powertrain.',
        hudClass: ''
      },
      2: {
        kicker: 'ACT II // BEAT 02 • 750°C THERMAL FADE',
        solid: 'LOOK CLOSER.',
        outline: '750°C ROTORS.',
        sub: 'Dropping from 212 mph at Mulsanne Corner turns solid discs cherry red—until Phil Remington’s quick-change brackets arrive.',
        hudClass: 'beat-thermal'
      },
      3: {
        kicker: 'ACT II // BEAT 03 • LE MANS SPEC LOCKED',
        solid: 'QUICK-CHANGE.',
        outline: 'FADE GONE.',
        sub: '60-second ventilated calipers and the 485 bhp 427 FE V8 lock in to conquer 24 unbroken hours.',
        hudClass: 'beat-locked'
      }
    };

    function applyAct2Beat(beatNum, fromScroll = false) {
      const prevBeat = currentAct2Beat;
      currentAct2Beat = beatNum;
      const cfg = BEAT_COPY[beatNum];
      if (!cfg) return;

      if (beatHud) {
        beatHud.classList.remove('beat-thermal', 'beat-locked');
        if (cfg.hudClass) beatHud.classList.add(cfg.hudClass);
      }
      if (beatKicker) beatKicker.textContent = cfg.kicker;
      if (beatSolid) beatSolid.textContent = cfg.solid;
      if (beatOutline) beatOutline.textContent = cfg.outline;
      if (beatSub) beatSub.textContent = cfg.sub;

      beatChips.forEach((chip) => {
        chip.classList.toggle('active', parseInt(chip.dataset.beat, 10) === beatNum);
      });

      if (currentAct === 2) setActiveAct(2);

      const viewer = window.gt40ExplodedViewer;
      if (viewer && (!fromScroll || prevBeat !== beatNum)) {
        if (beatNum === 1) {
          viewer.setBrakeThermalStress(0);
          viewer.setXRay(false, true);
          viewer.setSystem('all', { silent: fromScroll, explode: 0.45, duration: 850 });
          if (xrayCurtain) xrayCurtain.classList.add('scanning');
        } else if (beatNum === 2) {
          viewer.setXRay(false, true);
          viewer.setSystem('brakes', { silent: fromScroll, explode: 0.78, duration: 900 });
          viewer.setBrakeThermalStress(1.0);
          if (xrayCurtain) xrayCurtain.classList.remove('scanning');
          if (!fromScroll) markActComplete(2);
        } else if (beatNum === 3) {
          viewer.setBrakeThermalStress(0);
          viewer.setXRay(false, true);
          viewer.setSystem('all', { silent: fromScroll, explode: 0.62, duration: 1000 });
          if (!fromScroll) {
            viewer.setEnvironmentMode('podium');
            markActComplete(2);
          }
          if (xrayCurtain) xrayCurtain.classList.remove('scanning');
        }
      }
    }

    function updateDirectorToggleUI() {
      if (!directorToggle) return;
      directorToggle.classList.toggle('active', directorAuto);
      directorToggle.textContent = directorAuto ? 'DIRECTOR: AUTO' : 'FREE ORBIT';
    }

    if (directorToggle) {
      directorToggle.addEventListener('click', () => {
        directorAuto = !directorAuto;
        updateDirectorToggleUI();
        playClickSound();
        if (directorAuto) applyAct2Beat(currentAct2Beat, false);
      });
    }

    beatChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const beat = parseInt(chip.dataset.beat, 10);
        directorAuto = true;
        updateDirectorToggleUI();
        playClickSound();
        applyAct2Beat(beat, false);
      });
    });

    window.addEventListener('gt40:exploded-user-override', () => {
      if (directorAuto) {
        directorAuto = false;
        updateDirectorToggleUI();
      }
      if (xrayCurtain) xrayCurtain.classList.remove('scanning');
      markActComplete(2);
    });

    document.getElementById('btn-rev-engine')?.addEventListener('click', () => markActComplete(2));

    // Scroll-scrubbed X-Ray scanner sweep & automatic Act II Beat progression
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      const explodedEl = document.getElementById('exploded-section');
      if (explodedEl) {
        ScrollTrigger.create({
          trigger: explodedEl,
          start: 'top 42%',
          end: 'bottom 60%',
          onUpdate: (self) => {
            if (!directorAuto) return;
            const p = self.progress;
            if (p < 0.34) {
              if (xrayCurtain) {
                xrayCurtain.classList.add('scanning');
                const scanPct = Math.round(12 + (p / 0.34) * 76);
                xrayCurtain.style.setProperty('--scan-x', `${scanPct}%`);
              }
              applyAct2Beat(1, true);
            } else if (p < 0.68) {
              applyAct2Beat(2, true);
            } else {
              applyAct2Beat(3, true);
            }
          },
          onLeave: () => {
            if (xrayCurtain) xrayCurtain.classList.remove('scanning');
          },
          onLeaveBack: () => {
            if (xrayCurtain) xrayCurtain.classList.remove('scanning');
          }
        });
      }
    }

    // ---- ACT III & IV Completion Telemetry Hooks ----
    document.getElementById('cockpit-start-btn')?.addEventListener('click', () => markActComplete(3));
    document.getElementById('game-start-btn')?.addEventListener('click', () => markActComplete(3));

    document.querySelectorAll('.circuit-hotspot').forEach((hs) => {
      hs.addEventListener('click', () => markActComplete(4));
    });
    document.getElementById('race-time-slider')?.addEventListener('input', () => markActComplete(4));
    document.querySelectorAll('.race-hour-marker').forEach((btn) => {
      btn.addEventListener('click', () => markActComplete(4));
    });

    // ---- ACT V: AR Golden Sunset / Paddock Lighting Switcher ----
    const arStage = document.getElementById('ar-stage-container');
    const arLightBtns = document.querySelectorAll('.ar-light-btn');
    const arViewer = document.getElementById('gt40-ar-viewer');
    const MOOD_EXPOSURE = { night: 0.55, sunset: 0.78, studio: 0.90 };

    function setArMood(mood) {
      if (!arStage || !MOOD_EXPOSURE[mood]) return;
      arStage.classList.remove('mood-night', 'mood-sunset', 'mood-studio');
      arStage.classList.add(`mood-${mood}`);
      arLightBtns.forEach((b) => b.classList.toggle('active', b.dataset.arMood === mood));
      if (arViewer) {
        arViewer.exposure = MOOD_EXPOSURE[mood];
      }
      markActComplete(5);
    }

    arLightBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        playClickSound();
        setArMood(btn.dataset.arMood);
      });
    });

    document.getElementById('ar-launch-button')?.addEventListener('click', () => markActComplete(5));
    document.getElementById('ar-direct-trigger')?.addEventListener('click', () => markActComplete(5));
    arViewer?.addEventListener('camera-change', (e) => {
      if (e?.detail?.source === 'user-interaction') {
        markActComplete(5);
      }
    });

    // ---- Contextual Floating Bottom Pill Actions ----
    if (pillPrimaryBtn) {
      pillPrimaryBtn.addEventListener('click', () => {
        playClickSound();
        if (currentAct === 1) {
          scrollToElement('#slide-2-showroom');
          setTimeout(() => document.getElementById('btn-vs-ford-rev')?.click(), 350);
        } else if (currentAct === 2) {
          const nextBeat = currentAct2Beat >= 3 ? 1 : currentAct2Beat + 1;
          directorAuto = true;
          updateDirectorToggleUI();
          applyAct2Beat(nextBeat, false);
        } else if (currentAct === 3) {
          scrollToElement('#cockpit-sim-section');
          setTimeout(() => document.getElementById('cockpit-start-btn')?.click(), 400);
        } else if (currentAct === 4) {
          scrollToElement('#race-clock-section');
          const clock = window.gt40RaceClock;
          if (clock && typeof clock.setPhase === 'function') {
            const nextIdx = ((clock.currentPhaseIndex || 0) + 1) % 8;
            clock.setPhase(nextIdx, true);
            markActComplete(4);
          }
        } else if (currentAct === 5) {
          scrollToElement('#ar-section');
          setArMood('sunset');
        }
      });
    }

    if (pillNextBtn) {
      pillNextBtn.addEventListener('click', () => {
        playClickSound();
        const meta = ACT_META[currentAct];
        if (meta && meta.nextTarget) scrollToElement(meta.nextTarget);
      });
    }

    setActiveAct(1);
  }

  init();
})();
