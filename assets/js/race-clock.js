/**
 * The 24-Hour Crucible — Master Le Mans 1966 Time-Scrubber Experience
 * 00:00 → 24:00 Interactive Race Dial, Dynamic Sky/Atmosphere Engine,
 * Ford vs Ferrari Real-Time Attrition Telemetry & Archival Moments
 */

export const RACE_CHRONOLOGY = [
  {
    hour: 0,
    timeLabel: '16:00 SATURDAY',
    tag: 'HOUR 00:00 // THE LAUNCH',
    title: 'THE SPRINT ACROSS THE TARMAC',
    weather: 'Clear • 24°C • Dry Track',
    sky: 'linear-gradient(135deg, #1c2638 0%, #2f3e58 60%, #44597b 100%)',
    rainIntensity: 0,
    fordRunning: 8,
    fordRetired: 0,
    ferrariRunning: 14,
    ferrariRetired: 0,
    leader: 'Ford GT40 Mk II #1 (Ken Miles)',
    lap: 'Lap 1 / 360',
    lapTime: '3:34.2 (136 mph)',
    image: 'assets/images/history/ford-team.jpg',
    desc: 'Under the afternoon sun, Henry Ford II steps onto the grandstand balcony and waves the French tricolor. 55 drivers sprint across the asphalt in the traditional Le Mans start. Ken Miles slams into car #1, but the driver door fails to latch properly, forcing a rapid opening lap stop while Dan Gurney (#3) and Graham Hill launch into an immediate dogfight with the factory Ferraris.',
    quote: '"You\'ve got 24 hours to prove that American engineering can conquer the world." — Henry Ford II'
  },
  {
    hour: 4,
    timeLabel: '20:00 SATURDAY',
    tag: 'HOUR 04:00 // DUSK INTO DARKNESS',
    title: 'HEADLIGHTS PIERCE THE DUSK',
    weather: 'Dusk • Light Rain Drizzle • 19°C',
    sky: 'linear-gradient(135deg, #0e1320 0%, #1e1b34 50%, #3a2238 100%)',
    rainIntensity: 0.25,
    fordRunning: 8,
    fordRetired: 0,
    ferrariRunning: 13,
    ferrariRetired: 1,
    leader: 'Ferrari 330 P3 #21 (Bandini / Guichet)',
    lap: 'Lap 64 / 360',
    lapTime: '3:32.8',
    image: 'assets/images/history/ferrari-330p3-lemans-21.jpg',
    brief: 'Violet twilight falls over the French countryside. High-intensity quartz-iodine headlights illuminate mist spraying from wide rear tires. Ferrari\'s 4.0L quad-cam V12 proves blisteringly fast in the damp cooler air, trading the overall lead with Miles\' Shelby GT40 every two laps down the Mulsanne.',
    desc: 'Violet twilight falls over the French countryside. High-intensity quartz-iodine headlights illuminate mist spraying from wide rear tires. Ferrari\'s 4.0L quad-cam V12 proves blisteringly fast in the damp cooler air, trading the overall lead with Miles\' Shelby GT40 every two laps down the Mulsanne.',
    quote: '"The Ferrari is nimble through the corners, but when the 427 clears its throat on the straight, we pull away like they\'re tied to a post." — Ken Miles'
  },
  {
    hour: 8,
    timeLabel: '00:00 MIDNIGHT',
    tag: 'HOUR 08:00 // THE DOWNPOUR',
    title: 'NIGHTMARE ON THE MULSANNE',
    weather: 'Torrential Rain • Standing Water • 14°C',
    sky: 'linear-gradient(135deg, #040508 0%, #080c14 60%, #0a1120 100%)',
    rainIntensity: 0.90,
    fordRunning: 6,
    fordRetired: 2,
    ferrariRunning: 8,
    ferrariRetired: 6,
    leader: 'Ford GT40 Mk II #1 (Ken Miles / Denny Hulme)',
    lap: 'Lap 128 / 360',
    lapTime: '3:45.0 (Heavy Wet)',
    image: 'assets/images/history/ford-lemans-car5.jpg',
    desc: 'A devastating summer storm inundates the circuit with blinding sheets of water. Hydroplaning at 200 mph on the unlit Mulsanne Straight becomes a terrifying battle for survival. Ferrari begins suffering catastrophic clutch and gearbox failures under the brutal torque shock of standing water, while Shelby American\'s Kar Kraft T-44 transaxles hold together.',
    quote: '"You couldn\'t see twenty feet past the windshield wipers. You just aimed between the tail lights ahead and prayed." — Denny Hulme'
  },
  {
    hour: 12,
    timeLabel: '04:00 SUNDAY (DAWN)',
    tag: 'HOUR 12:00 // HALFWAY CRUCIBLE',
    title: 'THE RECORD-SHATTERING DAWN',
    weather: 'Dawn Fog • Track Drying • 15°C',
    sky: 'linear-gradient(135deg, #090e18 0%, #171b26 40%, #3e2e28 100%)',
    rainIntensity: 0.10,
    fordRunning: 5,
    fordRetired: 3,
    ferrariRunning: 3,
    ferrariRetired: 11,
    leader: 'Ford GT40 Mk II #1 (Ken Miles)',
    lap: 'Lap 192 / 360',
    lapTime: '3:30.6 (ALL-TIME TRACK RECORD)',
    image: 'assets/images/history/ford-miles.jpg',
    desc: 'As pink dawn burns off the mist over Tertre Rouge and Arnage, the brutal attrition toll becomes clear: all three works factory Ferrari 330 P3s are OUT of the race with terminal engine and drivetrain failures. Carroll Shelby signals Ken Miles to push, and Miles responds by shattering the all-time Le Mans circuit lap record with a staggering 3:30.6 (138.3 mph).',
    quote: '"Ken was driving like an artist possessed. He wasn\'t racing Ferraris anymore; he was racing time itself." — Carroll Shelby'
  },
  {
    hour: 16,
    timeLabel: '08:00 SUNDAY',
    tag: 'HOUR 16:00 // MECHANICAL MASTERY',
    title: 'THE 60-SECOND BRAKE MIRACLE',
    weather: 'Overcast • 18°C • Dry Line',
    sky: 'linear-gradient(135deg, #121822 0%, #202836 60%, #323d4e 100%)',
    rainIntensity: 0,
    fordRunning: 4,
    fordRetired: 4,
    ferrariRunning: 1,
    ferrariRetired: 13,
    leader: 'Ford GT40 Mk II #1 (Miles / Hulme)',
    lap: 'Lap 256 / 360',
    lapTime: '3:33.4',
    image: 'assets/images/history/ford-lemans-car2.jpg',
    desc: 'Ford now controls the top three positions. With brake pads glowing red and steel rotors developing thermal fatigue cracks, Phil Remington\'s revolutionary quick-change caliper bracket system pays monumental dividends: Shelby mechanics swap complete pre-assembled brake rotors and fresh pads in under 60 seconds, sending the car back out while competitors lose 15 minutes.',
    quote: '"Phil Remington was the smartest mechanic on earth. He solved problems before anyone else even knew they existed." — Dan Gurney'
  },
  {
    hour: 20,
    timeLabel: '12:00 SUNDAY',
    tag: 'HOUR 20:00 // THE EXECUTIVE ORDER',
    title: 'LEO BEEBE\'S DEAD-HEAT SCHEME',
    weather: 'Cloudy • 21°C • Ambient Tension',
    sky: 'linear-gradient(135deg, #1a222e 0%, #293444 60%, #3b495c 100%)',
    rainIntensity: 0,
    fordRunning: 3,
    fordRetired: 5,
    ferrariRunning: 0,
    ferrariRetired: 14,
    leader: 'Ford GT40 Mk II #1 (Ken Miles leading by laps)',
    lap: 'Lap 318 / 360',
    lapTime: '3:42.0 (Conserving Pace)',
    image: 'assets/images/history/ford-shelby.jpg',
    desc: 'The final surviving privateer Ferrari retires in the paddock; Ford has won the 24 Hours of Le Mans. Ken Miles holds an insurmountable multi-lap lead in car #1. But Ford PR director Leo Beebe conceives a PR stunt: ordering Ken Miles to slow down so Bruce McLaren (#2) and Ronnie Bucknum (#5) can catch up and cross the finish line in a historic 1-2-3 formation.',
    quote: '"Leo, Ken has earned this victory. You\'re asking a champion to surrender his prize." — Carroll Shelby to Leo Beebe'
  },
  {
    hour: 22,
    timeLabel: '14:00 SUNDAY',
    tag: 'HOUR 22:00 // THE BITTERSWEET LIFT',
    title: 'THE SACRIFICE OF SPEED',
    weather: 'Overcast Skies • 20°C',
    sky: 'linear-gradient(135deg, #161e2a 0%, #232c3a 60%, #333d4e 100%)',
    rainIntensity: 0.15,
    fordRunning: 3,
    fordRetired: 5,
    ferrariRunning: 0,
    ferrariRetired: 14,
    leader: 'Ford GT40 Mk II #1 & #2 (Running Nose to Tail)',
    lap: 'Lap 344 / 360',
    lapTime: '3:50.1 (Formation Cruise)',
    image: 'assets/images/history/ford-gt40-profile-1966.jpg',
    desc: 'Disillusioned by corporate politics but loyal to Carroll Shelby and the team, Ken Miles reluctantly lifts off the throttle, lapping 15 seconds off his record pace. Bruce McLaren and Chris Amon in the black #2 GT40 close the gap. Rain begins falling once again as the crowds surge against the paddock fences.',
    quote: '"I work for Ford. If they want a tie, I\'ll give them their photograph." — Ken Miles'
  },
  {
    hour: 24,
    timeLabel: '16:00 SUNDAY (FINISH)',
    tag: 'HOUR 24:00 // HISTORIC TRIUMPH',
    title: 'THE 1-2-3 IMMORTAL FINISH',
    weather: 'Light Rain • 19°C • Historic Triumph',
    sky: 'linear-gradient(135deg, #111a28 0%, #1e2b3e 60%, #30445e 100%)',
    rainIntensity: 0.30,
    fordRunning: 3,
    fordRetired: 5,
    ferrariRunning: 0,
    ferrariRetired: 14,
    leader: 'CHAMPIONS // McLaren & Amon (#2) / Miles & Hulme (#1)',
    lap: 'Lap 360 / 360 (4,843.09 km Completed)',
    lapTime: 'Average Speed: 125.45 mph (201.89 km/h)',
    image: 'assets/images/history/ford-lemans-formation.jpg',
    desc: 'At exactly 4:00 PM Sunday, the three black, blue, and gold Ford GT40 Mk IIs cross the finish line side-by-side in pouring rain. While Ford intended a dead-heat tie, the ACO officials rule that because Bruce McLaren and Chris Amon qualified 4th (starting ~20 meters behind Miles), they covered 8 meters more distance in 24 hours, awarding Car #2 the official victory. America has dethroned Ferrari.',
    quote: '"Ferrari was King. But today, the blue oval took the crown." — International Herald Tribune, June 1966'
  }
];

export class LeMansRaceClock {
  constructor() {
    this.container = document.getElementById('race-clock-section');
    if (!this.container) return;

    this.currentPhaseIndex = 0;

    // DOM Elements
    this.dialTime = document.getElementById('clock-dial-time');
    this.dialTag = document.getElementById('clock-phase-tag');
    this.dialTitle = document.getElementById('clock-phase-title');
    this.dialDesc = document.getElementById('clock-phase-desc');
    this.dialQuote = document.getElementById('clock-phase-quote');
    this.dialWeather = document.getElementById('clock-weather-val');
    this.dialLeader = document.getElementById('clock-leader-val');
    this.dialLap = document.getElementById('clock-lap-val');
    this.dialLapTime = document.getElementById('clock-laptime-val');
    this.dialImage = document.getElementById('clock-phase-image');
    this.fordCount = document.getElementById('clock-ford-count');
    this.ferrariCount = document.getElementById('clock-ferrari-count');
    this.slider = document.getElementById('race-time-slider');
    this.sliderFill = document.getElementById('race-slider-fill');
    this.hourButtons = document.querySelectorAll('.race-hour-marker');
    this.rainCanvas = document.getElementById('race-rain-canvas');

    this.initRainCanvas();
    this.bindEvents();
    this.setPhase(0);
  }

  initRainCanvas() {
    if (!this.rainCanvas) return;
    this.ctx = this.rainCanvas.getContext('2d');
    this.resizeRain();
    window.addEventListener('resize', () => this.resizeRain());

    this.raindrops = [];
    for (let i = 0; i < 70; i++) {
      this.raindrops.push({
        x: Math.random(),
        y: Math.random(),
        len: 12 + Math.random() * 18,
        speed: 8 + Math.random() * 12
      });
    }

    const renderRain = () => {
      requestAnimationFrame(renderRain);
      if (!this.ctx || !this.rainCanvas) return;
      const phase = RACE_CHRONOLOGY[this.currentPhaseIndex];
      const intensity = phase ? phase.rainIntensity : 0;

      const w = this.rainCanvas.width;
      const h = this.rainCanvas.height;
      this.ctx.clearRect(0, 0, w, h);

      if (intensity <= 0.05) return;

      this.ctx.strokeStyle = `rgba(180, 215, 255, ${intensity * 0.45})`;
      this.ctx.lineWidth = 1.2;

      this.raindrops.forEach((d) => {
        d.y += (d.speed / h) * (1 + intensity);
        d.x -= (2 / w);
        if (d.y > 1) { d.y = 0; d.x = Math.random(); }
        if (d.x < 0) { d.x = 1; }

        this.ctx.beginPath();
        this.ctx.moveTo(d.x * w, d.y * h);
        this.ctx.lineTo(d.x * w - 6, d.y * h + d.len);
        this.ctx.stroke();
      });
    };
    renderRain();
  }

  resizeRain() {
    if (!this.rainCanvas) return;
    const rect = this.rainCanvas.getBoundingClientRect();
    this.rainCanvas.width = rect.width;
    this.rainCanvas.height = rect.height;
  }

  bindEvents() {
    if (this.slider) {
      this.slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        // Find closest chronology index
        const idx = Math.min(RACE_CHRONOLOGY.length - 1, Math.round((val / 24) * (RACE_CHRONOLOGY.length - 1)));
        this.setPhase(idx, false);
      });
    }

    if (this.hourButtons) {
      this.hourButtons.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          this.setPhase(idx, true);
        });
      });
    }
  }

  setPhase(idx, updateSlider = true) {
    if (idx < 0 || idx >= RACE_CHRONOLOGY.length) return;
    this.currentPhaseIndex = idx;
    const data = RACE_CHRONOLOGY[idx];

    // Update Slider UI
    const pct = Math.round((data.hour / 24) * 100);
    if (updateSlider && this.slider) {
      this.slider.value = data.hour;
    }
    if (this.sliderFill) {
      this.sliderFill.style.width = `${pct}%`;
    }

    // Hour marker buttons
    if (this.hourButtons) {
      this.hourButtons.forEach((btn, i) => {
        btn.classList.toggle('active', i === idx);
      });
    }

    // Update text and telemetry
    if (this.dialTime) this.dialTime.textContent = data.timeLabel;
    if (this.dialTag) this.dialTag.textContent = data.tag;
    if (this.dialTitle) this.dialTitle.textContent = data.title;
    if (this.dialDesc) this.dialDesc.textContent = data.desc;
    if (this.dialQuote) this.dialQuote.textContent = data.quote;
    if (this.dialWeather) this.dialWeather.textContent = data.weather;
    if (this.dialLeader) this.dialLeader.textContent = data.leader;
    if (this.dialLap) this.dialLap.textContent = data.lap;
    if (this.dialLapTime) this.dialLapTime.textContent = data.lapTime;

    if (this.fordCount) this.fordCount.textContent = `${data.fordRunning} RUNNING / ${data.fordRetired} RETIRED`;
    if (this.ferrariCount) this.ferrariCount.textContent = `${data.ferrariRunning} RUNNING / ${data.ferrariRetired} RETIRED`;

    // Dynamic Atmospheric Background
    const backdrop = document.getElementById('race-clock-backdrop');
    if (backdrop) {
      backdrop.style.background = data.sky;
    }

    // Archival Image Fade
    if (this.dialImage) {
      this.dialImage.style.opacity = '0.25';
      setTimeout(() => {
        this.dialImage.src = data.image;
        this.dialImage.style.opacity = '1.0';
      }, 150);
    }

    // Trigger victory confetti on the 24th hour finish
    if (data.hour === 24 && typeof confetti === 'function') {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.65 },
        colors: ['#d4af37', '#ffffff', '#e02424', '#1e40af']
      });
    }
  }
}
