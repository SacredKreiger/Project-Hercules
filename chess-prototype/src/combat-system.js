/**
 * combat-system.js — On-Board Combat Animation System
 * Cinematic Chess Prototype
 *
 * Two factions: White Kingdom (gold/blue/light) vs Black Empire (obsidian/crimson/shadow)
 * 36 unique attacker×defender matchup sequences played ON the board squares.
 */

/* ─────────────────────────────────────────────────────────────────────────────
   COMBAT MATRIX — all 36 matchup definitions
   ───────────────────────────────────────────────────────────────────────────── */

const COMBAT_MATRIX = {

  /* ── PAWN attacks ─────────────────────────────────────────────────── */
  pawn_vs_pawn: {
    name: 'SOLDIER CLASH',
    attackerAnim: 'sword-thrust',
    defenderDeath: 'stumble-fall',
    clashEffect: 'sparks-gold',
    clashColor: '#ffaa00',
    textColor: '#ffcc44',
    screenShake: 1,
    duration: 1800,
    flashColor: 'rgba(255,170,0,0.18)',
  },
  pawn_vs_knight: {
    name: 'BRAVE UNDERDOG',
    attackerAnim: 'sword-thrust',
    defenderDeath: 'horse-stumble',
    clashEffect: 'sparks-gold',
    clashColor: '#ffbb33',
    textColor: '#ffe080',
    screenShake: 2,
    duration: 2000,
    flashColor: 'rgba(255,180,50,0.2)',
  },
  pawn_vs_bishop: {
    name: 'SHIELD PIERCED',
    attackerAnim: 'sword-thrust',
    defenderDeath: 'dispelled',
    clashEffect: 'sparks-gold',
    clashColor: '#88ffcc',
    textColor: '#aaffdd',
    screenShake: 1,
    duration: 1900,
    flashColor: 'rgba(100,255,200,0.15)',
  },
  pawn_vs_rook: {
    name: 'LUCKY STRIKE',
    attackerAnim: 'sword-thrust',
    defenderDeath: 'shatter',
    clashEffect: 'explosion-small',
    clashColor: '#ff8844',
    textColor: '#ffaa66',
    screenShake: 2,
    duration: 2100,
    flashColor: 'rgba(255,100,50,0.2)',
  },
  pawn_vs_queen: {
    name: 'HEROIC SACRIFICE',
    attackerAnim: 'sword-thrust',
    defenderDeath: 'heroic-fall',
    clashEffect: 'explosion-large',
    clashColor: '#ff4488',
    textColor: '#ff88cc',
    screenShake: 3,
    duration: 2400,
    flashColor: 'rgba(255,50,120,0.25)',
  },
  pawn_vs_king: {
    name: 'REGICIDE!',
    attackerAnim: 'sword-thrust',
    defenderDeath: 'throne-collapses',
    clashEffect: 'magic-nova',
    clashColor: '#ffdd00',
    textColor: '#ffee44',
    screenShake: 4,
    duration: 2500,
    flashColor: 'rgba(255,220,0,0.3)',
  },

  /* ── KNIGHT attacks ───────────────────────────────────────────────── */
  knight_vs_pawn: {
    name: 'CAVALRY TRAMPLES',
    attackerAnim: 'cavalry-charge',
    defenderDeath: 'stumble-fall',
    clashEffect: 'sparks-red',
    clashColor: '#ff5500',
    textColor: '#ff7733',
    screenShake: 2,
    duration: 1900,
    flashColor: 'rgba(255,80,0,0.2)',
  },
  knight_vs_knight: {
    name: 'CAVALRY DUEL',
    attackerAnim: 'cavalry-charge',
    defenderDeath: 'horse-stumble',
    clashEffect: 'explosion-large',
    clashColor: '#ff6600',
    textColor: '#ff9944',
    screenShake: 3,
    duration: 2300,
    flashColor: 'rgba(255,100,0,0.25)',
  },
  knight_vs_bishop: {
    name: 'LANCE PIERCES MAGIC',
    attackerAnim: 'cavalry-charge',
    defenderDeath: 'dispelled',
    clashEffect: 'lightning',
    clashColor: '#99eeff',
    textColor: '#bbf5ff',
    screenShake: 2,
    duration: 2100,
    flashColor: 'rgba(100,220,255,0.2)',
  },
  knight_vs_rook: {
    name: 'TITAN UNHORSED',
    attackerAnim: 'cavalry-charge',
    defenderDeath: 'shatter',
    clashEffect: 'shockwave',
    clashColor: '#ff8800',
    textColor: '#ffaa44',
    screenShake: 3,
    duration: 2200,
    flashColor: 'rgba(255,130,0,0.22)',
  },
  knight_vs_queen: {
    name: 'CAVALRY VS QUEEN',
    attackerAnim: 'cavalry-charge',
    defenderDeath: 'heroic-fall',
    clashEffect: 'explosion-large',
    clashColor: '#ff3366',
    textColor: '#ff77aa',
    screenShake: 4,
    duration: 2500,
    flashColor: 'rgba(255,40,100,0.28)',
  },
  knight_vs_king: {
    name: 'KNIGHT STRIKES KING',
    attackerAnim: 'cavalry-charge',
    defenderDeath: 'throne-collapses',
    clashEffect: 'magic-nova',
    clashColor: '#ffcc00',
    textColor: '#ffdd44',
    screenShake: 4,
    duration: 2400,
    flashColor: 'rgba(255,200,0,0.28)',
  },

  /* ── BISHOP attacks ───────────────────────────────────────────────── */
  bishop_vs_pawn: {
    name: 'BOLT FROM ABOVE',
    attackerAnim: 'magic-bolt',
    defenderDeath: 'stumble-fall',
    clashEffect: 'lightning',
    clashColor: '#aaddff',
    textColor: '#cceeff',
    screenShake: 1,
    duration: 1800,
    flashColor: 'rgba(150,220,255,0.18)',
  },
  bishop_vs_knight: {
    name: 'SPELL UNHORSE',
    attackerAnim: 'magic-bolt',
    defenderDeath: 'horse-stumble',
    clashEffect: 'magic-nova',
    clashColor: '#88bbff',
    textColor: '#aaccff',
    screenShake: 2,
    duration: 2000,
    flashColor: 'rgba(100,150,255,0.2)',
  },
  bishop_vs_bishop: {
    name: 'MAGE DUEL',
    attackerAnim: 'magic-bolt',
    defenderDeath: 'dispelled',
    clashEffect: 'magic-nova',
    clashColor: '#dd88ff',
    textColor: '#ee99ff',
    screenShake: 3,
    duration: 2300,
    flashColor: 'rgba(200,100,255,0.25)',
  },
  bishop_vs_rook: {
    name: 'OVERLOAD ARMOR',
    attackerAnim: 'magic-bolt',
    defenderDeath: 'shatter',
    clashEffect: 'lightning',
    clashColor: '#66ffff',
    textColor: '#88ffff',
    screenShake: 3,
    duration: 2200,
    flashColor: 'rgba(50,220,220,0.22)',
  },
  bishop_vs_queen: {
    name: 'MAGE VS QUEEN',
    attackerAnim: 'magic-bolt',
    defenderDeath: 'heroic-fall',
    clashEffect: 'explosion-large',
    clashColor: '#cc44ff',
    textColor: '#dd88ff',
    screenShake: 4,
    duration: 2500,
    flashColor: 'rgba(180,50,255,0.28)',
  },
  bishop_vs_king: {
    name: 'CLERIC SMITES KING',
    attackerAnim: 'magic-bolt',
    defenderDeath: 'throne-collapses',
    clashEffect: 'magic-nova',
    clashColor: '#ffffff',
    textColor: '#eeeeff',
    screenShake: 4,
    duration: 2500,
    flashColor: 'rgba(220,220,255,0.3)',
  },

  /* ── ROOK attacks ─────────────────────────────────────────────────── */
  rook_vs_pawn: {
    name: 'TITAN CRUSHES',
    attackerAnim: 'ground-smash',
    defenderDeath: 'stumble-fall',
    clashEffect: 'shockwave',
    clashColor: '#cc6600',
    textColor: '#dd8833',
    screenShake: 2,
    duration: 1900,
    flashColor: 'rgba(180,80,0,0.2)',
  },
  rook_vs_knight: {
    name: 'TITAN SMASHES HORSE',
    attackerAnim: 'ground-smash',
    defenderDeath: 'horse-stumble',
    clashEffect: 'shockwave',
    clashColor: '#dd7700',
    textColor: '#ee9933',
    screenShake: 3,
    duration: 2100,
    flashColor: 'rgba(200,100,0,0.22)',
  },
  rook_vs_bishop: {
    name: 'HAMMER SHATTERS STAFF',
    attackerAnim: 'ground-smash',
    defenderDeath: 'dispelled',
    clashEffect: 'explosion-small',
    clashColor: '#ff9944',
    textColor: '#ffbb66',
    screenShake: 3,
    duration: 2100,
    flashColor: 'rgba(255,130,50,0.22)',
  },
  rook_vs_rook: {
    name: 'TITANS COLLIDE',
    attackerAnim: 'ground-smash',
    defenderDeath: 'shatter',
    clashEffect: 'shockwave',
    clashColor: '#ff6600',
    textColor: '#ff8833',
    screenShake: 4,
    duration: 2400,
    flashColor: 'rgba(255,80,0,0.3)',
  },
  rook_vs_queen: {
    name: 'TITAN OVERPOWERS',
    attackerAnim: 'ground-smash',
    defenderDeath: 'heroic-fall',
    clashEffect: 'explosion-large',
    clashColor: '#ff4400',
    textColor: '#ff7733',
    screenShake: 4,
    duration: 2500,
    flashColor: 'rgba(255,50,0,0.28)',
  },
  rook_vs_king: {
    name: 'TITAN FELLS KING',
    attackerAnim: 'ground-smash',
    defenderDeath: 'throne-collapses',
    clashEffect: 'shockwave',
    clashColor: '#ff5500',
    textColor: '#ff8844',
    screenShake: 4,
    duration: 2500,
    flashColor: 'rgba(255,70,0,0.3)',
  },

  /* ── QUEEN attacks ────────────────────────────────────────────────── */
  queen_vs_pawn: {
    name: "QUEEN'S SWIFT JUSTICE",
    attackerAnim: 'combo-slash',
    defenderDeath: 'stumble-fall',
    clashEffect: 'sparks-gold',
    clashColor: '#ff44cc',
    textColor: '#ff88ee',
    screenShake: 2,
    duration: 1900,
    flashColor: 'rgba(255,50,200,0.2)',
  },
  queen_vs_knight: {
    name: "QUEEN'S BLADE DANCES",
    attackerAnim: 'combo-slash',
    defenderDeath: 'horse-stumble',
    clashEffect: 'explosion-small',
    clashColor: '#ff22aa',
    textColor: '#ff66cc',
    screenShake: 3,
    duration: 2100,
    flashColor: 'rgba(255,30,160,0.22)',
  },
  queen_vs_bishop: {
    name: "QUEEN OUTDUELS MAGE",
    attackerAnim: 'combo-slash',
    defenderDeath: 'dispelled',
    clashEffect: 'magic-nova',
    clashColor: '#ff55ff',
    textColor: '#ff88ff',
    screenShake: 3,
    duration: 2200,
    flashColor: 'rgba(255,50,255,0.22)',
  },
  queen_vs_rook: {
    name: "QUEEN SHATTERS TITAN",
    attackerAnim: 'combo-slash',
    defenderDeath: 'shatter',
    clashEffect: 'explosion-large',
    clashColor: '#ff3399',
    textColor: '#ff66bb',
    screenShake: 4,
    duration: 2400,
    flashColor: 'rgba(255,40,140,0.28)',
  },
  queen_vs_queen: {
    name: 'THE QUEENS CLASH',
    attackerAnim: 'combo-slash',
    defenderDeath: 'heroic-fall',
    clashEffect: 'explosion-large',
    clashColor: '#ff00ff',
    textColor: '#ff88ff',
    screenShake: 5,
    duration: 2500,
    flashColor: 'rgba(255,0,255,0.35)',
  },
  queen_vs_king: {
    name: "QUEEN DEFEATS KING",
    attackerAnim: 'combo-slash',
    defenderDeath: 'throne-collapses',
    clashEffect: 'magic-nova',
    clashColor: '#ff1188',
    textColor: '#ff55aa',
    screenShake: 4,
    duration: 2500,
    flashColor: 'rgba(255,10,130,0.3)',
  },

  /* ── KING attacks ─────────────────────────────────────────────────── */
  king_vs_pawn: {
    name: 'ROYAL EXAMPLE',
    attackerAnim: 'royal-strike',
    defenderDeath: 'stumble-fall',
    clashEffect: 'sparks-gold',
    clashColor: '#ffdd00',
    textColor: '#ffee44',
    screenShake: 2,
    duration: 2000,
    flashColor: 'rgba(255,220,0,0.22)',
  },
  king_vs_knight: {
    name: "KING'S CRUSHING BLOW",
    attackerAnim: 'royal-strike',
    defenderDeath: 'horse-stumble',
    clashEffect: 'explosion-small',
    clashColor: '#ffcc00',
    textColor: '#ffdd44',
    screenShake: 3,
    duration: 2100,
    flashColor: 'rgba(255,200,0,0.25)',
  },
  king_vs_bishop: {
    name: 'KING SILENCES MAGE',
    attackerAnim: 'royal-strike',
    defenderDeath: 'dispelled',
    clashEffect: 'lightning',
    clashColor: '#ffeebb',
    textColor: '#fff5cc',
    screenShake: 2,
    duration: 2000,
    flashColor: 'rgba(255,240,180,0.22)',
  },
  king_vs_rook: {
    name: 'KING OVERCOMES TITAN',
    attackerAnim: 'royal-strike',
    defenderDeath: 'shatter',
    clashEffect: 'shockwave',
    clashColor: '#ffaa00',
    textColor: '#ffcc44',
    screenShake: 4,
    duration: 2300,
    flashColor: 'rgba(255,160,0,0.28)',
  },
  king_vs_queen: {
    name: 'KING CAPTURES QUEEN',
    attackerAnim: 'royal-strike',
    defenderDeath: 'heroic-fall',
    clashEffect: 'explosion-large',
    clashColor: '#ffdd00',
    textColor: '#ffee66',
    screenShake: 5,
    duration: 2500,
    flashColor: 'rgba(255,220,0,0.35)',
  },
  // king_vs_king omitted — illegal in chess
};

/* ─────────────────────────────────────────────────────────────────────────────
   CSS KEYFRAMES injected once on class load
   ───────────────────────────────────────────────────────────────────────────── */

const COMBAT_CSS = `
/* ── Screen shake ──────────────────────────────────────────────── */
@keyframes shake-1 {
  0%,100%{transform:translate(0)}
  25%{transform:translate(-2px,1px)}
  75%{transform:translate(2px,-1px)}
}
@keyframes shake-2 {
  0%,100%{transform:translate(0)}
  20%{transform:translate(-4px,2px)}
  40%{transform:translate(3px,-3px)}
  60%{transform:translate(-3px,3px)}
  80%{transform:translate(4px,-2px)}
}
@keyframes shake-3 {
  0%,100%{transform:translate(0)}
  15%{transform:translate(-5px,3px)}
  35%{transform:translate(5px,-4px)}
  55%{transform:translate(-4px,5px)}
  75%{transform:translate(5px,-3px)}
}
@keyframes shake-4 {
  0%,100%{transform:translate(0)}
  10%{transform:translate(-7px,4px)}
  30%{transform:translate(7px,-6px)}
  50%{transform:translate(-6px,7px)}
  70%{transform:translate(8px,-5px)}
  90%{transform:translate(-5px,4px)}
}
@keyframes shake-5 {
  0%,100%{transform:translate(0)}
  10%{transform:translate(-10px,6px) rotate(-0.5deg)}
  25%{transform:translate(10px,-8px) rotate(0.5deg)}
  40%{transform:translate(-8px,10px) rotate(-0.3deg)}
  55%{transform:translate(11px,-7px) rotate(0.4deg)}
  70%{transform:translate(-9px,8px) rotate(-0.4deg)}
  85%{transform:translate(8px,-6px) rotate(0.3deg)}
}

/* ── Battle text ───────────────────────────────────────────────── */
@keyframes combat-text-pop {
  0%   {transform:translate(-50%,-50%) scale(0.4);opacity:0}
  15%  {transform:translate(-50%,-50%) scale(1.15);opacity:1}
  25%  {transform:translate(-50%,-50%) scale(1);opacity:1}
  75%  {transform:translate(-50%,-50%) scale(1);opacity:1}
  100% {transform:translate(-50%,-50%) scale(0.9);opacity:0}
}

/* ── Clash effects ─────────────────────────────────────────────── */
@keyframes sparks-burst {
  0%  {transform:scale(0) rotate(0deg);opacity:1}
  40% {transform:scale(2) rotate(20deg);opacity:0.9}
  100%{transform:scale(4) rotate(45deg);opacity:0}
}
@keyframes sparks-ray {
  0%  {transform:scaleX(0);opacity:1}
  60% {transform:scaleX(1);opacity:0.8}
  100%{transform:scaleX(1.2);opacity:0}
}
@keyframes explosion-ring {
  0%  {transform:scale(0);opacity:1;border-width:8px}
  60% {transform:scale(3);opacity:0.6;border-width:4px}
  100%{transform:scale(5);opacity:0;border-width:1px}
}
@keyframes explosion-core {
  0%  {transform:scale(0);opacity:1}
  30% {transform:scale(1.8);opacity:1}
  100%{transform:scale(3);opacity:0}
}
@keyframes magic-nova-ring {
  0%  {transform:scale(0) rotate(0deg);opacity:1}
  50% {transform:scale(2.5) rotate(180deg);opacity:0.7}
  100%{transform:scale(5) rotate(360deg);opacity:0}
}
@keyframes shockwave-ring {
  0%  {transform:scale(0);opacity:1;border-width:6px}
  50% {transform:scale(2);opacity:0.8;border-width:4px}
  100%{transform:scale(6);opacity:0;border-width:1px}
}
@keyframes lightning-bolt {
  0%  {opacity:0;transform:scaleY(0);transform-origin:top center}
  10% {opacity:1;transform:scaleY(1)}
  20% {opacity:0.3}
  30% {opacity:1}
  50% {opacity:0.2}
  60% {opacity:1}
  100%{opacity:0;transform:scaleY(0.8)}
}
@keyframes shadow-burst {
  0%  {transform:scale(0);opacity:1}
  40% {transform:scale(2.5);opacity:0.8}
  100%{transform:scale(5);opacity:0}
}

/* ── Attacker motion ───────────────────────────────────────────── */
@keyframes attacker-sword-thrust {
  0%  {transform:translate(0,0) scale(1)}
  30% {transform:translate(0,-4px) scale(1.08)}
  60% {transform:translate(var(--tx),var(--ty)) scale(1.12)}
  80% {transform:translate(var(--tx),var(--ty)) scale(1.1)}
  100%{transform:translate(0,0) scale(1)}
}
@keyframes attacker-cavalry-charge {
  0%  {transform:translate(0,0) scale(1) rotate(0deg)}
  20% {transform:translate(calc(var(--tx)*-0.3),calc(var(--ty)*-0.3)) scale(1.05) rotate(-3deg)}
  60% {transform:translate(var(--tx),var(--ty)) scale(1.18) rotate(3deg)}
  80% {transform:translate(var(--tx),var(--ty)) scale(1.14) rotate(1deg)}
  100%{transform:translate(0,0) scale(1) rotate(0deg)}
}
@keyframes attacker-magic-bolt {
  0%  {transform:scale(1)}
  20% {transform:scale(1.1)}
  40% {transform:scale(0.95)}
  50% {transform:scale(1.05)}
  100%{transform:scale(1)}
}
@keyframes attacker-ground-smash {
  0%  {transform:translate(0,0) scale(1)}
  30% {transform:translate(0,-8px) scale(1.1)}
  55% {transform:translate(var(--tx),var(--ty)) scale(1.2)}
  65% {transform:translate(var(--tx),calc(var(--ty)+4px)) scale(1.25)}
  80% {transform:translate(var(--tx),var(--ty)) scale(1.15)}
  100%{transform:translate(0,0) scale(1)}
}
@keyframes attacker-combo-slash {
  0%  {transform:translate(0,0) scale(1) rotate(0deg)}
  25% {transform:translate(calc(var(--tx)*0.5),calc(var(--ty)*0.5)) scale(1.1) rotate(-5deg)}
  50% {transform:translate(var(--tx),var(--ty)) scale(1.2) rotate(5deg)}
  65% {transform:translate(var(--tx),var(--ty)) scale(1.22) rotate(-2deg)}
  80% {transform:translate(var(--tx),var(--ty)) scale(1.15) rotate(0deg)}
  100%{transform:translate(0,0) scale(1) rotate(0deg)}
}
@keyframes attacker-royal-strike {
  0%  {transform:translate(0,0) scale(1) rotate(0deg)}
  20% {transform:translate(0,-10px) scale(1.12) rotate(-4deg)}
  55% {transform:translate(var(--tx),var(--ty)) scale(1.25) rotate(4deg)}
  70% {transform:translate(var(--tx),var(--ty)) scale(1.2) rotate(0deg)}
  100%{transform:translate(0,0) scale(1) rotate(0deg)}
}

/* ── Defender deaths ───────────────────────────────────────────── */
@keyframes death-stumble-fall {
  0%  {transform:translate(0,0) rotate(0deg) scale(1);opacity:1}
  30% {transform:translate(4px,-4px) rotate(10deg) scale(1.05);opacity:1}
  60% {transform:translate(8px,4px) rotate(25deg) scale(0.95);opacity:0.7}
  100%{transform:translate(10px,8px) rotate(45deg) scale(0.8);opacity:0}
}
@keyframes death-horse-stumble {
  0%  {transform:translate(0,0) rotate(0deg) scale(1);opacity:1}
  20% {transform:translate(-4px,-6px) rotate(-8deg) scale(1.08);opacity:1}
  50% {transform:translate(6px,2px) rotate(20deg) scale(1.0);opacity:0.8}
  70% {transform:translate(10px,6px) rotate(40deg) scale(0.9);opacity:0.5}
  100%{transform:translate(12px,14px) rotate(70deg) scale(0.7);opacity:0}
}
@keyframes death-dispelled {
  0%  {transform:scale(1) rotate(0deg);opacity:1;filter:blur(0px)}
  30% {transform:scale(1.15) rotate(5deg);opacity:0.9;filter:blur(1px)}
  60% {transform:scale(0.6) rotate(-10deg);opacity:0.5;filter:blur(3px)}
  100%{transform:scale(0) rotate(-20deg);opacity:0;filter:blur(6px)}
}
@keyframes death-shatter {
  0%  {transform:scale(1);opacity:1;filter:blur(0px)}
  20% {transform:scale(1.08);opacity:1;filter:blur(0px)}
  45% {transform:scale(1.04);opacity:0.9;filter:blur(0.5px)}
  65% {transform:scale(0.8);opacity:0.6;filter:blur(2px)}
  100%{transform:scale(0.2);opacity:0;filter:blur(5px)}
}
@keyframes death-heroic-fall {
  0%  {transform:translate(0,0) scale(1) rotate(0deg);opacity:1;filter:blur(0)}
  15% {transform:translate(-3px,-5px) scale(1.1) rotate(-3deg);opacity:1;filter:blur(0)}
  40% {transform:translate(5px,3px) scale(1.05) rotate(5deg);opacity:0.85;filter:blur(0.5px)}
  65% {transform:translate(8px,10px) scale(0.95) rotate(12deg);opacity:0.6;filter:blur(1px)}
  85% {transform:translate(10px,16px) scale(0.85) rotate(20deg);opacity:0.25;filter:blur(2px)}
  100%{transform:translate(12px,20px) scale(0.7) rotate(28deg);opacity:0;filter:blur(3px)}
}
@keyframes death-throne-collapses {
  0%  {transform:scale(1) rotate(0deg);opacity:1;filter:blur(0)}
  10% {transform:scale(1.12) rotate(-2deg);opacity:1}
  30% {transform:scale(1.06) rotate(3deg);opacity:0.9}
  50% {transform:scale(0.9) rotate(-5deg);opacity:0.7;filter:blur(1px)}
  70% {transform:scale(0.6) rotate(8deg);opacity:0.4;filter:blur(3px)}
  100%{transform:scale(0) rotate(15deg);opacity:0;filter:blur(6px)}
}

/* ── Projectile (bishop bolt) ──────────────────────────────────── */
@keyframes magic-projectile {
  0%  {transform:translate(0,0) scale(1);opacity:1}
  80% {transform:translate(var(--proj-x),var(--proj-y)) scale(0.7);opacity:0.9}
  100%{transform:translate(var(--proj-x),var(--proj-y)) scale(0.2);opacity:0}
}

/* ── Board flash ───────────────────────────────────────────────── */
@keyframes board-flash {
  0%  {opacity:0}
  20% {opacity:1}
  100%{opacity:0}
}

/* ── Promotion burst ───────────────────────────────────────────── */
@keyframes promo-burst {
  0%  {transform:scale(0);opacity:1}
  50% {transform:scale(3);opacity:0.8}
  100%{transform:scale(6);opacity:0}
}
@keyframes promo-star {
  0%  {transform:rotate(0deg) translateY(0) scale(1);opacity:1}
  100%{transform:rotate(var(--star-angle)) translateY(-60px) scale(0);opacity:0}
}

/* ── Check pulse ───────────────────────────────────────────────── */
@keyframes check-pulse {
  0%,100%{box-shadow:0 0 0 0 rgba(255,40,40,0.8),inset 0 0 0 0 rgba(255,40,40,0.4)}
  50%    {box-shadow:0 0 20px 10px rgba(255,40,40,0.0),inset 0 0 20px 8px rgba(255,40,40,0.3)}
}
@keyframes check-ring {
  0%  {transform:scale(0.5);opacity:1}
  100%{transform:scale(2.5);opacity:0}
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   COMBAT SYSTEM CLASS
   ───────────────────────────────────────────────────────────────────────────── */

class CombatSystem {
  constructor(boardContainer) {
    this.board = boardContainer;
    this._styleInjected = false;
    this._injectCSS();
    this._createOverlay();
  }

  /* ── Setup ──────────────────────────────────────────────────────── */

  _injectCSS() {
    if (this._styleInjected || document.getElementById('combat-system-styles')) return;
    const style = document.createElement('style');
    style.id = 'combat-system-styles';
    style.textContent = COMBAT_CSS;
    document.head.appendChild(style);
    this._styleInjected = true;
  }

  _createOverlay() {
    if (document.getElementById('combat-overlay')) {
      this._overlay = document.getElementById('combat-overlay');
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'combat-overlay';
    overlay.style.cssText = `
      position:absolute;inset:0;pointer-events:none;z-index:50;overflow:hidden;
    `;
    this.board.style.position = 'relative';
    this.board.appendChild(overlay);
    this._overlay = overlay;
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _clearOverlay() {
    this._overlay.innerHTML = '';
  }

  /* ── Position helpers ───────────────────────────────────────────── */

  _squareCenter(pos) {
    // pos = { x, y, size } where x,y are already the center of the square
    // (board-relative pixel coordinates from renderer.getSquarePosition)
    return {
      cx: pos.x,
      cy: pos.y,
    };
  }

  _makeDiv(cssText) {
    const el = document.createElement('div');
    el.style.cssText = `will-change:transform,opacity;position:absolute;${cssText}`;
    return el;
  }

  /* ── Attacker animation element ─────────────────────────────────── */

  _animateAttacker(fromPos, toPos, animName, duration) {
    const fromCenter = this._squareCenter(fromPos);
    const toCenter   = this._squareCenter(toPos);
    const tx = toCenter.cx - fromCenter.cx;
    const ty = toCenter.cy - fromCenter.cy;
    const size = fromPos.size;

    // A glowing ring to represent the attacker moving
    const el = this._makeDiv(`
      width:${size * 0.82}px;height:${size * 0.82}px;
      left:${fromCenter.cx - (size * 0.41)}px;
      top:${fromCenter.cy - (size * 0.41)}px;
      border-radius:50%;
      background:radial-gradient(circle,rgba(255,220,80,0.55) 0%,rgba(255,140,0,0.2) 60%,transparent 100%);
      border:2px solid rgba(255,220,100,0.7);
    `);
    el.style.setProperty('--tx', `${tx}px`);
    el.style.setProperty('--ty', `${ty}px`);
    el.style.animation = `attacker-${animName} ${duration * 0.6}ms ease-in-out forwards`;
    this._overlay.appendChild(el);
    return el;
  }

  /* ── Defender death animation element ───────────────────────────── */

  _animateDefender(toPos, deathAnim, duration) {
    const center = this._squareCenter(toPos);
    const size = toPos.size;

    const el = this._makeDiv(`
      width:${size * 0.75}px;height:${size * 0.75}px;
      left:${center.cx - (size * 0.375)}px;
      top:${center.cy - (size * 0.375)}px;
      border-radius:50%;
      background:radial-gradient(circle,rgba(180,50,50,0.5) 0%,rgba(100,20,20,0.2) 70%,transparent 100%);
      border:2px solid rgba(220,60,60,0.6);
    `);
    // Death starts at clash moment (~40% in)
    const delay = Math.floor(duration * 0.38);
    el.style.animationDelay = `${delay}ms`;
    el.style.animationFillMode = 'both';
    el.style.animation = `death-${deathAnim} ${Math.floor(duration * 0.55)}ms ease-in ${delay}ms both`;
    this._overlay.appendChild(el);
    return el;
  }

  /* ── Bishop magic projectile ────────────────────────────────────── */

  _animateProjectile(fromPos, toPos, color, duration) {
    const fromCenter = this._squareCenter(fromPos);
    const toCenter   = this._squareCenter(toPos);
    const tx = toCenter.cx - fromCenter.cx;
    const ty = toCenter.cy - fromCenter.cy;

    const el = this._makeDiv(`
      width:14px;height:14px;
      left:${fromCenter.cx - 7}px;top:${fromCenter.cy - 7}px;
      border-radius:50%;
      background:radial-gradient(circle,#fff 0%,${color} 50%,transparent 100%);
      box-shadow:0 0 12px 4px ${color};
    `);
    el.style.setProperty('--proj-x', `${tx}px`);
    el.style.setProperty('--proj-y', `${ty}px`);
    el.style.animation = `magic-projectile ${Math.floor(duration * 0.42)}ms cubic-bezier(.3,0,.5,1) forwards`;
    this._overlay.appendChild(el);
    return el;
  }

  /* ── Clash effects ───────────────────────────────────────────────── */

  _playClashEffect(toPos, effectType, color, duration) {
    const center = this._squareCenter(toPos);
    const size = toPos.size;
    const delay = Math.floor(duration * 0.38);
    const effectDur = Math.floor(duration * 0.55);

    switch (effectType) {
      case 'sparks-gold':
      case 'sparks-red': {
        const sparkColor = effectType === 'sparks-gold' ? '#ffcc44' : color;
        // Central burst ring
        const ring = this._makeDiv(`
          width:${size * 0.6}px;height:${size * 0.6}px;
          left:${center.cx - size * 0.3}px;top:${center.cy - size * 0.3}px;
          border-radius:50%;
          border:4px solid ${sparkColor};
          box-shadow:0 0 12px 4px ${sparkColor};
          background:radial-gradient(circle,${sparkColor}44 0%,transparent 70%);
        `);
        ring.style.animation = `sparks-burst ${effectDur}ms ease-out ${delay}ms both`;
        this._overlay.appendChild(ring);
        // Rays
        for (let i = 0; i < 8; i++) {
          const ray = this._makeDiv(`
            width:${size * 0.5}px;height:3px;
            left:${center.cx}px;top:${center.cy - 1.5}px;
            transform-origin:0 50%;
            background:linear-gradient(to right,${sparkColor},transparent);
            border-radius:2px;
            transform:rotate(${i * 45}deg) scaleX(0);
          `);
          ray.style.animation = `sparks-ray ${effectDur * 0.8}ms ease-out ${delay + 30}ms both`;
          this._overlay.appendChild(ray);
        }
        break;
      }

      case 'explosion-small': {
        const core = this._makeDiv(`
          width:${size * 0.5}px;height:${size * 0.5}px;
          left:${center.cx - size * 0.25}px;top:${center.cy - size * 0.25}px;
          border-radius:50%;
          background:radial-gradient(circle,#fff 0%,${color} 40%,${color}44 70%,transparent 100%);
          box-shadow:0 0 20px 8px ${color};
        `);
        core.style.animation = `explosion-core ${effectDur}ms ease-out ${delay}ms both`;
        this._overlay.appendChild(core);
        const ring = this._makeDiv(`
          width:${size * 0.5}px;height:${size * 0.5}px;
          left:${center.cx - size * 0.25}px;top:${center.cy - size * 0.25}px;
          border-radius:50%;border:4px solid ${color};
          box-shadow:0 0 8px 4px ${color};
        `);
        ring.style.animation = `explosion-ring ${effectDur}ms ease-out ${delay}ms both`;
        this._overlay.appendChild(ring);
        break;
      }

      case 'explosion-large': {
        // Core flash
        const core = this._makeDiv(`
          width:${size * 0.8}px;height:${size * 0.8}px;
          left:${center.cx - size * 0.4}px;top:${center.cy - size * 0.4}px;
          border-radius:50%;
          background:radial-gradient(circle,#fff 0%,${color} 30%,${color}88 60%,transparent 100%);
          box-shadow:0 0 30px 15px ${color};
        `);
        core.style.animation = `explosion-core ${effectDur}ms ease-out ${delay}ms both`;
        this._overlay.appendChild(core);
        // Two rings
        for (let i = 0; i < 2; i++) {
          const ring = this._makeDiv(`
            width:${size * 0.8}px;height:${size * 0.8}px;
            left:${center.cx - size * 0.4}px;top:${center.cy - size * 0.4}px;
            border-radius:50%;border:${6 - i * 2}px solid ${color};
            box-shadow:0 0 12px 4px ${color};
          `);
          ring.style.animation = `explosion-ring ${effectDur * (1 + i * 0.2)}ms ease-out ${delay + i * 60}ms both`;
          this._overlay.appendChild(ring);
        }
        // Wide board flash
        const flash = this._makeDiv(`
          inset:0;left:-100%;top:-100%;width:300%;height:300%;
          background:radial-gradient(circle,${color}33 0%,transparent 60%);
        `);
        flash.style.animation = `explosion-core ${effectDur * 0.5}ms ease-out ${delay}ms both`;
        this._overlay.appendChild(flash);
        break;
      }

      case 'magic-nova': {
        for (let i = 0; i < 3; i++) {
          const ring = this._makeDiv(`
            width:${size * 0.6}px;height:${size * 0.6}px;
            left:${center.cx - size * 0.3}px;top:${center.cy - size * 0.3}px;
            border-radius:50%;
            border:3px solid ${color};
            box-shadow:0 0 10px 4px ${color};
            background:radial-gradient(circle,${color}22 0%,transparent 70%);
          `);
          ring.style.animation = `magic-nova-ring ${effectDur * (0.8 + i * 0.15)}ms ease-out ${delay + i * 80}ms both`;
          this._overlay.appendChild(ring);
        }
        break;
      }

      case 'shockwave': {
        for (let i = 0; i < 3; i++) {
          const ring = this._makeDiv(`
            width:${size * 0.4}px;height:${size * 0.4}px;
            left:${center.cx - size * 0.2}px;top:${center.cy - size * 0.2}px;
            border-radius:50%;
            border:${5 - i}px solid ${color};
            box-shadow:0 0 8px 2px ${color};
          `);
          ring.style.animation = `shockwave-ring ${effectDur * (0.7 + i * 0.2)}ms ease-out ${delay + i * 100}ms both`;
          this._overlay.appendChild(ring);
        }
        break;
      }

      case 'lightning': {
        const fromCenter2 = this._squareCenter(fromPos);
        // Use a thin tall div
        const boltHeight = Math.abs(center.cy - fromCenter2.cy) || size * 0.8;
        const bolt = this._makeDiv(`
          width:4px;height:${boltHeight}px;
          left:${center.cx - 2}px;
          top:${Math.min(center.cy, fromCenter2.cy)}px;
          background:linear-gradient(to bottom,transparent,${color},#fff,${color},transparent);
          box-shadow:0 0 10px 4px ${color};
          border-radius:4px;
          transform-origin:top center;
        `);
        bolt.style.animation = `lightning-bolt ${effectDur}ms steps(3,jump-none) ${delay}ms both`;
        this._overlay.appendChild(bolt);
        // Glow at impact
        const glow = this._makeDiv(`
          width:${size * 0.5}px;height:${size * 0.5}px;
          left:${center.cx - size * 0.25}px;top:${center.cy - size * 0.25}px;
          border-radius:50%;
          background:radial-gradient(circle,#fff 0%,${color} 40%,transparent 80%);
          box-shadow:0 0 20px 8px ${color};
        `);
        glow.style.animation = `explosion-core ${effectDur * 0.8}ms ease-out ${delay + 80}ms both`;
        this._overlay.appendChild(glow);
        break;
      }

      case 'shadow-burst': {
        const core = this._makeDiv(`
          width:${size * 0.7}px;height:${size * 0.7}px;
          left:${center.cx - size * 0.35}px;top:${center.cy - size * 0.35}px;
          border-radius:50%;
          background:radial-gradient(circle,#220022 0%,${color} 40%,${color}44 70%,transparent 100%);
          box-shadow:0 0 25px 10px ${color};
        `);
        core.style.animation = `shadow-burst ${effectDur}ms ease-out ${delay}ms both`;
        this._overlay.appendChild(core);
        break;
      }
    }

    // Save fromCenter for lightning reference
    var fromPos = fromPos; // closure reference is already captured
  }

  /* ── Battle text label ───────────────────────────────────────────── */

  _showBattleText(label, toPos, color, duration) {
    const center = this._squareCenter(toPos);
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;
      left:${center.cx}px;
      top:${center.cy - toPos.size * 0.8}px;
      transform:translate(-50%,-50%) scale(0.4);
      font-family:'Cinzel',serif;
      font-size:${Math.max(11, toPos.size * 0.22)}px;
      font-weight:700;
      color:${color};
      text-shadow:0 0 8px ${color},0 0 2px #000,1px 1px 0 #000;
      white-space:nowrap;
      pointer-events:none;
      will-change:transform,opacity;
      letter-spacing:0.08em;
      z-index:60;
    `;
    el.textContent = label;
    el.style.animation = `combat-text-pop ${duration * 0.85}ms ease forwards`;
    this._overlay.appendChild(el);
    return el;
  }

  /* ── Screen shake ────────────────────────────────────────────────── */

  _shakeBoard(level, duration) {
    if (!level || level < 1) return;
    const lvl = Math.min(level, 5);
    this.board.style.animation = `shake-${lvl} ${Math.min(duration * 0.4, 400)}ms ease-in-out`;
    setTimeout(() => {
      this.board.style.animation = '';
    }, Math.min(duration * 0.4, 400) + 50);
  }

  /* ── Board flash overlay ─────────────────────────────────────────── */

  _flashBoard(color, duration) {
    const flash = this._makeDiv(`
      inset:0;left:0;top:0;width:100%;height:100%;
      background:${color};
      pointer-events:none;
    `);
    flash.style.animation = `board-flash ${duration * 0.5}ms ease-out forwards`;
    this._overlay.appendChild(flash);
  }

  /* ── Main capture playback ───────────────────────────────────────── */

  async playCapture(attacker, defender, fromSquare, toSquare, getSquarePos) {
    const key = `${attacker.type}_vs_${defender.type}`;
    const def = COMBAT_MATRIX[key];

    if (!def) {
      // Fallback for any missing combo
      await this._wait(600);
      return;
    }

    const fromPos = getSquarePos(fromSquare.row, fromSquare.col);
    const toPos   = getSquarePos(toSquare.row, toSquare.col);

    // Enforce max duration
    const duration = Math.min(def.duration, 2500);

    // Clear any lingering combat elements
    this._clearOverlay();

    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        this._cleanupCapture();
        resolve();
      }, duration + 100);

      // ─ Phase 1: attacker winds up (0ms)
      if (attacker.type === 'bishop') {
        // Bishop fires a visible projectile
        this._animateProjectile(fromPos, toPos, def.clashColor, duration);
        this._animateAttacker(fromPos, toPos, def.attackerAnim, duration);
      } else {
        this._animateAttacker(fromPos, toPos, def.attackerAnim, duration);
      }

      // ─ Phase 2: clash effects (at ~38% in)
      this._playClashEffect(toPos, def.clashEffect, def.clashColor, duration, fromPos);

      // ─ Phase 3: defender death (at ~38% in, driven inside _animateDefender)
      this._animateDefender(toPos, def.defenderDeath, duration);

      // ─ Battle text
      this._showBattleText(def.name, toPos, def.textColor || def.clashColor, duration);

      // ─ Screen shake at clash moment
      setTimeout(() => {
        this._shakeBoard(def.screenShake, duration);
        this._flashBoard(def.flashColor || `${def.clashColor}22`, duration);
      }, Math.floor(duration * 0.38));

      // ─ Resolve after full duration
      setTimeout(() => {
        clearTimeout(timeout);
        this._cleanupCapture();
        resolve();
      }, duration);
    });
  }

  _cleanupCapture() {
    this._clearOverlay();
    // Ensure board shake is cleared
    this.board.style.animation = '';
  }

  /* ── Check ───────────────────────────────────────────────────────── */

  async playCheck(kingSquare, getSquarePos) {
    this._clearOverlay();
    const pos = getSquarePos(kingSquare.row, kingSquare.col);
    const center = this._squareCenter(pos);
    const size = pos.size;

    // Pulse ring on king square
    for (let i = 0; i < 3; i++) {
      const ring = this._makeDiv(`
        width:${size * 0.85}px;height:${size * 0.85}px;
        left:${center.cx - size * 0.425}px;top:${center.cy - size * 0.425}px;
        border-radius:50%;border:3px solid #ff3333;
        box-shadow:0 0 12px 4px rgba(255,40,40,0.7);
      `);
      ring.style.animation = `check-ring 600ms ease-out ${i * 150}ms both`;
      this._overlay.appendChild(ring);
    }

    this._showBattleText('CHECK!', pos, '#ff4444', 800);
    this._flashBoard('rgba(220,20,20,0.22)', 800);
    this._shakeBoard(2, 600);

    await this._wait(850);
    this._clearOverlay();
  }

  /* ── Promotion ───────────────────────────────────────────────────── */

  async playPromotion(square, color, getSquarePos) {
    this._clearOverlay();
    const pos = getSquarePos(square.row, square.col);
    const center = this._squareCenter(pos);
    const size = pos.size;
    const gold = '#f5d060';

    // Golden burst
    const burst = this._makeDiv(`
      width:${size * 0.5}px;height:${size * 0.5}px;
      left:${center.cx - size * 0.25}px;top:${center.cy - size * 0.25}px;
      border-radius:50%;
      background:radial-gradient(circle,#fff 0%,${gold} 40%,${gold}44 70%,transparent 100%);
      box-shadow:0 0 30px 10px ${gold};
    `);
    burst.style.animation = `promo-burst 900ms ease-out forwards`;
    this._overlay.appendChild(burst);

    // Star particles
    for (let i = 0; i < 8; i++) {
      const star = this._makeDiv(`
        width:8px;height:8px;
        left:${center.cx - 4}px;top:${center.cy - 4}px;
        border-radius:50%;
        background:${gold};
        box-shadow:0 0 6px 2px ${gold};
      `);
      star.style.setProperty('--star-angle', `${i * 45}deg`);
      star.style.animation = `promo-star 800ms ease-out ${i * 30}ms both`;
      this._overlay.appendChild(star);
    }

    this._showBattleText('SOLDIER CROWNED', pos, gold, 1100);
    this._flashBoard('rgba(212,175,55,0.22)', 900);
    this._shakeBoard(2, 900);

    await this._wait(1100);
    this._clearOverlay();
  }

  /* ── Castle ──────────────────────────────────────────────────────── */

  async playCastle(color, side) {
    this._clearOverlay();

    // Find a center position on the board for the text
    const boardRect = this.board.getBoundingClientRect();
    const overlayRect = this._overlay.getBoundingClientRect();
    const cx = this._overlay.offsetWidth / 2;
    const cy = this._overlay.offsetHeight / 2;

    const fakePos = {
      x: cx - 60,
      y: cy - 20,
      size: 60,
    };

    this._showBattleText('FLANKING MANEUVER', fakePos, '#88bbff', 900);
    this._flashBoard('rgba(80,130,255,0.15)', 700);

    await this._wait(900);
    this._clearOverlay();
  }

  /* ── Checkmate ───────────────────────────────────────────────────── */

  async playCheckmate(winner) {
    this._clearOverlay();

    const isWhite = winner === 'white';
    const color = isWhite ? '#f5d060' : '#ee6644';
    const faction = isWhite ? 'WHITE KINGDOM' : 'BLACK EMPIRE';

    const cx = this._overlay.offsetWidth / 2;
    const cy = this._overlay.offsetHeight / 2;
    const fakePos = { x: cx - 80, y: cy - 20, size: 80 };

    // Large board flash
    this._flashBoard(isWhite ? 'rgba(245,208,96,0.3)' : 'rgba(220,80,50,0.3)', 2000);
    this._shakeBoard(3, 2000);

    // Nova rings from center
    for (let i = 0; i < 4; i++) {
      const ring = this._makeDiv(`
        width:60px;height:60px;
        left:${cx - 30}px;top:${cy - 30}px;
        border-radius:50%;
        border:4px solid ${color};
        box-shadow:0 0 15px 5px ${color};
      `);
      ring.style.animation = `magic-nova-ring ${1200 + i * 200}ms ease-out ${i * 200}ms both`;
      this._overlay.appendChild(ring);
    }

    await this._wait(400);
    this._showBattleText(`CHECKMATE — ${faction} WINS`, fakePos, color, 2000);

    await this._wait(2000);
    this._clearOverlay();
  }

  /* ── Destroy ─────────────────────────────────────────────────────── */

  destroy() {
    this._clearOverlay();
    this.board.style.animation = '';
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
    }
    const style = document.getElementById('combat-system-styles');
    if (style) style.remove();
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Export
   ───────────────────────────────────────────────────────────────────────────── */

if (typeof module !== 'undefined') module.exports = CombatSystem;
else window.CombatSystem = CombatSystem;
