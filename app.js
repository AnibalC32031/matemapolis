// CONTROLADOR MATEMÁPOLIS CON RESPONSIVIDAD TOTAL MÓVIL Y ACCESO CONTROLADO

let mqttClient = null;
let peer = null;
let connMap = {};
let isHost = false;
let myPeerId = "";
let hostPeerId = "";
let myPlayerIdx = -1;

const MQTT_BROKER = "wss://broker.emqx.io:8084/mqtt";
const MQTT_DISCOVERY_TOPIC = "matemapolis/jujuy/discovery_v3";

// Parámetros de Duración y Turno
const TURN_DURATION_SEC = 20;
let turnTimerInterval = null;
let turnSecondsLeft = TURN_DURATION_SEC;

// Temporizador Global de Partida
let matchSecondsLeft = 0;
let totalMatchSeconds = 0;
let matchTimerInterval = null;

// Sonido nativo
let audioCtx = null;
let soundEnabled = true;

// Estado Sincronizado de la Partida
let gameState = {
  started: false,
  roomName: "",
  maxPlayers: 4,
  matchDurationMin: 10,
  players: [], // { id, name, icon, role, color, ca: 1500, pos: 0, props: [], failedCount: 0, laps: 0, emergencyUsed: false }
  turnIndex: 0,
  ownership: {},
  awaitingAction: false,
  gameOver: false,
  gameOverReason: ""
};

const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"];

document.addEventListener("DOMContentLoaded", () => {
  buildBoardUI();
  initAvatarSelection();
  initAudioSystem();
  initMobileDrawer();
  initMQTTDiscovery();
  initLobbyControls();
  initGameplayControls();
  initRulesModal();
});

// 1. SISTEMA DE AUDIO NATIVO
function initAudioSystem() {
  const toggleBtns = [document.getElementById("btn-sound-toggle"), document.getElementById("btn-sound-toggle-top")];
  toggleBtns.forEach(btn => {
    if (!btn) return;
    btn.onclick = () => {
      soundEnabled = !soundEnabled;
      toggleBtns.forEach(b => { if (b) b.innerText = soundEnabled ? "🔊" : "🔇"; });
    };
  });
}

function playTone(freq, type = "sine", duration = 0.15) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn(e);
  }
}

function playSound(name) {
  if (!soundEnabled) return;
  if (name === "roll") playTone(320, "triangle", 0.08);
  else if (name === "success") { playTone(523, "sine", 0.12); setTimeout(() => playTone(659, "sine", 0.2), 100); }
  else if (name === "error") { playTone(180, "sawtooth", 0.25); }
  else if (name === "cash") { playTone(880, "sine", 0.15); setTimeout(() => playTone(1046, "sine", 0.25), 80); }
  else if (name === "win") { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => playTone(f, "triangle", 0.3), i * 140)); }
}

// 2. CONTROL DEL CAJÓN DESPLEGABLE EN CELULARES
function initMobileDrawer() {
  const drawer = document.getElementById("game-sidebar");
  const openBtn = document.getElementById("btn-toggle-drawer");
  const closeBtn = document.getElementById("btn-close-drawer");

  if (openBtn) {
    openBtn.onclick = () => drawer.classList.add("open");
  }
  if (closeBtn) {
    closeBtn.onclick = () => drawer.classList.remove("open");
  }
}

// 3. SELECCIÓN DE FICHA
function initAvatarSelection() {
  const btns = document.querySelectorAll(".avatar-btn");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function getSelectedAvatar() {
  const active = document.querySelector(".avatar-btn.active") || document.querySelector(".avatar-btn");
  return { icon: active.dataset.icon, role: active.dataset.label };
}

// 4. MQTT DISCOVERY
function initMQTTDiscovery() {
  const scanLabel = document.getElementById("scan-indicator");
  mqttClient = mqtt.connect(MQTT_BROKER);

  mqttClient.on("connect", () => {
    scanLabel.innerText = "Buscando...";
    mqttClient.subscribe(MQTT_DISCOVERY_TOPIC);
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "ROOM_ANNOUNCEMENT" && !isHost && !gameState.started) {
        updateLobbyRoomItem(data);
      }
    } catch (e) {
      console.error(e);
    }
  });
}

function broadcastRoomAnnouncement() {
  if (!mqttClient || !mqttClient.connected || !isHost) return;
  mqttClient.publish(MQTT_DISCOVERY_TOPIC, JSON.stringify({
    type: "ROOM_ANNOUNCEMENT",
    roomTitle: gameState.roomName,
    hostPeerId: myPeerId,
    playerCount: gameState.players.length,
    maxPlayers: gameState.maxPlayers,
    durationMin: gameState.matchDurationMin,
    hasStarted: gameState.started,
    timestamp: Date.now()
  }));
}

function updateLobbyRoomItem(room) {
  const list = document.getElementById("rooms-list");
  const empty = list.querySelector(".empty-rooms");
  if (empty) empty.remove();

  let existing = document.getElementById(`room-${room.hostPeerId}`);
  if (room.hasStarted || room.playerCount >= room.maxPlayers) {
    if (existing) existing.remove();
    return;
  }

  if (!existing) {
    existing = document.createElement("div");
    existing.id = `room-${room.hostPeerId}`;
    existing.className = "room-item-row";
    list.appendChild(existing);
  }

  existing.innerHTML = `
    <div>
      <strong>Partida: ${room.roomTitle}</strong>
      <span class="room-badge badge-available">${room.playerCount}/${room.maxPlayers} Jug.</span>
      <span class="room-badge" style="background:#e0f2fe; color:#0369a1;">${room.durationMin > 0 ? room.durationMin + ' min' : 'Libre'}</span>
    </div>
    <button class="btn primary-btn small-btn" onclick="joinRoomDirectly('${room.hostPeerId}')">Unirme</button>
  `;
}

// 5. LOBBY Y SALAS
function initLobbyControls() {
  const btnCreate = document.getElementById("btn-create-game");
  const btnStart = document.getElementById("btn-start-match");

  btnCreate.addEventListener("click", () => {
    const pName = document.getElementById("player-name").value.trim() || "Anfitrión";
    const maxPlayers = parseInt(document.getElementById("match-max-players").value) || 4;
    const durationMin = parseInt(document.getElementById("match-duration-select").value) || 10;
    const av = getSelectedAvatar();
    isHost = true;

    gameState.maxPlayers = maxPlayers;
    gameState.matchDurationMin = durationMin;
    gameState.roomName = pName;

    const shortCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    peer = new Peer("matema-" + shortCode);

    peer.on("open", (id) => {
      myPeerId = id;
      hostPeerId = id;
      myPlayerIdx = 0;

      gameState.players.push({
        id: myPeerId, name: pName, icon: av.icon, role: av.role,
        color: PLAYER_COLORS[0], ca: 1500, pos: 0, props: [], failedCount: 0, laps: 0, emergencyUsed: false
      });

      document.getElementById("host-room-title").innerText = pName;
      document.getElementById("waiting-room-sub").innerText = `Cupo: ${gameState.players.length}/${gameState.maxPlayers} estudiantes | ${durationMin > 0 ? durationMin + ' min' : 'Ilimitada'}`;
      document.getElementById("waiting-room").style.display = "block";
      document.getElementById("btn-start-match").style.display = "block";
      btnCreate.disabled = true;

      renderWaitingList();

      setInterval(() => {
        if (!gameState.started) broadcastRoomAnnouncement();
      }, 2500);
    });

    peer.on("connection", (conn) => {
      if (gameState.started) {
        conn.on("open", () => {
          conn.send({ type: "JOIN_REJECTED", reason: "Partida ya iniciada." });
          setTimeout(() => conn.close(), 500);
        });
        return;
      }
      if (gameState.players.length >= gameState.maxPlayers) {
        conn.on("open", () => {
          conn.send({ type: "JOIN_REJECTED", reason: "Cupo de sala completo." });
          setTimeout(() => conn.close(), 500);
        });
        return;
      }

      conn.on("open", () => { connMap[conn.peer] = conn; });
      conn.on("data", (data) => handleHostMessage(data, conn));
    });
  });

  btnStart.addEventListener("click", () => {
    if (gameState.players.length < 1) return;
    gameState.started = true;
    broadcastRoomAnnouncement();
    openGameBoardView();
    syncEveryone();
    startTurnTimer();

    if (gameState.matchDurationMin > 0) {
      startMatchClock(gameState.matchDurationMin * 60);
    }
  });
}

window.joinRoomDirectly = function(targetHostId) {
  const pName = document.getElementById("player-name").value.trim() || "Estudiante";
  const av = getSelectedAvatar();
  isHost = false;

  peer = new Peer();

  peer.on("open", (id) => {
    myPeerId = id;
    hostPeerId = targetHostId;
    const conn = peer.connect(hostPeerId);

    conn.on("open", () => {
      connMap[hostPeerId] = conn;
      conn.send({ type: "PLAYER_JOIN", name: pName, icon: av.icon, role: av.role, peerId: myPeerId });
      document.getElementById("rooms-list").innerHTML = "<p style='color:#16a34a; font-weight:bold;'>Conectando a la mesa...</p>";
    });

    conn.on("data", (data) => handleClientMessage(data));
  });
};

function handleHostMessage(data, conn) {
  if (data.type === "PLAYER_JOIN") {
    if (gameState.started || gameState.players.length >= gameState.maxPlayers) {
      conn.send({ type: "JOIN_REJECTED", reason: "Cupo completo o juego en curso." });
      return;
    }

    const newIdx = gameState.players.length;
    gameState.players.push({
      id: data.peerId, name: data.name, icon: data.icon, role: data.role,
      color: PLAYER_COLORS[newIdx], ca: 1500, pos: 0, props: [], failedCount: 0, laps: 0, emergencyUsed: false
    });

    renderWaitingList();
    broadcastRoomAnnouncement();
    syncEveryone();
    return;
  }

  const activePlayer = gameState.players[gameState.turnIndex];
  const senderPeerId = conn ? conn.peer : myPeerId;

  if (activePlayer.id === senderPeerId) {
    if (data.type === "DICE_ROLL") {
      stopTurnTimer();
      executeMove(data.steps);
    } else if (data.type === "ANSWER_CHALLENGE") {
      processAnswerResult(data.isOk, data.cellId);
    } else if (data.type === "PURCHASE_CHOICE") {
      processPurchase(data.wantsBuy, data.cellId);
    }
  }

  if (data.type === "CLAIM_EMERGENCY") {
    const p = gameState.players.find(pl => pl.id === senderPeerId);
    if (p && p.ca < 100 && !p.emergencyUsed) {
      p.ca += 200;
      p.emergencyUsed = true;
      logEvent(`🚨 Beca de Emergencia: ${p.name} recibe 200 CA.`);
      playSound("cash");
      syncEveryone();
    }
  }
}

function handleClientMessage(data) {
  if (data.type === "JOIN_REJECTED") {
    alert("No fue posible ingresar: " + data.reason);
    location.reload();
    return;
  }

  if (data.type === "STATE_SYNC") {
    gameState = data.state;
    myPlayerIdx = gameState.players.findIndex(p => p.id === myPeerId);

    if (gameState.started && document.getElementById("lobby-screen").style.display !== "none") {
      openGameBoardView();
    }
    updateScreenView();
  } else if (data.type === "PROMPT_QUESTION") {
    if (myPlayerIdx === gameState.turnIndex) {
      showQuestionModal(data.cellId, data.question);
    }
  } else if (data.type === "PROMPT_BUY") {
    if (myPlayerIdx === gameState.turnIndex) {
      showPurchaseModal(data.cellId);
    }
  } else if (data.type === "PROMPT_EVENT") {
    if (myPlayerIdx === gameState.turnIndex) {
      showEventModal(data.card);
    }
  } else if (data.type === "TIMER_TICK") {
    renderTimer(data.seconds);
  } else if (data.type === "MATCH_CLOCK_TICK") {
    renderMatchClock(data.secondsLeft, data.totalSec);
  } else if (data.type === "GAME_OVER_SYNC") {
    playSound("win");
    showFinalReportModal(data.results, data.reason);
  }
}

function syncEveryone() {
  const payload = { type: "STATE_SYNC", state: gameState };
  Object.values(connMap).forEach(c => c.send(payload));
  updateScreenView();
}

function sendToHostServer(msg) {
  if (isHost) handleHostMessage(msg, null);
  else if (connMap[hostPeerId]) connMap[hostPeerId].send(msg);
}

function renderWaitingList() {
  const list = document.getElementById("players-joined-list");
  list.innerHTML = "";
  gameState.players.forEach(p => {
    const chip = document.createElement("span");
    chip.className = "joined-chip";
    chip.innerText = `${p.icon} ${p.name}`;
    list.appendChild(chip);
  });
}

function openGameBoardView() {
  document.getElementById("lobby-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "flex";
  updateScreenView();
  logEvent("🎓 Partida iniciada. ¡Cada aspirante recibe 1.500 CA!");
}

// 6. DIBUJO DEL TABLERO
function buildBoardUI() {
  const board = document.getElementById("monopoly-board");
  const coords = [];

  for (let c = 11; c >= 1; c--) coords.push({ r: 11, c });
  for (let r = 10; r >= 1; r--) coords.push({ r, c: 1 });
  for (let c = 2; c <= 11; c++) coords.push({ r: 1, c });
  for (let r = 2; r <= 10; r++) coords.push({ r, c: 11 });

  BOARD_DATA.forEach((tile, index) => {
    const pos = coords[index];
    const el = document.createElement("div");
    el.id = `tile-${tile.id}`;
    el.className = `cell ${tile.type}`;
    el.style.gridRow = pos.r;
    el.style.gridColumn = pos.c;

    let costHtml = tile.cost > 0 ? `<div class="cell-price-tag">$${tile.cost}</div>` : `<div class="cell-price-tag">${tile.desc || ''}</div>`;
    el.innerHTML = `
      <div class="cell-color-band"></div>
      <div class="cell-name-label">${tile.name}</div>
      ${costHtml}
      <div class="tokens-slot" id="slot-tile-${tile.id}"></div>
    `;
    board.appendChild(el);
  });
}

// 7. CRONÓMETRO GLOBAL
function startMatchClock(durationSec) {
  if (!isHost) return;
  totalMatchSeconds = durationSec;
  matchSecondsLeft = durationSec;

  broadcastMatchClockTick(matchSecondsLeft, totalMatchSeconds);

  matchTimerInterval = setInterval(() => {
    matchSecondsLeft--;
    broadcastMatchClockTick(matchSecondsLeft, totalMatchSeconds);

    if (matchSecondsLeft <= 0) {
      clearInterval(matchTimerInterval);
      matchTimerInterval = null;
      endGameByTimeLimit("¡Tiempo de partida agotado! Evaluación por promedio general.");
    }
  }, 1000);
}

function broadcastMatchClockTick(secondsLeft, totalSec) {
  renderMatchClock(secondsLeft, totalSec);
  Object.values(connMap).forEach(c => c.send({ type: "MATCH_CLOCK_TICK", secondsLeft, totalSec }));
}

function renderMatchClock(secondsLeft, totalSec) {
  const displayDesk = document.getElementById("match-clock-display");
  const displayMob = document.getElementById("m-match-clock");
  const fill = document.getElementById("match-clock-bar-fill");

  if (totalSec <= 0) {
    if (displayDesk) displayDesk.innerText = "Sin Límite";
    if (displayMob) displayMob.innerText = "∞";
    return;
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  if (displayDesk) displayDesk.innerText = str;
  if (displayMob) displayMob.innerText = str;

  if (fill) {
    const percent = Math.max(0, (secondsLeft / totalSec) * 100);
    fill.style.width = `${percent}%`;
  }
}

// 8. TEMPORIZADOR DE TURNO
function startTurnTimer() {
  if (!isHost) return;
  stopTurnTimer();
  turnSecondsLeft = TURN_DURATION_SEC;
  broadcastTimerTick(turnSecondsLeft);

  turnTimerInterval = setInterval(() => {
    turnSecondsLeft--;
    broadcastTimerTick(turnSecondsLeft);

    if (turnSecondsLeft <= 0) {
      stopTurnTimer();
      const autoVal = Math.floor(Math.random() * 6) + 1;
      logEvent(`⏰ ¡Turno expirado! Dado automático: [${autoVal}].`);
      executeMove(autoVal);
    }
  }, 1000);
}

function stopTurnTimer() {
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
  }
}

function broadcastTimerTick(seconds) {
  renderTimer(seconds);
  Object.values(connMap).forEach(c => c.send({ type: "TIMER_TICK", seconds }));
}

function renderTimer(seconds) {
  const badge = document.getElementById("turn-timer-badge");
  const bar = document.getElementById("turn-timer-progress");
  if (badge) {
    badge.innerText = `${seconds}s`;
    if (seconds <= 5) badge.classList.add("danger");
    else badge.classList.remove("danger");
  }
  if (bar) {
    bar.style.width = `${(seconds / TURN_DURATION_SEC) * 100}%`;
  }
}

// 9. CONTROLES Y DADOS (MÓVIL Y ESCRITORIO)
function initGameplayControls() {
  const btnVirtualMob = document.getElementById("m-btn-roll");
  const btnVirtualDesk = document.getElementById("desk-btn-roll");
  
  const btnApplyPhysicalMob = document.getElementById("btn-apply-physical-dice");
  const btnApplyPhysicalDesk = document.getElementById("desk-btn-apply-physical");
  
  const btnEmergency = document.getElementById("btn-emergency-grant");

  const handleRoll = () => {
    if (!isMyTurnNow()) return alert("No es tu turno.");
    playSound("roll");
    const val = Math.floor(Math.random() * 6) + 1;
    sendToHostServer({ type: "DICE_ROLL", steps: val });
  };

  if (btnVirtualMob) btnVirtualMob.addEventListener("click", handleRoll);
  if (btnVirtualDesk) btnVirtualDesk.addEventListener("click", handleRoll);

  const handlePhysical = (inputId) => {
    if (!isMyTurnNow()) return alert("No es tu turno.");
    const input = document.getElementById(inputId);
    const val = parseInt(input.value);
    if (val >= 1 && val <= 6) {
      playSound("roll");
      sendToHostServer({ type: "DICE_ROLL", steps: val });
      input.value = "";
    } else {
      alert("Introduce un valor entre 1 y 6.");
    }
  };

  if (btnApplyPhysicalMob) btnApplyPhysicalMob.addEventListener("click", () => handlePhysical("physical-dice-val"));
  if (btnApplyPhysicalDesk) btnApplyPhysicalDesk.addEventListener("click", () => handlePhysical("desk-physical-dice-val"));

  btnEmergency.addEventListener("click", () => {
    sendToHostServer({ type: "CLAIM_EMERGENCY" });
    btnEmergency.style.display = "none";
  });

  document.getElementById("btn-accept-event").addEventListener("click", () => {
    document.getElementById("modal-event-card").style.display = "none";
    if (isHost) endTurnStep();
  });
}

function isMyTurnNow() {
  return gameState.started && !gameState.gameOver && gameState.turnIndex === myPlayerIdx && !gameState.awaitingAction;
}

// 10. MOVIMIENTO Y CASILLAS
function executeMove(steps) {
  gameState.awaitingAction = true;
  const p = gameState.players[gameState.turnIndex];

  // Reflejar en panel de PC y Móvil a la vez
  const mDice = document.getElementById("m-val-white-dice");
  const dDice = document.getElementById("desk-val-white-dice");
  if (mDice) mDice.innerText = steps;
  if (dDice) dDice.innerText = steps;

  logEvent(`🎲 ${p.name} avanza ${steps} casillas.`);

  const prev = p.pos;
  p.pos = (p.pos + steps) % 40;

  if (p.pos < prev) {
    p.laps = (p.laps || 0) + 1;
    p.ca += 200;
    playSound("cash");
    const yearNames = ["1º Año", "2º Año", "3º Año", "4º Año / Residencia"];
    logEvent(`💵 ${p.name} avanzó a ${yearNames[Math.min(p.laps, 3)]} (+200 CA Beca).`);
  }

  syncEveryone();

  setTimeout(() => {
    checkTileLanding(p.pos);
  }, 600);
}

function checkTileLanding(tileId) {
  const p = gameState.players[gameState.turnIndex];
  const tile = BOARD_DATA[tileId];

  if (tileId === 30) {
    playSound("error");
    logEvent(`⚠️ ¡A Coloquio! ${p.name} fue enviado a Mesa de Examen.`);
    p.pos = 10;
    p.failedCount = (p.failedCount || 0) + 1;
    syncEveryone();
    endTurnStep();
    return;
  }

  if (tile.type === "CORNER" || tile.type === "SERVICE") {
    endTurnStep();
    return;
  }

  if (tile.type === "EVENTO") {
    const deck = EVENT_CARDS[tile.deck];
    const card = deck[Math.floor(Math.random() * deck.length)];
    applyEventCard(card, p);
    return;
  }

  const owner = gameState.ownership[tileId];
  if (owner === undefined) {
    const questionsList = QUESTION_BANK[tileId] || [
      { q: `¿Planificas adecuadamente los contenidos de ${tile.name}?`, options: ["Sí, articulado con el diseño", "No, sin planificación previa"], ans: 0 }
    ];
    const randomQ = questionsList[Math.floor(Math.random() * questionsList.length)];
    
    if (isHost && gameState.turnIndex === 0) {
      showQuestionModal(tileId, randomQ);
    } else {
      const targetConn = connMap[p.id];
      if (targetConn) {
        targetConn.send({ type: "PROMPT_QUESTION", cellId: tileId, question: randomQ });
      }
    }
  } else if (owner !== gameState.turnIndex) {
    const ownerPlayer = gameState.players[owner];
    const rentVal = tile.rent;
    p.ca -= rentVal;
    ownerPlayer.ca += rentVal;
    playSound("cash");
    logEvent(`📚 ${p.name} cursó en la cátedra de ${ownerPlayer.name} ("${tile.name}") y pagó ${rentVal} CA.`);

    if (p.ca <= 0) {
      playSound("error");
      logEvent(`💥 ¡${p.name} ha quedado sin presupuesto académico!`);
    }

    syncEveryone();
    endTurnStep();
  } else {
    logEvent(`🏛️ ${p.name} coordina su cátedra.`);
    endTurnStep();
  }
}

// 11. PREGUNTAS Y DADO DORADO
function showQuestionModal(cellId, qData) {
  const modal = document.getElementById("modal-question");
  const tile = BOARD_DATA[cellId];

  document.getElementById("question-subject-badge").innerText = tile.type;
  document.getElementById("question-subject-title").innerText = tile.name;
  document.getElementById("question-text").innerText = qData.q;

  const answersBox = document.getElementById("question-answers-list");
  const feedback = document.getElementById("question-feedback");
  answersBox.innerHTML = "";
  feedback.style.display = "none";

  qData.options.forEach((optText, i) => {
    const btn = document.createElement("button");
    btn.className = "answer-option-btn";
    btn.innerText = optText;
    btn.onclick = () => {
      const isOk = (i === qData.ans);
      feedback.style.display = "block";
      if (isOk) {
        playSound("success");
        feedback.className = "feedback-area ok";
        feedback.innerText = "¡Respuesta correcta!";
      } else {
        playSound("error");
        feedback.className = "feedback-area error";
        feedback.innerText = "Respuesta errónea. Penalización aplicada.";
      }

      setTimeout(() => {
        modal.style.display = "none";
        sendToHostServer({ type: "ANSWER_CHALLENGE", isOk, cellId });
      }, 950);
    };
    answersBox.appendChild(btn);
  });

  modal.style.display = "flex";
}

function processAnswerResult(isOk, cellId) {
  const p = gameState.players[gameState.turnIndex];
  const tile = BOARD_DATA[cellId];

  if (isOk) {
    const bonus = Math.floor(Math.random() * 6) + 1;
    const mPill = document.getElementById("m-golden-dice-pill");
    const dPill = document.getElementById("desk-golden-dice-pill");
    const mVal = document.getElementById("m-val-golden-dice");
    const dVal = document.getElementById("desk-val-golden-dice");

    if (mVal) mVal.innerText = bonus;
    if (dVal) dVal.innerText = bonus;
    if (mPill) mPill.style.display = "block";
    if (dPill) dPill.style.display = "block";

    p.pos = (p.pos + bonus) % 40;
    logEvent(`🚀 ¡Respuesta correcta! Dado Dorado: [${bonus}]. ${p.name} avanza ${bonus} casillas extra.`);
    syncEveryone();

    setTimeout(() => {
      if (p.ca >= tile.cost) {
        if (isHost && gameState.turnIndex === 0) {
          showPurchaseModal(cellId);
        } else {
          const c = connMap[p.id];
          if (c) c.send({ type: "PROMPT_BUY", cellId });
        }
      } else {
        endTurnStep();
      }
    }, 700);

  } else {
    p.ca = Math.max(0, p.ca - 25);
    p.pos = (p.pos - 2 + 40) % 40;
    p.failedCount = (p.failedCount || 0) + 1;
    logEvent(`❌ ${p.name} falló: pierde 25 CA y retrocede 2 casillas.`);
    syncEveryone();
    endTurnStep();
  }
}

// 12. TITULARIZACIÓN
function showPurchaseModal(cellId) {
  const tile = BOARD_DATA[cellId];
  const modal = document.getElementById("modal-purchase");
  document.getElementById("purchase-title").innerText = tile.name;
  document.getElementById("purchase-desc").innerText = `Costo: ${tile.cost} CA | Arancel: ${tile.rent} CA. ¿Deseas titularizar?`;

  document.getElementById("btn-confirm-purchase").onclick = () => {
    modal.style.display = "none";
    sendToHostServer({ type: "PURCHASE_CHOICE", wantsBuy: true, cellId });
  };
  document.getElementById("btn-cancel-purchase").onclick = () => {
    modal.style.display = "none";
    sendToHostServer({ type: "PURCHASE_CHOICE", wantsBuy: false, cellId });
  };

  modal.style.display = "flex";
}

function processPurchase(wantsBuy, cellId) {
  const p = gameState.players[gameState.turnIndex];
  const tile = BOARD_DATA[cellId];

  if (wantsBuy && p.ca >= tile.cost) {
    p.ca -= tile.cost;
    gameState.ownership[cellId] = gameState.turnIndex;
    p.props.push(cellId);
    playSound("cash");
    logEvent(`📜 ${p.name} titularizó "${tile.name}".`);
  }

  if (evaluateGameEnd(p)) return;

  syncEveryone();
  endTurnStep();
}

function applyEventCard(card, player) {
  logEvent(`🔔 Evento: ${card.title}`);

  if (card.act === "cash") {
    player.ca = Math.max(0, player.ca + card.val);
    playSound("cash");
  } else if (card.act === "move") {
    player.pos = (player.pos + card.val + 40) % 40;
  } else if (card.act === "acceleration") {
    const extra = Math.floor(Math.random() * 6) + 1;
    player.pos = (player.pos + extra) % 40;
    logEvent(`⚡ Aceleración: +${extra} casillas.`);
  }

  syncEveryone();

  if (isHost && gameState.turnIndex === 0) {
    showEventModal(card);
  } else {
    const c = connMap[player.id];
    if (c) c.send({ type: "PROMPT_EVENT", card });
  }
}

function showEventModal(card) {
  document.getElementById("event-title").innerText = card.title;
  document.getElementById("event-description").innerText = card.desc;
  document.getElementById("modal-event-card").style.display = "flex";
}

function endTurnStep() {
  gameState.awaitingAction = false;
  const mPill = document.getElementById("m-golden-dice-pill");
  const dPill = document.getElementById("desk-golden-dice-pill");
  if (mPill) mPill.style.display = "none";
  if (dPill) dPill.style.display = "none";

  gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
  syncEveryone();

  if (isHost && !gameState.gameOver) {
    startTurnTimer();
  }
}

// 13. FIN DE PARTIDA
function evaluateGameEnd(activePlayer) {
  const reachedResidence = activePlayer.props.includes(39) || activePlayer.pos === 39;
  const isWinner = (activePlayer.props.length >= 5 && reachedResidence && activePlayer.ca >= 2200);

  const solventPlayers = gameState.players.filter(p => p.ca > 0);
  const oneSurvivor = (gameState.players.length > 1 && solventPlayers.length === 1);

  if (isWinner || oneSurvivor) {
    const reason = isWinner ? `¡${activePlayer.name} completó todos los requisitos de Graduación!` : `¡${solventPlayers[0].name} es el único aspirante en carrera!`;
    concludeGame(reason);
    return true;
  }
  return false;
}

function endGameByTimeLimit(reason) {
  concludeGame(reason);
}

function concludeGame(reason) {
  gameState.gameOver = true;
  gameState.gameOverReason = reason;
  stopTurnTimer();
  if (matchTimerInterval) clearInterval(matchTimerInterval);

  const results = generateFinalAcademicReport();
  playSound("win");
  showFinalReportModal(results, reason);

  Object.values(connMap).forEach(c => c.send({ type: "GAME_OVER_SYNC", results, reason }));
  syncEveryone();
}

function generateFinalAcademicReport() {
  return gameState.players.map(p => {
    let academicScore = (p.props.length * 160) + Math.floor(p.ca / 8) + ((p.laps || 0) * 120) - ((p.failedCount || 0) * 70);
    academicScore = Math.max(0, academicScore);

    let status = "";
    let statusClass = "";

    if (p.ca <= 0) {
      status = "Recursante / Sin Presupuesto";
      statusClass = "status-recursante";
    } else if (p.props.includes(39) && p.props.length >= 5) {
      status = "¡Graduado/a con Honores!";
      statusClass = "status-graduado";
    } else if (p.props.length >= 4) {
      status = "Egresado Regular";
      statusClass = "status-regular";
    } else {
      status = "Estudiante Regular";
      statusClass = "status-proceso";
    }

    return {
      name: p.name,
      icon: p.icon,
      color: p.color,
      ca: p.ca,
      propsCount: p.props.length,
      laps: p.laps || 0,
      failed: p.failedCount || 0,
      score: academicScore,
      status,
      statusClass
    };
  }).sort((a, b) => b.score - a.score);
}

function showFinalReportModal(results, reason) {
  const modal = document.getElementById("modal-game-over");
  const container = document.getElementById("final-scores-table");
  const reasonEl = document.getElementById("game-over-reason");

  if (reasonEl) reasonEl.innerText = reason || "Evaluación académica de graduación:";
  container.innerHTML = "";

  results.forEach((res, rank) => {
    const row = document.createElement("div");
    row.className = "report-row";
    row.innerHTML = `
      <div class="report-user">
        <span class="report-medal">${rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉"}</span>
        <strong>${res.icon} ${res.name}</strong>
      </div>
      <div class="report-status ${res.statusClass}">${res.status}</div>
      <div class="report-details">
        <span>Cátedras: <b>${res.propsCount}</b></span>
        <span>Año: <b>${res.laps + 1}º</b></span>
        <span>CA: <b>${res.ca}</b></span>
        <span class="report-score">Puntaje: <b>${res.score}</b></span>
      </div>
    `;
    container.appendChild(row);
  });

  modal.style.display = "flex";
}

// 14. SINCRONIZACIÓN VISUAL
function updateScreenView() {
  if (myPlayerIdx >= 0 && gameState.players[myPlayerIdx]) {
    const me = gameState.players[myPlayerIdx];
    document.getElementById("my-name-display").innerText = me.name;
    document.getElementById("my-role-display").innerText = me.role;
    
    const yearNames = ["1º Año", "2º Año", "3º Año", "4º Año / Residencia"];
    document.getElementById("my-academic-year").innerText = yearNames[Math.min(me.laps || 0, 3)];

    const badge = document.getElementById("my-avatar-badge");
    badge.innerText = me.icon;
    badge.style.background = me.color;

    const emergencyBtn = document.getElementById("btn-emergency-grant");
    if (me.ca < 100 && !me.emergencyUsed && !gameState.gameOver) {
      emergencyBtn.style.display = "block";
    } else {
      emergencyBtn.style.display = "none";
    }
  }

  // Lista lateral
  const table = document.getElementById("players-table");
  table.innerHTML = "";
  gameState.players.forEach((p, idx) => {
    const isMe = (idx === myPlayerIdx);
    const isTurn = (idx === gameState.turnIndex);
    const row = document.createElement("div");
    row.className = `player-score-row ${isTurn ? "is-turn" : ""} ${isMe ? "is-me" : ""}`;
    row.innerHTML = `
      <span>
        <strong style="color:${p.color}">${p.icon}</strong> ${p.name}
        ${isMe ? '<span class="badge-me">TÚ</span>' : ''}
      </span>
      <span><strong>${p.ca} CA</strong> (${p.props.length} cát.)</span>
    `;
    table.appendChild(row);
  });

  const current = gameState.players[gameState.turnIndex];
  
  // Elementos Móvil
  const btnVirtualMob = document.getElementById("m-btn-roll");
  const applyBtnMob = document.getElementById("btn-apply-physical-dice");
  const inputDiceMob = document.getElementById("physical-dice-val");

  // Elementos Escritorio (PC)
  const btnVirtualDesk = document.getElementById("desk-btn-roll");
  const applyBtnDesk = document.getElementById("desk-btn-apply-physical");
  const inputDiceDesk = document.getElementById("desk-physical-dice-val");

  if (current) {
    const isMyTurn = (myPlayerIdx === gameState.turnIndex);
    document.getElementById("current-player-display").innerText = `${current.icon} ${current.name}`;
    document.getElementById("current-player-display").style.color = current.color;

    // Header móvil
    document.getElementById("m-current-player").innerText = isMyTurn ? "👉 ¡TU TURNO!" : `Turno: ${current.name}`;
    document.getElementById("m-turn-dot").style.background = current.color;

    const disabledState = !isMyTurn || gameState.awaitingAction || gameState.gameOver;
    
    // Habilitar o deshabilitar ambos controles a la vez
    [btnVirtualMob, applyBtnMob, inputDiceMob, btnVirtualDesk, applyBtnDesk, inputDiceDesk].forEach(el => {
      if (el) el.disabled = disabledState;
    });
  }

  // Fichas en el tablero
  BOARD_DATA.forEach(t => {
    const slot = document.getElementById(`slot-tile-${t.id}`);
    if (slot) slot.innerHTML = "";
  });

  gameState.players.forEach((p, index) => {
    const position = (typeof p.pos === "number" && !isNaN(p.pos)) ? p.pos : 0;
    const slot = document.getElementById(`slot-tile-${position}`);
    if (slot) {
      const chip = document.createElement("div");
      chip.className = "player-chip";
      chip.style.backgroundColor = p.color;
      chip.innerText = p.icon;
      chip.title = `${p.name} (${p.ca} CA)`;
      if (index === myPlayerIdx) {
        chip.style.outline = "2px solid #ffffff";
        chip.style.transform = "scale(1.18)";
      }
      slot.appendChild(chip);
    }
  });

  // Titularizaciones
  Object.entries(gameState.ownership).forEach(([cellId, ownerIdx]) => {
    const el = document.getElementById(`tile-${cellId}`);
    if (el && gameState.players[ownerIdx]) {
      el.style.border = `2.5px solid ${gameState.players[ownerIdx].color}`;
    }
  });
}

function logEvent(msg) {
  const box = document.getElementById("game-log-box");
  const row = document.createElement("div");
  row.innerText = msg;
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function initRulesModal() {
  const modal = document.getElementById("modal-rules-guide");
  const openBtns = [document.getElementById("btn-open-rules"), document.getElementById("btn-help-floating")];
  const closeBtns = [document.getElementById("btn-close-rules"), document.getElementById("btn-close-rules-bottom")];

  openBtns.forEach(b => { if (b) b.onclick = () => modal.style.display = "flex"; });
  closeBtns.forEach(b => { if (b) b.onclick = () => modal.style.display = "none"; });
}