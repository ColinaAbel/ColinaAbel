const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const finalScoreElement = document.getElementById('finalScore');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseButton = document.getElementById('pauseButton');
const musicButton = document.getElementById('musicButton');
const levelElement = document.getElementById('level');
const onePlayerButton = document.getElementById('onePlayerButton');
const twoPlayerButton = document.getElementById('twoPlayerButton');
const marioTouchControls = document.getElementById('marioTouchControls');
const luigiTouchControls = document.getElementById('luigiTouchControls');
const keys = new Set();

let width = 0;
let height = 0;
let running = false;
let paused = false;
let animationFrame = 0;
let lastTime = 0;
let score = 0;
let best = Number(localStorage.getItem('mario-luigi-best') || 0);
let levelIndex = 0;
let cameraX = 0;
let level = null;
let players = [];
let playerCount = 2;
let gameWon = false;
let audioContext = null;
let musicTimer = null;
let musicEnabled = true;
let musicStep = 0;
const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];

function playMusicNote() {
  if (!musicEnabled || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'square';
  oscillator.frequency.value = melody[musicStep % melody.length];
  gain.gain.setValueAtTime(.035, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .16);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + .17);
  musicStep += 1;
}

function startMusic() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume();
  if (!musicTimer) { playMusicNote(); musicTimer = setInterval(playMusicNote, 190); }
}

function toggleMusic() {
  musicEnabled = !musicEnabled;
  musicButton.textContent = musicEnabled ? '♫' : '×';
  musicButton.setAttribute('aria-label', musicEnabled ? 'Silenciar música' : 'Activar música');
  if (musicEnabled && running) startMusic();
}

const levelBlueprints = [
  { name: 'Pradera Pixel', sky: '#b9e8f0', ground: '#4f9b62', accent: '#f4c95d', spawn: { x: 90, y: 380 }, goal: 2910, platforms: [[0, 470, 3200, 70], [330, 370, 180, 24], [620, 300, 190, 24], [930, 390, 150, 24], [1210, 320, 210, 24], [1560, 385, 180, 24], [1850, 295, 210, 24], [2170, 380, 190, 24], [2460, 315, 190, 24]], coins: [[380, 330], [670, 260], [975, 350], [1280, 280], [1630, 345], [1920, 255], [2240, 340], [2530, 275]], enemies: [[550, 425, 1], [1120, 425, -1], [1770, 425, 1], [2310, 425, -1]] },
  { name: 'Fábrica Fuego', sky: '#f2b18a', ground: '#70454b', accent: '#ff6b5c', spawn: { x: 90, y: 380 }, goal: 3060, platforms: [[0, 470, 3300, 70], [260, 350, 140, 24], [530, 260, 130, 24], [800, 390, 170, 24], [1100, 290, 140, 24], [1370, 365, 170, 24], [1690, 245, 150, 24], [1990, 350, 190, 24], [2320, 280, 160, 24], [2630, 370, 210, 24]], coins: [[300, 310], [570, 220], [855, 350], [1140, 250], [1420, 325], [1735, 205], [2050, 310], [2370, 240], [2690, 330]], enemies: [[430, 425, 1], [700, 425, -1], [1010, 425, 1], [1580, 425, -1], [2210, 425, 1], [2870, 425, -1]] },
  { name: 'Castillo Final', sky: '#7783a8', ground: '#3e485e', accent: '#9ff3c4', spawn: { x: 90, y: 380 }, goal: 3200, platforms: [[0, 470, 3450, 70], [220, 320, 160, 24], [500, 410, 120, 24], [730, 270, 170, 24], [1010, 365, 150, 24], [1270, 240, 170, 24], [1550, 350, 150, 24], [1810, 275, 180, 24], [2100, 390, 130, 24], [2350, 250, 180, 24], [2650, 340, 170, 24], [2940, 240, 190, 24]], coins: [[270, 280], [545, 370], [790, 230], [1060, 325], [1320, 200], [1595, 310], [1870, 235], [2140, 350], [2410, 210], [2700, 300], [3000, 200]], enemies: [[390, 425, 1], [650, 425, -1], [930, 425, 1], [1190, 425, -1], [1480, 425, 1], [2020, 425, -1], [2500, 425, 1], [2840, 425, -1]] }
];

for (let levelNumber = 4; levelNumber <= 10; levelNumber += 1) {
  const length = 3200 + (levelNumber - 4) * 260;
  const platformGap = Math.max(185, 245 - (levelNumber - 4) * 8);
  const platforms = [[0, 470, length, 70]];
  const coins = [];
  const enemies = [];
  for (let x = 260, index = 0; x < length - 120; x += platformGap, index += 1) {
    const platformY = 325 + (index % 3) * 42;
    platforms.push([x, platformY, 112, 24]);
    coins.push([x + 52, platformY - 40]);
    if (index % 2 === 0 || levelNumber > 7) enemies.push([x + 135, 425, index % 2 ? -1 : 1]);
  }
  levelBlueprints.push({ name: `Desafío ${levelNumber}`, sky: ['#f4d6a0', '#9bc8c1', '#d3b5d9'][levelNumber % 3], ground: '#465d69', accent: ['#ff6b5c', '#f4c95d', '#9ff3c4'][levelNumber % 3], spawn: { x: 90, y: 380 }, goal: length - 100, platforms, coins, enemies });
}

levelBlueprints.forEach((blueprint, index) => {
  blueprint.obstacles = [];
  const spacing = Math.max(260, 390 - index * 15);
  for (let x = 430 + index * 18; x < blueprint.goal - 100; x += spacing) {
    blueprint.obstacles.push({ x, y: 435, width: 32 + (index % 3) * 7, height: 35, style: index % 2 ? 'crate' : 'spikes' });
  }
});

function formatScore(value) { return String(Math.floor(value)).padStart(6, '0'); }
function resizeCanvas() { const ratio = window.devicePixelRatio || 1; const bounds = canvas.getBoundingClientRect(); width = bounds.width; height = bounds.height; canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); }
function createPlayers() { level.powerCubes = level.coins.filter((coin, index) => index % 3 === 1).map(coin => ({ x: coin[0], y: coin[1] - 38, collected: false })); return [{ name: 'Mario', x: level.spawn.x, y: level.spawn.y, vx: 0, vy: 0, width: 25, height: 35, grounded: false, powerTimer: 0, colors: { cap: '#e94435', suit: '#e94435', overalls: '#1d5fa7' }, left: 'a', right: 'd', jump: 'w' }, { name: 'Luigi', x: level.spawn.x - 40, y: level.spawn.y, vx: 0, vy: 0, width: 25, height: 35, grounded: false, powerTimer: 0, colors: { cap: '#49ad62', suit: '#49ad62', overalls: '#1d5fa7' }, left: 'j', right: 'l', jump: 'i' }].slice(0, playerCount); }
function loadLevel(index) { levelIndex = index; const blueprint = levelBlueprints[index]; level = { ...blueprint, platforms: blueprint.platforms.map(platform => [...platform]), coins: blueprint.coins.map(coin => ({ x: coin[0], y: coin[1], collected: false })), obstacles: blueprint.obstacles.map(obstacle => ({ ...obstacle })), enemies: blueprint.enemies.map(enemy => ({ x: enemy[0], y: enemy[1], width: 27, height: 30, direction: enemy[2], speed: 48 })) }; players = createPlayers(); cameraX = 0; levelElement.textContent = `${levelIndex + 1} / ${levelBlueprints.length}`; }
function resetGame() { score = 0; gameWon = false; loadLevel(0); updateScore(); }
function startGame() { resetGame(); running = true; paused = false; startOverlay.classList.add('hidden'); gameOverOverlay.classList.add('hidden'); pauseOverlay.classList.add('hidden'); pauseButton.disabled = false; statusText.textContent = 'AVENTURA EN CURSO'; startMusic(); lastTime = performance.now(); cancelAnimationFrame(animationFrame); animationFrame = requestAnimationFrame(loop); }
function togglePause() { if (!running) return; paused = !paused; pauseOverlay.classList.toggle('hidden', !paused); statusText.textContent = paused ? 'JUEGO EN PAUSA' : 'AVENTURA EN CURSO'; if (!paused) { lastTime = performance.now(); animationFrame = requestAnimationFrame(loop); } }
function finishGame(won) { running = false; gameWon = won; pauseButton.disabled = true; statusText.textContent = won ? 'AVENTURA COMPLETADA' : 'SISTEMA EN ESPERA'; finalScoreElement.textContent = formatScore(score); const title = gameOverOverlay.querySelector('h2'); const eyebrow = gameOverOverlay.querySelector('.eyebrow'); title.innerHTML = won ? '¡Peach está<br><em>a salvo!</em>' : 'La aventura<br><em>terminó.</em>'; eyebrow.textContent = won ? 'MISIÓN CUMPLIDA' : 'FIN DE PARTIDA'; gameOverOverlay.classList.remove('hidden'); if (score > best) { best = score; localStorage.setItem('mario-luigi-best', best); bestElement.textContent = formatScore(best); } }
function updateScore() { scoreElement.textContent = formatScore(score); bestElement.textContent = formatScore(best); progressBar.style.width = `${Math.min(100, (levelIndex * 100 / levelBlueprints.length) + (score % 100) / 3)}%`; }
function overlaps(first, second) { return first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y; }
function movePlayer(player, delta) { player.powerTimer = Math.max(0, player.powerTimer - delta); const left = keys.has(player.left); const right = keys.has(player.right); const direction = (right ? 1 : 0) - (left ? 1 : 0); const maxSpeed = player.powerTimer > 0 ? 320 : 225; player.vx += (direction * maxSpeed - player.vx) * Math.min(1, delta * 12); if (!direction) player.vx *= Math.pow(.001, delta); if (keys.has(player.jump) && player.grounded) { player.vy = player.powerTimer > 0 ? -590 : -510; player.grounded = false; } player.vy += 1300 * delta; const previousBottom = player.y + player.height; player.x += player.vx * delta; player.x = Math.max(0, Math.min(level.goal + 80, player.x)); player.y += player.vy * delta; player.grounded = false; level.platforms.forEach(platform => { const block = { x: platform[0], y: platform[1], width: platform[2], height: platform[3] }; if (overlaps(player, block) && previousBottom <= block.y + 5 && player.vy >= 0) { player.y = block.y - player.height; player.vy = 0; player.grounded = true; } }); if (level.obstacles.some(obstacle => overlaps(player, obstacle))) respawnPlayer(player); if (player.y > height + 100) respawnPlayer(player); }
function respawnPlayer(player) { player.x = level.spawn.x; player.y = level.spawn.y; player.vx = 0; player.vy = 0; score = Math.max(0, score - 25); updateScore(); }
function updatePowerCubes() { level.powerCubes.forEach(cube => { if (!cube.collected) { const collector = players.find(player => Math.hypot(player.x + player.width / 2 - cube.x, player.y + player.height / 2 - cube.y) < 28); if (collector) { cube.collected = true; collector.powerTimer = 8; score += 100; updateScore(); } } }); }
function update(delta) { players.forEach(player => movePlayer(player, delta)); updatePowerCubes(); level.enemies.forEach(enemy => { enemy.x += enemy.direction * enemy.speed * delta; if (enemy.x < 0 || enemy.x > level.goal) enemy.direction *= -1; players.forEach(player => { if (overlaps(player, enemy)) respawnPlayer(player); }); }); level.coins.forEach(coin => { if (!coin.collected && players.some(player => Math.hypot(player.x + player.width / 2 - coin.x, player.y + player.height / 2 - coin.y) < 25)) { coin.collected = true; score += 50; updateScore(); } }); if (players.some(player => player.x > level.goal)) { if (levelIndex < levelBlueprints.length - 1) loadLevel(levelIndex + 1); else finishGame(true); } cameraX += ((Math.max(...players.map(player => player.x)) - width * .35) - cameraX) * Math.min(1, delta * 4); cameraX = Math.max(0, Math.min(level.goal - width * .55, cameraX)); score += delta * 3; updateScore(); }
function drawPlayer(player) { const x = player.x - cameraX; const y = player.y; context.save(); context.translate(x + player.width / 2, y); context.fillStyle = player.colors.overalls; context.fillRect(-7, 14, 14, 13); context.fillStyle = player.colors.suit; context.fillRect(-12, 14, 5, 9); context.fillRect(7, 14, 5, 9); context.fillRect(-8, 26, 6, 7); context.fillRect(2, 26, 6, 7); context.fillStyle = '#713a29'; context.fillRect(-9, 32, 7, 3); context.fillRect(2, 32, 7, 3); context.fillStyle = '#f0ad72'; context.beginPath(); context.arc(0, 9, 8, 0, Math.PI * 2); context.fill(); context.fillStyle = player.colors.cap; context.beginPath(); context.arc(0, 5, 8, Math.PI, Math.PI * 2); context.fill(); context.fillRect(-8, 3, 14, 5); context.fillStyle = '#f2eee5'; context.fillRect(-3, 3, 6, 2); context.fillStyle = '#101820'; context.fillRect(-4, 9, 2, 2); context.fillRect(3, 9, 2, 2); if (player.powerTimer > 0) { context.strokeStyle = '#f4c95d'; context.lineWidth = 2; context.beginPath(); context.arc(0, 15, 21, 0, Math.PI * 2); context.stroke(); } context.restore(); }
function drawPeach() { if (!gameWon || !level) return; const scaleX = width / 860; const scaleY = height / 540; context.save(); context.scale(scaleX, scaleY); const x = level.goal + 35 - cameraX; const y = 422; context.fillStyle = '#f2a7bd'; context.beginPath(); context.moveTo(x, y + 8); context.lineTo(x - 18, y + 46); context.lineTo(x + 18, y + 46); context.closePath(); context.fill(); context.fillStyle = '#f0ad72'; context.beginPath(); context.arc(x, y, 10, 0, Math.PI * 2); context.fill(); context.fillStyle = '#f8d75d'; context.beginPath(); context.arc(x - 7, y - 7, 4, 0, Math.PI * 2); context.arc(x + 7, y - 7, 4, 0, Math.PI * 2); context.fill(); context.fillStyle = '#f5a4c2'; context.beginPath(); context.arc(x, y - 7, 10, Math.PI, Math.PI * 2); context.fill(); context.fillStyle = '#101820'; context.fillRect(x - 5, y, 2, 2); context.fillRect(x + 3, y, 2, 2); context.restore(); }
function draw() { context.clearRect(0, 0, width, height); const scaleX = width / 860; const scaleY = height / 540; context.save(); context.scale(scaleX, scaleY); const viewWidth = width / scaleX; const viewHeight = height / scaleY; context.fillStyle = level ? level.sky : '#b9e8f0'; context.fillRect(0, 0, viewWidth, viewHeight); context.fillStyle = 'rgba(255,255,255,.3)'; for (let x = -((cameraX * .2) % 170) - 80; x < viewWidth + 170; x += 170) { context.beginPath(); context.arc(x, 130, 35, 0, Math.PI * 2); context.arc(x + 38, 130, 48, 0, Math.PI * 2); context.arc(x + 78, 130, 30, 0, Math.PI * 2); context.fill(); } context.fillStyle = 'rgba(44,91,100,.18)'; for (let x = -((cameraX * .1) % 260) - 120; x < viewWidth + 260; x += 260) { context.beginPath(); context.moveTo(x, 470); context.lineTo(x + 120, 260); context.lineTo(x + 260, 470); context.fill(); } if (level) { level.platforms.forEach(platform => { const x = platform[0] - cameraX; context.fillStyle = level.ground; context.fillRect(x, platform[1], platform[2], platform[3]); context.fillStyle = level.accent; context.fillRect(x, platform[1], platform[2], 6); }); level.coins.forEach(coin => { if (coin.collected) return; const x = coin.x - cameraX; context.fillStyle = '#f4c95d'; context.beginPath(); context.ellipse(x, coin.y, 8, 11 + Math.sin(performance.now() / 180 + coin.x) * 2, 0, 0, Math.PI * 2); context.fill(); context.fillStyle = '#fff1a8'; context.fillRect(x - 2, coin.y - 6, 2, 5); }); level.enemies.forEach(enemy => { const x = enemy.x - cameraX; context.fillStyle = '#b82f46'; context.beginPath(); context.arc(x + 13, enemy.y + 15, 14, Math.PI, 0); context.lineTo(x + 27, enemy.y + 25); context.lineTo(x, enemy.y + 25); context.closePath(); context.fill(); context.fillStyle = '#101820'; context.fillRect(x + 6, enemy.y + 12, 3, 4); context.fillRect(x + 18, enemy.y + 12, 3, 4); context.fillStyle = '#f4c95d'; context.fillRect(x + 2, enemy.y + 26, 8, 4); context.fillRect(x + 17, enemy.y + 26, 8, 4); }); const goalX = level.goal - cameraX; context.fillStyle = '#f2eee5'; context.fillRect(goalX, 245, 5, 225); context.fillStyle = level.accent; context.beginPath(); context.moveTo(goalX + 5, 250); context.lineTo(goalX + 70, 270); context.lineTo(goalX + 5, 290); context.closePath(); context.fill(); players.forEach(drawPlayer); } context.restore(); }
function drawPowerCubes() { if (!level) return; const scaleX = width / 860; const scaleY = height / 540; context.save(); context.scale(scaleX, scaleY); level.powerCubes.forEach(cube => { if (cube.collected) return; const x = cube.x - cameraX; const y = cube.y + Math.sin(performance.now() / 220 + cube.x) * 4; context.fillStyle = '#4d82e8'; context.fillRect(x - 13, y - 13, 26, 26); context.strokeStyle = '#f4c95d'; context.lineWidth = 3; context.strokeRect(x - 10, y - 10, 20, 20); context.fillStyle = '#f2eee5'; context.font = 'bold 16px Space Grotesk'; context.textAlign = 'center'; context.fillText('?', x, y + 6); }); context.restore(); }
function drawObstacles() { if (!level) return; const scaleX = width / 860; const scaleY = height / 540; context.save(); context.scale(scaleX, scaleY); level.obstacles.forEach(obstacle => { const x = obstacle.x - cameraX; if (obstacle.style === 'spikes') { context.fillStyle = '#ff6b5c'; context.beginPath(); for (let offset = 0; offset < obstacle.width; offset += 12) { context.lineTo(x + offset + 6, obstacle.y); context.lineTo(x + offset + 12, obstacle.y + obstacle.height); } context.lineTo(x, obstacle.y + obstacle.height); context.closePath(); context.fill(); } else { context.fillStyle = '#a66a3f'; context.fillRect(x, obstacle.y, obstacle.width, obstacle.height); context.strokeStyle = '#f4c95d'; context.lineWidth = 3; context.strokeRect(x + 2, obstacle.y + 2, obstacle.width - 4, obstacle.height - 4); context.beginPath(); context.moveTo(x + 5, obstacle.y + 5); context.lineTo(x + obstacle.width - 5, obstacle.y + obstacle.height - 5); context.moveTo(x + obstacle.width - 5, obstacle.y + 5); context.lineTo(x + 5, obstacle.y + obstacle.height - 5); context.stroke(); } }); context.restore(); }
function loop(time) { const delta = Math.min(.035, (time - lastTime) / 1000); lastTime = time; if (running && !paused) update(delta); draw(); drawObstacles(); drawPowerCubes(); drawPeach(); if (running && !paused) animationFrame = requestAnimationFrame(loop); }

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', event => { const key = event.key.toLowerCase(); if (['a', 'd', 'w', 'j', 'l', 'i', 'p', ' '].includes(key)) event.preventDefault(); keys.add(key); if (key === 'p') togglePause(); if (key === ' ' && !running) startGame(); });
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('restartButton').addEventListener('click', startGame);
document.getElementById('resumeButton').addEventListener('click', togglePause);
pauseButton.addEventListener('click', togglePause);
musicButton.addEventListener('click', toggleMusic);
onePlayerButton.addEventListener('click', () => { playerCount = 1; onePlayerButton.classList.add('selected'); twoPlayerButton.classList.remove('selected'); });
twoPlayerButton.addEventListener('click', () => { playerCount = 2; twoPlayerButton.classList.add('selected'); onePlayerButton.classList.remove('selected'); });
function bindTouchControl(button) { const key = button.dataset.key; const press = event => { event.preventDefault(); keys.add(key); button.setPointerCapture?.(event.pointerId); }; const release = event => { event.preventDefault(); keys.delete(key); }; button.addEventListener('pointerdown', press); button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release); }
document.querySelectorAll('.touch-button').forEach(bindTouchControl);
onePlayerButton.addEventListener('click', () => { luigiTouchControls.classList.add('inactive'); });
twoPlayerButton.addEventListener('click', () => { luigiTouchControls.classList.remove('inactive'); });
resizeCanvas(); loadLevel(0); draw();
