let detector, video, canvas, ctx;
let ball = { x: 100, y: 0, radius: 20 };
let score = 0;
let selectedKeypoint = "nose"; // domyślnie
let gameRunning = false;
let difficulty = 1;            // domyślny poziom
let speed = 1;                 // prędkość kulki

function selectKeypoint(name) {
  selectedKeypoint = name;

  document.querySelectorAll("#menu button").forEach(btn => {
    btn.classList.remove("selected");
    if (btn.dataset.keypoint === name) {
      btn.classList.add("selected");
    }
  });
}

function startGame(level) {
  // Bezpieczne rzutowanie i walidacja
  level = Number(level);
  if (![1,2,3,4].includes(level)) {
    console.warn('Nieprawidłowy poziom, ustawiam 1');
    level = 1;
  }

  difficulty = level;
  const speedMap = {1: 1, 2: 2, 3: 3, 4: 4};
  speed = speedMap[level];

  // przygotowanie gry
  score = 0;
  gameRunning = true; // jeśli masz w runGame() warunek !gameRunning
  document.getElementById("menu").classList.add("hidden");

  console.log('startGame level=', level, 'speed=', speed, 'selectedKeypoint=', selectedKeypoint);
  setup();
}

document.getElementById("restartBtn").addEventListener("click", () => {
  gameRunning = false;
  document.getElementById("menu").classList.remove("hidden");
  document.getElementById("restartBtn").classList.add("hidden");

  // Reset pozycji kulki i wyniku
  score = 0;
  ball.y = 0;
  ball.x = Math.random() * (canvas.width - 40) + 20;

  // Czyścimy canvas
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
});

async function initCamera() {
  video = document.getElementById("video");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => resolve(video);
  });
}

async function setup() {
  await tf.setBackend('webgl');
  await tf.ready(); // Upewnia się, że backend jest gotowy

  await initCamera();
  canvas = document.getElementById("canvas");
  canvas.width = 640;
  canvas.height = 480;
  ctx = canvas.getContext("2d");

  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  };
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );

  requestAnimationFrame(runGame);
  document.getElementById("restartBtn").classList.remove("hidden");
}

document.getElementById("restartBtn").addEventListener("click", () => {
  // Zatrzymujemy grę i wracamy do menu
  document.getElementById("menu").classList.remove("hidden");
  document.getElementById("restartBtn").classList.add("hidden");

  // Resetujemy wynik i pozycję kulki
  score = 0;
  ball.y = 0;
  ball.x = Math.random() * (canvas.width - 40) + 20;
});


async function runGame() {
  if (!gameRunning) return; // jeśli gra nie działa – nie rób nic
  const poses = await detector.estimatePoses(video);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Punkty: " + score, 10, 30);

  // Rysujemy kulkę
  ball.y += speed;
  if (ball.y > canvas.height) {
    ball.y = 0;
    ball.x = Math.random() * (canvas.width - 40) + 20;
  }
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();

  // Sprawdzamy czy nos dotyka kulki
  if (poses[0] && poses[0].keypoints)  {
  const target = poses[0].keypoints.find((pt) => pt.name === selectedKeypoint);
  if (target && target.score > 0.4) {
    console.log("Target:", target.name, target.x, target.y);

    // Najpierw obliczamy odbite X
    const mirroredX = canvas.width - target.x;

    // Rysujemy niebieski punkt
    ctx.beginPath();
    ctx.arc(mirroredX, target.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "blue";
    ctx.fill();

    // Obliczamy odległość do kulki
    const dx = ball.x - mirroredX;
    const dy = ball.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ball.radius + 20) {
      ball.y = 0;
      ball.x = Math.random() * (canvas.width - 40) + 20;
      score += 1;
      console.log("ZŁAPAŁAŚ! 🎉");
    }
  }
}

  // To musi być **poza** if-em — aby gra ciągle się odświeżała
  requestAnimationFrame(runGame);
}

