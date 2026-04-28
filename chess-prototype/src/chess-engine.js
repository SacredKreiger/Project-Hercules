/**
 * chess-engine.js
 * Complete, production-quality chess engine in pure JavaScript.
 * Handles all standard chess rules: legal move generation, check/checkmate/stalemate
 * detection, castling, en passant, and pawn promotion.
 *
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIECE_TYPES = {
  KING: 'king', QUEEN: 'queen', ROOK: 'rook',
  BISHOP: 'bishop', KNIGHT: 'knight', PAWN: 'pawn',
};

const COLORS = { WHITE: 'white', BLACK: 'black' };

const GAME_STATUS = {
  ACTIVE: 'active', CHECKMATE: 'checkmate', STALEMATE: 'stalemate', DRAW: 'draw',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePiece(type, color) { return { type, color }; }

function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

function cloneState(state) {
  return {
    board: cloneBoard(state.board),
    turn: state.turn,
    castlingRights: {
      white: { ...state.castlingRights.white },
      black: { ...state.castlingRights.black },
    },
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    halfMoveClock: state.halfMoveClock,
    fullMoveNumber: state.fullMoveNumber,
  };
}

function buildInitialBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
  backRank.forEach((type, col) => {
    board[0][col] = makePiece(type, 'black');
    board[7][col] = makePiece(type, 'white');
  });
  for (let col = 0; col < 8; col++) {
    board[1][col] = makePiece('pawn', 'black');
    board[6][col] = makePiece('pawn', 'white');
  }
  return board;
}

function toAlgebraic(row, col) {
  return String.fromCharCode('a'.charCodeAt(0) + col) + (8 - row);
}
function fromAlgebraic(sq) {
  return { col: sq.charCodeAt(0) - 97, row: 8 - parseInt(sq[1], 10) };
}
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

// ---------------------------------------------------------------------------
// Pseudo-legal move generators
// ---------------------------------------------------------------------------

const BISHOP_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];
const ROOK_DIRS   = [[-1,0],[1,0],[0,-1],[0,1]];
const QUEEN_DIRS  = [...BISHOP_DIRS, ...ROOK_DIRS];

function pawnMoves(state, row, col) {
  const { board, enPassantTarget } = state;
  const { color } = board[row][col];
  const dir = color === 'white' ? -1 : 1;
  const startRank = color === 'white' ? 6 : 1;
  const promRank  = color === 'white' ? 0 : 7;
  const moves = [];
  const sp = r => r === promRank ? 'promotion' : null;

  const oneAhead = row + dir;
  if (inBounds(oneAhead, col) && !board[oneAhead][col]) {
    moves.push({ row: oneAhead, col, special: sp(oneAhead) });
    if (row === startRank) {
      const twoAhead = row + 2 * dir;
      if (!board[twoAhead][col]) moves.push({ row: twoAhead, col, special: null });
    }
  }
  for (const dc of [-1, 1]) {
    const dr = row + dir, dc2 = col + dc;
    if (!inBounds(dr, dc2)) continue;
    const t = board[dr][dc2];
    if (t && t.color !== color) {
      moves.push({ row: dr, col: dc2, special: sp(dr) });
    } else if (enPassantTarget && enPassantTarget.row === dr && enPassantTarget.col === dc2) {
      moves.push({ row: dr, col: dc2, special: 'enpassant' });
    }
  }
  return moves;
}

function knightMoves(state, row, col) {
  const { board } = state;
  const color = board[row][col].color;
  const moves = [];
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const r = row+dr, c = col+dc;
    if (!inBounds(r,c)) continue;
    if (board[r][c]?.color === color) continue;
    moves.push({ row: r, col: c, special: null });
  }
  return moves;
}

function slidingMoves(state, row, col, dirs) {
  const { board } = state;
  const color = board[row][col].color;
  const moves = [];
  for (const [dr, dc] of dirs) {
    let r = row+dr, c = col+dc;
    while (inBounds(r,c)) {
      const t = board[r][c];
      if (t) { if (t.color !== color) moves.push({ row:r, col:c, special:null }); break; }
      moves.push({ row:r, col:c, special:null });
      r += dr; c += dc;
    }
  }
  return moves;
}

function kingMoves(state, row, col) {
  const { board, castlingRights } = state;
  const color = board[row][col].color;
  const moves = [];
  for (const [dr, dc] of QUEEN_DIRS) {
    const r = row+dr, c = col+dc;
    if (!inBounds(r,c) || board[r][c]?.color === color) continue;
    moves.push({ row:r, col:c, special:null });
  }
  const rights = castlingRights[color];
  if (!rights.kingMoved) {
    if (rights.kingsideRook  && !board[row][5] && !board[row][6])
      moves.push({ row, col:6, special:'castle_kingside' });
    if (rights.queensideRook && !board[row][3] && !board[row][2] && !board[row][1])
      moves.push({ row, col:2, special:'castle_queenside' });
  }
  return moves;
}

function pseudoLegalMoves(state, row, col) {
  const p = state.board[row][col];
  if (!p) return [];
  switch (p.type) {
    case 'pawn':   return pawnMoves(state, row, col);
    case 'knight': return knightMoves(state, row, col);
    case 'bishop': return slidingMoves(state, row, col, BISHOP_DIRS);
    case 'rook':   return slidingMoves(state, row, col, ROOK_DIRS);
    case 'queen':  return slidingMoves(state, row, col, QUEEN_DIRS);
    case 'king':   return kingMoves(state, row, col);
    default: return [];
  }
}

// ---------------------------------------------------------------------------
// Attack / Check detection
// ---------------------------------------------------------------------------

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'king' && board[r][c]?.color === color)
        return { row:r, col:c };
  return null;
}

function isSquareAttacked(state, row, col, attackerColor) {
  const { board } = state;
  const pawnDir = attackerColor === 'white' ? 1 : -1;
  for (const dc of [-1,1]) {
    const p = board[row+pawnDir]?.[col+dc];
    if (p?.type === 'pawn' && p.color === attackerColor) return true;
  }
  for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const p = board[row+dr]?.[col+dc];
    if (p?.type === 'knight' && p.color === attackerColor) return true;
  }
  for (const { dirs, types } of [
    { dirs: BISHOP_DIRS, types: ['bishop','queen'] },
    { dirs: ROOK_DIRS,   types: ['rook','queen']   },
  ]) {
    for (const [dr,dc] of dirs) {
      let r=row+dr, c=col+dc;
      while (inBounds(r,c)) {
        const p = board[r][c];
        if (p) { if (p.color===attackerColor && types.includes(p.type)) return true; break; }
        r+=dr; c+=dc;
      }
    }
  }
  for (const [dr,dc] of QUEEN_DIRS) {
    const p = board[row+dr]?.[col+dc];
    if (p?.type === 'king' && p.color === attackerColor) return true;
  }
  return false;
}

function isInCheckState(state, color) {
  const king = findKing(state.board, color);
  if (!king) return false;
  const opp = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(state, king.row, king.col, opp);
}

// ---------------------------------------------------------------------------
// Apply move to state (immutable)
// ---------------------------------------------------------------------------

function applyMoveToState(state, fromRow, fromCol, toRow, toCol, promotionPiece = 'queen') {
  const newState = cloneState(state);
  const board = newState.board;
  const piece = board[fromRow][fromCol];
  const color = piece.color;
  const opp = color === 'white' ? 'black' : 'white';

  let capturedPiece = board[toRow][toCol] ? { ...board[toRow][toCol] } : null;
  let special = null;

  // En passant
  if (piece.type === 'pawn' && newState.enPassantTarget?.row === toRow && newState.enPassantTarget?.col === toCol) {
    capturedPiece = { ...board[fromRow][toCol] };
    board[fromRow][toCol] = null;
    special = 'enpassant';
  }

  // Castling — detect via pseudo-legal special tag
  const pseudos = pseudoLegalMoves(state, fromRow, fromCol);
  const meta = pseudos.find(m => m.row === toRow && m.col === toCol);
  const metaSpecial = meta?.special;

  if (piece.type === 'king' && metaSpecial === 'castle_kingside') {
    board[fromRow][5] = board[fromRow][7]; board[fromRow][7] = null;
    special = 'castle_kingside';
  } else if (piece.type === 'king' && metaSpecial === 'castle_queenside') {
    board[fromRow][3] = board[fromRow][0]; board[fromRow][0] = null;
    special = 'castle_queenside';
  }

  // En passant target for next move
  if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
    newState.enPassantTarget = { row: (fromRow + toRow) / 2, col: toCol };
  } else {
    newState.enPassantTarget = null;
  }

  // Move piece
  board[toRow][toCol] = piece;
  board[fromRow][fromCol] = null;

  // Promotion
  const promRank = color === 'white' ? 0 : 7;
  if (piece.type === 'pawn' && toRow === promRank) {
    board[toRow][toCol] = makePiece(promotionPiece, color);
    if (!special) special = 'promotion';
  }

  // Castling rights
  if (piece.type === 'king') {
    newState.castlingRights[color] = { kingMoved: true, kingsideRook: false, queensideRook: false };
  }
  const backRank = color === 'white' ? 7 : 0;
  if (piece.type === 'rook') {
    if (fromRow === backRank && fromCol === 7) newState.castlingRights[color].kingsideRook = false;
    if (fromRow === backRank && fromCol === 0) newState.castlingRights[color].queensideRook = false;
  }
  const oppBack = opp === 'white' ? 7 : 0;
  if (capturedPiece?.type === 'rook') {
    if (toRow === oppBack && toCol === 7) newState.castlingRights[opp].kingsideRook = false;
    if (toRow === oppBack && toCol === 0) newState.castlingRights[opp].queensideRook = false;
  }

  newState.turn = opp;
  newState.halfMoveClock = (piece.type === 'pawn' || capturedPiece) ? 0 : newState.halfMoveClock + 1;
  if (color === 'black') newState.fullMoveNumber++;

  return { newState, capturedPiece, special };
}

// ---------------------------------------------------------------------------
// Legal move generation
// ---------------------------------------------------------------------------

function getLegalMovesFromState(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.color !== state.turn) return [];
  const color = piece.color;
  const opp = color === 'white' ? 'black' : 'white';
  const legal = [];

  for (const move of pseudoLegalMoves(state, row, col)) {
    // Extra castling checks: not in check, not passing through attack
    if (move.special === 'castle_kingside' || move.special === 'castle_queenside') {
      if (isInCheckState(state, color)) continue;
      const passingCol = move.special === 'castle_kingside' ? 5 : 3;
      if (isSquareAttacked(state, row, passingCol, opp)) continue;
    }
    const { newState } = applyMoveToState(state, row, col, move.row, move.col);
    if (!isInCheckState(newState, color)) legal.push(move);
  }
  return legal;
}

function hasLegalMoves(state, color) {
  const s = { ...state, turn: color };
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (state.board[r][c]?.color === color && getLegalMovesFromState(s, r, c).length > 0)
        return true;
  return false;
}

// ---------------------------------------------------------------------------
// ChessEngine class
// ---------------------------------------------------------------------------

class ChessEngine {
  constructor() { this.reset(); }

  reset() {
    this._state = {
      board: buildInitialBoard(),
      turn: 'white',
      castlingRights: {
        white: { kingMoved: false, kingsideRook: true, queensideRook: true },
        black: { kingMoved: false, kingsideRook: true, queensideRook: true },
      },
      enPassantTarget: null,
      halfMoveClock: 0,
      fullMoveNumber: 1,
    };
    this._moveHistory = [];
    this._capturedPieces = { white: [], black: [] };
    this._gameStatus = 'active';
    this._winner = null;
  }

  getBoard() { return cloneBoard(this._state.board); }

  getLegalMoves(row, col) {
    if (this._gameStatus !== 'active') return [];
    return getLegalMovesFromState(this._state, row, col);
  }

  makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = 'queen') {
    const fail = { success:false, captured:null, special:null, check:false, checkmate:false, stalemate:false };
    if (this._gameStatus !== 'active') return fail;
    const piece = this._state.board[fromRow][fromCol];
    if (!piece || piece.color !== this._state.turn) return fail;
    const legal = getLegalMovesFromState(this._state, fromRow, fromCol);
    if (!legal.find(m => m.row === toRow && m.col === toCol)) return fail;

    const { newState, capturedPiece, special } = applyMoveToState(
      this._state, fromRow, fromCol, toRow, toCol, promotionPiece
    );

    this._moveHistory.push({
      from: { row:fromRow, col:fromCol, square:toAlgebraic(fromRow,fromCol) },
      to:   { row:toRow,   col:toCol,   square:toAlgebraic(toRow,toCol) },
      piece: { ...piece }, captured: capturedPiece, special,
      promotionPiece: special === 'promotion' ? promotionPiece : null,
      fullMoveNumber: this._state.fullMoveNumber, turn: this._state.turn,
    });

    if (capturedPiece) this._capturedPieces[piece.color].push({ ...capturedPiece });
    this._state = newState;

    const cur = this._state.turn;
    const inCheck = isInCheckState(this._state, cur);
    const canMove = hasLegalMoves(this._state, cur);
    let checkmate = false, stalemate = false;

    if (!canMove) {
      if (inCheck) { checkmate = true; this._gameStatus = 'checkmate'; this._winner = piece.color; }
      else          { stalemate = true; this._gameStatus = 'stalemate'; this._winner = null; }
    } else if (this._state.halfMoveClock >= 100) {
      this._gameStatus = 'draw'; this._winner = null;
    }

    return { success:true, captured:capturedPiece, special, check:inCheck && !checkmate, checkmate, stalemate };
  }

  getCurrentTurn()      { return this._state.turn; }
  isInCheck(color)      { return isInCheckState(this._state, color); }
  getGameStatus()       { return this._gameStatus; }
  getWinner()           { return this._winner; }
  getMoveHistory()      { return [...this._moveHistory]; }
  getCapturedPieces()   { return { white:[...this._capturedPieces.white], black:[...this._capturedPieces.black] }; }
  getKingPosition(c)    { return findKing(this._state.board, c); }
  cloneState()          { return cloneState(this._state); }
  applyMoveToState(...a){ return applyMoveToState(...a); }
  toAlgebraic(r,c)      { return toAlgebraic(r,c); }
  fromAlgebraic(sq)     { return fromAlgebraic(sq); }

  getAllLegalMovesForColor(state, color) {
    const s = { ...state, turn: color };
    const moves = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (state.board[r][c]?.color === color)
          for (const dest of getLegalMovesFromState(s, r, c))
            moves.push({ fromRow:r, fromCol:c, toRow:dest.row, toCol:dest.col, special:dest.special });
    return moves;
  }

  isInCheckForState(state, color)   { return isInCheckState(state, color); }
  isCheckmateForState(state, color) { return isInCheckState(state,color) && !hasLegalMoves(state,color); }
  isStalemateForState(state, color) { return !isInCheckState(state,color) && !hasLegalMoves(state,color); }
}

if (typeof module !== 'undefined') module.exports = ChessEngine;
else window.ChessEngine = ChessEngine;
