/**
 * chess-ai.js — Minimax Chess AI with Alpha-Beta Pruning
 * Cinematic Chess Prototype
 * Plays as BLACK (minimizing player). Depth 2-4 for mobile performance.
 *
 * Depends on ChessEngine (window.ChessEngine). Loaded after chess-engine.js.
 */

class ChessAI {
  constructor(engine) {
    this.engine = engine;

    this.PIECE_VALUES = {
      pawn: 100, knight: 320, bishop: 330,
      rook: 500, queen: 900, king: 20000,
    };

    this.PST = {
      pawn: [
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [ 50, 50, 50, 50, 50, 50, 50, 50],
        [ 10, 10, 20, 30, 30, 20, 10, 10],
        [  5,  5, 10, 25, 25, 10,  5,  5],
        [  0,  0,  0, 20, 20,  0,  0,  0],
        [  5, -5,-10,  0,  0,-10, -5,  5],
        [  5, 10, 10,-20,-20, 10, 10,  5],
        [  0,  0,  0,  0,  0,  0,  0,  0],
      ],
      knight: [
        [-50,-40,-30,-30,-30,-30,-40,-50],
        [-40,-20,  0,  0,  0,  0,-20,-40],
        [-30,  0, 10, 15, 15, 10,  0,-30],
        [-30,  5, 15, 20, 20, 15,  5,-30],
        [-30,  0, 15, 20, 20, 15,  0,-30],
        [-30,  5, 10, 15, 15, 10,  5,-30],
        [-40,-20,  0,  5,  5,  0,-20,-40],
        [-50,-40,-30,-30,-30,-30,-40,-50],
      ],
      bishop: [
        [-20,-10,-10,-10,-10,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5, 10, 10,  5,  0,-10],
        [-10,  5,  5, 10, 10,  5,  5,-10],
        [-10,  0, 10, 10, 10, 10,  0,-10],
        [-10, 10, 10, 10, 10, 10, 10,-10],
        [-10,  5,  0,  0,  0,  0,  5,-10],
        [-20,-10,-10,-10,-10,-10,-10,-20],
      ],
      rook: [
        [  0,  0,  0,  0,  0,  0,  0,  0],
        [  5, 10, 10, 10, 10, 10, 10,  5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [ -5,  0,  0,  0,  0,  0,  0, -5],
        [  0,  0,  0,  5,  5,  0,  0,  0],
      ],
      queen: [
        [-20,-10,-10, -5, -5,-10,-10,-20],
        [-10,  0,  0,  0,  0,  0,  0,-10],
        [-10,  0,  5,  5,  5,  5,  0,-10],
        [ -5,  0,  5,  5,  5,  5,  0, -5],
        [  0,  0,  5,  5,  5,  5,  0, -5],
        [-10,  5,  5,  5,  5,  5,  0,-10],
        [-10,  0,  5,  0,  0,  0,  0,-10],
        [-20,-10,-10, -5, -5,-10,-10,-20],
      ],
      king_mid: [
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-30,-40,-40,-50,-50,-40,-40,-30],
        [-20,-30,-30,-40,-40,-30,-30,-20],
        [-10,-20,-20,-20,-20,-20,-20,-10],
        [ 20, 20,  0,  0,  0,  0, 20, 20],
        [ 20, 30, 10,  0,  0, 10, 30, 20],
      ],
      king_end: [
        [-50,-40,-30,-20,-20,-30,-40,-50],
        [-30,-20,-10,  0,  0,-10,-20,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-30,  0,  0,  0,  0,-30,-30],
        [-50,-30,-30,-30,-30,-30,-30,-50],
      ],
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  getBestMove(depth = 3) {
    // Clone current engine state for tree search (non-destructive)
    const rootState = this.engine.cloneState();

    const moves = this._getAllMovesForColor('black', rootState);
    if (!moves || moves.length === 0) return null;

    const ordered = this._orderMoves(moves, rootState);

    let bestScore = Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of ordered) {
      const { fromRow, fromCol, toRow, toCol } = move;
      const { newState } = this.engine.applyMoveToState(
        rootState, fromRow, fromCol, toRow, toCol, 'queen'
      );

      const score = this.minimax(depth - 1, alpha, beta, true, newState);

      if (score < bestScore) {
        bestScore = score;
        bestMove = { fromRow, fromCol, toRow, toCol, promotionPiece: 'queen' };
      }

      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }

    return bestMove;
  }

  // ─── Minimax with Alpha-Beta Pruning ─────────────────────────────────────

  minimax(depth, alpha, beta, isMaximizing, state) {
    if (depth === 0) {
      return this.evaluate(state);
    }

    const color = isMaximizing ? 'white' : 'black';
    const moves = this._getAllMovesForColor(color, state);

    if (!moves || moves.length === 0) {
      // Terminal: checkmate or stalemate
      const inCheck = this.engine.isInCheckForState(state, color);
      if (inCheck) {
        // Checkmate — heavily penalize, prefer faster mates
        return isMaximizing
          ? -100000 - depth * 1000
          :  100000 + depth * 1000;
      }
      return 0; // Stalemate
    }

    const ordered = this._orderMoves(moves, state);

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (const move of ordered) {
        const { newState } = this.engine.applyMoveToState(
          state, move.fromRow, move.fromCol, move.toRow, move.toCol, 'queen'
        );
        const score = this.minimax(depth - 1, alpha, beta, false, newState);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Beta cutoff
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of ordered) {
        const { newState } = this.engine.applyMoveToState(
          state, move.fromRow, move.fromCol, move.toRow, move.toCol, 'queen'
        );
        const score = this.minimax(depth - 1, alpha, beta, true, newState);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return minScore;
    }
  }

  // ─── Static Evaluation ───────────────────────────────────────────────────

  evaluate(state) {
    const board = state.board;

    // Determine game phase (endgame when non-king material drops below threshold)
    let totalMaterial = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type !== 'king') {
          totalMaterial += this.PIECE_VALUES[p.type] || 0;
        }
      }
    }
    const isEndgame = totalMaterial < 1600;

    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = this.PIECE_VALUES[piece.type] || 0;

        // PST bonus
        let pst = 0;
        if (piece.type === 'king') {
          const table = isEndgame ? this.PST.king_end : this.PST.king_mid;
          pst = piece.color === 'white' ? table[r][c] : table[7 - r][c];
        } else if (this.PST[piece.type]) {
          const table = this.PST[piece.type];
          pst = piece.color === 'white' ? table[r][c] : table[7 - r][c];
        }

        const contribution = val + pst;
        score += piece.color === 'white' ? contribution : -contribution;
      }
    }

    return score;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _getAllMovesForColor(color, state) {
    return this.engine.getAllLegalMovesForColor(state, color) || [];
  }

  // MVV-LVA move ordering: captures first (high-value victim, low-value attacker),
  // then promotions, then quiet moves. Dramatically improves alpha-beta cutoffs.
  _orderMoves(moves, state) {
    const board = state.board;

    const scored = moves.map(move => {
      const { fromRow, fromCol, toRow, toCol, special } = move;
      let s = 0;

      const attacker = board[fromRow]?.[fromCol];
      const victim = board[toRow]?.[toCol];

      if (victim) {
        const victimVal = this.PIECE_VALUES[victim.type] || 0;
        const attackerVal = attacker ? (this.PIECE_VALUES[attacker.type] || 0) : 0;
        s = 10 * victimVal - Math.floor(attackerVal / 100);
      }

      if (special === 'promotion' || special === 'enpassant') s += 8000;

      return { move, s };
    });

    scored.sort((a, b) => b.s - a.s);
    return scored.map(x => x.move);
  }
}

if (typeof module !== 'undefined') module.exports = ChessAI;
else window.ChessAI = ChessAI;
