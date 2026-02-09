/**
 * Animated Aquarium Scene
 *
 * SVG-based underwater scene with swimming fish, swaying corals,
 * and rising bubbles. Used as the empty state illustration.
 */

export default function AquariumScene() {
  return (
    <div className="relative w-full h-32 overflow-hidden rounded-lg shadow bg-gradient-to-b from-ocean-100 via-ocean-200 to-ocean-300">
      {/* Water caustics overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 animate-caustics bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.4)_0%,transparent_50%)]" />
        <div className="absolute inset-0 animate-caustics-slow bg-[radial-gradient(ellipse_at_70%_60%,rgba(255,255,255,0.3)_0%,transparent_50%)]" />
      </div>

      <svg viewBox="0 0 600 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Sandy bottom */}
        <ellipse cx="300" cy="210" rx="340" ry="30" fill="#e8d5a3" opacity="0.6" />
        <ellipse cx="300" cy="215" rx="320" ry="20" fill="#d4c28a" opacity="0.4" />

        {/* Rocks */}
        {/* Large rock left */}
        <ellipse cx="155" cy="190" rx="28" ry="14" fill="#7f8c8d" />
        <ellipse cx="155" cy="188" rx="26" ry="12" fill="#95a5a6" />
        <ellipse cx="148" cy="186" rx="12" ry="6" fill="#a8b5b8" opacity="0.6" />
        {/* Medium rock center-left */}
        <ellipse cx="240" cy="192" rx="18" ry="10" fill="#6c7a7d" />
        <ellipse cx="240" cy="190" rx="16" ry="8" fill="#8e9ea2" />
        {/* Small rock right-center */}
        <ellipse cx="385" cy="193" rx="14" ry="8" fill="#7f8c8d" />
        <ellipse cx="385" cy="191" rx="12" ry="6" fill="#a3b1b5" />
        {/* Rock cluster right */}
        <ellipse cx="540" cy="191" rx="22" ry="11" fill="#6c7a7d" />
        <ellipse cx="540" cy="189" rx="20" ry="9" fill="#8e9ea2" />
        <ellipse cx="550" cy="187" rx="10" ry="5" fill="#a8b5b8" opacity="0.5" />
        {/* Tiny pebbles scattered */}
        <ellipse cx="180" cy="196" rx="5" ry="3" fill="#a3b1b5" opacity="0.6" />
        <ellipse cx="320" cy="197" rx="4" ry="2.5" fill="#95a5a6" opacity="0.5" />
        <ellipse cx="430" cy="196" rx="6" ry="3" fill="#8e9ea2" opacity="0.5" />

        {/* Coral group left - swaying */}
        <g className="animate-coral-sway" style={{ transformOrigin: '100px 185px' }}>
          {/* Branching coral */}
          <path d="M95 185 Q90 160 80 140 Q75 130 70 125" stroke="#e84393" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M95 185 Q100 155 95 135 Q93 125 90 118" stroke="#e84393" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M95 185 Q105 160 115 145 Q120 138 125 132" stroke="#fd79a8" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M80 140 Q75 135 68 130" stroke="#e84393" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M95 135 Q100 125 105 120" stroke="#fd79a8" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* Coral tips */}
          <circle cx="70" cy="125" r="3" fill="#fab1d0" />
          <circle cx="68" cy="130" r="2.5" fill="#fab1d0" />
          <circle cx="90" cy="118" r="3" fill="#fab1d0" />
          <circle cx="105" cy="120" r="2.5" fill="#fab1d0" />
          <circle cx="125" cy="132" r="3" fill="#fab1d0" />
        </g>

        {/* Coral group center - different sway timing */}
        <g className="animate-coral-sway-alt" style={{ transformOrigin: '300px 185px' }}>
          {/* Brain/mushroom coral */}
          <ellipse cx="300" cy="178" rx="22" ry="12" fill="#a29bfe" />
          <ellipse cx="300" cy="176" rx="20" ry="10" fill="#b8b0ff" />
          <path d="M284 176 Q292 170 300 176 Q308 170 316 176" stroke="#8c83e8" strokeWidth="1.5" fill="none" />
          <path d="M288 178 Q294 172 300 178 Q306 172 312 178" stroke="#8c83e8" strokeWidth="1" fill="none" />
        </g>

        {/* Coral group right - swaying */}
        <g className="animate-coral-sway-slow" style={{ transformOrigin: '480px 185px' }}>
          {/* Sea fan coral */}
          <path d="M480 185 Q475 160 470 140 Q468 130 465 122" stroke="#00b894" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M480 185 Q485 155 490 138 Q492 130 495 125" stroke="#00b894" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M470 140 Q465 135 460 132" stroke="#55efc4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M470 140 Q475 133 480 128" stroke="#55efc4" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M490 138 Q485 130 482 125" stroke="#55efc4" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M490 138 Q495 132 500 128" stroke="#55efc4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Tips */}
          <circle cx="465" cy="122" r="2.5" fill="#55efc4" />
          <circle cx="460" cy="132" r="2" fill="#55efc4" />
          <circle cx="480" cy="128" r="2" fill="#55efc4" />
          <circle cx="495" cy="125" r="2.5" fill="#55efc4" />
          <circle cx="482" cy="125" r="2" fill="#55efc4" />
          <circle cx="500" cy="128" r="2" fill="#55efc4" />
        </g>

        {/* Small anemone */}
        <g className="animate-coral-sway" style={{ transformOrigin: '200px 190px' }}>
          <path d="M200 190 Q195 175 190 165" stroke="#fdcb6e" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M200 190 Q200 172 200 162" stroke="#fdcb6e" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M200 190 Q205 175 210 165" stroke="#fdcb6e" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="190" cy="164" r="2" fill="#ffeaa7" />
          <circle cx="200" cy="161" r="2" fill="#ffeaa7" />
          <circle cx="210" cy="164" r="2" fill="#ffeaa7" />
        </g>

        {/* Fish 1 - Clownfish swimming right */}
        <g className="animate-swim-right">
          <g transform="translate(0, 0)">
            {/* Body */}
            <ellipse cx="0" cy="60" rx="18" ry="10" fill="#f39c12" />
            {/* White stripes */}
            <path d="M-6 50 Q-6 60 -6 70" stroke="white" strokeWidth="3" fill="none" />
            <path d="M6 52 Q6 60 6 68" stroke="white" strokeWidth="3" fill="none" />
            {/* Tail */}
            <path d="M-18 60 L-26 52 L-26 68 Z" fill="#e67e22" className="animate-tail-wag" style={{ transformOrigin: '-18px 60px' }} />
            {/* Eye */}
            <circle cx="10" cy="57" r="2.5" fill="white" />
            <circle cx="11" cy="57" r="1.5" fill="#2d3436" />
            {/* Fins */}
            <path d="M0 50 Q3 44 -3 44" fill="#f39c12" opacity="0.8" />
          </g>
        </g>

        {/* Fish 2 - Blue tang swimming right (different speed/height) */}
        <g className="animate-swim-right-slow">
          <g transform="translate(0, 110)">
            {/* Body */}
            <ellipse cx="0" cy="0" rx="15" ry="9" fill="#0984e3" />
            {/* Pattern */}
            <path d="M-5 -6 Q0 0 -5 6" stroke="#074f8a" strokeWidth="2" fill="none" />
            {/* Tail */}
            <path d="M-15 0 L-22 -7 L-22 7 Z" fill="#74b9ff" className="animate-tail-wag-fast" style={{ transformOrigin: '-15px 0px' }} />
            {/* Yellow accent */}
            <path d="M-15 0 L-18 -3 L-18 3 Z" fill="#fdcb6e" />
            {/* Eye */}
            <circle cx="8" cy="-2" r="2" fill="white" />
            <circle cx="9" cy="-2" r="1.2" fill="#2d3436" />
            {/* Top fin */}
            <path d="M-3 -9 Q3 -14 8 -9" fill="#0984e3" opacity="0.8" />
          </g>
        </g>

        {/* Fish 3 - Small chromis swimming right (fast, schooling) */}
        <g className="animate-swim-right-fast">
          <g transform="translate(0, 45)">
            <ellipse cx="0" cy="0" rx="8" ry="5" fill="#00cec9" />
            <path d="M-8 0 L-13 -4 L-13 4 Z" fill="#81ecec" className="animate-tail-wag" style={{ transformOrigin: '-8px 0px' }} />
            <circle cx="4" cy="-1" r="1.5" fill="white" />
            <circle cx="4.5" cy="-1" r="0.8" fill="#2d3436" />
          </g>
        </g>

        {/* Fish 4 - Another chromis slightly behind */}
        <g className="animate-swim-right-fast-2">
          <g transform="translate(0, 55)">
            <ellipse cx="0" cy="0" rx="7" ry="4.5" fill="#00b894" />
            <path d="M-7 0 L-12 -3.5 L-12 3.5 Z" fill="#55efc4" className="animate-tail-wag-fast" style={{ transformOrigin: '-7px 0px' }} />
            <circle cx="3.5" cy="-1" r="1.3" fill="white" />
            <circle cx="4" cy="-1" r="0.7" fill="#2d3436" />
          </g>
        </g>

        {/* Fish 5 - Yellow Tang (bright yellow, disc-shaped, tall dorsal fin) */}
        <g className="animate-swim-right-medium">
          <g transform="translate(0, 85)">
            {/* Body - disc shaped */}
            <ellipse cx="0" cy="0" rx="14" ry="12" fill="#f1c40f" />
            {/* Dorsal fin - tall and distinctive */}
            <path d="M-4 -12 Q0 -20 6 -12" fill="#f1c40f" stroke="#e6b800" strokeWidth="0.5" />
            {/* Ventral fin */}
            <path d="M-4 12 Q0 18 6 12" fill="#f1c40f" stroke="#e6b800" strokeWidth="0.5" />
            {/* Tail */}
            <path d="M-14 0 L-22 -6 L-22 6 Z" fill="#f9e547" className="animate-tail-wag" style={{ transformOrigin: '-14px 0px' }} />
            {/* Tail spine (white) */}
            <line x1="-14" y1="-1" x2="-16" y2="-1" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            {/* Eye */}
            <circle cx="7" cy="-2" r="2.2" fill="white" />
            <circle cx="8" cy="-2" r="1.3" fill="#2d3436" />
            {/* Mouth */}
            <path d="M13 0 Q14 1 13 2" stroke="#d4a800" strokeWidth="0.8" fill="none" />
          </g>
        </g>

        {/* Bottom dwellers */}
        {/* Cleaner shrimp - scuttling along sand */}
        <g className="animate-crawl-shrimp" style={{ transformOrigin: '70px 186px' }}>
          <g transform="translate(70, 186)">
            {/* Body - curved */}
            <path d="M-8 0 Q-6 -4 0 -3 Q6 -2 8 0 Q6 2 0 2 Q-6 1 -8 0Z" fill="#e17055" />
            {/* Abdomen segments */}
            <path d="M-3 -2 L-3 1.5" stroke="#d35400" strokeWidth="0.5" opacity="0.5" />
            <path d="M0 -2.5 L0 1.8" stroke="#d35400" strokeWidth="0.5" opacity="0.5" />
            <path d="M3 -2 L3 1.5" stroke="#d35400" strokeWidth="0.5" opacity="0.5" />
            {/* Tail fan */}
            <path d="M-8 0 L-12 -2 L-13 0 L-12 2 Z" fill="#fab1a0" />
            {/* Long antennae */}
            <path d="M8 -2 Q14 -8 18 -10" stroke="#e17055" strokeWidth="0.6" fill="none" />
            <path d="M8 -1 Q16 -6 20 -7" stroke="#e17055" strokeWidth="0.6" fill="none" />
            {/* Walking legs */}
            <line x1="-3" y1="2" x2="-4" y2="5" stroke="#d35400" strokeWidth="0.5" />
            <line x1="0" y1="2" x2="0" y2="5" stroke="#d35400" strokeWidth="0.5" />
            <line x1="3" y1="2" x2="3" y2="5" stroke="#d35400" strokeWidth="0.5" />
            <line x1="5" y1="1" x2="6" y2="4" stroke="#d35400" strokeWidth="0.5" />
            {/* Eye */}
            <circle cx="7" cy="-3" r="1" fill="white" />
            <circle cx="7.3" cy="-3" r="0.5" fill="#2d3436" />
          </g>
        </g>

        {/* Turbo snail - very slow crawl */}
        <g className="animate-snail-crawl" style={{ transformOrigin: '340px 192px' }}>
          <g transform="translate(340, 192)">
            {/* Soft body / foot */}
            <ellipse cx="0" cy="2" rx="8" ry="3" fill="#b2bec3" />
            {/* Shell - spiral */}
            <ellipse cx="-2" cy="-2" rx="7" ry="7" fill="#6c5ce7" />
            <ellipse cx="-2" cy="-2" rx="6" ry="6" fill="#a29bfe" />
            {/* Spiral pattern */}
            <path d="M-2 -8 Q4 -5 2 -1 Q0 2 -5 0 Q-8 -2 -5 -5" stroke="#6c5ce7" strokeWidth="1" fill="none" />
            <path d="M-2 -5 Q1 -3 0 -1" stroke="#6c5ce7" strokeWidth="0.8" fill="none" />
            {/* Head poking out */}
            <ellipse cx="6" cy="0" rx="3" ry="2.5" fill="#b2bec3" />
            {/* Eye stalks */}
            <line x1="7" y1="-1" x2="9" y2="-4" stroke="#b2bec3" strokeWidth="1" />
            <line x1="5" y1="-1" x2="6" y2="-4" stroke="#b2bec3" strokeWidth="1" />
            <circle cx="9" cy="-4.5" r="0.8" fill="#2d3436" />
            <circle cx="6" cy="-4.5" r="0.8" fill="#2d3436" />
          </g>
        </g>

        {/* Goby 1 - resting near a rock, occasional hop */}
        <g className="animate-goby-hop" style={{ transformOrigin: '170px 186px' }}>
          <g transform="translate(170, 186)">
            {/* Body - small, elongated */}
            <ellipse cx="0" cy="0" rx="10" ry="5" fill="#636e72" />
            <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#b2bec3" />
            {/* Spots */}
            <circle cx="-3" cy="-1" r="1" fill="#636e72" opacity="0.4" />
            <circle cx="2" cy="0" r="0.8" fill="#636e72" opacity="0.4" />
            {/* Tail */}
            <path d="M-10 0 L-15 -4 L-15 4 Z" fill="#95a5a6" />
            {/* Dorsal fin */}
            <path d="M-3 -5 Q0 -8 4 -5" fill="#b2bec3" stroke="#95a5a6" strokeWidth="0.5" />
            {/* Large eyes (characteristic of gobies) */}
            <circle cx="6" cy="-2.5" r="2.5" fill="white" />
            <circle cx="6.5" cy="-2.5" r="1.5" fill="#2d3436" />
            {/* Pectoral fin (used to perch) */}
            <path d="M2 3 Q4 6 6 4" stroke="#95a5a6" strokeWidth="1" fill="none" />
          </g>
        </g>

        {/* Goby 2 - near right rock cluster */}
        <g className="animate-goby-hop-2" style={{ transformOrigin: '530px 186px' }}>
          <g transform="translate(530, 186)">
            {/* Body */}
            <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#636e72" />
            <ellipse cx="0" cy="0" rx="8" ry="4" fill="#dfe6e9" />
            {/* Stripe pattern */}
            <path d="M-4 -3 L-4 3" stroke="#636e72" strokeWidth="0.8" opacity="0.3" />
            <path d="M0 -4 L0 4" stroke="#636e72" strokeWidth="0.8" opacity="0.3" />
            <path d="M4 -3 L4 3" stroke="#636e72" strokeWidth="0.8" opacity="0.3" />
            {/* Tail */}
            <path d="M-9 0 L-13 -3.5 L-13 3.5 Z" fill="#b2bec3" />
            {/* Dorsal fin */}
            <path d="M-2 -4 Q1 -7 4 -4" fill="#dfe6e9" stroke="#b2bec3" strokeWidth="0.5" />
            {/* Large eyes */}
            <circle cx="5" cy="-2" r="2.2" fill="white" />
            <circle cx="5.5" cy="-2" r="1.3" fill="#2d3436" />
            {/* Pectoral fin */}
            <path d="M1.5 2.5 Q3 5 5 3.5" stroke="#b2bec3" strokeWidth="0.8" fill="none" />
          </g>
        </g>

        {/* Bubbles */}
        <circle cx="150" cy="180" r="2" fill="white" opacity="0.4" className="animate-bubble-1" />
        <circle cx="350" cy="175" r="1.5" fill="white" opacity="0.3" className="animate-bubble-2" />
        <circle cx="250" cy="185" r="2.5" fill="white" opacity="0.35" className="animate-bubble-3" />
        <circle cx="450" cy="180" r="1.8" fill="white" opacity="0.3" className="animate-bubble-4" />
        <circle cx="520" cy="170" r="2" fill="white" opacity="0.25" className="animate-bubble-5" />

        {/* Small particles / plankton */}
        <circle cx="180" cy="80" r="1" fill="white" opacity="0.2" className="animate-float-particle" />
        <circle cx="400" cy="100" r="0.8" fill="white" opacity="0.15" className="animate-float-particle-slow" />
        <circle cx="550" cy="70" r="1" fill="white" opacity="0.2" className="animate-float-particle" />
      </svg>
    </div>
  )
}
