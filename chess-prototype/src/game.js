/**
 * game.js — Main Game Controller
 * Cinematic Chess Prototype
 * Wires together: ChessEngine, ChessAI, ChessRenderer, CombatSystem, AnimationSystem
 */

class CinematicChess {
  constructor() {
    this.engine = null;
    this.ai = null;
    this.renderer = null;
    this.combat = null;    // CombatSystem — on-board battle animations
    this.animations = null; // AnimationSystem — overlay text/flash fallback

    this.mode = null; // 'vs-ai' | 'hotseat'
    this.aiDifficulty = 3; // minimax depth
    this.aiColor = 'black';
    this.aiThinking = false;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.gameActive = false;
    this.moveLog = [];

    this.screens = {};
    this.elements = {};

    this._init();
  }

  _init() {
    // Cache screen references
    this.screens = {
      menu: document.getElementById('menu-screen'),
      mode: document.getElementById('mode-screen'),
      game: document.getElementById('game-screen'),
      victory: document.getElementById('victory-screen'),
    };

    this.elements = {
      board: document.getElementById('chess-board'),
      animOverlay: document.getElementById('animation-overlay'),
      promotionOverlay: document.getElementById('promotion-overlay'),
      statusText: document.getElementById('status-text'),
      topPlayerCaptured: document.getElementById('top-captured'),
      bottomPlayerCaptured: document.getElementById('bottom-captured'),
      topPlayerAvatar: document.getElementById('top-avatar'),
      bottomPlayerAvatar: document.getElementById('bottom-avatar'),
      topTurnIndicator: document.getElementById('top-turn-indicator'),
      bottomTurnIndicator: document.getElementById('bottom-turn-indicator'),
      moveLogEl: document.getElementById('move-log'),
      victoryTitle: document.getElementById('victory-title'),
      victorySubtitle: document.getElementById('victory-subtitle'),
      victoryDetail: document.getElementById('victory-detail'),
      victoryIcon: document.getElementById('victory-icon'),
    };

    this._bindMenuEvents();
    this._showScreen('menu');
  }

  // ─── Screen Management ────────────────────────────────────────────────────

  _showScreen(name) {
    // Hide all screens
    Object.values(this.screens).forEach(el => {
      if (el) el.classList.remove('active', 'transitioning');
    });
    // Show the target
    const target = this.screens[name];
    if (target) {
      target.classList.add('active');
    }
  }

  // ─── Menu Events ──────────────────────────────────────────────────────────

  _bindMenuEvents() {
    // Main menu buttons
    document.getElementById('btn-play')?.addEventListener('click', () => {
      this._showScreen('mode');
    });

    document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
      this._showHowToPlay();
    });

    // Mode select
    document.getElementById('mode-vs-ai')?.addEventListener('click', () => {
      this.mode = 'vs-ai';
      this._startGame();
    });

    document.getElementById('mode-hotseat')?.addEventListener('click', () => {
      this.mode = 'hotseat';
      this._startGame();
    });

    document.getElementById('mode-back')?.addEventListener('click', () => {
      this._showScreen('menu');
    });

    // Game screen buttons
    document.getElementById('btn-menu')?.addEventListener('click', () => {
      this._endGame();
      this._showScreen('menu');
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this._startGame();
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const depth = parseInt(btn.dataset.depth);
        this.aiDifficulty = depth;
      });
    });

    // Victory screen buttons
    document.getElementById('victory-rematch')?.addEventListener('click', () => {
      this._startGame();
    });

    document.getElementById('victory-menu')?.addEventListener('click', () => {
      this._endGame();
      this._showScreen('menu');
    });
  }

  // ─── Game Lifecycle ───────────────────────────────────────────────────────

  _startGame() {
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.gameActive = true;
    this.aiThinking = false;
    this.moveLog = [];

    // Create engine
    this.engine = new ChessEngine();

    // Create AI if vs-ai mode
    if (this.mode === 'vs-ai') {
      this.ai = new ChessAI(this.engine);
    } else {
      this.ai = null;
    }

    // Create renderer
    if (this.renderer) {
      this.renderer.destroy();
    }
    this.renderer = new ChessRenderer(
      this.elements.board,
      (row, col) => this._onSquareClick(row, col)
    );

    // Create combat system (on-board SVG battle animations)
    // Pass the chess board container — CombatSystem finds/creates its overlay internally
    if (this.combat) {
      this.combat.destroy?.();
    }
    if (window.CombatSystem) {
      this.combat = new CombatSystem(this.elements.board);
    }

    // Fallback overlay animation system (text flash)
    if (this.animations) {
      this.animations.destroy?.();
    }
    this.animations = new AnimationSystem(this.elements.animOverlay);

    // Show game screen
    this._showScreen('game');

    // Update player info
    this._updatePlayerInfo();

    // Initial render
    this._render();

    this._updateStatus();
    this._updateMoveLog();
  }

  _endGame() {
    this.gameActive = false;
    this.aiThinking = false;
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }

  // ─── Input Handling ───────────────────────────────────────────────────────

  async _onSquareClick(row, col) {
    if (!this.gameActive || !this.engine) return;
    if (this.aiThinking) return;

    const currentTurn = this.engine.getCurrentTurn();

    // If AI's turn, ignore user input
    if (this.mode === 'vs-ai' && currentTurn === this.aiColor) return;

    const board = this.engine.getBoard();
    const clickedPiece = board[row][col];

    // If something is selected
    if (this.selectedSquare) {
      const { row: selRow, col: selCol } = this.selectedSquare;

      // Check if clicking a legal move target
      const isLegalTarget = this.legalMoves.some(m => m.row === row && m.col === col);

      if (isLegalTarget) {
        // Execute the move
        await this._executeMove(selRow, selCol, row, col);
        return;
      }

      // If clicking own piece, reselect
      if (clickedPiece && clickedPiece.color === currentTurn) {
        this._selectSquare(row, col);
        return;
      }

      // Deselect
      this._deselect();
      return;
    }

    // Nothing selected — try to select a piece
    if (clickedPiece && clickedPiece.color === currentTurn) {
      this._selectSquare(row, col);
    }
  }

  _selectSquare(row, col) {
    this.selectedSquare = { row, col };
    this.legalMoves = this.engine.getLegalMoves(row, col);
    this._render();
  }

  _deselect() {
    this.selectedSquare = null;
    this.legalMoves = [];
    this._render();
  }

  // ─── Move Execution ───────────────────────────────────────────────────────

  async _executeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
    if (!this.gameActive) return;

    const board = this.engine.getBoard();
    const movingPiece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];

    // Check if this is a promotion move
    const moveInfo = this.engine.getLegalMoves(fromRow, fromCol)
      .find(m => m.row === toRow && m.col === toCol);

    const isPromotion = moveInfo?.special === 'promotion';

    // If promotion and no piece chosen, show dialog
    if (isPromotion && !promotionPiece && this.mode !== 'ai-internal') {
      const chosen = await this._showPromotionDialog(movingPiece.color);
      promotionPiece = chosen;
    }

    // Play move animation first
    this.selectedSquare = null;
    this.legalMoves = [];

    // Determine if capture
    const isCapture = targetPiece !== null ||
      (moveInfo?.special === 'enpassant');

    // Play animations
    if (isCapture) {
      const capturedPiece = targetPiece || this._getEnPassantCapturedPiece(fromRow, fromCol, toRow, toCol);

      // Use CombatSystem (on-board SVG combat) if available
      if (this.combat) {
        await this.combat.playCapture(
          movingPiece,
          capturedPiece,
          { row: fromRow, col: fromCol },
          { row: toRow, col: toCol },
          (r, c) => this.renderer.getSquarePosition(r, c)
        );
      } else {
        await this.animations.playCaptureAnimation(
          movingPiece, capturedPiece,
          { row: fromRow, col: fromCol }, { row: toRow, col: toCol },
          this.renderer
        );
      }
    } else {
      await this.animations.playMoveAnimation(
        movingPiece,
        { row: fromRow, col: fromCol },
        { row: toRow, col: toCol },
        this.renderer
      );
    }

    // Make the move in engine
    const result = this.engine.makeMove(fromRow, fromCol, toRow, toCol, promotionPiece || 'queen');

    if (!result.success) {
      this._render();
      return;
    }

    this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };

    // Record move
    this.moveLog.push(this._formatMove(movingPiece, fromRow, fromCol, toRow, toCol, result));

    // Update render
    this._render();
    this._updateCapturedPieces();
    this._updateMoveLog();

    // Special post-move animations
    if (result.special === 'promotion') {
      const anim = this.combat || this.animations;
      await anim.playPromotion(
        { row: toRow, col: toCol },
        movingPiece.color,
        (r, c) => this.renderer.getSquarePosition(r, c)
      );
    } else if (result.special === 'castle_kingside' || result.special === 'castle_queenside') {
      const anim = this.combat || this.animations;
      await anim.playCastle(movingPiece.color, result.special);
    }

    // Check/checkmate
    if (result.checkmate) {
      const anim = this.combat || this.animations;
      await anim.playCheckmate(this.engine.getWinner());
      setTimeout(() => this._showVictory(), 800);
      return;
    }

    if (result.stalemate) {
      setTimeout(() => this._showStalemate(), 400);
      return;
    }

    if (result.check) {
      const kingPos = this.engine.getKingPosition(this.engine.getCurrentTurn());
      if (this.combat) {
        await this.combat.playCheck(kingPos, (r, c) => this.renderer.getSquarePosition(r, c));
      } else {
        await this.animations.playCheckAnimation(kingPos, this.renderer);
      }
    }

    this._updateStatus();
    this._updatePlayerInfo();

    // Trigger AI move if applicable
    if (this.mode === 'vs-ai' && this.engine.getCurrentTurn() === this.aiColor && this.gameActive) {
      setTimeout(() => this._doAiMove(), 300);
    }
  }

  _getEnPassantCapturedPiece(fromRow, fromCol, toRow, toCol) {
    // En passant: captured pawn sits at {fromRow, toCol} (same rank as attacker, target file)
    const board = this.engine.getBoard();
    return board[fromRow][toCol] || { type: 'pawn', color: this.engine.getCurrentTurn() === 'white' ? 'black' : 'white' };
  }

  // ─── AI Move ──────────────────────────────────────────────────────────────

  async _doAiMove() {
    if (!this.gameActive || !this.ai) return;
    if (this.engine.getGameStatus() !== 'active') return;

    this.aiThinking = true;
    this._updateStatus('Opponent is thinking...');

    // Small delay so UI feels responsive
    await this._sleep(150);

    try {
      const move = this.ai.getBestMove(this.aiDifficulty);

      if (!move || !this.gameActive) {
        this.aiThinking = false;
        return;
      }

      this.aiThinking = false;
      await this._executeMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move.promotionPiece);
    } catch (e) {
      console.error('AI error:', e);
      this.aiThinking = false;
      this._updateStatus();
    }
  }

  // ─── Promotion Dialog ─────────────────────────────────────────────────────

  _showPromotionDialog(color) {
    return new Promise(resolve => {
      const overlay = this.elements.promotionOverlay;
      overlay.classList.add('visible');

      const pieces = ['queen', 'rook', 'bishop', 'knight'];
      const symbols = {
        white: { queen: '♕', rook: '♖', bishop: '♗', knight: '♘' },
        black: { queen: '♛', rook: '♜', bishop: '♝', knight: '♞' },
      };

      const container = overlay.querySelector('.promotion-pieces');
      container.innerHTML = '';

      pieces.forEach(piece => {
        const btn = document.createElement('button');
        btn.className = 'promotion-piece-btn';
        btn.innerHTML = `
          <span class="promotion-piece-symbol">${symbols[color][piece]}</span>
          <span class="promotion-piece-name">${piece}</span>
        `;
        btn.addEventListener('click', () => {
          overlay.classList.remove('visible');
          resolve(piece);
        }, { once: true });
        container.appendChild(btn);
      });

      overlay.classList.remove('hidden');
    });
  }

  // ─── Victory / End States ─────────────────────────────────────────────────

  _showVictory() {
    if (!this.gameActive) return;
    this.gameActive = false;

    const winner = this.engine.getWinner();
    const winnerName = winner === 'white' ? 'White' : 'Black';
    const isPlayerWin = this.mode === 'hotseat' ||
      (this.mode === 'vs-ai' && winner !== this.aiColor);

    this.elements.victoryIcon.textContent = isPlayerWin ? '🏆' : '💀';
    this.elements.victoryTitle.textContent = 'CHECKMATE';
    this.elements.victorySubtitle.textContent = `${winnerName} Conquers the Field`;
    this.elements.victoryDetail.textContent =
      isPlayerWin && this.mode === 'vs-ai' ? 'Victory Against The Machine' : 'The Battle is Over';

    this._showScreen('victory');

    // Trigger animation
    const content = this.screens.victory.querySelector('.victory-content');
    if (content) {
      content.style.animation = 'none';
      content.offsetHeight; // reflow
      content.style.animation = 'victory-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards';
    }
  }

  _showStalemate() {
    this.gameActive = false;
    this.elements.victoryIcon.textContent = '🤝';
    this.elements.victoryTitle.textContent = 'STALEMATE';
    this.elements.victorySubtitle.textContent = 'No Victor This Day';
    this.elements.victoryDetail.textContent = 'The battle ends in a draw';
    this._showScreen('victory');
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  _render() {
    if (!this.renderer || !this.engine) return;

    const board = this.engine.getBoard();
    const currentTurn = this.engine.getCurrentTurn();
    const inCheck = this.engine.isInCheck(currentTurn);
    const kingPos = inCheck ? this.engine.getKingPosition(currentTurn) : null;

    this.renderer.render(
      board,
      this.legalMoves,
      this.selectedSquare,
      this.lastMove,
      kingPos,
      currentTurn
    );
  }

  // ─── UI Updates ───────────────────────────────────────────────────────────

  _updateStatus(override = null) {
    const el = this.elements.statusText;
    if (!el) return;

    if (override) {
      el.textContent = override;
      el.className = 'status-text';
      return;
    }

    if (!this.engine) return;

    const status = this.engine.getGameStatus();
    const turn = this.engine.getCurrentTurn();
    const inCheck = this.engine.isInCheck(turn);

    if (status === 'active') {
      if (inCheck) {
        el.textContent = `${turn === 'white' ? 'White' : 'Black'} is in CHECK`;
        el.className = 'status-text check';
      } else {
        el.textContent = this.mode === 'vs-ai' && turn === this.aiColor
          ? 'Opponent\'s turn'
          : `${turn === 'white' ? 'White' : 'Black'} to move`;
        el.className = 'status-text';
      }
    }
  }

  _updatePlayerInfo() {
    if (!this.engine) return;
    const turn = this.engine.getCurrentTurn();

    // For white-at-bottom orientation:
    // Bottom = white, Top = black
    const topAvatar = this.elements.topPlayerAvatar;
    const bottomAvatar = this.elements.bottomPlayerAvatar;
    const topIndicator = this.elements.topTurnIndicator;
    const bottomIndicator = this.elements.bottomTurnIndicator;

    if (topAvatar) {
      topAvatar.classList.toggle('active', turn === 'black');
    }
    if (bottomAvatar) {
      bottomAvatar.classList.toggle('active', turn === 'white');
    }
    if (topIndicator) {
      topIndicator.classList.toggle('active', turn === 'black');
    }
    if (bottomIndicator) {
      bottomIndicator.classList.toggle('active', turn === 'white');
    }
  }

  _updateCapturedPieces() {
    if (!this.engine) return;
    const captured = this.engine.getCapturedPieces();

    const symbols = {
      white: { pawn: '♙', rook: '♖', knight: '♘', bishop: '♗', queen: '♕', king: '♔' },
      black: { pawn: '♟', rook: '♜', knight: '♞', bishop: '♝', queen: '♛', king: '♚' },
    };

    // Top player is black; shows white pieces captured by black
    if (this.elements.topPlayerCaptured) {
      this.elements.topPlayerCaptured.innerHTML = captured.white
        .map(p => `<span class="captured-piece">${symbols.white[p.type]}</span>`)
        .join('');
    }

    // Bottom player is white; shows black pieces captured by white
    if (this.elements.bottomPlayerCaptured) {
      this.elements.bottomPlayerCaptured.innerHTML = captured.black
        .map(p => `<span class="captured-piece">${symbols.black[p.type]}</span>`)
        .join('');
    }
  }

  _updateMoveLog() {
    const el = this.elements.moveLogEl;
    if (!el) return;
    el.innerHTML = this.moveLog
      .map((m, i) => `<span class="move-entry">${Math.ceil((i + 1) / 2)}${i % 2 === 0 ? '.' : '…'} ${m}</span>`)
      .join('');
    el.scrollLeft = el.scrollWidth;
  }

  _formatMove(piece, fromRow, fromCol, toRow, toCol, result) {
    const files = 'abcdefgh';
    const from = `${files[fromCol]}${8 - fromRow}`;
    const to = `${files[toCol]}${8 - toRow}`;
    const capture = result.captured ? 'x' : '-';
    const check = result.checkmate ? '#' : result.check ? '+' : '';
    const pieceSymbol = piece.type === 'pawn' ? '' : piece.type[0].toUpperCase();
    return `${pieceSymbol}${from}${capture}${to}${check}`;
  }

  _showHowToPlay() {
    alert(
      'CINEMATIC CHESS\n\n' +
      '• Tap a piece to select it\n' +
      '• Green dots show legal moves\n' +
      '• Tap a highlighted square to move\n' +
      '• All standard chess rules apply\n' +
      '• Castling, en passant & promotion included\n\n' +
      'The most exciting way to play real chess.'
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.game = new CinematicChess();
});
