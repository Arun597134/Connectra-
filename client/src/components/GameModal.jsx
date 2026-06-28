import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Award, LogOut, Loader2 } from 'lucide-react';

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

const checkConnectFourWin = (grid) => {
  const ROWS = 6;
  const COLS = 7;
  const getIndex = (r, c) => r * COLS + c;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const val = grid[getIndex(r, c)];
      if (val &&
          val === grid[getIndex(r, c + 1)] &&
          val === grid[getIndex(r, c + 2)] &&
          val === grid[getIndex(r, c + 3)]) {
        return val;
      }
    }
  }

  // Vertical
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      const val = grid[getIndex(r, c)];
      if (val &&
          val === grid[getIndex(r + 1, c)] &&
          val === grid[getIndex(r + 2, c)] &&
          val === grid[getIndex(r + 3, c)]) {
        return val;
      }
    }
  }

  // Diagonal Down-Right
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const val = grid[getIndex(r, c)];
      if (val &&
          val === grid[getIndex(r + 1, c + 1)] &&
          val === grid[getIndex(r + 2, c + 2)] &&
          val === grid[getIndex(r + 3, c + 3)]) {
        return val;
      }
    }
  }

  // Diagonal Up-Right
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const val = grid[getIndex(r, c)];
      if (val &&
          val === grid[getIndex(r - 1, c + 1)] &&
          val === grid[getIndex(r - 2, c + 2)] &&
          val === grid[getIndex(r - 3, c + 3)]) {
        return val;
      }
    }
  }

  return null;
};

export default function GameModal({ socket, contact, userId, gameType = 'tic-tac-toe', onClose }) {
  const isTicTacToe = gameType === 'tic-tac-toe';
  const boardSize = isTicTacToe ? 9 : 42;

  const [board, setBoard] = useState(Array(boardSize).fill(null));
  const mySymbol = userId < contact.id ? 'X' : 'O';
  const [isMyTurn, setIsMyTurn] = useState(mySymbol === 'X');
  const [gameState, setGameState] = useState('waiting');
  const [scores, setScores] = useState({ mine: 0, peer: 0 });

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Sync board size if gameType changes (or when mounting)
  useEffect(() => {
    setBoard(Array(boardSize).fill(null));
  }, [gameType, boardSize]);

  // Check game result whenever board changes
  useEffect(() => {
    if (gameState !== 'active') return;

    if (isTicTacToe) {
      for (let combo of WINNING_COMBOS) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          if (board[a] === mySymbol) {
            setGameState('won');
            setScores(prev => ({ ...prev, mine: prev.mine + 1 }));
          } else {
            setGameState('lost');
            setScores(prev => ({ ...prev, peer: prev.peer + 1 }));
          }
          return;
        }
      }
    } else {
      // Connect Four
      const winner = checkConnectFourWin(board);
      if (winner) {
        if (winner === mySymbol) {
          setGameState('won');
          setScores(prev => ({ ...prev, mine: prev.mine + 1 }));
        } else {
          setGameState('lost');
          setScores(prev => ({ ...prev, peer: prev.peer + 1 }));
        }
        return;
      }
    }

    if (board.every(cell => cell !== null)) {
      setGameState('draw');
    }
  }, [board, mySymbol, gameState, isTicTacToe]);

  useEffect(() => {
    // Notify peer we have entered the game modal
    socket?.emit('game_response', { receiverId: contact.id, accept: true, gameType });

    const onGameResponse = (data) => {
      if (data.senderId === contact.id && data.accept) {
        if (gameStateRef.current === 'waiting') {
          setGameState('active');
          // Respond back as a handshake to activate the peer
          socket?.emit('game_response', { receiverId: contact.id, accept: true, gameType });
        }
      }
    };

    const onGameMove = (data) => {
      if (data.senderId === contact.id) {
        const peerSymbol = mySymbol === 'X' ? 'O' : 'X';
        setBoard(prev => {
          const next = [...prev];
          next[data.index] = peerSymbol;
          return next;
        });
        setIsMyTurn(true);
      }
    };

    const onGameReset = (data) => {
      if (data.senderId === contact.id) {
        setBoard(Array(boardSize).fill(null));
        setGameState('active');
        setIsMyTurn(mySymbol === 'O'); // Alternate turns on reset
      }
    };

    const onGameQuit = (data) => {
      if (data.senderId === contact.id) {
        setGameState('quit');
      }
    };

    socket?.on('game_response', onGameResponse);
    socket?.on('game_move', onGameMove);
    socket?.on('game_reset', onGameReset);
    socket?.on('game_quit', onGameQuit);

    return () => {
      socket?.off('game_response', onGameResponse);
      socket?.off('game_move', onGameMove);
      socket?.off('game_reset', onGameReset);
      socket?.off('game_quit', onGameQuit);
    };
  }, [contact, socket, mySymbol, gameType, boardSize]);

  const handleCellClick = (index) => {
    if (gameState !== 'active' || !isMyTurn) return;

    if (isTicTacToe) {
      if (board[index]) return;
      const nextBoard = [...board];
      nextBoard[index] = mySymbol;
      setBoard(nextBoard);
      setIsMyTurn(false);
      socket?.emit('game_move', { receiverId: contact.id, index });
    } else {
      // Connect Four Column Drop
      const colIndex = index % 7;
      const ROWS = 6;
      const COLS = 7;
      let targetRow = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const targetIdx = r * COLS + colIndex;
        if (board[targetIdx] === null) {
          targetRow = r;
          break;
        }
      }

      if (targetRow === -1) return; // Column full

      const finalIdx = targetRow * COLS + colIndex;
      const nextBoard = [...board];
      nextBoard[finalIdx] = mySymbol;
      setBoard(nextBoard);
      setIsMyTurn(false);
      socket?.emit('game_move', { receiverId: contact.id, index: finalIdx });
    }
  };

  const handleReset = () => {
    setBoard(Array(boardSize).fill(null));
    setGameState('active');
    setIsMyTurn(mySymbol === 'O'); // Alternate turns on reset
    socket?.emit('game_reset', { receiverId: contact.id });
  };

  const handleQuit = () => {
    socket?.emit('game_quit', { receiverId: contact.id });
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 11000 }}>
      <div className="modal-content glass-card animate-zoom-in max-w-sm text-center" style={{ padding: '24px', minWidth: isTicTacToe ? 'auto' : '360px' }}>
        <button className="modal-close-btn" onClick={handleQuit}>
          <X size={18} />
        </button>

        <div className="modal-header-section">
          <h2>{isTicTacToe ? 'Tic-Tac-Toe' : 'Connect Four'}</h2>
          <p>Playing with @{contact.username}</p>
        </div>

        {/* Score Board */}
        <div style={{ display: 'flex', justifyContent: 'space-around', margin: '16px 0', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              You ({mySymbol === 'X' ? (isTicTacToe ? 'X' : 'Red🔴') : (isTicTacToe ? 'O' : 'Yellow🟡')})
            </span>
            <h3 style={{ margin: '4px 0 0 0', color: mySymbol === 'X' ? 'var(--primary-glow)' : 'var(--success)' }}>{scores.mine}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Award size={18} className="text-yellow-400" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              @{contact.username} ({mySymbol === 'X' ? (isTicTacToe ? 'O' : 'Red🔴') : (isTicTacToe ? 'X' : 'Yellow🟡')})
            </span>
            <h3 style={{ margin: '4px 0 0 0', color: mySymbol === 'X' ? 'var(--success)' : 'var(--primary-glow)' }}>{scores.peer}</h3>
          </div>
        </div>

        {/* Status Message */}
        <div style={{ margin: '12px 0', minHeight: '24px' }}>
          {gameState === 'waiting' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Waiting for @{contact.username} to enter...</span>
            </div>
          )}
          {gameState === 'declined' && (
            <span style={{ color: '#EF4444', fontWeight: 600 }}>@{contact.username} declined.</span>
          )}
          {gameState === 'quit' && (
            <span style={{ color: '#EF4444', fontWeight: 600 }}>@{contact.username} left the game.</span>
          )}
          {gameState === 'active' && (
            <span style={{ color: isMyTurn ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
              {isMyTurn ? "Your Turn!" : `Waiting for @${contact.username}...`}
            </span>
          )}
          {gameState === 'won' && <span style={{ color: 'var(--success)', fontWeight: 600 }}>You Won! 🎉</span>}
          {gameState === 'lost' && <span style={{ color: '#EF4444', fontWeight: 600 }}>You Lost! 😢</span>}
          {gameState === 'draw' && <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>It's a Draw! 🤝</span>}
        </div>

        {/* Game Board */}
        {(gameState === 'active' || gameState === 'won' || gameState === 'lost' || gameState === 'draw') && (
          isTicTacToe ? (
            <div className="game-board-container">
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={gameState !== 'active' || !isMyTurn || cell !== null}
                  className={`game-cell ${gameState === 'active' && isMyTurn && !cell ? 'my-turn-active' : ''} ${cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : ''}`}
                >
                  {cell}
                </button>
              ))}
            </div>
          ) : (
            <div className="connect-four-container">
              {board.map((cell, index) => {
                const colIdx = index % 7;
                const isColFull = board[colIdx] !== null;
                return (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    disabled={gameState !== 'active' || !isMyTurn || isColFull}
                    className={`connect-four-cell ${gameState === 'active' && isMyTurn && !isColFull ? 'my-turn-active' : ''} ${cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : ''}`}
                  />
                );
              })}
            </div>
          )
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          {(gameState === 'won' || gameState === 'lost' || gameState === 'draw') && (
            <button onClick={handleReset} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={14} />
              <span>Play Again</span>
            </button>
          )}
          <button onClick={handleQuit} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={14} />
            <span>Quit Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
