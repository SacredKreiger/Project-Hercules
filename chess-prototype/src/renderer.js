/**
 * renderer.js — SVG Chess Board Renderer
 * Cinematic Chess — Battle Chess inspired
 * Uses PIECE_SVG character illustrations (loaded from pieces-svg.js)
 */

class ChessRenderer {
  constructor(container, onSquareClick) {
    this.container = container;
    this.onSquareClick = onSquareClick;
    this.squares = [];          // [row][col] → DOM element
    this.clickListeners = [];

    this._buildBoard();
  }

  // ─── Board Construction ───────────────────────────────────────────────────

  _buildBoard() {
    this.container.innerHTML = '';
    this.squares = [];
    this.clickListeners = [];

    for (let row = 0; row < 8; row++) {
      this.squares[row] = [];
      for (let col = 0; col < 8; col++) {
        const sq = document.createElement('div');
        sq.className = 'square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.row = row;
        sq.dataset.col = col;

        const handler = () => this.onSquareClick(row, col);
        sq.addEventListener('click', handler);
        this.clickListeners.push({ el: sq, handler });

        this.container.appendChild(sq);
        this.squares[row][col] = sq;
      }
    }
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  render(board, legalMoves, selectedSquare, lastMove, kingInCheck, currentTurn) {
    const legalSet   = new Set();
    const captureSet = new Set();

    if (legalMoves) {
      for (const move of legalMoves) {
        const key    = `${move.row},${move.col}`;
        const target = board[move.row][move.col];
        if (target && target.color !== currentTurn) captureSet.add(key);
        else legalSet.add(key);
      }
    }

    const lastMoveKeys = new Set();
    if (lastMove) {
      lastMoveKeys.add(`${lastMove.from.row},${lastMove.from.col}`);
      lastMoveKeys.add(`${lastMove.to.row},${lastMove.to.col}`);
    }

    const checkKey    = kingInCheck    ? `${kingInCheck.row},${kingInCheck.col}`       : null;
    const selectedKey = selectedSquare ? `${selectedSquare.row},${selectedSquare.col}` : null;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq  = this.squares[row][col];
        const key = `${row},${col}`;

        // Reset state classes (keep light/dark)
        sq.classList.remove('selected', 'legal-move', 'legal-capture', 'last-move', 'in-check');

        if (key === selectedKey) sq.classList.add('selected');
        if (legalSet.has(key))   sq.classList.add('legal-move');
        if (captureSet.has(key)) sq.classList.add('legal-capture');
        if (lastMoveKeys.has(key)) sq.classList.add('last-move');
        if (key === checkKey)    sq.classList.add('in-check');

        // Remove existing piece
        const existing = sq.querySelector('.piece-wrapper');
        if (existing) sq.removeChild(existing);

        // Render piece
        const cell = board[row][col];
        if (cell) {
          const wrapper = this._createPieceElement(cell.type, cell.color);
          sq.appendChild(wrapper);
        }
      }
    }
  }

  // ─── Piece Element Creation ───────────────────────────────────────────────

  _createPieceElement(type, color) {
    const wrapper = document.createElement('div');
    wrapper.className = `piece-wrapper piece-${color}`;

    // Use SVG character if available, else fall back to Unicode
    const svgSrc = window.PIECE_SVG?.[color]?.[type];

    if (svgSrc) {
      wrapper.innerHTML = svgSrc;
      const svgEl = wrapper.querySelector('svg');
      if (svgEl) {
        svgEl.style.cssText = `
          width: 100%;
          height: 100%;
          display: block;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5));
        `;
      }
    } else {
      // Unicode fallback
      const SYMBOLS = {
        white: { king:'♔', queen:'♕', rook:'♖', bishop:'♗', knight:'♘', pawn:'♙' },
        black: { king:'♚', queen:'♛', rook:'♜', bishop:'♝', knight:'♞', pawn:'♟' },
      };
      const span = document.createElement('span');
      span.className = 'piece-inner';
      span.textContent = SYMBOLS[color]?.[type] ?? '?';
      wrapper.appendChild(span);
    }

    return wrapper;
  }

  // ─── Position Utilities (used by CombatSystem) ───────────────────────────

  getSquareElement(row, col) {
    return this.squares[row]?.[col] ?? null;
  }

  /**
   * Returns the pixel center and size of a square.
   * Used by CombatSystem to position on-board animations.
   */
  getSquarePosition(row, col) {
    const sq = this.squares[row]?.[col];
    if (!sq) return null;
    const rect = sq.getBoundingClientRect();
    const boardRect = this.container.getBoundingClientRect();
    return {
      // Position relative to board container (for absolute positioning inside board)
      x:    rect.left - boardRect.left + rect.width  / 2,
      y:    rect.top  - boardRect.top  + rect.height / 2,
      size: rect.width,
      // Also expose absolute page coords for overlays
      pageX: rect.left + rect.width  / 2,
      pageY: rect.top  + rect.height / 2,
    };
  }

  /**
   * Temporarily hides a piece on a square (during combat animation).
   */
  hidePiece(row, col) {
    const sq = this.squares[row]?.[col];
    const piece = sq?.querySelector('.piece-wrapper');
    if (piece) piece.style.opacity = '0';
  }

  /**
   * Restores piece visibility.
   */
  showPiece(row, col) {
    const sq = this.squares[row]?.[col];
    const piece = sq?.querySelector('.piece-wrapper');
    if (piece) piece.style.opacity = '';
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  destroy() {
    for (const { el, handler } of this.clickListeners) {
      el.removeEventListener('click', handler);
    }
    this.clickListeners = [];
    this.container.innerHTML = '';
    this.squares = [];
  }
}

if (typeof module !== 'undefined') module.exports = ChessRenderer;
else window.ChessRenderer = ChessRenderer;
