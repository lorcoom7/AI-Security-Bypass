const tabs = [...document.querySelectorAll('.tab')];
const panels = [...document.querySelectorAll('.panel')];

function activateTab(tabName) {
  tabs.forEach((btn) => {
    const isCurrent = btn.dataset.tab === tabName;
    btn.classList.toggle('is-active', isCurrent);
    btn.setAttribute('aria-selected', String(isCurrent));
  });

  panels.forEach((panel) => {
    const isCurrent = panel.id === tabName;
    panel.classList.toggle('is-active', isCurrent);
    panel.hidden = !isCurrent;
  });
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

const canvas = document.getElementById('digestCanvas');
const ctx = canvas.getContext('2d');
const steps = [...document.querySelectorAll('.story-step')];
const digestStory = document.getElementById('digestStory');
const progressPct = document.getElementById('progressPct');

let progress = 0;
let targetProgress = 0;

function drawTube(pathPoints, thickness, colorA, colorB) {
  ctx.lineWidth = thickness;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  ctx.strokeStyle = gradient;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(pathPoints[0][0], pathPoints[0][1]);
  for (let i = 1; i < pathPoints.length; i += 1) {
    ctx.lineTo(pathPoints[i][0], pathPoints[i][1]);
  }
  ctx.stroke();
}

function pointOnPath(points, t) {
  const segments = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dist = Math.hypot(x2 - x1, y2 - y1);
    total += dist;
    segments.push({ x1, y1, x2, y2, dist, end: total });
  }

  const target = t * total;
  const segment = segments.find((s) => s.end >= target) || segments[segments.length - 1];
  const prevEnd = segment.end - segment.dist;
  const local = segment.dist ? (target - prevEnd) / segment.dist : 0;

  return {
    x: segment.x1 + (segment.x2 - segment.x1) * local,
    y: segment.y1 + (segment.y2 - segment.y1) * local,
  };
}

function drawOrganLabel(text, x, y, highlighted = false) {
  ctx.save();
  ctx.font = '600 18px Inter';
  ctx.fillStyle = highlighted ? '#72edff' : 'rgba(208, 224, 255, 0.85)';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawDigestiveScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const route = [
    [160, 55],
    [205, 108],
    [260, 178],
    [348, 218],
    [442, 235],
    [533, 273],
    [620, 340],
    [700, 403],
    [780, 480],
  ];

  drawTube(route, 56, 'rgba(120,144,255,.34)', 'rgba(66,98,202,.2)');
  drawTube(route, 32, 'rgba(118,102,255,.92)', 'rgba(81,227,255,.9)');

  const activePoint = pointOnPath(route, progress);
  const glowSize = 34 + Math.sin(Date.now() / 240) * 3.8;

  const glow = ctx.createRadialGradient(activePoint.x, activePoint.y, 2, activePoint.x, activePoint.y, glowSize);
  glow.addColorStop(0, '#fff7d7');
  glow.addColorStop(0.35, '#ffc167');
  glow.addColorStop(1, 'rgba(255,148,68,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(activePoint.x, activePoint.y, glowSize, 0, Math.PI * 2);
  ctx.fill();

  const stageStops = [0.1, 0.24, 0.42, 0.62, 0.8, 1];
  const stageNames = ['Mouth', 'Esophagus', 'Stomach', 'Small Intestine', 'Large Intestine', 'Exit'];
  const stageCoords = [
    [95, 70],
    [205, 132],
    [360, 197],
    [532, 251],
    [660, 355],
    [805, 492],
  ];

  stageStops.forEach((stop, idx) => {
    const [x, y] = stageCoords[idx];
    drawOrganLabel(stageNames[idx], x, y, progress >= stop - 0.03);
  });

  const scanX = 70 + progress * 820;
  const scanGradient = ctx.createLinearGradient(scanX - 55, 0, scanX + 55, 0);
  scanGradient.addColorStop(0, 'rgba(104,199,255,0)');
  scanGradient.addColorStop(0.5, 'rgba(120,235,255,0.17)');
  scanGradient.addColorStop(1, 'rgba(104,199,255,0)');
  ctx.fillStyle = scanGradient;
  ctx.fillRect(scanX - 55, 0, 110, canvas.height);
}

function computeScrollProgress() {
  const rect = digestStory.getBoundingClientRect();
  const maxScroll = digestStory.scrollHeight - digestStory.clientHeight;
  const raw = maxScroll <= 0 ? 0 : digestStory.scrollTop / maxScroll;

  targetProgress = Math.max(0, Math.min(1, raw));
  progressPct.textContent = `${Math.round(targetProgress * 100)}%`;

  let nearest = null;
  let nearestDiff = Infinity;
  steps.forEach((step) => {
    const stage = Number(step.dataset.stage);
    const diff = Math.abs(targetProgress - stage);
    if (diff < nearestDiff) {
      nearest = step;
      nearestDiff = diff;
    }
  });

  steps.forEach((s) => s.classList.toggle('active', s === nearest));

  if (rect.top < 100 && rect.bottom > 220 && digestStory.scrollTop === 0) {
    targetProgress = 0.08;
  }
}

function animate() {
  progress += (targetProgress - progress) * 0.08;
  drawDigestiveScene();
  requestAnimationFrame(animate);
}

['scroll', 'resize'].forEach((eventName) => {
  window.addEventListener(eventName, computeScrollProgress, { passive: true });
});

digestStory.addEventListener('scroll', computeScrollProgress, { passive: true });

computeScrollProgress();
animate();
