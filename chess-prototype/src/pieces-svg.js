// pieces-svg.js — SVG Character Illustrations for Cinematic Chess
// Each piece is a complete SVG string, designed for 40-55px display size
// Factions: White Kingdom (gold #d4af37, blue #3a7bd5) vs Black Empire (obsidian #1c1c2e, crimson #cc2200)

const PIECE_SVG = {
  white: {

    // WHITE PAWN — Foot Soldier
    pawn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="wp-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0d060"/>
      <stop offset="100%" stop-color="#9a7a10"/>
    </linearGradient>
    <linearGradient id="wp-helm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8c840"/>
      <stop offset="100%" stop-color="#7a5e0a"/>
    </linearGradient>
    <linearGradient id="wp-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#7a5e0a"/>
    </linearGradient>
    <linearGradient id="wp-cape" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3a7bd5"/>
      <stop offset="100%" stop-color="#1a4a9a"/>
    </linearGradient>
    <filter id="wp-glow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="wp-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <!-- Drop shadow base -->
  <ellipse cx="30" cy="57" rx="14" ry="3" fill="#000" opacity="0.35"/>
  <!-- Base platform -->
  <ellipse cx="30" cy="54" rx="13" ry="3.5" fill="url(#wp-base)" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Body / torso -->
  <rect x="22" y="37" width="16" height="15" rx="4" fill="url(#wp-body)" stroke="#6b4d00" stroke-width="1.5"/>
  <!-- Blue cape / tabard sides -->
  <rect x="19" y="40" width="5" height="11" rx="2" fill="url(#wp-cape)" stroke="#1a3a7a" stroke-width="1"/>
  <rect x="36" y="40" width="5" height="11" rx="2" fill="url(#wp-cape)" stroke="#1a3a7a" stroke-width="1"/>
  <!-- Chest plate detail -->
  <ellipse cx="30" cy="43" rx="5" ry="4" fill="#f0d060" stroke="#9a7a10" stroke-width="1"/>
  <path d="M27 41 L30 39 L33 41" fill="none" stroke="#3a7bd5" stroke-width="1.2"/>
  <!-- Neck -->
  <rect x="27" y="30" width="6" height="8" rx="2" fill="#c8a030" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Helmet -->
  <ellipse cx="30" cy="27" rx="10" ry="9" fill="url(#wp-helm)" stroke="#6b4d00" stroke-width="1.8"/>
  <!-- Helmet ridge -->
  <path d="M22 25 Q30 18 38 25" fill="none" stroke="#f0d060" stroke-width="2"/>
  <!-- Visor slit -->
  <rect x="24" y="25" width="12" height="3" rx="1.5" fill="#1a1a2e" stroke="#555" stroke-width="0.8"/>
  <line x1="30" y1="25" x2="30" y2="28" stroke="#333" stroke-width="0.5"/>
  <!-- Cheek guards -->
  <rect x="20" y="24" width="4" height="7" rx="2" fill="#c8a030" stroke="#7a5e0a" stroke-width="1"/>
  <rect x="36" y="24" width="4" height="7" rx="2" fill="#c8a030" stroke="#7a5e0a" stroke-width="1"/>
  <!-- Left arm holding shield -->
  <rect x="14" y="38" width="8" height="10" rx="3" fill="#c8a030" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Shield -->
  <path d="M10 35 L10 45 Q10 50 14 51 Q18 50 18 45 L18 35 Z" fill="#3a7bd5" stroke="#1a3a7a" stroke-width="1.5"/>
  <path d="M14 36 L14 48" stroke="#f0d060" stroke-width="1.2"/>
  <path d="M11 41 L17 41" stroke="#f0d060" stroke-width="1.2"/>
  <!-- Right arm holding sword -->
  <rect x="38" y="36" width="7" height="9" rx="3" fill="#c8a030" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Sword blade pointing up -->
  <rect x="43" y="14" width="3" height="23" rx="1" fill="#e8e8f0" stroke="#999" stroke-width="1"/>
  <!-- Sword guard -->
  <rect x="40" y="34" width="9" height="3" rx="1" fill="#d4af37" stroke="#9a7a10" stroke-width="1"/>
  <!-- Sword handle -->
  <rect x="43.5" y="37" width="2" height="5" rx="0.5" fill="#8b5a00" stroke="#5a3a00" stroke-width="0.8"/>
  <!-- Sword tip glow -->
  <ellipse cx="44.5" cy="14" rx="2" ry="2" fill="#fff" opacity="0.7" filter="url(#wp-glow)"/>
</svg>`,

    // WHITE KNIGHT — Cavalry Knight
    knight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="wkn-horse" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8e8e8"/>
      <stop offset="100%" stop-color="#a0a0a8"/>
    </linearGradient>
    <linearGradient id="wkn-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0d060"/>
      <stop offset="100%" stop-color="#8a6a00"/>
    </linearGradient>
    <linearGradient id="wkn-barding" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#7a5e0a"/>
    </linearGradient>
    <filter id="wkn-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <!-- Shadow -->
  <ellipse cx="30" cy="57" rx="15" ry="3" fill="#000" opacity="0.3"/>
  <!-- Horse body (lower section, gold barding) -->
  <ellipse cx="30" cy="50" rx="17" ry="8" fill="url(#wkn-barding)" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Horse chest / lower neck -->
  <ellipse cx="26" cy="40" rx="10" ry="9" fill="url(#wkn-horse)" stroke="#888" stroke-width="1.5"/>
  <!-- Gold barding chest piece -->
  <path d="M18 44 Q26 38 34 44 L32 52 Q26 55 20 52 Z" fill="url(#wkn-barding)" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Horse neck -->
  <path d="M22 42 Q24 28 28 22 Q30 18 32 20 Q30 24 28 32 Q26 40 24 44 Z" fill="url(#wkn-horse)" stroke="#888" stroke-width="1.5"/>
  <!-- Horse head -->
  <path d="M25 22 Q28 14 34 12 Q40 10 41 14 Q42 18 38 22 Q35 26 30 26 Z" fill="url(#wkn-horse)" stroke="#888" stroke-width="1.8"/>
  <!-- Horse muzzle -->
  <path d="M38 18 Q43 17 44 21 Q44 25 40 25 Q37 25 36 22 Z" fill="#c8c8c8" stroke="#888" stroke-width="1.2"/>
  <!-- Nostril -->
  <ellipse cx="42" cy="22" rx="1.2" ry="0.8" fill="#999"/>
  <!-- Horse eye -->
  <ellipse cx="35" cy="15" rx="1.5" ry="1.5" fill="#222"/>
  <ellipse cx="35.4" cy="14.6" rx="0.5" ry="0.5" fill="#fff"/>
  <!-- Gold bridle -->
  <path d="M29 18 Q34 14 40 16" fill="none" stroke="#d4af37" stroke-width="1.5"/>
  <path d="M28 22 Q34 20 40 20" fill="none" stroke="#d4af37" stroke-width="1.2"/>
  <!-- Horse mane -->
  <path d="M26 22 Q24 18 25 12 Q27 8 29 12 Q28 16 28 22" fill="#e0c060" stroke="#c8a020" stroke-width="1"/>
  <!-- Rider torso -->
  <rect x="20" y="28" width="16" height="16" rx="5" fill="url(#wkn-armor)" stroke="#6b4d00" stroke-width="1.8"/>
  <!-- Rider chest emblem -->
  <path d="M25 34 L28 30 L31 34 L34 30" fill="none" stroke="#3a7bd5" stroke-width="1.5"/>
  <!-- Rider helmet with blue plume -->
  <ellipse cx="28" cy="26" rx="8" ry="7" fill="url(#wkn-armor)" stroke="#6b4d00" stroke-width="1.8"/>
  <path d="M22 24 Q28 18 34 24" fill="#e8c840" stroke="#9a7a10" stroke-width="1.2"/>
  <!-- Visor -->
  <rect x="22" y="24" width="12" height="3" rx="1.5" fill="#1a1a2e" stroke="#444" stroke-width="0.8"/>
  <!-- Blue plume -->
  <path d="M28 19 Q25 12 22 7 Q26 10 28 14 Q30 10 34 6 Q31 11 28 19" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="1"/>
  <!-- Lance/sword arm -->
  <rect x="36" y="28" width="7" height="10" rx="3" fill="#c8a030" stroke="#7a5e0a" stroke-width="1.2"/>
  <rect x="41" y="10" width="2.5" height="22" rx="1" fill="#d0d0e0" stroke="#999" stroke-width="1"/>
  <!-- Lance tip -->
  <polygon points="42.25,6 40.5,12 44,12" fill="#e8e8f0" stroke="#aaa" stroke-width="1"/>
</svg>`,

    // WHITE BISHOP — Holy Mage
    bishop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="wb-robe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0d878"/>
      <stop offset="100%" stop-color="#7a5e0a"/>
    </linearGradient>
    <linearGradient id="wb-mitre" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff8e0"/>
      <stop offset="100%" stop-color="#d4af37"/>
    </linearGradient>
    <linearGradient id="wb-orb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#a0c8ff"/>
      <stop offset="100%" stop-color="#3a7bd5"/>
    </linearGradient>
    <radialGradient id="wb-glow-orb" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="60%" stop-color="#80b8ff" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#3a7bd5" stop-opacity="0.4"/>
    </radialGradient>
    <filter id="wb-orbglow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="wb-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Shadow -->
  <ellipse cx="30" cy="57" rx="13" ry="3" fill="#000" opacity="0.35"/>
  <!-- Base / robe hem -->
  <ellipse cx="30" cy="54" rx="12" ry="3.5" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Robe body -->
  <path d="M18 54 L20 35 Q30 30 40 35 L42 54 Z" fill="url(#wb-robe)" stroke="#6b4d00" stroke-width="1.5"/>
  <!-- Gold robe trim at hem -->
  <path d="M18 54 Q30 58 42 54" fill="none" stroke="#f0d060" stroke-width="2"/>
  <!-- Gold cross on robe -->
  <rect x="28.5" y="38" width="3" height="10" rx="1" fill="#f0d060" stroke="#9a7a10" stroke-width="0.8"/>
  <rect x="25" y="41" width="10" height="3" rx="1" fill="#f0d060" stroke="#9a7a10" stroke-width="0.8"/>
  <!-- Torso / chest detail -->
  <rect x="22" y="33" width="16" height="12" rx="4" fill="#e8c840" stroke="#8a6a00" stroke-width="1.5"/>
  <!-- Blue gem on chest -->
  <ellipse cx="30" cy="38" rx="3" ry="3.5" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="1"/>
  <ellipse cx="29" cy="37" rx="1" ry="1.2" fill="#80c0ff" opacity="0.7"/>
  <!-- Neck -->
  <rect x="27" y="27" width="6" height="7" rx="2" fill="#c8a030" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Face -->
  <ellipse cx="30" cy="24" rx="7" ry="7" fill="#f5deb0" stroke="#c8a040" stroke-width="1.5"/>
  <!-- Eyes (wise old mage) -->
  <ellipse cx="27" cy="23" rx="1.5" ry="1.2" fill="#334"/>
  <ellipse cx="33" cy="23" rx="1.5" ry="1.2" fill="#334"/>
  <ellipse cx="27.4" cy="22.6" rx="0.5" ry="0.4" fill="#fff"/>
  <ellipse cx="33.4" cy="22.6" rx="0.5" ry="0.4" fill="#fff"/>
  <!-- Wrinkles / eyebrows -->
  <path d="M25 21 Q27 20 29 21" fill="none" stroke="#8b6030" stroke-width="1"/>
  <path d="M31 21 Q33 20 35 21" fill="none" stroke="#8b6030" stroke-width="1"/>
  <!-- Beard -->
  <path d="M24 27 Q30 32 36 27 Q34 30 30 32 Q26 30 24 27 Z" fill="#e0d0a0" stroke="#c0a060" stroke-width="0.8"/>
  <!-- MITRE HAT (tall pointed) -->
  <path d="M23 18 Q24 8 30 2 Q36 8 37 18 Z" fill="url(#wb-mitre)" stroke="#c8a020" stroke-width="1.8"/>
  <!-- Mitre band -->
  <rect x="23" y="17" width="14" height="3" rx="1" fill="#d4af37" stroke="#9a7a10" stroke-width="1"/>
  <!-- Cross on mitre -->
  <rect x="29" y="5" width="2" height="8" rx="0.5" fill="#d4af37"/>
  <rect x="27" y="8" width="6" height="2" rx="0.5" fill="#d4af37"/>
  <!-- Left arm / sleeve -->
  <path d="M22 35 Q16 38 14 44" stroke="#c8a020" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Right arm holding staff -->
  <path d="M38 35 Q44 38 44 42" stroke="#c8a020" stroke-width="6" stroke-linecap="round" fill="none"/>
  <!-- Staff pole -->
  <rect x="43" y="12" width="3" height="32" rx="1.5" fill="#8b5a00" stroke="#5a3a00" stroke-width="1"/>
  <!-- Staff top finial -->
  <rect x="41" y="10" width="7" height="4" rx="1" fill="#d4af37" stroke="#9a7a10" stroke-width="1"/>
  <!-- Glowing orb atop staff -->
  <circle cx="44.5" cy="8" r="5" fill="url(#wb-glow-orb)" stroke="#3a7bd5" stroke-width="1.2" filter="url(#wb-orbglow)"/>
  <ellipse cx="43" cy="6.5" rx="1.5" ry="1.2" fill="#fff" opacity="0.7"/>
  <!-- Orb magic rays -->
  <line x1="44.5" y1="3" x2="44.5" y2="1" stroke="#80c0ff" stroke-width="1" opacity="0.8"/>
  <line x1="48" y1="5" x2="50" y2="4" stroke="#80c0ff" stroke-width="1" opacity="0.8"/>
  <line x1="49" y1="9" x2="51" y2="10" stroke="#80c0ff" stroke-width="1" opacity="0.6"/>
</svg>`,

    // WHITE ROOK — Armored Titan
    rook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="wr-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0d878"/>
      <stop offset="100%" stop-color="#6b4d00"/>
    </linearGradient>
    <linearGradient id="wr-shield" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5a9ae8"/>
      <stop offset="100%" stop-color="#1a3a8a"/>
    </linearGradient>
    <linearGradient id="wr-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#7a5e0a"/>
    </linearGradient>
    <filter id="wr-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <!-- Shadow (wider for hulking figure) -->
  <ellipse cx="30" cy="57" rx="18" ry="3.5" fill="#000" opacity="0.4"/>
  <!-- Base -->
  <ellipse cx="30" cy="54" rx="16" ry="4" fill="url(#wr-base)" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Legs / greaves -->
  <rect x="18" y="46" width="10" height="10" rx="3" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <rect x="32" y="46" width="10" height="10" rx="3" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Main body — wide barrel chest -->
  <rect x="12" y="28" width="36" height="22" rx="6" fill="url(#wr-armor)" stroke="#5a3a00" stroke-width="2"/>
  <!-- Chest plate detail ridges -->
  <path d="M18 30 L18 48" stroke="#f0d060" stroke-width="1.2" opacity="0.7"/>
  <path d="M42 30 L42 48" stroke="#f0d060" stroke-width="1.2" opacity="0.7"/>
  <path d="M14 38 L46 38" stroke="#f0d060" stroke-width="1.2" opacity="0.7"/>
  <!-- Center chest crest (tower symbol) -->
  <rect x="26" y="31" width="8" height="9" rx="1" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="1"/>
  <rect x="26" y="29" width="2" height="4" rx="0.5" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="0.8"/>
  <rect x="29" y="29" width="2" height="4" rx="0.5" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="0.8"/>
  <rect x="32" y="29" width="2" height="4" rx="0.5" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="0.8"/>
  <!-- Pauldrons / shoulder armor (extra wide) -->
  <ellipse cx="12" cy="30" rx="8" ry="6" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.8"/>
  <ellipse cx="48" cy="30" rx="8" ry="6" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.8"/>
  <!-- Arm holding tower shield (left) -->
  <rect x="4" y="32" width="9" height="18" rx="4" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Tower Shield -->
  <path d="M2 26 L2 48 Q2 56 8 57 Q14 56 14 48 L14 26 Z" fill="url(#wr-shield)" stroke="#1a3a9a" stroke-width="2"/>
  <!-- Tower emblem on shield -->
  <rect x="5" y="32" width="6" height="8" rx="1" fill="#f0d060" stroke="#c8a020" stroke-width="0.8"/>
  <rect x="5" y="30" width="1.5" height="4" rx="0.3" fill="#f0d060"/>
  <rect x="7" y="30" width="1.5" height="4" rx="0.3" fill="#f0d060"/>
  <rect x="9" y="30" width="1.5" height="4" rx="0.3" fill="#f0d060"/>
  <!-- Right arm (fist raised) -->
  <rect x="47" y="30" width="9" height="16" rx="4" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Gauntlet fist -->
  <rect x="47" y="44" width="9" height="7" rx="3" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Neck -->
  <rect x="24" y="22" width="12" height="8" rx="3" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- HELMET — imposing, wide, narrow visor -->
  <rect x="18" y="12" width="24" height="16" rx="6" fill="url(#wr-armor)" stroke="#5a3a00" stroke-width="2"/>
  <!-- Helmet top ridge -->
  <rect x="22" y="10" width="16" height="5" rx="2" fill="#e8c840" stroke="#8a6a00" stroke-width="1.5"/>
  <rect x="27" y="6" width="6" height="6" rx="1" fill="#d4af37" stroke="#9a7a10" stroke-width="1.2"/>
  <!-- Narrow visor slit -->
  <rect x="20" y="22" width="20" height="3" rx="1.5" fill="#111" stroke="#444" stroke-width="0.8"/>
  <!-- Cheek guard rivets -->
  <circle cx="21" cy="20" r="1.2" fill="#f0d060"/>
  <circle cx="21" cy="26" r="1.2" fill="#f0d060"/>
  <circle cx="39" cy="20" r="1.2" fill="#f0d060"/>
  <circle cx="39" cy="26" r="1.2" fill="#f0d060"/>
</svg>`,

    // WHITE QUEEN — Warrior Queen
    queen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="wq-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8e878"/>
      <stop offset="100%" stop-color="#8a6a00"/>
    </linearGradient>
    <linearGradient id="wq-cape" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4a8be5"/>
      <stop offset="100%" stop-color="#1a3a9a"/>
    </linearGradient>
    <linearGradient id="wq-sword" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#c0e0ff"/>
      <stop offset="100%" stop-color="#3a7bd5"/>
    </linearGradient>
    <radialGradient id="wq-blade-glow" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#3a7bd5" stop-opacity="0"/>
    </radialGradient>
    <filter id="wq-swordglow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="wq-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Shadow -->
  <ellipse cx="30" cy="57" rx="14" ry="3" fill="#000" opacity="0.35"/>
  <!-- Cape flowing behind (widest at bottom) -->
  <path d="M16 28 Q8 40 10 57 L50 57 Q52 40 44 28 Z" fill="url(#wq-cape)" stroke="#1a3a9a" stroke-width="1.5"/>
  <!-- Cape inner lighter -->
  <path d="M19 30 Q12 42 14 55 L46 55 Q48 42 41 30 Z" fill="#5a9af0" opacity="0.3"/>
  <!-- Base -->
  <ellipse cx="30" cy="54" rx="13" ry="3.5" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Skirt / lower armor -->
  <path d="M20 42 Q30 46 40 42 L38 54 L22 54 Z" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Torso armor -->
  <rect x="20" y="28" width="20" height="17" rx="5" fill="url(#wq-armor)" stroke="#6b4d00" stroke-width="1.8"/>
  <!-- Chest breastplate detail -->
  <path d="M24 31 Q30 28 36 31 L35 40 Q30 43 25 40 Z" fill="#e8c840" stroke="#9a7a10" stroke-width="1"/>
  <!-- Blue gem on chest -->
  <ellipse cx="30" cy="35" rx="3" ry="3.5" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="1"/>
  <ellipse cx="29" cy="34" rx="1" ry="1.2" fill="#a0d0ff" opacity="0.8"/>
  <!-- Pauldrons -->
  <ellipse cx="20" cy="30" rx="6" ry="5" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.5"/>
  <ellipse cx="40" cy="30" rx="6" ry="5" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Neck -->
  <rect x="26" y="21" width="8" height="8" rx="3" fill="#c8a030" stroke="#7a5e0a" stroke-width="1.2"/>
  <!-- Face — heroic warrior queen -->
  <ellipse cx="30" cy="19" rx="8" ry="8" fill="#f5deb0" stroke="#c8a040" stroke-width="1.5"/>
  <!-- Hair flowing -->
  <path d="M22 17 Q20 10 22 4 Q30 8 38 4 Q40 10 38 17" fill="#c8a020" stroke="#9a7a10" stroke-width="1"/>
  <!-- Eyes -->
  <ellipse cx="27" cy="18" rx="1.8" ry="1.5" fill="#1a3a6a"/>
  <ellipse cx="33" cy="18" rx="1.8" ry="1.5" fill="#1a3a6a"/>
  <ellipse cx="27.5" cy="17.5" rx="0.6" ry="0.5" fill="#fff"/>
  <ellipse cx="33.5" cy="17.5" rx="0.6" ry="0.5" fill="#fff"/>
  <!-- Nose + lips -->
  <path d="M29.5 20 Q30 21 30.5 20" fill="none" stroke="#c09060" stroke-width="0.8"/>
  <path d="M28 22 Q30 23.5 32 22" fill="#e08080" stroke="none"/>
  <!-- CROWN -->
  <rect x="22" y="10" width="16" height="5" rx="1" fill="#d4af37" stroke="#9a7a10" stroke-width="1.5"/>
  <!-- Crown points -->
  <polygon points="22,10 24,4 26,10" fill="#d4af37" stroke="#9a7a10" stroke-width="1.2"/>
  <polygon points="27,10 30,3 33,10" fill="#d4af37" stroke="#9a7a10" stroke-width="1.2"/>
  <polygon points="34,10 36,4 38,10" fill="#d4af37" stroke="#9a7a10" stroke-width="1.2"/>
  <!-- Crown gems -->
  <ellipse cx="25" cy="9" rx="1.2" ry="1" fill="#3a7bd5"/>
  <ellipse cx="30" cy="8" rx="1.2" ry="1" fill="#3a7bd5"/>
  <ellipse cx="35" cy="9" rx="1.2" ry="1" fill="#3a7bd5"/>
  <!-- Left arm -->
  <path d="M20 30 Q14 34 13 40" stroke="#c8a020" stroke-width="7" stroke-linecap="round" fill="none"/>
  <!-- Right arm raised holding sword -->
  <path d="M40 30 Q46 30 47 26" stroke="#c8a020" stroke-width="7" stroke-linecap="round" fill="none"/>
  <!-- Sword blade (angled, glowing) -->
  <rect x="44" y="4" width="4" height="26" rx="1.5" fill="url(#wq-sword)" stroke="#aaccff" stroke-width="1" filter="url(#wq-swordglow)"/>
  <!-- Sword guard -->
  <rect x="41" y="26" width="10" height="3.5" rx="1.5" fill="#d4af37" stroke="#9a7a10" stroke-width="1.2"/>
  <!-- Sword grip -->
  <rect x="44.5" y="29" width="3" height="6" rx="1" fill="#8b5a00" stroke="#5a3a00" stroke-width="0.8"/>
  <!-- Sword pommel -->
  <ellipse cx="46" cy="36" rx="2.5" ry="2" fill="#d4af37" stroke="#9a7a10" stroke-width="1"/>
  <!-- Blade glow aura -->
  <rect x="43" y="4" width="6" height="26" rx="3" fill="url(#wq-blade-glow)" opacity="0.5"/>
</svg>`,

    // WHITE KING — Battle King
    king: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="wki-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f8e878"/>
      <stop offset="100%" stop-color="#7a5a00"/>
    </linearGradient>
    <linearGradient id="wki-crown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe060"/>
      <stop offset="100%" stop-color="#c8900a"/>
    </linearGradient>
    <linearGradient id="wki-orb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#c0e0ff"/>
      <stop offset="100%" stop-color="#3a7bd5"/>
    </linearGradient>
    <radialGradient id="wki-orb-glow" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#3a7bd5" stop-opacity="0.3"/>
    </radialGradient>
    <filter id="wki-orb-filter">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="wki-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <!-- Shadow -->
  <ellipse cx="30" cy="57" rx="16" ry="3.5" fill="#000" opacity="0.4"/>
  <!-- Base -->
  <ellipse cx="30" cy="54" rx="15" ry="4" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Legs -->
  <rect x="20" y="46" width="9" height="10" rx="3" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <rect x="31" y="46" width="9" height="10" rx="3" fill="#c8a020" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Tassets / lower armor flares -->
  <path d="M17 42 Q22 48 30 47 Q38 48 43 42 L40 55 L20 55 Z" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Main torso — wide and commanding -->
  <rect x="15" y="26" width="30" height="20" rx="6" fill="url(#wki-armor)" stroke="#5a3a00" stroke-width="2"/>
  <!-- Breastplate center crest -->
  <path d="M22 28 Q30 24 38 28 L37 42 Q30 46 23 42 Z" fill="#e8c840" stroke="#9a7a10" stroke-width="1.2"/>
  <!-- Blue gem center -->
  <ellipse cx="30" cy="35" rx="4" ry="4.5" fill="#3a7bd5" stroke="#1a3a9a" stroke-width="1.2"/>
  <ellipse cx="28.5" cy="33.5" rx="1.5" ry="1.5" fill="#a0d0ff" opacity="0.8"/>
  <!-- Cross on breastplate -->
  <rect x="28.5" y="29" width="3" height="12" rx="1" fill="#1a3a9a" opacity="0.5"/>
  <rect x="24" y="34" width="12" height="3" rx="1" fill="#1a3a9a" opacity="0.5"/>
  <!-- Pauldrons (extra large) -->
  <ellipse cx="15" cy="28" rx="8" ry="7" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.8"/>
  <ellipse cx="45" cy="28" rx="8" ry="7" fill="#d4af37" stroke="#7a5e0a" stroke-width="1.8"/>
  <!-- Blue trim on pauldrons -->
  <path d="M9 28 Q15 22 21 28" fill="none" stroke="#3a7bd5" stroke-width="1.5"/>
  <path d="M39 28 Q45 22 51 28" fill="none" stroke="#3a7bd5" stroke-width="1.5"/>
  <!-- Neck -->
  <rect x="25" y="19" width="10" height="8" rx="3" fill="#c8a030" stroke="#7a5e0a" stroke-width="1.5"/>
  <!-- Face — commanding king -->
  <ellipse cx="30" cy="17" rx="9" ry="8.5" fill="#f0d8a0" stroke="#c8a040" stroke-width="1.5"/>
  <!-- Beard -->
  <path d="M22 21 Q30 28 38 21 Q36 26 30 28 Q24 26 22 21 Z" fill="#c8a040" stroke="#9a7a10" stroke-width="1"/>
  <!-- Eyes (commanding, stern) -->
  <ellipse cx="27" cy="16" rx="2" ry="1.5" fill="#1a2a4a"/>
  <ellipse cx="33" cy="16" rx="2" ry="1.5" fill="#1a2a4a"/>
  <ellipse cx="27.6" cy="15.5" rx="0.7" ry="0.6" fill="#fff"/>
  <ellipse cx="33.6" cy="15.5" rx="0.7" ry="0.6" fill="#fff"/>
  <!-- Stern brow -->
  <path d="M24.5 13.5 Q27 12.5 29.5 13.5" fill="none" stroke="#8b6030" stroke-width="1.2"/>
  <path d="M30.5 13.5 Q33 12.5 35.5 13.5" fill="none" stroke="#8b6030" stroke-width="1.2"/>
  <!-- CROWN (most ornate — 5 tall points) -->
  <rect x="20" y="9" width="20" height="6" rx="1.5" fill="url(#wki-crown)" stroke="#9a7a10" stroke-width="1.8"/>
  <!-- Five crown points -->
  <polygon points="20,9 22,2 24,9" fill="url(#wki-crown)" stroke="#9a7a10" stroke-width="1.2"/>
  <polygon points="23.5,9 26,1 28.5,9" fill="url(#wki-crown)" stroke="#9a7a10" stroke-width="1.2"/>
  <polygon points="27.5,9 30,0 32.5,9" fill="url(#wki-crown)" stroke="#9a7a10" stroke-width="1.5"/>
  <polygon points="31.5,9 34,1 36.5,9" fill="url(#wki-crown)" stroke="#9a7a10" stroke-width="1.2"/>
  <polygon points="36,9 38,2 40,9" fill="url(#wki-crown)" stroke="#9a7a10" stroke-width="1.2"/>
  <!-- Crown gems -->
  <ellipse cx="23" cy="8" rx="1.2" ry="1" fill="#3a7bd5"/>
  <ellipse cx="27" cy="7" rx="1.2" ry="1" fill="#3a7bd5"/>
  <ellipse cx="30" cy="6.5" rx="1.5" ry="1.2" fill="#60aaff"/>
  <ellipse cx="33" cy="7" rx="1.2" ry="1" fill="#3a7bd5"/>
  <ellipse cx="37" cy="8" rx="1.2" ry="1" fill="#3a7bd5"/>
  <!-- Left arm holding scepter -->
  <path d="M15 28 Q10 32 10 40" stroke="#c8a020" stroke-width="7" stroke-linecap="round" fill="none"/>
  <!-- Scepter -->
  <rect x="7.5" y="24" width="3" height="18" rx="1.5" fill="#8b5a00" stroke="#5a3a00" stroke-width="1"/>
  <!-- Scepter top orb -->
  <circle cx="9" cy="22" r="5" fill="url(#wki-orb-glow)" stroke="#3a7bd5" stroke-width="1.5" filter="url(#wki-orb-filter)"/>
  <ellipse cx="7.5" cy="20.5" rx="1.5" ry="1.2" fill="#fff" opacity="0.7"/>
  <!-- Right arm holding sword -->
  <path d="M45 28 Q50 30 50 38" stroke="#c8a020" stroke-width="7" stroke-linecap="round" fill="none"/>
  <!-- Sword (shorter, more regal) -->
  <rect x="48" y="12" width="4" height="26" rx="1.5" fill="#e8e8f0" stroke="#9a9aaa" stroke-width="1.2"/>
  <rect x="45" y="33" width="10" height="4" rx="2" fill="#d4af37" stroke="#9a7a10" stroke-width="1.2"/>
  <rect x="48.5" y="37" width="3" height="5" rx="1" fill="#8b5a00" stroke="#5a3a00" stroke-width="0.8"/>
  <!-- Sword tip shine -->
  <ellipse cx="50" cy="13" rx="1.5" ry="1.5" fill="#fff" opacity="0.6"/>
</svg>`,

  },

  black: {

    // BLACK PAWN — Dark Recruit
    pawn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="bp-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3a3a4e"/>
      <stop offset="100%" stop-color="#0a0a14"/>
    </linearGradient>
    <linearGradient id="bp-helm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2e2e42"/>
      <stop offset="100%" stop-color="#0a0a18"/>
    </linearGradient>
    <linearGradient id="bp-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a2a38"/>
      <stop offset="100%" stop-color="#0a0a14"/>
    </linearGradient>
    <radialGradient id="bp-eye-glow" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#ff4400"/>
      <stop offset="100%" stop-color="#880000"/>
    </radialGradient>
    <filter id="bp-redglow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bp-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#cc2200" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Drop shadow (red tinted) -->
  <ellipse cx="30" cy="57" rx="14" ry="3" fill="#cc2200" opacity="0.2"/>
  <ellipse cx="30" cy="57" rx="12" ry="2.5" fill="#000" opacity="0.4"/>
  <!-- Base platform -->
  <ellipse cx="30" cy="54" rx="13" ry="3.5" fill="url(#bp-base)" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Body / torso -->
  <rect x="22" y="37" width="16" height="15" rx="4" fill="url(#bp-body)" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Red cape / tabard sides -->
  <rect x="19" y="40" width="5" height="11" rx="2" fill="#8a0000" stroke="#cc2200" stroke-width="1"/>
  <rect x="36" y="40" width="5" height="11" rx="2" fill="#8a0000" stroke="#cc2200" stroke-width="1"/>
  <!-- Chest plate -->
  <ellipse cx="30" cy="43" rx="5" ry="4" fill="#1c1c2e" stroke="#cc2200" stroke-width="1"/>
  <!-- Red skull symbol on chest -->
  <ellipse cx="30" cy="42" rx="2" ry="2.2" fill="#cc2200" opacity="0.6"/>
  <rect x="28.5" y="44" width="3" height="1.5" rx="0.5" fill="#cc2200" opacity="0.5"/>
  <!-- Neck -->
  <rect x="27" y="30" width="6" height="8" rx="2" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Helmet (obsidian) -->
  <ellipse cx="30" cy="27" rx="10" ry="9" fill="url(#bp-helm)" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Helmet ridge -->
  <path d="M22 25 Q30 18 38 25" fill="none" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Glowing RED eye slit -->
  <rect x="24" y="25" width="12" height="3" rx="1.5" fill="#cc2200" filter="url(#bp-redglow)" opacity="0.9"/>
  <rect x="24" y="25" width="12" height="3" rx="1.5" fill="#ff4400" opacity="0.6"/>
  <!-- Cheek guards -->
  <rect x="20" y="24" width="4" height="7" rx="2" fill="#1c1c2e" stroke="#cc2200" stroke-width="1"/>
  <rect x="36" y="24" width="4" height="7" rx="2" fill="#1c1c2e" stroke="#cc2200" stroke-width="1"/>
  <!-- Left arm holding dark shield -->
  <rect x="14" y="38" width="8" height="10" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Dark Shield -->
  <path d="M10 35 L10 45 Q10 50 14 51 Q18 50 18 45 L18 35 Z" fill="#0a0a14" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Skull on shield -->
  <ellipse cx="14" cy="40" rx="3" ry="3" fill="#cc2200" opacity="0.5"/>
  <ellipse cx="13" cy="39" rx="1" ry="1" fill="#000"/>
  <ellipse cx="15" cy="39" rx="1" ry="1" fill="#000"/>
  <rect x="12" y="41.5" width="4" height="1" rx="0.5" fill="#000"/>
  <!-- Right arm holding dark sword -->
  <rect x="38" y="36" width="7" height="9" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Dark sword blade pointing up -->
  <rect x="43" y="14" width="3" height="23" rx="1" fill="#2a1a1a" stroke="#cc2200" stroke-width="1"/>
  <!-- Red glow on blade -->
  <rect x="43.5" y="14" width="2" height="20" rx="1" fill="#cc2200" opacity="0.3" filter="url(#bp-redglow)"/>
  <!-- Sword guard -->
  <rect x="40" y="34" width="9" height="3" rx="1" fill="#2a0a0a" stroke="#cc2200" stroke-width="1"/>
  <!-- Sword handle -->
  <rect x="43.5" y="37" width="2" height="5" rx="0.5" fill="#1a0a0a" stroke="#cc2200" stroke-width="0.8"/>
  <!-- Sword tip red glow -->
  <ellipse cx="44.5" cy="14" rx="2" ry="2" fill="#cc2200" opacity="0.7" filter="url(#bp-redglow)"/>
</svg>`,

    // BLACK KNIGHT — Shadow Cavalry
    knight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="bkn-horse" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c1c2e"/>
      <stop offset="100%" stop-color="#0a0a14"/>
    </linearGradient>
    <linearGradient id="bkn-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2e2e42"/>
      <stop offset="100%" stop-color="#0a0a18"/>
    </linearGradient>
    <linearGradient id="bkn-barding" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1a1a"/>
      <stop offset="100%" stop-color="#0a0808"/>
    </linearGradient>
    <radialGradient id="bkn-eye" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#ff4400"/>
      <stop offset="100%" stop-color="#880000"/>
    </radialGradient>
    <filter id="bkn-redglow">
      <feGaussianBlur stdDeviation="1.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bkn-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#cc2200" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Shadow -->
  <ellipse cx="30" cy="57" rx="15" ry="3" fill="#000" opacity="0.5"/>
  <!-- Horse body (lower section, dark barding) -->
  <ellipse cx="30" cy="50" rx="17" ry="8" fill="url(#bkn-barding)" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Horse chest / lower neck (dark) -->
  <ellipse cx="26" cy="40" rx="10" ry="9" fill="url(#bkn-horse)" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Dark barding chest piece -->
  <path d="M18 44 Q26 38 34 44 L32 52 Q26 55 20 52 Z" fill="#1a0a0a" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Red trim on barding -->
  <path d="M18 44 Q26 38 34 44" fill="none" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Horse neck (dark) -->
  <path d="M22 42 Q24 28 28 22 Q30 18 32 20 Q30 24 28 32 Q26 40 24 44 Z" fill="url(#bkn-horse)" stroke="#333" stroke-width="1.5"/>
  <!-- Horse head (dark) -->
  <path d="M25 22 Q28 14 34 12 Q40 10 41 14 Q42 18 38 22 Q35 26 30 26 Z" fill="url(#bkn-horse)" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Horse muzzle -->
  <path d="M38 18 Q43 17 44 21 Q44 25 40 25 Q37 25 36 22 Z" fill="#1a1a2e" stroke="#444" stroke-width="1.2"/>
  <!-- GLOWING RED horse eyes -->
  <ellipse cx="35" cy="15" rx="2" ry="2" fill="url(#bkn-eye)" filter="url(#bkn-redglow)"/>
  <ellipse cx="35" cy="15" rx="1" ry="1" fill="#ff6600"/>
  <!-- Dark bridle with red -->
  <path d="M29 18 Q34 14 40 16" fill="none" stroke="#cc2200" stroke-width="1.5"/>
  <path d="M28 22 Q34 20 40 20" fill="none" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Dark mane with red highlights -->
  <path d="M26 22 Q24 18 25 12 Q27 8 29 12 Q28 16 28 22" fill="#2a0a0a" stroke="#cc2200" stroke-width="1"/>
  <!-- Red flame wisps off mane -->
  <path d="M24 18 Q20 14 22 9" fill="none" stroke="#cc2200" stroke-width="1.5" opacity="0.7" filter="url(#bkn-redglow)"/>
  <path d="M25 14 Q21 10 24 5" fill="none" stroke="#ff4400" stroke-width="1" opacity="0.5"/>
  <!-- Rider torso (dark armor) -->
  <rect x="20" y="28" width="16" height="16" rx="5" fill="url(#bkn-armor)" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Red trim on torso -->
  <path d="M22 32 L28 28 L34 32" fill="none" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Rider helmet with crimson visor -->
  <ellipse cx="28" cy="26" rx="8" ry="7" fill="url(#bkn-armor)" stroke="#cc2200" stroke-width="1.8"/>
  <path d="M22 24 Q28 18 34 24" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Crimson visor glow -->
  <rect x="22" y="24" width="12" height="3" rx="1.5" fill="#cc2200" filter="url(#bkn-redglow)" opacity="0.9"/>
  <rect x="22" y="24" width="12" height="3" rx="1.5" fill="#ff3300" opacity="0.5"/>
  <!-- Red fire plume wisps -->
  <path d="M28 19 Q25 13 23 8" fill="none" stroke="#cc2200" stroke-width="2" filter="url(#bkn-redglow)"/>
  <path d="M28 19 Q31 12 29 6" fill="none" stroke="#ff4400" stroke-width="1.5" opacity="0.7"/>
  <path d="M28 19 Q33 14 35 8" fill="none" stroke="#cc2200" stroke-width="1" opacity="0.5"/>
  <!-- Lance arm -->
  <rect x="36" y="28" width="7" height="10" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Dark Lance with red tip -->
  <rect x="41" y="10" width="2.5" height="22" rx="1" fill="#1a0a0a" stroke="#cc2200" stroke-width="1"/>
  <polygon points="42.25,6 40.5,12 44,12" fill="#cc2200" stroke="#880000" stroke-width="1" filter="url(#bkn-redglow)"/>
</svg>`,

    // BLACK BISHOP — Shadow Mage
    bishop: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="bb-robe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2e1a1a"/>
      <stop offset="100%" stop-color="#0a0808"/>
    </linearGradient>
    <linearGradient id="bb-mitre" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c1c2e"/>
      <stop offset="100%" stop-color="#0a0a18"/>
    </linearGradient>
    <radialGradient id="bb-orb" cx="40%" cy="35%">
      <stop offset="0%" stop-color="#ff6600" stop-opacity="1"/>
      <stop offset="50%" stop-color="#cc2200" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#3a0000" stop-opacity="0.5"/>
    </radialGradient>
    <filter id="bb-orbglow">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bb-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#cc2200" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Shadow -->
  <ellipse cx="30" cy="57" rx="13" ry="3" fill="#000" opacity="0.5"/>
  <!-- Base / robe hem -->
  <ellipse cx="30" cy="54" rx="12" ry="3.5" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Robe body -->
  <path d="M18 54 L20 35 Q30 30 40 35 L42 54 Z" fill="url(#bb-robe)" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Red robe trim at hem -->
  <path d="M18 54 Q30 58 42 54" fill="none" stroke="#cc2200" stroke-width="2"/>
  <!-- Dark rune on robe -->
  <path d="M28.5 42 L30 38 L31.5 42 L28 40 L32 40 Z" fill="#cc2200" opacity="0.5"/>
  <!-- Torso -->
  <rect x="22" y="33" width="16" height="12" rx="4" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Red gem on chest -->
  <ellipse cx="30" cy="38" rx="3" ry="3.5" fill="#cc2200" stroke="#880000" stroke-width="1" filter="url(#bb-orbglow)"/>
  <ellipse cx="29" cy="37" rx="1" ry="1.2" fill="#ff8060" opacity="0.7"/>
  <!-- Neck -->
  <rect x="27" y="27" width="6" height="7" rx="2" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Face — sinister mage -->
  <ellipse cx="30" cy="24" rx="7" ry="7" fill="#1a1a2a" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Sinister glowing eyes -->
  <ellipse cx="27" cy="23" rx="1.8" ry="1.4" fill="#cc2200" filter="url(#bb-orbglow)"/>
  <ellipse cx="33" cy="23" rx="1.8" ry="1.4" fill="#cc2200" filter="url(#bb-orbglow)"/>
  <ellipse cx="27" cy="23" rx="1" ry="0.8" fill="#ff4400"/>
  <ellipse cx="33" cy="23" rx="1" ry="0.8" fill="#ff4400"/>
  <!-- DARK MITRE HAT (tall pointed) -->
  <path d="M23 18 Q24 8 30 2 Q36 8 37 18 Z" fill="url(#bb-mitre)" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Mitre band -->
  <rect x="23" y="17" width="14" height="3" rx="1" fill="#cc2200" stroke="#880000" stroke-width="1" opacity="0.8"/>
  <!-- Dark rune on mitre -->
  <path d="M29 6 L30 4 L31 6 L28.5 5 L31.5 5 Z" fill="#cc2200" opacity="0.7"/>
  <!-- Left arm / sleeve -->
  <path d="M22 35 Q16 38 14 44" stroke="#1c1c2e" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M22 35 Q16 38 14 44" stroke="#cc2200" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Right arm holding dark staff -->
  <path d="M38 35 Q44 38 44 42" stroke="#1c1c2e" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M38 35 Q44 38 44 42" stroke="#cc2200" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Staff pole (dark) -->
  <rect x="43" y="12" width="3" height="32" rx="1.5" fill="#1a0a08" stroke="#cc2200" stroke-width="1"/>
  <!-- Staff top dark finial -->
  <rect x="41" y="10" width="7" height="4" rx="1" fill="#1c1c2e" stroke="#cc2200" stroke-width="1"/>
  <!-- Pulsing RED/DARK orb atop staff -->
  <circle cx="44.5" cy="8" r="5" fill="url(#bb-orb)" stroke="#cc2200" stroke-width="1.5" filter="url(#bb-orbglow)"/>
  <ellipse cx="43" cy="6.5" rx="1.5" ry="1.2" fill="#ff8060" opacity="0.5"/>
  <!-- Red magic crackling energy -->
  <line x1="44.5" y1="3" x2="44.5" y2="1" stroke="#cc2200" stroke-width="1.5" opacity="0.9" filter="url(#bb-orbglow)"/>
  <line x1="48" y1="5" x2="50.5" y2="3.5" stroke="#ff4400" stroke-width="1" opacity="0.8"/>
  <line x1="49" y1="9" x2="51" y2="10.5" stroke="#cc2200" stroke-width="1" opacity="0.7"/>
  <line x1="41" y1="5" x2="38.5" y2="3.5" stroke="#ff4400" stroke-width="1" opacity="0.6"/>
</svg>`,

    // BLACK ROOK — Dark Titan
    rook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="br-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2e2e42"/>
      <stop offset="100%" stop-color="#06060e"/>
    </linearGradient>
    <linearGradient id="br-shield" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0a0a"/>
      <stop offset="100%" stop-color="#080404"/>
    </linearGradient>
    <linearGradient id="br-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1c1c2e"/>
      <stop offset="100%" stop-color="#0a0a14"/>
    </linearGradient>
    <filter id="br-redglow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="br-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#cc2200" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Shadow (red tinted) -->
  <ellipse cx="30" cy="57" rx="18" ry="3.5" fill="#cc2200" opacity="0.15"/>
  <ellipse cx="30" cy="57" rx="16" ry="3" fill="#000" opacity="0.5"/>
  <!-- Base -->
  <ellipse cx="30" cy="54" rx="16" ry="4" fill="url(#br-base)" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Legs / greaves -->
  <rect x="18" y="46" width="10" height="10" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <rect x="32" y="46" width="10" height="10" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Red glowing joints at knees -->
  <rect x="19" y="46" width="8" height="2" rx="1" fill="#cc2200" opacity="0.7" filter="url(#br-redglow)"/>
  <rect x="33" y="46" width="8" height="2" rx="1" fill="#cc2200" opacity="0.7" filter="url(#br-redglow)"/>
  <!-- Main body — wide obsidian chest -->
  <rect x="12" y="28" width="36" height="22" rx="6" fill="url(#br-armor)" stroke="#cc2200" stroke-width="2"/>
  <!-- Red glow joints on body -->
  <path d="M14 38 L46 38" stroke="#cc2200" stroke-width="1.2" opacity="0.5" filter="url(#br-redglow)"/>
  <path d="M18 30 L18 48" stroke="#cc2200" stroke-width="1" opacity="0.4"/>
  <path d="M42 30 L42 48" stroke="#cc2200" stroke-width="1" opacity="0.4"/>
  <!-- Center chest dark sigil (skull) -->
  <ellipse cx="30" cy="34" rx="5" ry="5.5" fill="#cc2200" opacity="0.3"/>
  <ellipse cx="28.5" cy="32.5" rx="1.5" ry="1.5" fill="#000"/>
  <ellipse cx="31.5" cy="32.5" rx="1.5" ry="1.5" fill="#000"/>
  <path d="M27 36 L28 37.5 L30 36.5 L32 37.5 L33 36" fill="none" stroke="#000" stroke-width="1.2"/>
  <path d="M28 34.5 L30 38" fill="none" stroke="#000" stroke-width="1"/>
  <path d="M32 34.5 L30 38" fill="none" stroke="#000" stroke-width="1"/>
  <!-- Pauldrons -->
  <ellipse cx="12" cy="30" rx="8" ry="6" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.8"/>
  <ellipse cx="48" cy="30" rx="8" ry="6" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Red glow at pauldron joints -->
  <ellipse cx="12" cy="30" rx="4" ry="3" fill="#cc2200" opacity="0.3" filter="url(#br-redglow)"/>
  <ellipse cx="48" cy="30" rx="4" ry="3" fill="#cc2200" opacity="0.3" filter="url(#br-redglow)"/>
  <!-- Arm holding dark tower shield -->
  <rect x="4" y="32" width="9" height="18" rx="4" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Dark Tower Shield -->
  <path d="M2 26 L2 48 Q2 56 8 57 Q14 56 14 48 L14 26 Z" fill="url(#br-shield)" stroke="#cc2200" stroke-width="2"/>
  <!-- Skull/dark sigil on shield -->
  <ellipse cx="8" cy="37" rx="4" ry="4.5" fill="#cc2200" opacity="0.3"/>
  <ellipse cx="6.8" cy="35.5" rx="1.2" ry="1.2" fill="#0a0a14"/>
  <ellipse cx="9.2" cy="35.5" rx="1.2" ry="1.2" fill="#0a0a14"/>
  <path d="M6.5 38.5 L7.5 40 L8 39 L8.5 40 L9.5 38.5" fill="none" stroke="#0a0a14" stroke-width="1"/>
  <!-- Shield rim red -->
  <path d="M2 26 L14 26" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Right arm (fist) -->
  <rect x="47" y="30" width="9" height="16" rx="4" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Gauntlet fist with red glow at knuckles -->
  <rect x="47" y="44" width="9" height="7" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <path d="M48 44 L55 44" stroke="#cc2200" stroke-width="1.5" opacity="0.7" filter="url(#br-redglow)"/>
  <!-- Neck -->
  <rect x="24" y="22" width="12" height="8" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- HELMET — imposing dark, red eye slits -->
  <rect x="18" y="12" width="24" height="16" rx="6" fill="url(#br-armor)" stroke="#cc2200" stroke-width="2"/>
  <!-- Helmet top ridge -->
  <rect x="22" y="10" width="16" height="5" rx="2" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <rect x="27" y="6" width="6" height="6" rx="1" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- RED glowing eye slits -->
  <rect x="20" y="22" width="20" height="3" rx="1.5" fill="#cc2200" filter="url(#br-redglow)"/>
  <rect x="20" y="22" width="20" height="3" rx="1.5" fill="#ff4400" opacity="0.6"/>
  <!-- Armor rivets (red) -->
  <circle cx="21" cy="20" r="1.2" fill="#cc2200" opacity="0.7"/>
  <circle cx="21" cy="26" r="1.2" fill="#cc2200" opacity="0.7"/>
  <circle cx="39" cy="20" r="1.2" fill="#cc2200" opacity="0.7"/>
  <circle cx="39" cy="26" r="1.2" fill="#cc2200" opacity="0.7"/>
</svg>`,

    // BLACK QUEEN — Shadow Queen
    queen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="bq-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2e1a2e"/>
      <stop offset="100%" stop-color="#0a060a"/>
    </linearGradient>
    <linearGradient id="bq-cape" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a0a0a"/>
      <stop offset="50%" stop-color="#0a0a14"/>
      <stop offset="100%" stop-color="#3a0a0a"/>
    </linearGradient>
    <linearGradient id="bq-cape-inner" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#cc2200"/>
      <stop offset="100%" stop-color="#3a0a00"/>
    </linearGradient>
    <linearGradient id="bq-sword" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a0a0a"/>
      <stop offset="50%" stop-color="#3a1a1a"/>
      <stop offset="100%" stop-color="#cc2200"/>
    </linearGradient>
    <filter id="bq-redglow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bq-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#cc2200" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Shadow -->
  <ellipse cx="30" cy="57" rx="14" ry="3" fill="#cc2200" opacity="0.15"/>
  <ellipse cx="30" cy="57" rx="12" ry="2.5" fill="#000" opacity="0.5"/>
  <!-- Dark cape with red inner lining -->
  <path d="M16 28 Q8 40 10 57 L50 57 Q52 40 44 28 Z" fill="url(#bq-cape)" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Cape inner red lining (visible at edges) -->
  <path d="M12 40 Q11 50 13 57 L17 57 Q15 50 16 38 Z" fill="url(#bq-cape-inner)" opacity="0.7"/>
  <path d="M48 40 Q49 50 47 57 L43 57 Q45 50 44 38 Z" fill="url(#bq-cape-inner)" opacity="0.7"/>
  <!-- Shadow magic trails from cape -->
  <path d="M10 45 Q5 42 3 38" fill="none" stroke="#cc2200" stroke-width="1.5" opacity="0.6" filter="url(#bq-redglow)"/>
  <path d="M50 45 Q55 42 57 38" fill="none" stroke="#cc2200" stroke-width="1.5" opacity="0.6" filter="url(#bq-redglow)"/>
  <!-- Base -->
  <ellipse cx="30" cy="54" rx="13" ry="3.5" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Skirt / lower armor -->
  <path d="M20 42 Q30 46 40 42 L38 54 L22 54 Z" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Red trim on skirt -->
  <path d="M20 42 Q30 46 40 42" fill="none" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Torso armor (dark) -->
  <rect x="20" y="28" width="20" height="17" rx="5" fill="url(#bq-armor)" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Dark breastplate -->
  <path d="M24 31 Q30 28 36 31 L35 40 Q30 43 25 40 Z" fill="#1a0a0a" stroke="#cc2200" stroke-width="1"/>
  <!-- Red gem on chest -->
  <ellipse cx="30" cy="35" rx="3" ry="3.5" fill="#cc2200" stroke="#880000" stroke-width="1" filter="url(#bq-redglow)"/>
  <ellipse cx="29" cy="34" rx="1" ry="1.2" fill="#ff8060" opacity="0.6"/>
  <!-- Pauldrons -->
  <ellipse cx="20" cy="30" rx="6" ry="5" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <ellipse cx="40" cy="30" rx="6" ry="5" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Neck -->
  <rect x="26" y="21" width="8" height="8" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Face — shadow queen (pale, red eyes) -->
  <ellipse cx="30" cy="19" rx="8" ry="8" fill="#1a1420" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Dark flowing hair -->
  <path d="M22 17 Q20 10 22 4 Q30 8 38 4 Q40 10 38 17" fill="#0a0614" stroke="#1a0a1a" stroke-width="1"/>
  <!-- GLOWING RED EYES -->
  <ellipse cx="27" cy="18" rx="2" ry="1.5" fill="#cc2200" filter="url(#bq-redglow)"/>
  <ellipse cx="33" cy="18" rx="2" ry="1.5" fill="#cc2200" filter="url(#bq-redglow)"/>
  <ellipse cx="27" cy="18" rx="1" ry="0.8" fill="#ff6600"/>
  <ellipse cx="33" cy="18" rx="1" ry="0.8" fill="#ff6600"/>
  <!-- Dark lips -->
  <path d="M28 22 Q30 23 32 22" fill="#8a0020" stroke="none"/>
  <!-- DARK CROWN with red gems -->
  <rect x="22" y="10" width="16" height="5" rx="1" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Crown points -->
  <polygon points="22,10 24,4 26,10" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <polygon points="27,10 30,3 33,10" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <polygon points="34,10 36,4 38,10" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Crown red gemstones -->
  <ellipse cx="25" cy="9" rx="1.2" ry="1" fill="#cc2200" filter="url(#bq-redglow)"/>
  <ellipse cx="30" cy="8" rx="1.5" ry="1.2" fill="#ff4400" filter="url(#bq-redglow)"/>
  <ellipse cx="35" cy="9" rx="1.2" ry="1" fill="#cc2200" filter="url(#bq-redglow)"/>
  <!-- Left arm -->
  <path d="M20 30 Q14 34 13 40" stroke="#1c1c2e" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M20 30 Q14 34 13 40" stroke="#cc2200" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Right arm raised holding dark sword -->
  <path d="M40 30 Q46 30 47 26" stroke="#1c1c2e" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M40 30 Q46 30 47 26" stroke="#cc2200" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Dark sword blade with shadow magic trails -->
  <rect x="44" y="4" width="4" height="26" rx="1.5" fill="url(#bq-sword)" stroke="#cc2200" stroke-width="1"/>
  <!-- Shadow magic wisping off blade -->
  <path d="M46 4 Q50 8 48 12" fill="none" stroke="#cc2200" stroke-width="1.5" opacity="0.8" filter="url(#bq-redglow)"/>
  <path d="M46 10 Q51 12 49 18" fill="none" stroke="#cc2200" stroke-width="1" opacity="0.6" filter="url(#bq-redglow)"/>
  <path d="M46 18 Q50 20 48 26" fill="none" stroke="#880000" stroke-width="1" opacity="0.5"/>
  <!-- Sword guard -->
  <rect x="41" y="26" width="10" height="3.5" rx="1.5" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Sword grip -->
  <rect x="44.5" y="29" width="3" height="6" rx="1" fill="#0a0608" stroke="#cc2200" stroke-width="0.8"/>
  <!-- Sword pommel -->
  <ellipse cx="46" cy="36" rx="2.5" ry="2" fill="#cc2200" stroke="#880000" stroke-width="1" filter="url(#bq-redglow)"/>
</svg>`,

    // BLACK KING — Dark Ruler
    king: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">
  <defs>
    <linearGradient id="bki-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1a2a"/>
      <stop offset="100%" stop-color="#06040a"/>
    </linearGradient>
    <linearGradient id="bki-crown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1a2a"/>
      <stop offset="100%" stop-color="#0a080e"/>
    </linearGradient>
    <radialGradient id="bki-orb" cx="35%" cy="35%">
      <stop offset="0%" stop-color="#ff4400"/>
      <stop offset="60%" stop-color="#cc2200"/>
      <stop offset="100%" stop-color="#3a0000"/>
    </radialGradient>
    <filter id="bki-redglow">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bki-orbglow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bki-shadow">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#cc2200" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Red aura shadow -->
  <ellipse cx="30" cy="57" rx="18" ry="4" fill="#cc2200" opacity="0.2" filter="url(#bki-redglow)"/>
  <ellipse cx="30" cy="57" rx="16" ry="3.5" fill="#000" opacity="0.5"/>
  <!-- Base -->
  <ellipse cx="30" cy="54" rx="15" ry="4" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Legs -->
  <rect x="20" y="46" width="9" height="10" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <rect x="31" y="46" width="9" height="10" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Red glow at knee joints -->
  <rect x="21" y="46" width="7" height="2" rx="1" fill="#cc2200" opacity="0.7" filter="url(#bki-redglow)"/>
  <rect x="32" y="46" width="7" height="2" rx="1" fill="#cc2200" opacity="0.7" filter="url(#bki-redglow)"/>
  <!-- Tassets -->
  <path d="M17 42 Q22 48 30 47 Q38 48 43 42 L40 55 L20 55 Z" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Red trim on tassets -->
  <path d="M17 42 Q22 48 30 47 Q38 48 43 42" fill="none" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Main torso — dark commanding -->
  <rect x="15" y="26" width="30" height="20" rx="6" fill="url(#bki-armor)" stroke="#cc2200" stroke-width="2"/>
  <!-- Dark breastplate with red skull crest -->
  <path d="M22 28 Q30 24 38 28 L37 42 Q30 46 23 42 Z" fill="#1a0a1a" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Skull on breastplate -->
  <ellipse cx="30" cy="33" rx="5.5" ry="6" fill="#cc2200" opacity="0.25" filter="url(#bki-redglow)"/>
  <ellipse cx="28" cy="31" rx="1.8" ry="1.8" fill="#0a0608"/>
  <ellipse cx="32" cy="31" rx="1.8" ry="1.8" fill="#0a0608"/>
  <path d="M27 35.5 L28.5 37.5 L30 36 L31.5 37.5 L33 35.5" fill="none" stroke="#0a0608" stroke-width="1.2"/>
  <path d="M28.5 33.5 L30 37" fill="none" stroke="#0a0608" stroke-width="1"/>
  <path d="M31.5 33.5 L30 37" fill="none" stroke="#0a0608" stroke-width="1"/>
  <!-- Red glow around skull -->
  <ellipse cx="30" cy="34" rx="6" ry="7" fill="#cc2200" opacity="0.15" filter="url(#bki-orbglow)"/>
  <!-- Pauldrons (massive) -->
  <ellipse cx="15" cy="28" rx="9" ry="7" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.8"/>
  <ellipse cx="45" cy="28" rx="9" ry="7" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Red glow at pauldron joints -->
  <ellipse cx="15" cy="28" rx="5" ry="4" fill="#cc2200" opacity="0.25" filter="url(#bki-redglow)"/>
  <ellipse cx="45" cy="28" rx="5" ry="4" fill="#cc2200" opacity="0.25" filter="url(#bki-redglow)"/>
  <!-- Neck -->
  <rect x="25" y="19" width="10" height="8" rx="3" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Face — dark ruler (pale/dark, red eyes, imposing) -->
  <ellipse cx="30" cy="17" rx="9" ry="8.5" fill="#12101a" stroke="#cc2200" stroke-width="1.5"/>
  <!-- Dark beard -->
  <path d="M22 21 Q30 28 38 21 Q36 26 30 28 Q24 26 22 21 Z" fill="#0a0814" stroke="#2a1a2a" stroke-width="1"/>
  <!-- GLOWING RED EYES (imposing) -->
  <ellipse cx="27" cy="16" rx="2.5" ry="2" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="33" cy="16" rx="2.5" ry="2" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="27" cy="16" rx="1.3" ry="1" fill="#ff5500"/>
  <ellipse cx="33" cy="16" rx="1.3" ry="1" fill="#ff5500"/>
  <!-- DARK CROWN with RED SPIKES (5 points, most imposing) -->
  <rect x="20" y="9" width="20" height="6" rx="1.5" fill="url(#bki-crown)" stroke="#cc2200" stroke-width="1.8"/>
  <!-- Five crown spikes (red tipped) -->
  <polygon points="20,9 22,2 24,9" fill="url(#bki-crown)" stroke="#cc2200" stroke-width="1.2"/>
  <polygon points="23.5,9 26,1 28.5,9" fill="url(#bki-crown)" stroke="#cc2200" stroke-width="1.2"/>
  <polygon points="27.5,9 30,0 32.5,9" fill="url(#bki-crown)" stroke="#cc2200" stroke-width="1.5"/>
  <polygon points="31.5,9 34,1 36.5,9" fill="url(#bki-crown)" stroke="#cc2200" stroke-width="1.2"/>
  <polygon points="36,9 38,2 40,9" fill="url(#bki-crown)" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Red spike tips (glowing) -->
  <ellipse cx="22" cy="2.5" rx="1.5" ry="1.5" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="26" cy="1.5" rx="1.5" ry="1.5" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="30" cy="1" rx="2" ry="2" fill="#ff4400" filter="url(#bki-orbglow)"/>
  <ellipse cx="34" cy="1.5" rx="1.5" ry="1.5" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="38" cy="2.5" rx="1.5" ry="1.5" fill="#cc2200" filter="url(#bki-redglow)"/>
  <!-- Crown red gems -->
  <ellipse cx="23" cy="8" rx="1.2" ry="1" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="27" cy="7" rx="1.2" ry="1" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="30" cy="6.5" rx="1.8" ry="1.4" fill="#ff4400" filter="url(#bki-orbglow)"/>
  <ellipse cx="33" cy="7" rx="1.2" ry="1" fill="#cc2200" filter="url(#bki-redglow)"/>
  <ellipse cx="37" cy="8" rx="1.2" ry="1" fill="#cc2200" filter="url(#bki-redglow)"/>
  <!-- Left arm holding dark scepter -->
  <path d="M15 28 Q10 32 10 40" stroke="#1c1c2e" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M15 28 Q10 32 10 40" stroke="#cc2200" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Dark scepter -->
  <rect x="7.5" y="24" width="3" height="18" rx="1.5" fill="#0a0608" stroke="#cc2200" stroke-width="1"/>
  <!-- Scepter dark orb (red glowing) -->
  <circle cx="9" cy="22" r="5" fill="url(#bki-orb)" stroke="#cc2200" stroke-width="1.5" filter="url(#bki-orbglow)"/>
  <ellipse cx="7.5" cy="20.5" rx="1.5" ry="1.2" fill="#ff8060" opacity="0.4"/>
  <!-- Red shadow aura around orb -->
  <circle cx="9" cy="22" r="7" fill="#cc2200" opacity="0.15" filter="url(#bki-orbglow)"/>
  <!-- Right arm holding dark sword -->
  <path d="M45 28 Q50 30 50 38" stroke="#1c1c2e" stroke-width="7" stroke-linecap="round" fill="none"/>
  <path d="M45 28 Q50 30 50 38" stroke="#cc2200" stroke-width="1" stroke-linecap="round" fill="none"/>
  <!-- Dark sword -->
  <rect x="48" y="12" width="4" height="26" rx="1.5" fill="#1a0a0a" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Red glow along dark blade -->
  <rect x="49" y="12" width="2" height="24" rx="1" fill="#cc2200" opacity="0.3" filter="url(#bki-redglow)"/>
  <!-- Sword guard -->
  <rect x="45" y="33" width="10" height="4" rx="2" fill="#1c1c2e" stroke="#cc2200" stroke-width="1.2"/>
  <!-- Sword grip -->
  <rect x="48.5" y="37" width="3" height="5" rx="1" fill="#0a0608" stroke="#cc2200" stroke-width="0.8"/>
  <!-- Sword pommel -->
  <ellipse cx="50" cy="43" rx="2.5" ry="2" fill="#cc2200" stroke="#880000" stroke-width="1" filter="url(#bki-redglow)"/>
</svg>`,

  },
};

if (typeof module !== 'undefined') module.exports = PIECE_SVG;
else window.PIECE_SVG = PIECE_SVG;
