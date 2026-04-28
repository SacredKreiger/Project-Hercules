/**
 * animations.js — Cinematic Animation System
 * Cinematic Chess Prototype
 * Short, punchy battle animations for captures and special events
 */

class AnimationSystem {
  constructor(overlayContainer) {
    this.overlay = overlayContainer;
    this.battleText = document.getElementById('battle-text');
    this.battleFlash = document.getElementById('battle-flash');

    this._captureFlavorMap = {
      king:   '⚔ KING STRIKES',
      queen:  '⚔ QUEEN DECIMATES',
      rook:   '⚔ ROOK CRUSHES',
      bishop: '⚔ BISHOP SMITES',
      knight: '⚔ KNIGHT CHARGES',
      pawn:   '⚔ PAWN ADVANCES',
    };
  }

  _clearText() {
    if (!this.battleText) return;
    this.battleText.textContent = '';
    this.battleText.className = 'battle-text';
    this.battleText.style.removeProperty('color');
    this.battleText.style.removeProperty('animation');
  }

  _clearFlash() {
    if (!this.battleFlash) return;
    this.battleFlash.className = 'battle-flash';
    this.battleFlash.style.removeProperty('animation');
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _showText(text, animationName, color, duration) {
    return new Promise(resolve => {
      if (!this.battleText) { setTimeout(resolve, duration); return; }
      this._clearText();
      this.battleText.textContent = text;
      if (color) this.battleText.style.color = color;
      // Force reflow so animation restarts cleanly
      void this.battleText.offsetWidth;
      this.battleText.style.animation = `${animationName} ${duration}ms ease forwards`;
      setTimeout(() => {
        this._clearText();
        resolve();
      }, duration);
    });
  }

  _showFlash(color, duration) {
    return new Promise(resolve => {
      if (!this.battleFlash) { setTimeout(resolve, duration); return; }
      this._clearFlash();
      this.battleFlash.style.background = color || 'rgba(220, 50, 30, 0.2)';
      void this.battleFlash.offsetWidth;
      this.battleFlash.style.animation = `battle-flash-in ${duration}ms ease forwards`;
      setTimeout(() => {
        this._clearFlash();
        resolve();
      }, duration);
    });
  }

  async playCaptureAnimation(attacker, captured, fromSquare, toSquare, renderer) {
    const flavor = this._captureFlavorMap[attacker?.type] || '⚔ PIECE TAKEN';
    await Promise.all([
      this._showText(flavor, 'battle-text-in', '#ffcc44', 680),
      this._showFlash('rgba(200, 40, 20, 0.25)', 320),
    ]);
  }

  async playMoveAnimation(piece, fromSquare, toSquare, renderer) {
    // Minimal delay — movement is instant DOM update, this just provides
    // a slight pause so the animation feels deliberate
    await this._wait(180);
  }

  async playCheckAnimation(kingSquare, renderer) {
    await Promise.all([
      this._showText('CHECK', 'battle-text-in', '#ff3333', 750),
      this._showFlash('rgba(220, 20, 20, 0.3)', 400),
    ]);
  }

  async playCheckmateAnimation(winner) {
    const color = winner === 'white' ? '#f5d060' : '#ee6644';
    const label = winner ? winner.toUpperCase() : 'DRAW';
    await Promise.all([
      this._showText(`CHECKMATE — ${label} WINS`, 'battle-text-in', color, 1100),
      this._showFlash('rgba(180, 120, 0, 0.2)', 600),
    ]);
  }

  async playCastleAnimation(color, side) {
    await this._showText('⚔ FLANKING MANEUVER', 'battle-text-in', '#88bbff', 700);
  }

  async playPromotionAnimation(square, color, renderer) {
    await Promise.all([
      this._showText('⚜ SOLDIER CROWNED', 'battle-text-in', '#f5d060', 900),
      this._showFlash('rgba(212, 175, 55, 0.2)', 500),
    ]);
  }

  destroy() {
    this._clearText();
    this._clearFlash();
  }
}

if (typeof module !== 'undefined') module.exports = AnimationSystem;
else window.AnimationSystem = AnimationSystem;
