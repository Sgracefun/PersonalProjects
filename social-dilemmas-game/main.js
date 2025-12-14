// ---------- Types / constants ----------
const Move = Object.freeze({ C: "C", D: "D" });

// Payoff matrices (You, Opponent)
// Format: matrix[yourMove][oppMove] = [youPayoff, oppPayoff]
const MATRICES = {
  PD: {
    name: "Prisoner’s Dilemma",
    matrix: {
      C: { C: [3, 3], D: [1, 4] },
      D: { C: [4, 1], D: [2, 2] }
    }
  },
  ASSURANCE: {
    name: "Assurance (Valentine's Day)",
    matrix: {
      C: { C: [4, 4], D: [1, 3] },
      D: { C: [3, 1], D: [2, 2] }
    }
  },
  CHICKEN: {
    name: "Chicken",
    matrix: {
      C: { C: [3, 3], D: [2, 4] },
      D: { C: [4, 2], D: [1, 1] }
    }
  }
};

const PAYOFF_TERMS = {
  T: { label: "Temptation", desc: "You defect while the opponent cooperates." },
  R: { label: "Reward", desc: "Both players cooperate." },
  P: { label: "Punishment", desc: "Both players defect." },
  S: { label: "Sucker", desc: "You cooperate while the opponent defects." }
};

const TRPS_LEGEND_HTML = Object.entries(PAYOFF_TERMS)
  .map(([key, info]) => `${info.label} (${key}): ${info.desc}`)
  .join("<br>");

const FEAR_GREED_LEGEND_HTML = [
  "Fear: You’d rather defect if you expect the opponent to defect.",
  "Greed: You’re tempted to defect when you expect them to cooperate."
].join("<br>");

const ORDER_KEYS = ["T", "R", "P", "S"];
const PALETTES = [
  {
    id: "classicBlue",
    bg: "#f6f7fb",
    fg: "#111111",
    cardBg: "#ffffff",
    cardBorder: "#e6e6ee",
    name: "Classic blue"
  },
  {
    id: "nightOwl",
    bg: "#0d1b2a",
    fg: "#f2f5f9",
    cardBg: "#182c3f",
    cardBorder: "#1f364c",
    name: "Night owl"
  },
  {
    id: "mintFresh",
    bg: "#e8fff4",
    fg: "#084c2e",
    cardBg: "#ffffff",
    cardBorder: "#b7e3cf",
    name: "Mint fresh"
  },
  {
    id: "sunsetGlow",
    bg: "#fff1e6",
    fg: "#4a1d1f",
    cardBg: "#fff8f1",
    cardBorder: "#f0c7b1",
    name: "Sunset glow"
  },
  {
    id: "purpleHaze",
    bg: "#efe4ff",
    fg: "#2c0b4a",
    cardBg: "#f8f1ff",
    cardBorder: "#d7c1ff",
    name: "Purple haze"
  }
];
const PALETTE_COST = 50;

// ---------- Drawing (background ink) ----------
const INK_COST = 50;
const INK_COLORS = [
  { id: "black", name: "Black", color: "#000000", cost: 0 },
  { id: "red", name: "Red", color: "#ff0000", cost: INK_COST },
  { id: "orange", name: "Orange", color: "#ff7a00", cost: INK_COST },
  { id: "yellow", name: "Yellow", color: "#ffd400", cost: INK_COST },
  { id: "green", name: "Green", color: "#00b050", cost: INK_COST },
  { id: "blue", name: "Blue", color: "#1f6feb", cost: INK_COST },
  { id: "purple", name: "Purple", color: "#7a2cff", cost: INK_COST },
  { id: "pink", name: "Pink", color: "#ff4fa3", cost: INK_COST },
  { id: "brown", name: "Brown", color: "#7a4a21", cost: INK_COST },
  { id: "white", name: "White", color: "#ffffff", cost: INK_COST }
];

const unlockedInkColors = new Set(["black"]);
let activeInkId = "black";

let bgCanvas = null;
let bgCtx = null;
let isDrawing = false;
let lastPt = null;

function renderInkCard(ink) {
  const { id, name, color, cost } = ink;
  const unlocked = unlockedInkColors.has(id);

  const card = document.createElement("div");
  card.className = "palette-card";

  const preview = document.createElement("div");
  preview.className = "palette-preview";
  preview.style.background = color;
  preview.style.color = (id === "white" || id === "yellow") ? "#111" : "#fff";
  preview.textContent = name;

  const status = document.createElement("div");
  status.className = "cost";
  status.textContent = unlocked ? "Unlocked" : `Cost: ${cost} pts`;

  const btn = document.createElement("button");
  btn.textContent = unlocked ? (id === activeInkId ? "In use" : "Use ink") : "Unlock";
  if (id === activeInkId) btn.classList.add("secondary");
  btn.disabled = !unlocked && totalPoints < cost;

  btn.addEventListener("click", () => {
    if (unlockedInkColors.has(id)) {
      applyInk(id);
      return;
    }
    if (totalPoints < cost) return;
    unlockedInkColors.add(id);
    addPoints(-cost);
    applyInk(id);
  });

  card.appendChild(preview);
  card.appendChild(status);
  card.appendChild(btn);
  return card;
}

function prepareInkGrid() {
  const grid = $("drawColorGrid");
  if (!grid) return;
  grid.innerHTML = "";
  INK_COLORS.forEach(c => grid.appendChild(renderInkCard(c)));
}

function applyInk(id) {
  const ink = INK_COLORS.find(c => c.id === id);
  if (!ink) return;
  activeInkId = ink.id;

  const label = $("activeInkLabel");
  if (label) label.textContent = ink.name;

  const swatch = $("activeInkSwatch");
  if (swatch) swatch.style.background = ink.color;

  prepareInkGrid();
}

function initCanvas() {
  bgCanvas = $("bgCanvas");
  if (!bgCanvas) return;
  bgCtx = bgCanvas.getContext("2d");
  resizeCanvas();
  // Default: clear to transparent so page theme shows through
  if (bgCtx) {
    bgCtx.lineCap = "round";
    bgCtx.lineJoin = "round";
  }
}

function resizeCanvas() {
  if (!bgCanvas || !bgCtx) return;
  const dpr = window.devicePixelRatio || 1;
  bgCanvas.width = Math.floor(window.innerWidth * dpr);
  bgCanvas.height = Math.floor(window.innerHeight * dpr);
  bgCanvas.style.width = `${window.innerWidth}px`;
  bgCanvas.style.height = `${window.innerHeight}px`;
  bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function isInFunctionalBox(target) {
  if (!target) return false;
  return Boolean(
    target.closest(".card") ||
    target.closest(".modal") ||
    target.closest("button") ||
    target.closest("input") ||
    target.closest("select") ||
    target.closest("textarea") ||
    target.closest("a")
  );
}

function getPointFromEvent(e) {
  return { x: e.clientX, y: e.clientY };
}

function beginDrawing(e) {
  if (!bgCtx) return;
  if (isInFunctionalBox(e.target)) return;

  isDrawing = true;
  lastPt = getPointFromEvent(e);

  // Draw a dot to handle clicks without movement
  const ink = INK_COLORS.find(c => c.id === activeInkId) || INK_COLORS[0];
  bgCtx.strokeStyle = ink.color;
  bgCtx.lineWidth = 6;

  bgCtx.beginPath();
  bgCtx.moveTo(lastPt.x, lastPt.y);
  bgCtx.lineTo(lastPt.x + 0.01, lastPt.y + 0.01);
  bgCtx.stroke();
}

function moveDrawing(e) {
  if (!bgCtx || !isDrawing) return;

  // If they started drawing in background, keep drawing even if they pass near UI
  const pt = getPointFromEvent(e);
  const ink = INK_COLORS.find(c => c.id === activeInkId) || INK_COLORS[0];
  bgCtx.strokeStyle = ink.color;
  bgCtx.lineWidth = 6;

  bgCtx.beginPath();
  bgCtx.moveTo(lastPt.x, lastPt.y);
  bgCtx.lineTo(pt.x, pt.y);
  bgCtx.stroke();

  lastPt = pt;
}

function endDrawing() {
  isDrawing = false;
  lastPt = null;
}

function clearDrawing() {
  if (!bgCtx || !bgCanvas) return;
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
}

let draggedOrderEl = null;
let orderContainerInitialized = false;

function describeMotives(fear, greed) {
  if (fear && greed) return "both fear and greed";
  if (fear) return "fear only";
  if (greed) return "greed only";
  return "neither fear nor greed";
}

let totalPoints = 0;
const unlockedPalettes = new Set(["classicBlue"]);
let activePaletteId = "classicBlue";

// ---------- Palette helpers ----------
function renderPaletteCard(palette) {
  const { id, name, bg, fg } = palette;
  const unlocked = unlockedPalettes.has(id);
  const card = document.createElement("div");
  card.className = "palette-card";

  const preview = document.createElement("div");
  preview.className = "palette-preview";
  preview.style.background = bg;
  preview.style.color = fg;
  preview.textContent = name;

  const status = document.createElement("div");
  status.className = "cost";
  status.textContent = unlocked ? "Unlocked" : `Cost: ${PALETTE_COST} pts`;

  const btn = document.createElement("button");
  btn.textContent = unlocked ? (id === activePaletteId ? "In use" : "Use theme") : "Unlock";
  if (id === activePaletteId) btn.classList.add("secondary");
  btn.disabled = !unlocked && totalPoints < PALETTE_COST;

  btn.addEventListener("click", () => {
    if (unlockedPalettes.has(id)) {
      applyPalette(id);
      return;
    }
    if (totalPoints < PALETTE_COST) return;
    unlockedPalettes.add(id);
    addPoints(-PALETTE_COST);
    applyPalette(id);
  });

  card.appendChild(preview);
  card.appendChild(status);
  card.appendChild(btn);
  return card;
}

function preparePaletteGrid() {
  const grid = $("paletteGrid");
  if (!grid) return;
  grid.innerHTML = "";
  PALETTES.forEach(p => grid.appendChild(renderPaletteCard(p)));
}

function applyPalette(id) {
  const palette = PALETTES.find(p => p.id === id);
  if (!palette) return;
  activePaletteId = palette.id;
  const root = document.documentElement;
  root.style.setProperty("--app-bg", palette.bg);
  root.style.setProperty("--app-text", palette.fg);
  root.style.setProperty("--card-bg", palette.cardBg);
  root.style.setProperty("--card-border", palette.cardBorder);
  preparePaletteGrid();
}

// ---------- Helper builders ----------
function createOrderChip(key) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "order-chip";
  chip.draggable = true;
  chip.dataset.key = key;
  chip.textContent = `${PAYOFF_TERMS[key].label} (${key})`;
  chip.addEventListener("dragstart", handleOrderDragStart);
  chip.addEventListener("dragend", handleOrderDragEnd);
  return chip;
}

function ensureOrderContainer() {
  if (orderContainerInitialized) return;
  const list = $("orderList");
  if (!list) return;
  list.addEventListener("dragover", (e) => e.preventDefault());
  list.addEventListener("drop", handleOrderDrop);
  orderContainerInitialized = true;
}

function renderOrderList(order = ORDER_KEYS) {
  const list = $("orderList");
  if (!list) return;
  ensureOrderContainer();
  list.innerHTML = "";
  order.forEach(key => list.appendChild(createOrderChip(key)));
}

function getCurrentOrderGuess() {
  const list = $("orderList");
  if (!list) return [];
  return Array.from(list.children).map(el => el.dataset.key);
}

function handleOrderDragStart(e) {
  draggedOrderEl = e.currentTarget;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", e.currentTarget.dataset.key);
}

function handleOrderDragEnd() {
  draggedOrderEl = null;
}

function handleOrderDrop(e) {
  e.preventDefault();
  const list = e.currentTarget;
  if (!list || !draggedOrderEl) return;
  const targetChip = e.target.closest(".order-chip");
  if (!targetChip || targetChip === draggedOrderEl) {
    list.appendChild(draggedOrderEl);
    return;
  }
  const items = Array.from(list.children);
  const dragIdx = items.indexOf(draggedOrderEl);
  const dropIdx = items.indexOf(targetChip);
  if (dragIdx < dropIdx) list.insertBefore(draggedOrderEl, targetChip.nextSibling);
  else list.insertBefore(draggedOrderEl, targetChip);
}

function resetHardChallengeInputs() {
  renderOrderList();
  const fearCb = $("fearCheckbox");
  const greedCb = $("greedCheckbox");
  const hardSelect = $("hardGuessSelect");
  const hardFeedback = $("hardFeedback");
  if (fearCb) fearCb.checked = false;
  if (greedCb) greedCb.checked = false;
  if (hardSelect) hardSelect.selectedIndex = 0;
  if (hardFeedback) hardFeedback.innerHTML = "";
}

function resetOrderOnly() {
  renderOrderList();
}

// ---------- DOM helpers ----------
const $ = (id) => document.getElementById(id);

function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }

function updateGlobalPoints() {
  const el = $("globalPointsDisplay");
  if (el) el.textContent = `Total points: ${totalPoints}`;
}

function addPoints(amount) {
  if (!Number.isFinite(amount) || amount === 0) return;
  totalPoints = Math.max(0, totalPoints + amount);
  updateGlobalPoints();
  preparePaletteGrid();
  prepareInkGrid();
}

// ---------- Game state ----------
let scenarios = [];
let game = null;

function newGameState({ scenario, rounds, mode, aiStrategy, difficulty }) {
  return {
    scenario,
    dilemma: MATRICES[scenario.dilemmaType],
    roundsTotal: rounds,
    roundIndex: 0,

    mode, // "ai" | "human"
    aiStrategy, // string
    difficulty,  // "easy" | "medium" | "hard"
    challengeComplete: false,
    basePointsAwarded: false,
    humanTurn: 0, // 0 = player1 (you), 1 = player2 (opp) in human mode
    pendingHumanMoves: { you: null, opp: null }, // store for human mode

    lastMoves: { you: null, opp: null },
    score: { you: 0, opp: 0 },
    counts: { CC: 0, CD: 0, DC: 0, DD: 0 }
  };
}

function simpleMeaningText(dilemmaKey) {
  switch (dilemmaKey) {
    case "PD":
      return "You’re tempted to act in your own interest, even though if both people do that, everyone ends up worse off. Cooperation helps the group, but cheating can feel rewarding.";
    case "ASSURANCE":
      return "The best outcome happens when both people cooperate, but cooperating feels risky if you’re not sure the other person will do it too. This dilemma is about trust and coordination.";
    case "CHICKEN":
      return "Each person wants the other to back down. If neither backs down, the result is the worst for everyone. This dilemma is about toeing the line and avoiding a crash.";
    default:
      return "";
  }
}

function revealFullExplanation(state) {
  const ex = dilemmaExplanation(state);
  $("dilemmaExplain").textContent = ex.core;
  $("trpsLegend").innerHTML = TRPS_LEGEND_HTML;
  $("fearGreedLegend").innerHTML = FEAR_GREED_LEGEND_HTML;
  $("fearGreedLine").textContent = ex.fg;
}

// ---------- Load scenarios ----------
async function loadScenarios() {
  const res = await fetch("./scenarios.json");
  scenarios = await res.json();

  const sel = $("scenarioSelect");
  for (const s of scenarios) {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.title} (${MATRICES[s.dilemmaType].name})`;
    sel.appendChild(opt);
  }
}

function populateGuessSelects() {
  const ids = ["guessSelect", "hardGuessSelect"];
  const entries = Object.entries(MATRICES);
  for (const id of ids) {
    const sel = $(id);
    if (!sel) continue;
    sel.innerHTML = "";
    for (const [key, info] of entries) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = info.name;
      sel.appendChild(opt);
    }
  }
}

// ---------- Pick scenario ----------
function pickScenario() {
  const choice = $("scenarioSelect").value;
  if (choice === "random") {
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }
  return scenarios.find(s => s.id === choice) ?? scenarios[0];
}

// ---------- AI strategies ----------
function aiMove(strategy, state) {
  const lastYou = state.lastMoves.you;
  const lastOpp = state.lastMoves.opp;

  switch (strategy) {
    case "alwaysC": return Move.C;
    case "alwaysD": return Move.D;
    case "titfortat":
      // Start cooperate; then copy your last move
      if (!lastYou) return Move.C;
      return lastYou;
    case "random":
    default:
      return Math.random() < 0.5 ? Move.C : Move.D;
  }
}

// ---------- Payoff / bookkeeping ----------
function payoffFor(state, youMove, oppMove) {
  return state.dilemma.matrix[youMove][oppMove]; // [you, opp]
}

function updateCounts(state, youMove, oppMove) {
  if (youMove === "C" && oppMove === "C") state.counts.CC++;
  else if (youMove === "C" && oppMove === "D") state.counts.CD++;
  else if (youMove === "D" && oppMove === "C") state.counts.DC++;
  else state.counts.DD++;
}

function moveLabel(state, who, move) {
  const labels = state.scenario.actionLabels ?? { C: "Cooperate", D: "Defect" };
  return move === "C" ? labels.C : labels.D;
}

// ---------- T/R/P/S extraction ----------
function extractTRPS(matrix) {
  // T: you defect, other cooperates => D/C (you get T)
  // R: both cooperate => C/C
  // P: both defect => D/D
  // S: you cooperate, other defects => C/D
  const T = matrix.D.C[0];
  const R = matrix.C.C[0];
  const P = matrix.D.D[0];
  const S = matrix.C.D[0];
  return { T, R, P, S };
}

function dilemmaExplanation(state) {
  const { T, R, P, S } = extractTRPS(state.dilemma.matrix);

  // Determine inequality pattern (basic readable)
  const vals = [{ k: "T", v: T }, { k: "R", v: R }, { k: "P", v: P }, { k: "S", v: S }]
    .sort((a, b) => b.v - a.v);

  const orderKeys = vals.map(x => x.k);
  const order = orderKeys.join(" > ");
  const orderWords = orderKeys.map(x => PAYOFF_TERMS[x].label).join(" > ");

  const fear = P > S;   // "If they defect, I’d rather defect too"
  const greed = T > R;  // "If they cooperate, I’m tempted to defect"

  let core = `This is ${state.dilemma.name}. The payoff ordering here is ${orderWords}. `;
  let fg = `Fear: ${fear ? "present" : "not central"} (P ${fear ? ">" : "≤"} S). ` +
           `Greed: ${greed ? "present" : "not central"} (T ${greed ? ">" : "≤"} R).`;

  return { T, R, P, S, order, orderWords, orderKeys, fear, greed, core, fg };
}

// ---------- UI rendering ----------
function renderScenario(state) {
  $("scenarioTitle").textContent = state.scenario.title;
  $("scenarioStory").textContent = state.scenario.story;

  const actions = state.scenario.actionLabels ?? { C: "Cooperate", D: "Defect" };

  if (state.difficulty !== "easy") {
    $("scenarioMeta").textContent =
      `Mystery mode • Actions: "${actions.C}" vs "${actions.D}" • You: ${state.scenario.youLabel ?? "You"} vs Opponent: ${state.scenario.oppLabel ?? "Opponent"}`;
  } else {
    const m = MATRICES[state.scenario.dilemmaType].name;
    $("scenarioMeta").textContent =
      `Dilemma: ${m} • Actions: "${actions.C}" vs "${actions.D}" • You: ${state.scenario.youLabel ?? "You"} vs Opponent: ${state.scenario.oppLabel ?? "Opponent"}`;
  }

  $("coopBtn").textContent = actions.C;
  $("defectBtn").textContent = actions.D;
}

function renderRound(state) {
  $("roundNum").textContent = String(state.roundIndex + 1);
  $("roundTotal").textContent = String(state.roundsTotal);

  $("scoreYou").textContent = String(state.score.you);
  $("scoreOpp").textContent = String(state.score.opp);

  $("yourLast").textContent = state.lastMoves.you ? moveLabel(state, "you", state.lastMoves.you) : "—";
  $("oppLast").textContent = state.lastMoves.opp ? moveLabel(state, "opp", state.lastMoves.opp) : "—";
}

function setLastPayoffText(text) {
  $("lastPayoff").textContent = text;
}

// ---------- Human mode: two players on one laptop ----------
function handleHumanMove(state, move) {
  // Turn-based entry: first "You", then "Opponent"
  if (state.humanTurn === 0) {
    state.pendingHumanMoves.you = move;
    state.humanTurn = 1;
    setLastPayoffText(`Player 1 locked in. Now Player 2 choose (no peeking).`);
    return;
  }
  state.pendingHumanMoves.opp = move;

  const youMove = state.pendingHumanMoves.you;
  const oppMove = state.pendingHumanMoves.opp;

  state.pendingHumanMoves = { you: null, opp: null };
  state.humanTurn = 0;

  resolveRound(state, youMove, oppMove);
}

// ---------- Resolve one round ----------
function resolveRound(state, youMove, oppMove) {
  const [py, po] = payoffFor(state, youMove, oppMove);

  state.score.you += py;
  state.score.opp += po;

  state.lastMoves.you = youMove;
  state.lastMoves.opp = oppMove;

  updateCounts(state, youMove, oppMove);

  const yLab = moveLabel(state, "you", youMove);
  const oLab = moveLabel(state, "opp", oppMove);
  setLastPayoffText(`${yLab} vs ${oLab} → (+${py}, +${po})`);
state.roundIndex++;
  renderRound(state);

  if (state.roundIndex >= state.roundsTotal) {
    endGame(state);
  }
}

// ---------- Start / end ----------
function startGame() {
  const rounds = Math.max(1, Math.min(50, Number($("roundsInput").value) || 10));
  const mode = $("modeSelect").value;
  const aiStrategy = $("aiSelect").value;
  const difficulty = $("difficultySelect").value;

  const scenario = pickScenario();

  game = newGameState({ scenario, rounds, mode, aiStrategy, difficulty });

  hide("setupCard");
  hide("customizeCard");
  hide("resultsCard");
  show("gameCard");

  renderScenario(game);
  renderRound(game);

  setLastPayoffText(mode === "human"
    ? `Human mode: Player 1 goes first.`
    : `AI mode: Make your first move.`);
}

function endGame(state) {
  hide("gameCard");
  show("resultsCard");

  $("finalYou").textContent = String(state.score.you);
  $("finalOpp").textContent = String(state.score.opp);

  $("ccCount").textContent = String(state.counts.CC);
  $("cdCount").textContent = String(state.counts.CD);
  $("dcCount").textContent = String(state.counts.DC);
  $("ddCount").textContent = String(state.counts.DD);

  let winner;
  if (state.score.you > state.score.opp) winner = "You win!";
  else if (state.score.you < state.score.opp) winner = "Opponent wins!";
  else winner = "It’s a tie!";

  $("winnerLine").textContent = `${winner} (You: ${state.score.you}, Opponent: ${state.score.opp})`;

  // Always set the simple meaning (but we may hide the rest until guess is submitted)
  $("simpleMeaning").textContent = simpleMeaningText(state.scenario.dilemmaType);

  if (!state.basePointsAwarded) {
    addPoints(state.score.you);
    state.basePointsAwarded = true;
  }

  hide("guessBox");
  hide("hardBox");

  if (state.difficulty === "easy") {
    revealFullExplanation(state);
    state.challengeComplete = true;
  } else if (state.difficulty === "medium") {
    show("guessBox");
    $("guessFeedback").textContent = "";
    $("dilemmaExplain").textContent = "Submit your guess to reveal the explanation.";
    $("trpsLegend").innerHTML = "";
    $("fearGreedLegend").innerHTML = "";
    $("fearGreedLine").textContent = "";
    state.challengeComplete = false;
  } else {
    show("hardBox");
    $("dilemmaExplain").textContent = "Complete the steps below to reveal the explanation.";
    $("trpsLegend").innerHTML = "";
    $("fearGreedLegend").innerHTML = "";
    $("fearGreedLine").textContent = "";
    resetHardChallengeInputs();
    state.challengeComplete = false;
  }
}

// ---------- Event wiring ----------
function onMove(move) {
  if (!game) return;

  // If game already ended, ignore
  if (game.roundIndex >= game.roundsTotal) return;

  if (game.mode === "ai") {
    const oppMove = aiMove(game.aiStrategy, game);
    resolveRound(game, move, oppMove);
  } else {
    handleHumanMove(game, move);
  }
}

function resetToSetup() {
  game = null;
  hide("gameCard");
  hide("resultsCard");
  hide("guessBox");
  hide("hardBox");
  show("customizeCard");
  show("setupCard");
  setLastPayoffText("—");
  resetHardChallengeInputs();
}

function handleHardSubmit() {
  if (!game) return;
  if (game.difficulty !== "hard") return;
  if (game.challengeComplete) return;

  const ex = dilemmaExplanation(game);
  const orderGuess = getCurrentOrderGuess();
  const orderCorrect = orderGuess.length === ex.orderKeys.length &&
    orderGuess.every((key, idx) => key === ex.orderKeys[idx]);

  const fearSelected = $("fearCheckbox").checked;
  const greedSelected = $("greedCheckbox").checked;
  const fearCorrect = fearSelected === ex.fear;
  const greedCorrect = greedSelected === ex.greed;
  const motivesCorrect = fearCorrect && greedCorrect;

  const guess = $("hardGuessSelect").value;
  const guessCorrect = guess === game.scenario.dilemmaType;

  const lines = [];
  lines.push(orderCorrect
    ? "✅ Payoff order correct."
    : `❌ Payoff order mismatch. Correct order: ${ex.orderWords}.`);

  const userMotives = describeMotives(fearSelected, greedSelected);
  const correctMotives = describeMotives(ex.fear, ex.greed);
  lines.push(motivesCorrect
    ? "✅ Motives correct."
    : `❌ Motives: You chose ${userMotives}, but correct was ${correctMotives}.`);

  const userGuessName = MATRICES[guess]?.name ?? guess;
  const correctName = MATRICES[game.scenario.dilemmaType].name;
  lines.push(guessCorrect
    ? `✅ Dilemma guess correct (${correctName}).`
    : `❌ Dilemma guess: You chose ${userGuessName}; correct was ${correctName}.`);

  const bonusPoints =
    (orderCorrect ? 4 : 0) +
    (motivesCorrect ? 2 : 0) +
    (guessCorrect ? 2 : 0);

  if (bonusPoints > 0) addPoints(bonusPoints);

  $("hardFeedback").innerHTML = lines.join("<br>");
  revealFullExplanation(game);
  game.challengeComplete = true;
}

// ---------- Init ----------
function updateAiRow() {
  const mode = $("modeSelect").value;
  if (mode === "ai") $("aiRow").classList.remove("hidden");
  else $("aiRow").classList.add("hidden");
}

window.addEventListener("DOMContentLoaded", async () => {
  initCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Background drawing listeners (pointer works for mouse + touch)
  window.addEventListener("pointerdown", beginDrawing);
  window.addEventListener("pointermove", moveDrawing);
  window.addEventListener("pointerup", endDrawing);
  window.addEventListener("pointercancel", endDrawing);


  updateAiRow();
  $("modeSelect").addEventListener("change", updateAiRow);

  $("startBtn").addEventListener("click", startGame);
  $("coopBtn").addEventListener("click", () => onMove(Move.C));
  $("defectBtn").addEventListener("click", () => onMove(Move.D));
  $("quitBtn").addEventListener("click", resetToSetup);
  $("playAgainBtn").addEventListener("click", resetToSetup);

  $("submitGuessBtn").addEventListener("click", () => {
    if (!game) return;
    if (game.difficulty !== "medium") return;
    if (game.challengeComplete) return;

    const guess = $("guessSelect").value;
    const correct = guess === game.scenario.dilemmaType;

    $("guessFeedback").textContent = correct
      ? "✅ Correct! Here’s what that dilemma means and how the payoffs work."
      : `❌ Not quite. The correct answer was: ${MATRICES[game.scenario.dilemmaType].name}. Here’s why.`;

    if (correct) addPoints(2);
    revealFullExplanation(game);
    game.challengeComplete = true;
  });

  $("resetOrderBtn").addEventListener("click", resetOrderOnly);
  $("submitHardBtn").addEventListener("click", handleHardSubmit);

  $("styleInfoBtn").addEventListener("click", () => {
    show("styleInfoModal");
  });
  $("closeStyleInfo").addEventListener("click", () => {
    hide("styleInfoModal");
  });

  $("clearDrawingBtn").addEventListener("click", clearDrawing);

  populateGuessSelects();
  resetHardChallengeInputs();
  updateGlobalPoints();
  prepareInkGrid();
  applyInk(activeInkId);
  await loadScenarios();
  applyPalette(activePaletteId);
});