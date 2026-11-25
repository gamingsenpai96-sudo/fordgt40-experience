/**
 * 1966 Circuit de la Sarthe — Interactive Le Mans Track Experience
 * 13.461 km Historic High-Speed Configuration (No Mulsanne chicanes)
 * Interactive Hotspots, Sector Telemetry, Archival Imagery & Driver Briefings
 */

export const LEMANS_1966_SECTORS = {
  'start-finish': {
    name: 'START / FINISH & PITS',
    french: 'Ligne Droite des Stands',
    length: '1,100 m',
    speed: '145 mph (233 km/h)',
    gear: '3rd → 4th Gear',
    danger: 'MODERATE',
    image: 'assets/images/history/ford-lemans-car2.jpg',
    brief: 'The nerve center of the 24-hour siege. 55 drivers completed the famous sprint across the track to launch their machines at 4:00 PM. Here, Phil Remington and the Shelby American mechanics executed revolutionary quick-change disc brake caliper swaps in under 60 seconds.',
    quote: '"Go like hell, boys. Let\'s make Mr. Ford proud." — Carroll Shelby'
  },
  'dunlop': {
    name: 'DUNLOP CURVE & BRIDGE',
    french: 'Courbe et Passerelle Dunlop',
    length: '650 m',
    speed: '130 mph (209 km/h)',
    gear: '4th → 3rd Gear',
    danger: 'HIGH',
    image: 'assets/images/history/ferrari-330p3-lemans-action.jpg',
    brief: 'Cresting blind under the iconic Dunlop tire bridge at over 130 mph. Aerodynamic lift on the low-slung GT40 Mk II was fierce until Ken Miles and the team refined the front nose splitter and rear ducktail wickerbill.',
    quote: '"At 130 mph under that bridge in the wet, your heart is in your mouth." — Bruce McLaren'
  },
  'tertre-rouge': {
    name: 'THE ESSES & TERTRE ROUGE',
    french: 'Les Esses et Le Tertre Rouge',
    length: '980 m',
    speed: '85 mph → 140 mph',
    gear: '2nd → 3rd Gear',
    danger: 'EXTREME',
    image: 'assets/images/history/ford-gt40-profile-1966.jpg',
    brief: 'The most critical corner on the circuit. Tertre Rouge is a deceptive right-hander that slingshots the car onto the 3.7-mile Mulsanne Straight. A mistake here ruins your terminal velocity for miles; nailing the apex adds 5–7 mph across the entire straight.',
    quote: '"Exit speed out of Tertre Rouge is everything. You carry that momentum all the way to the horizon." — Ken Miles'
  },
  'mulsanne-straight': {
    name: 'MULSANNE STRAIGHT',
    french: 'Ligne Droite des Hunaudières',
    length: '5,800 m (3.7 Miles)',
    speed: '212+ mph (341 km/h)',
    gear: '4th Gear (6,200 RPM Flat Out)',
    danger: 'MAXIMUM',
    image: 'assets/images/history/ford-lemans-car5.jpg',
    brief: '3.7 miles of uninterrupted, heart-pounding flat-out asphalt with no modern chicanes. The 7.0-litre Ford 427 FE V8 roared for over 60 seconds continuous wide-open throttle, vibrating the entire steel semi-monocoque chassis as rain sheets battered the Plexiglas roof.',
    quote: '"Down Mulsanne at 210 mph in the pitch black with rain streaming sideways, you feel like you are flying a fighter jet on the runway." — Chris Amon'
  },
  'mulsanne-corner': {
    name: 'MULSANNE KINK & BRAKING ZONE',
    french: 'Virage de Mulsanne',
    length: '450 m',
    speed: '212 mph → 42 mph',
    gear: '4th → 1st Gear (Severe Braking)',
    danger: 'EXTREME',
    image: 'assets/images/history/ferrari-330p3-lemans-21.jpg',
    brief: 'The most ferocious braking zone in motorsport. Drivers stood on the heavy pedal with both feet, dropping 170 mph in just 250 meters. Brake rotors turned incandescent cherry-red at 750°C, illuminating the wheel arches like fireflies.',
    quote: '"If the brakes fade here, there is nothing between you and the trees." — Denny Hulme'
  },
  'indianapolis': {
    name: 'INDIANAPOLIS BANKING',
    french: 'Virage d\'Indianapolis',
    length: '750 m',
    speed: '135 mph → 65 mph',
    gear: '3rd → 2nd Gear',
    danger: 'HIGH',
    image: 'assets/images/history/ferrari-p3-beauty.jpg',
    brief: 'A fast, slightly banked left-hander plunging through dense forest trees immediately followed by an off-camber 90-degree right turn. Low grip and dappled evening tree shadows made Indianapolis a notorious trap for spinning prototypes.',
    quote: '"Entering Indianapolis blind through the pine trees is like threading a needle at 130 miles an hour." — Ronnie Bucknum'
  },
  'arnage': {
    name: 'ARNAGE CORNER',
    french: 'Virage d\'Arnage',
    length: '320 m',
    speed: '38 mph (61 km/h)',
    gear: '1st Gear (Mechanical Traction)',
    danger: 'MODERATE',
    image: 'assets/images/history/ford-miles.jpg',
    brief: 'The slowest, tightest turn on the 8.3-mile track. Demands absolute chassis composure and throttle control to prevent the massive 475 lb-ft of torque from breaking the wide Goodyear Blue Streak racing slicks loose on the slick public road tarmac.',
    quote: '"First gear, steady throttle. Don\'t let 475 foot-pounds spin you into the spectators." — Ken Miles'
  },
  'maison-blanche': {
    name: 'MAISON BLANCHE',
    french: 'La Maison Blanche',
    length: '1,200 m',
    speed: '140 mph (225 km/h)',
    gear: '4th Gear',
    danger: 'HIGH',
    image: 'assets/images/history/ford-lemans-formation.jpg',
    brief: 'Sweeping high-speed bends rushing past traditional French stone cottages and brick farm walls just before the pit straight. The scene of the legendary Sunday 4:00 PM 1-2-3 formation photograph as McLaren, Miles, and Hutcherson crossed the finish line in history.',
    quote: '"The cottages flashed by like white blurs. When you see the grandstands again, you know you survived another lap." — Bruce McLaren'
  }
};

export class LeMansTrackExperience {
  constructor() {
    this.container = document.getElementById('circuit-section');
    if (!this.container) return;

    this.activeSectorKey = 'mulsanne-straight';

    // DOM Elements
    this.nameEl = document.getElementById('track-sector-name');
    this.frenchEl = document.getElementById('track-sector-french');
    this.speedEl = document.getElementById('track-sector-speed');
    this.gearEl = document.getElementById('track-sector-gear');
    this.dangerEl = document.getElementById('track-sector-danger');
    this.descEl = document.getElementById('track-sector-desc');
    this.quoteEl = document.getElementById('track-sector-quote');
    this.imgEl = document.getElementById('track-sector-image');
    this.hotspots = document.querySelectorAll('.circuit-hotspot');
    this.sectorPath = document.getElementById('circuit-track-line');

    this.bindEvents();
    this.selectSector(this.activeSectorKey);
  }

  bindEvents() {
    this.hotspots.forEach((spot) => {
      spot.addEventListener('click', () => {
        const key = spot.dataset.sector;
        if (key && LEMANS_1966_SECTORS[key]) {
          this.selectSector(key);
        }
      });
    });
  }

  selectSector(key) {
    const data = LEMANS_1966_SECTORS[key];
    if (!data) return;

    this.activeSectorKey = key;

    // Update hotspot active styling
    this.hotspots.forEach((spot) => {
      spot.classList.toggle('active', spot.dataset.sector === key);
    });

    // Animate details transition
    if (this.nameEl) this.nameEl.textContent = data.name;
    if (this.frenchEl) this.frenchEl.textContent = data.french;
    if (this.speedEl) this.speedEl.textContent = data.speed;
    if (this.gearEl) this.gearEl.textContent = data.gear;
    if (this.dangerEl) {
      this.dangerEl.textContent = data.danger;
      this.dangerEl.className = `sector-danger-badge danger-${data.danger.toLowerCase()}`;
    }
    if (this.descEl) this.descEl.textContent = data.brief;
    if (this.quoteEl) this.quoteEl.textContent = data.quote;
    if (this.imgEl) {
      this.imgEl.style.opacity = '0.3';
      setTimeout(() => {
        this.imgEl.src = data.image;
        this.imgEl.style.opacity = '1.0';
      }, 150);
    }
  }
}
