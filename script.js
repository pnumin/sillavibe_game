const BOARD_SIZE = 8;
const POINTS_PER_GEM = 15;

const GEM_TYPES = [
  { id: "ruby", label: "빨간 루비", x: 0, y: 0 },
  { id: "diamond", label: "하늘빛 다이아", x: 25, y: 0 },
  { id: "amethyst", label: "보라빛 아메지스트", x: 50, y: 0 },
  { id: "emerald", label: "에메랄드", x: 75, y: 0 },
  { id: "topaz", label: "황금빛 토파즈", x: 0, y: 25 },
  { id: "sapphire", label: "파란 사파이어", x: 25, y: 25 },
  { id: "rose", label: "분홍 보석", x: 50, y: 25 },
  { id: "citrine", label: "주황빛 시트린", x: 75, y: 25 }
];

const boardEl = document.getElementById("board");
const statusMessage = document.getElementById("statusMessage");
const scoreValue = document.getElementById("scoreValue");
const movesValue = document.getElementById("movesValue");
const resetButton = document.getElementById("resetButton");

let board = [];
let gemElements = [];
let selectedCell = null;
let isProcessing = false;
let score = 0;
let moves = 0;

function startGame() {
  score = 0;
  moves = 0;
  board = createInitialBoard();
  renderBoard();
  updateScore();
  updateMoves();
  statusMessage.textContent = "인접한 보석을 교환해서 3개 이상 매치해 보세요!";
  clearSelection();
  setProcessing(false);
}

function createInitialBoard() {
  const newBoard = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      let typeIndex;
      do {
        typeIndex = randomGem();
      } while (createsMatch(newBoard, row, col, typeIndex));
      newBoard[row][col] = typeIndex;
    }
  }

  return newBoard;
}

function renderBoard() {
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--board-size", BOARD_SIZE);
  gemElements = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE));

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const gemEl = document.createElement("div");
      gemEl.classList.add("gem");
      gemEl.dataset.row = String(row);
      gemEl.dataset.col = String(col);
      gemEl.setAttribute("role", "gridcell");
      gemEl.addEventListener("click", handleGemClick);
      boardEl.appendChild(gemEl);

      gemElements[row][col] = gemEl;
      paintGem(row, col, board[row][col]);
    }
  }
}

function handleGemClick(event) {
  if (isProcessing) return;

  const target = event.currentTarget;
  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);

  if (!selectedCell) {
    selectedCell = { row, col };
    gemElements[row][col].classList.add("selected");
    statusMessage.textContent = "교환할 다른 보석을 선택하세요.";
    return;
  }

  const isSameCell = selectedCell.row === row && selectedCell.col === col;
  if (isSameCell) {
    clearSelection();
    statusMessage.textContent = "선택을 취소했습니다.";
    return;
  }

  if (!areAdjacent(selectedCell, { row, col })) {
    gemElements[selectedCell.row][selectedCell.col].classList.remove("selected");
    selectedCell = { row, col };
    gemElements[row][col].classList.add("selected");
    statusMessage.textContent = "인접한 보석끼리만 교환할 수 있어요.";
    return;
  }

  attemptSwap(selectedCell, { row, col });
}

function attemptSwap(first, second) {
  setProcessing(true);
  const { row: r1, col: c1 } = first;
  const { row: r2, col: c2 } = second;

  const type1 = board[r1][c1];
  const type2 = board[r2][c2];

  board[r1][c1] = type2;
  board[r2][c2] = type1;

  paintGem(r1, c1, type2);
  paintGem(r2, c2, type1);

  const matches = findMatches();
  if (matches.size > 0) {
    moves += 1;
    updateMoves();
    statusMessage.textContent = matches.size >= 4 ? "대박! 4개 이상 연결했어요!" : "좋아요!";
    clearSelection();
    resolveMatches(matches);
  } else {
    setTimeout(() => {
      board[r1][c1] = type1;
      board[r2][c2] = type2;
      paintGem(r1, c1, type1);
      paintGem(r2, c2, type2);
      statusMessage.textContent = "매치가 없어요. 다른 조합을 시도해 보세요!";
      clearSelection();
      setProcessing(false);
    }, 180);
  }
}

function resolveMatches(matches) {
  const matchedCount = matches.size;
  if (matchedCount === 0) {
    setProcessing(false);
    return;
  }

  matches.forEach((key) => {
    const [row, col] = key.split(",").map(Number);
    const gemEl = gemElements[row][col];
    gemEl.classList.add("matched");
  });

  score += matchedCount * POINTS_PER_GEM;
  updateScore();

  setTimeout(() => {
    matches.forEach((key) => {
      const [row, col] = key.split(",").map(Number);
      board[row][col] = null;
      const gemEl = gemElements[row][col];
      gemEl.classList.remove("matched");
      paintGem(row, col, null);
    });

    collapseBoard();
  }, 320);
}

function collapseBoard() {
  for (let col = 0; col < BOARD_SIZE; col++) {
    const existing = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      if (board[row][col] != null) existing.push(board[row][col]);
    }

    const empties = BOARD_SIZE - existing.length;
    const newColumn = new Array(BOARD_SIZE);

    for (let row = 0; row < empties; row++) {
      let typeIndex;
      do {
        typeIndex = randomGem();
      } while (wouldCauseMatch(row, col, typeIndex, newColumn));
      newColumn[row] = typeIndex;
    }

    for (let i = 0; i < existing.length; i++) {
      newColumn[empties + i] = existing[i];
    }

    for (let row = 0; row < BOARD_SIZE; row++) {
      board[row][col] = newColumn[row];
      paintGem(row, col, newColumn[row], { spawn: row < empties });
    }
  }

  setTimeout(() => {
    const nextMatches = findMatches();
    if (nextMatches.size > 0) {
      statusMessage.textContent = "연쇄 반응!";
      resolveMatches(nextMatches);
    } else {
      setProcessing(false);
      statusMessage.textContent = "다른 보석을 노려보세요.";
    }
  }, 260);
}

function findMatches() {
  const baseMatches = new Set();

  for (let row = 0; row < BOARD_SIZE; row++) {
    let streak = 1;
    for (let col = 1; col < BOARD_SIZE; col++) {
      const current = board[row][col];
      const previous = board[row][col - 1];

      if (current != null && current === previous) {
        streak += 1;
      } else {
        if (streak >= 3 && previous != null) {
          for (let k = 0; k < streak; k++) {
            baseMatches.add(`${row},${col - 1 - k}`);
          }
        }
        streak = 1;
      }
    }

    if (streak >= 3 && board[row][BOARD_SIZE - 1] != null) {
      for (let k = 0; k < streak; k++) {
        baseMatches.add(`${row},${BOARD_SIZE - 1 - k}`);
      }
    }
  }

  for (let col = 0; col < BOARD_SIZE; col++) {
    let streak = 1;
    for (let row = 1; row < BOARD_SIZE; row++) {
      const current = board[row][col];
      const previous = board[row - 1][col];

      if (current != null && current === previous) {
        streak += 1;
      } else {
        if (streak >= 3 && previous != null) {
          for (let k = 0; k < streak; k++) {
            baseMatches.add(`${row - 1 - k},${col}`);
          }
        }
        streak = 1;
      }
    }

    if (streak >= 3 && board[BOARD_SIZE - 1][col] != null) {
      for (let k = 0; k < streak; k++) {
        baseMatches.add(`${BOARD_SIZE - 1 - k},${col}`);
      }
    }
  }

  if (baseMatches.size === 0) {
    return baseMatches;
  }

  const matches = new Set(baseMatches);
  const clusterVisited = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(false));

  baseMatches.forEach((key) => {
    const [startRow, startCol] = key.split(",").map(Number);
    if (clusterVisited[startRow][startCol]) return;

    const type = board[startRow][startCol];
    if (type == null) return;

    const stack = [[startRow, startCol]];
    const cluster = [];
    clusterVisited[startRow][startCol] = true;

    while (stack.length > 0) {
      const [row, col] = stack.pop();
      cluster.push([row, col]);

      const neighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1]
      ];

      for (const [nextRow, nextCol] of neighbors) {
        if (
          nextRow >= 0 &&
          nextRow < BOARD_SIZE &&
          nextCol >= 0 &&
          nextCol < BOARD_SIZE &&
          !clusterVisited[nextRow][nextCol] &&
          board[nextRow][nextCol] === type
        ) {
          clusterVisited[nextRow][nextCol] = true;
          stack.push([nextRow, nextCol]);
        }
      }
    }

    if (cluster.length >= 4) {
      cluster.forEach(([row, col]) => {
        matches.add(`${row},${col}`);
      });
    }
  });

  return matches;
}





function areAdjacent(first, second) {
  const distance = Math.abs(first.row - second.row) + Math.abs(first.col - second.col);
  return distance === 1;
}

function clearSelection() {
  if (!selectedCell) return;
  const { row, col } = selectedCell;
  const gemEl = gemElements[row][col];
  if (gemEl) {
    gemEl.classList.remove("selected");
  }
  selectedCell = null;
}

function paintGem(row, col, typeIndex, options = {}) {
  const gemEl = gemElements[row][col];
  if (!gemEl) return;

  gemEl.classList.remove("matched");
  gemEl.classList.remove("spawn");

  if (typeIndex == null) {
    gemEl.classList.add("empty");
    gemEl.removeAttribute("data-type");
    gemEl.removeAttribute("aria-label");
    return;
  }

  const type = GEM_TYPES[typeIndex];
  gemEl.classList.remove("empty");
  gemEl.dataset.type = type.id;
  gemEl.style.backgroundPosition = `${type.x}% ${type.y}%`;
  gemEl.setAttribute("aria-label", `${type.label} (행 ${row + 1}, 열 ${col + 1})`);

  if (options.spawn) {
    gemEl.classList.add("spawn");
    setTimeout(() => gemEl.classList.remove("spawn"), 320);
  }
}

function randomGem() {
  return Math.floor(Math.random() * GEM_TYPES.length);
}

function createsMatch(boardState, row, col, typeIndex) {
  return (
    makesHorizontalMatch(boardState, row, col, typeIndex) ||
    makesVerticalMatch(boardState, row, col, typeIndex)
  );
}

function makesHorizontalMatch(boardState, row, col, typeIndex) {
  const left1 = col > 0 ? boardState[row][col - 1] : null;
  const left2 = col > 1 ? boardState[row][col - 2] : null;
  return left1 === typeIndex && left2 === typeIndex;
}

function makesVerticalMatch(boardState, row, col, typeIndex) {
  const up1 = row > 0 ? boardState[row - 1][col] : null;
  const up2 = row > 1 ? boardState[row - 2][col] : null;
  return up1 === typeIndex && up2 === typeIndex;
}

function wouldCauseMatch(row, col, typeIndex, columnDraft) {
  const left1 = col > 0 ? board[row][col - 1] : null;
  const left2 = col > 1 ? board[row][col - 2] : null;
  if (left1 === typeIndex && left2 === typeIndex) return true;

  const up1 = row > 0 ? columnDraft[row - 1] : null;
  const up2 = row > 1 ? columnDraft[row - 2] : null;
  return up1 === typeIndex && up2 === typeIndex;
}

function updateScore() {
  scoreValue.textContent = score.toString();
}

function updateMoves() {
  movesValue.textContent = moves.toString();
}

function setProcessing(state) {
  isProcessing = state;
  boardEl.classList.toggle("locked", state);
}

resetButton.addEventListener("click", startGame);

startGame();
