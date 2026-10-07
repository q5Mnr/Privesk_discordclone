import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, RotateCcw, User, Bot, Undo2 } from 'lucide-react';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PIECES = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

function parseFen(fen) {
  const [placement, turn, castling, ep, half, full] = fen.split(' ');
  const board = [];
  for (const row of placement.split('/')) {
    const line = [];
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) line.push(null);
      } else {
        line.push({ type: ch.toLowerCase(), color: ch === ch.toUpperCase() ? 'w' : 'b' });
      }
    }
    board.push(line);
  }
  return { board, turn, castling, ep: ep === '-' ? null : ep, half, full };
}

function toFen(state) {
  let placement = '';
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const p = state.board[r][c];
      if (!p) { empty++; continue; }
      if (empty) { placement += empty; empty = 0; }
      placement += p.color === 'w' ? p.type.toUpperCase() : p.type;
    }
    if (empty) placement += empty;
    if (r < 7) placement += '/';
  }
  return `${placement} ${state.turn} ${state.castling} ${state.ep || '-'} 0 1`;
}

const FILES = 'abcdefgh';
const RANK_OFFSETS = {
  k: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  n: [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  q: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
};

function isSquareAttacked(board, r, c, byColor) {
  for (const [dr, dc] of RANK_OFFSETS.n) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] && board[nr][nc].color === byColor && board[nr][nc].type === 'n') return true;
  }
  const pawnDirs = byColor === 'w' ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
  for (const [dr, dc] of pawnDirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] && board[nr][nc].color === byColor && board[nr][nc].type === 'p') return true;
  }
  for (const [dr, dc] of RANK_OFFSETS.k) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] && board[nr][nc].color === byColor && board[nr][nc].type === 'k') return true;
  }
  const slide = RANK_OFFSETS.r.concat(RANK_OFFSETS.b).concat(RANK_OFFSETS.q);
  const diag = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const straight = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dr, dc] of slide) {
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = board[nr][nc];
      if (p) {
        const isDiag = diag.some(([x, y]) => x === dr && y === dc);
        const isStraight = straight.some(([x, y]) => x === dr && y === dc);
        if (p.color === byColor && (isDiag ? p.type === 'b' || p.type === 'q' : isStraight ? p.type === 'r' || p.type === 'q' : false)) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  return false;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c] && board[r][c].type === 'k' && board[r][c].color === color) return { r, c };
  }
  return null;
}

function inCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  return isSquareAttacked(board, king.r, king.c, color === 'w' ? 'b' : 'w');
}

function cloneBoard(board) {
  return board.map(row => row.map(p => p ? { ...p } : null));
}

function generateMoves(state, r, c) {
  const piece = state.board[r][c];
  if (!piece) return [];
  const moves = [];
  const color = piece.color;
  const opp = color === 'w' ? 'b' : 'w';

  const addIfValid = (nr, nc) => {
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
    const target = state.board[nr][nc];
    if (target && target.color === color) return false;
    moves.push({ from: [r, c], to: [nr, nc], type: piece.type, capture: !!target, prom: null });
    return true;
  };

  if (piece.type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (r + dir >= 0 && r + dir < 8 && !state.board[r + dir][c]) {
      const promo = (color === 'w' && r + dir === 0) || (color === 'b' && r + dir === 7);
      if (promo) {
        for (const t of ['q', 'r', 'b', 'n']) moves.push({ from: [r, c], to: [r + dir, c], type: 'p', capture: false, prom: t });
      } else {
        moves.push({ from: [r, c], to: [r + dir, c], type: 'p', capture: false, prom: null });
        if (r === startRow && !state.board[r + 2 * dir][c]) moves.push({ from: [r, c], to: [r + 2 * dir, c], type: 'p', capture: false, prom: null });
      }
    }
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (nc < 0 || nc >= 8 || r + dir < 0 || r + dir >= 8) continue;
      const target = state.board[r + dir][nc];
      const isPromo = (color === 'w' && r + dir === 0) || (color === 'b' && r + dir === 7);
      if (target && target.color === opp) {
        if (isPromo) {
          for (const t of ['q', 'r', 'b', 'n']) moves.push({ from: [r, c], to: [r + dir, nc], type: 'p', capture: true, prom: t });
        } else {
          moves.push({ from: [r, c], to: [r + dir, nc], type: 'p', capture: true, prom: null });
        }
      }
      if (state.ep === `${FILES[nc]}${8 - (r + dir)}` && !target) {
        moves.push({ from: [r, c], to: [r + dir, nc], type: 'p', capture: true, prom: null, enPassant: true });
      }
    }
  } else {
    const offsets = RANK_OFFSETS[piece.type];
    if (piece.type === 'k') {
      for (const [dr, dc] of offsets) addIfValid(r + dr, c + dc);
      const row = color === 'w' ? 7 : 0;
      const kRook = state.board[row][7], qRook = state.board[row][0];
      const isRook = p => p && p.type === 'r' && p.color === color;
      if (r === row && c === 4) {
        if (state.castling.includes(color === 'w' ? 'K' : 'k') && isRook(kRook) && !state.board[row][5] && !state.board[row][6]
          && !isSquareAttacked(state.board, row, 4, opp) && !isSquareAttacked(state.board, row, 5, opp) && !isSquareAttacked(state.board, row, 6, opp)) {
          moves.push({ from: [r, c], to: [row, 6], type: 'k', castling: 'kingside', capture: false });
        }
        if (state.castling.includes(color === 'w' ? 'Q' : 'q') && isRook(qRook) && !state.board[row][3] && !state.board[row][2] && !state.board[row][1]
          && !isSquareAttacked(state.board, row, 4, opp) && !isSquareAttacked(state.board, row, 3, opp) && !isSquareAttacked(state.board, row, 2, opp)) {
          moves.push({ from: [r, c], to: [row, 2], type: 'k', castling: 'queenside', capture: false });
        }
      }
    } else {
      for (const [dr, dc] of offsets) {
        if (piece.type === 'n') {
          addIfValid(r + dr, c + dc);
        } else {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!addIfValid(nr, nc)) break;
            if (state.board[nr][nc]) break;
            nr += dr; nc += dc;
          }
        }
      }
    }
  }

  return moves.filter(m => {
    const nb = cloneBoard(state.board);
    nb[m.to[0]][m.to[1]] = { type: m.prom || m.type, color };
    nb[m.from[0]][m.from[1]] = null;
    if (m.enPassant) {
      nb[m.from[0]][m.to[1]] = null;
    }
    if (m.castling === 'kingside') {
      nb[m.to[0]][5] = nb[m.to[0]][7];
      nb[m.to[0]][7] = null;
    }
    if (m.castling === 'queenside') {
      nb[m.to[0]][3] = nb[m.to[0]][0];
      nb[m.to[0]][0] = null;
    }
    return !inCheck(nb, color);
  });
}

function allLegalMoves(state, color) {
  const all = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (state.board[r][c] && state.board[r][c].color === color) {
      const moves = generateMoves(state, r, c);
      for (const m of moves) all.push({ ...m, pieceType: state.board[r][c].type });
    }
  }
  return all;
}

function applyMove(state, move) {
  const board = cloneBoard(state.board);
  const piece = board[move.from[0]][move.from[1]];
  board[move.to[0]][move.to[1]] = { type: move.prom || move.type, color: piece.color };
  board[move.from[0]][move.from[1]] = null;

  if (move.enPassant) board[move.from[0]][move.to[1]] = null;
  if (move.castling === 'kingside') {
    board[move.to[0]][5] = board[move.to[0]][7];
    board[move.to[0]][7] = null;
  }
  if (move.castling === 'queenside') {
    board[move.to[0]][3] = board[move.to[0]][0];
    board[move.to[0]][0] = null;
  }

  let castling = state.castling;
  const fromSq = `${FILES[move.from[1]]}${8 - move.from[0]}`;
  const toSq = `${FILES[move.to[1]]}${8 - move.to[0]}`;
  const kingFrom = move.type === 'k' ? fromSq : null;
  const rookSquares = {
    a1: 'Q', h1: 'K', a8: 'q', h8: 'k',
  };
  const affected = [kingFrom, fromSq, toSq];
  for (const sq of affected) {
    if (rookSquares[sq]) castling = castling.replace(rookSquares[sq], '');
  }
  if (move.type === 'k') {
    if (piece.color === 'w') castling = castling.replace(/[KQ]/g, '');
    if (piece.color === 'b') castling = castling.replace(/[kq]/g, '');
  }

  let ep = null;
  if (move.type === 'p' && Math.abs(move.to[0] - move.from[0]) === 2) {
    ep = `${FILES[move.from[1]]}${8 - (move.from[0] + (move.to[0] - move.from[0]) / 2)}`;
  }

  return {
    board,
    turn: state.turn === 'w' ? 'b' : 'w',
    castling: castling || '-',
    ep,
    lastMove: { from: move.from, to: move.to },
  };
}

function getGameStatus(state) {
  const moves = allLegalMoves(state, state.turn);
  if (moves.length === 0) {
    if (inCheck(state.board, state.turn)) return state.turn === 'w' ? 'checkmate-b' : 'checkmate-w';
    return 'stalemate';
  }
  if (inCheck(state.board, state.turn)) return 'check';
  return 'playing';
}

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const v = PIECE_VALUES[p.type];
    score += p.color === 'w' ? v : -v;
    if (p.type === 'p') {
      const center = Math.abs(c - 3.5) + Math.abs(r - 3.5);
      const bonus = (8 - center) * 2;
      score += p.color === 'w' ? bonus : -bonus;
    }
  }
  return score;
}

function minimax(state, depth, alpha, beta, maximizing) {
  if (depth === 0) return { score: evaluateBoard(state.board) };
  const moves = allLegalMoves(state, maximizing ? 'w' : 'b');
  if (moves.length === 0) {
    if (inCheck(state.board, maximizing ? 'w' : 'b')) return { score: maximizing ? -100000 - depth : 100000 + depth };
    return { score: 0 };
  }
  if (maximizing) {
    let best = { score: -Infinity };
    for (const m of moves) {
      const child = applyMove(state, m);
      const res = minimax(child, depth - 1, alpha, beta, false);
      if (res.score > best.score) best = { score: res.score, move: m };
      alpha = Math.max(alpha, res.score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = { score: Infinity };
    for (const m of moves) {
      const child = applyMove(state, m);
      const res = minimax(child, depth - 1, alpha, beta, true);
      if (res.score < best.score) best = { score: res.score, move: m };
      beta = Math.min(beta, res.score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function pickAiMove(state, difficulty, aiColor) {
  const moves = allLegalMoves(state, aiColor);
  if (moves.length === 0) return null;
  if (difficulty === 'easy') {
    const scoring = moves.map(m => {
      const target = state.board[m.to[0]][m.to[1]];
      let s = target ? PIECE_VALUES[target.type] : 0;
      if (m.capture) s += 10;
      return { m, s };
    });
    scoring.sort((a, b) => b.s - a.s);
    const top = scoring.slice(0, 3);
    return top[Math.floor(Math.random() * top.length)].m;
  }
  const depth = difficulty === 'hard' ? 3 : 2;
  const res = minimax(state, depth, -Infinity, Infinity, aiColor === 'w');
  return res.move || moves[0];
}

export default function ChessGame({ onClose, user }) {
  const [fen, setFen] = useState(START_FEN);
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('playing');
  const [mode, setMode] = useState('ai');
  const [difficulty, setDifficulty] = useState('medium');
  const [playerColor, setPlayerColor] = useState('w');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [gameOver, setGameOver] = useState(null);
  const stateRef = useRef(parseFen(START_FEN));
  const aiTimerRef = useRef(null);
  const aiThinkingRef = useRef(false);

  const updateFromState = useCallback((st) => {
    stateRef.current = st;
    setFen(toFen(st));
    setSelected(null);
    setLegalMoves([]);
    const s = getGameStatus(st);
    setStatus(s);
    if (s.startsWith('checkmate')) {
      setGameOver(s === 'checkmate-w' ? 'Белые победили' : 'Чёрные победили');
    } else if (s === 'stalemate') {
      setGameOver('Пат! Ничья');
    }
  }, []);

  useEffect(() => {
    if (gameOver || mode !== 'ai') return;
    const aiColor = playerColor === 'w' ? 'b' : 'w';
    if (fen.split(' ')[1] !== aiColor || aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    setIsAiThinking(true);
    aiTimerRef.current = setTimeout(() => {
      aiThinkingRef.current = false;
      const st = stateRef.current;
      const move = pickAiMove(st, difficulty, aiColor);
      if (move) {
        const next = applyMove(st, move);
        setHistory(h => [...h, { ...move, color: aiColor, fen: toFen(next) }]);
        const cap = captureNotation(st, move);
        const capKey = aiColor === 'w' ? 'b' : 'w';
        if (cap) setCaptured(c => ({ ...c, [capKey]: [...c[capKey], cap] }));
        updateFromState(next);
      }
      setIsAiThinking(false);
    }, 400);
    return () => clearTimeout(aiTimerRef.current);
  }, [fen, mode, gameOver, difficulty, playerColor, updateFromState]);

  const captureNotation = (st, move) => {
    const t = move.enPassant ? st.board[move.from[0]][move.to[1]] : st.board[move.to[0]][move.to[1]];
    return t ? PIECES[t.color][t.type] : null;
  };

  const handleSquareClick = useCallback((r, c) => {
    if (gameOver) return;
    if (isAiThinking) return;
    const st = stateRef.current;
    if (selected) {
      const move = legalMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (move) {
        if (move.prom) {
          const promoPiece = window.prompt('Продвижение: q (ферзь), r (ладья), b (слон), n (конь)', 'q');
          const t = ['q', 'r', 'b', 'n'].includes(promoPiece) ? promoPiece : 'q';
          move.prom = t;
        }
        const next = applyMove(st, move);
        setHistory(h => [...h, { ...move, color: st.turn, fen: toFen(next) }]);
        const capturedPiece = move.enPassant ? st.board[move.from[0]][move.to[1]] : st.board[move.to[0]][move.to[1]];
        if (capturedPiece) {
          setCaptured(c => ({ ...c, [st.turn === 'w' ? 'b' : 'w']: [...c[st.turn === 'w' ? 'b' : 'w'], PIECES[capturedPiece.color][capturedPiece.type]] }));
        }
        updateFromState(next);
        return;
      }
    }
    const piece = st.board[r][c];
    if (piece && piece.color === st.turn) {
      setSelected({ r, c });
      setLegalMoves(generateMoves(st, r, c));
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [selected, legalMoves, gameOver, isAiThinking, updateFromState]);

  const reset = useCallback(() => {
    aiThinkingRef.current = false;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    stateRef.current = parseFen(START_FEN);
    setHistory([]);
    setCaptured({ w: [], b: [] });
    setGameOver(null);
    setSelected(null);
    setLegalMoves([]);
    setIsAiThinking(false);
    setFen(START_FEN);
    setStatus('playing');
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    if (mode === 'ai' && history.length >= 2) {
      const targetHistory = history.length - 3 >= 0 ? history[history.length - 3].fen : START_FEN;
      setHistory(h => h.slice(0, -2));
      stateRef.current = parseFen(targetHistory);
      updateFromState(stateRef.current);
      setCaptured({ w: [], b: [] });
    } else if (mode === 'local') {
      const targetHistory = history.length - 2 >= 0 ? history[history.length - 2].fen : START_FEN;
      setHistory(h => h.slice(0, -1));
      stateRef.current = parseFen(targetHistory);
      updateFromState(stateRef.current);
      setCaptured({ w: [], b: [] });
    }
  }, [history, mode, updateFromState]);

  const st = stateRef.current;
  const board = st.board;
  const selectedSquare = selected ? `${selected.r},${selected.c}` : null;
  const legalTargets = legalMoves.map(m => `${m.to[0]},${m.to[1]}`);
  const lastMove = st.lastMove;
  const turnText = gameOver ? gameOver : isAiThinking ? 'Компьютер думает...' : status === 'check' ? `Шах! ${st.turn === 'w' ? 'Белые' : 'Чёрные'} под шахом` : `${st.turn === 'w' ? 'Белые' : 'Чёрные'} ходят`;

  const isWhiteBottom = playerColor === 'w';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-discord-mid rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl border border-discord-light/20 overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-600/20 via-green-500/20 to-teal-500/20 px-6 py-4 flex items-center justify-between border-b border-discord-light/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">♞</span>
            <div>
              <h2 className="text-lg font-bold text-discord-white">Шахматы</h2>
              <p className="text-xs text-discord-muted">Полная игра с правилами и ИИ</p>
            </div>
          </div>
          <button onClick={onClose} className="text-discord-gray hover:text-discord-accent transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => { setMode('ai'); reset(); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'ai' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20 border border-discord-light/20'}`}>
              <Bot size={16} /> Против ИИ
            </button>
            <button onClick={() => { setMode('local'); reset(); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${mode === 'local' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-discord-muted hover:text-discord-white hover:bg-discord-light/20 border border-discord-light/20'}`}>
              <User size={16} /> Два игрока
            </button>
          </div>

          {mode === 'ai' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                {[
                  { id: 'easy', label: 'Лёгкий' },
                  { id: 'medium', label: 'Средний' },
                  { id: 'hard', label: 'Сложный' },
                ].map(d => (
                  <button key={d.id} onClick={() => setDifficulty(d.id)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${difficulty === d.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-discord-muted hover:text-discord-white border border-discord-light/20'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setPlayerColor('w'); reset(); }}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${playerColor === 'w' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'text-discord-muted hover:text-discord-white border border-discord-light/20'}`}>
                  ♔ Играть за белых
                </button>
                <button onClick={() => { setPlayerColor('b'); reset(); }}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${playerColor === 'b' ? 'bg-gray-500/20 text-gray-200 border border-gray-500/40' : 'text-discord-muted hover:text-discord-white border border-discord-light/20'}`}>
                  ♚ Играть за чёрных
                </button>
              </div>
            </div>
          )}

          <div className={`text-center py-2 rounded-xl text-sm font-medium border ${
            gameOver ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : status === 'check' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-discord-dark/50 text-discord-white border-discord-light/20'
          }`}>{turnText}</div>

          <div className="flex justify-center">
            <div className="w-[340px] sm:w-[380px] select-none">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(rowIdx => {
                const r = isWhiteBottom ? 7 - rowIdx : rowIdx;
                return (
                  <div key={rowIdx} className="flex">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map(c => {
                      const piece = board[r][c];
                      const isLight = (r + c) % 2 === 0;
                      const isSelected = selectedSquare === `${r},${c}`;
                      const isLegal = legalTargets.includes(`${r},${c}`);
                      const isCapture = isLegal && piece;
                      const isLast = lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c));
                      return (
                        <button key={c} onClick={() => handleSquareClick(r, c)}
                          className={`relative w-[42.5px] h-[42.5px] sm:w-[47.5px] sm:h-[47.5px] flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-yellow-400/50' : isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                          }`}>
                          {isLast && !isSelected && <div className="absolute inset-0 bg-yellow-400/30 pointer-events-none" />}
                          {isLegal && !isCapture && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-3 h-3 rounded-full bg-emerald-500/60" /></div>}
                          {isCapture && <div className="absolute inset-0 border-4 border-emerald-500/60 rounded-sm pointer-events-none" />}
                          {piece && (
                            <span className={`text-[34px] sm:text-[38px] leading-none ${piece.color === 'w' ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]' : 'text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.2)]'}`}>
                              {PIECES[piece.color][piece.type]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-1.5 bg-discord-dark/50 rounded-lg px-3 py-1.5 border border-discord-light/20">
              <span className="text-[10px] text-discord-muted uppercase">Съедено</span>
              <span className="text-xs text-white">{captured.b.join(' ') || '—'}</span>
              <span className="text-[10px] text-discord-muted mx-1">|</span>
              <span className="text-xs text-black">{captured.w.join(' ') || '—'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={undo} disabled={history.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-discord-gray hover:text-discord-white hover:bg-discord-light/20 border border-discord-light/20 transition-all disabled:opacity-40">
                <Undo2 size={14} /> Отмена
              </button>
              <button onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-discord-gray hover:text-discord-white hover:bg-discord-light/20 border border-discord-light/20 transition-all">
                <RotateCcw size={14} /> Новая игра
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
