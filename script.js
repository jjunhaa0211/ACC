const app = document.getElementById("app");
const emojiLayer = document.getElementById("emojiLayer");
const dropButton = document.getElementById("dropButton");
const status = document.getElementById("status");
const emojiTemplate = document.getElementById("emojiTemplate");

if (
  !(app instanceof HTMLElement) ||
  !(emojiLayer instanceof HTMLElement) ||
  !(dropButton instanceof HTMLButtonElement) ||
  !(status instanceof HTMLElement) ||
  !(emojiTemplate instanceof HTMLTemplateElement)
) {
  throw new Error("필수 DOM 요소를 찾을 수 없습니다.");
}

const query = new URLSearchParams(window.location.search);
const seed = Number.parseInt(query.get("seed") ?? "", 10);
const isTestMode = query.get("test") === "1";

const random = Number.isFinite(seed) ? createRng(seed) : Math.random;

const EMOJI_POOL = ["😂", "🔥", "💥", "😎", "🤖", "🎯", "🪩", "🍀", "⚡", "🌊", "🎈", "🫧"];

const SETTINGS = {
  burstCount: 42,
  maxEmojis: 140,
  gravity: 2400,
  airDrag: 0.992,
  wallBounce: 0.82,
  floorBounce: 0.74,
  buttonBounce: 0.78,
  emojiBounce: 0.84,
  floorFriction: 0.985,
  buttonTopFriction: 0.99,
  minTopBounceVelocity: 160,
  fixedStep: 1 / 120
};

const emojis = [];
let nextEmojiId = 1;
let worldWidth = window.innerWidth;
let worldHeight = window.innerHeight;
let lastFrameTime = performance.now();
let accumulator = 0;
let rafId = 0;

let dragState = null;

function createRng(initialSeed) {
  let state = (initialSeed >>> 0) || 1;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + (max - min) * random();
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function getButtonRect() {
  const rect = dropButton.getBoundingClientRect();
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
}

function getEmojiById(id) {
  return emojis.find((emoji) => emoji.id === id) ?? null;
}

function makeEmojiElement(id, symbol) {
  const element = emojiTemplate.content.firstElementChild?.cloneNode(true);
  if (!(element instanceof HTMLElement)) {
    throw new Error("emoji template 생성에 실패했습니다.");
  }

  element.textContent = symbol;
  element.dataset.emojiId = String(id);
  element.dataset.emoji = "true";
  element.style.cursor = "grab";
  element.style.touchAction = "none";

  return element;
}

function createEmoji() {
  const radius = randomBetween(18, 24);
  const id = nextEmojiId;
  const symbol = EMOJI_POOL[Math.floor(randomBetween(0, EMOJI_POOL.length))];

  const emoji = {
    id,
    symbol,
    x: randomBetween(radius, worldWidth - radius),
    y: randomBetween(-360, -radius),
    vx: randomBetween(-280, 280),
    vy: randomBetween(120, 420),
    spin: randomBetween(-180, 180),
    angle: randomBetween(0, 360),
    radius,
    dragging: false,
    element: makeEmojiElement(id, symbol)
  };

  nextEmojiId += 1;
  emojiLayer.appendChild(emoji.element);
  emojis.push(emoji);
}

function trimExcessEmojis() {
  while (emojis.length > SETTINGS.maxEmojis) {
    const removed = emojis.shift();
    removed?.element.remove();
  }
}

function spawnBurst(count = SETTINGS.burstCount) {
  for (let index = 0; index < count; index += 1) {
    createEmoji();
  }

  trimExcessEmojis();
  updateStatus();
}

function updateStatus() {
  if (emojis.length === 0) {
    status.textContent = "버튼을 누른 뒤 이모지를 잡아서 던져보세요";
    return;
  }

  status.textContent = `현재 ${emojis.length}개의 이모지가 튕기고 있어요`;
}

function resolveViewportCollision(emoji) {
  const { radius } = emoji;

  if (emoji.x - radius < 0) {
    emoji.x = radius;
    emoji.vx = Math.abs(emoji.vx) * SETTINGS.wallBounce;
  }

  if (emoji.x + radius > worldWidth) {
    emoji.x = worldWidth - radius;
    emoji.vx = -Math.abs(emoji.vx) * SETTINGS.wallBounce;
  }

  if (emoji.y - radius < 0) {
    emoji.y = radius;
    emoji.vy = Math.abs(emoji.vy) * SETTINGS.wallBounce;
  }

  if (emoji.y + radius > worldHeight) {
    emoji.y = worldHeight - radius;
    emoji.vy = -Math.abs(emoji.vy) * SETTINGS.floorBounce;
    emoji.vx *= SETTINGS.floorFriction;

    if (Math.abs(emoji.vy) < 24) {
      emoji.vy = 0;
    }
  }
}

function resolveRectCollision(emoji, rect) {
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const closestX = clamp(emoji.x, rect.left, rect.right);
  const closestY = clamp(emoji.y, rect.top, rect.bottom);

  let dx = emoji.x - closestX;
  let dy = emoji.y - closestY;

  const distanceSquared = dx * dx + dy * dy;
  const radiusSquared = emoji.radius * emoji.radius;

  if (distanceSquared >= radiusSquared) {
    return;
  }

  let nx;
  let ny;
  let penetration;

  if (distanceSquared === 0) {
    const overlaps = [
      { nx: -1, ny: 0, depth: Math.abs(emoji.x - rect.left) },
      { nx: 1, ny: 0, depth: Math.abs(rect.right - emoji.x) },
      { nx: 0, ny: -1, depth: Math.abs(emoji.y - rect.top) },
      { nx: 0, ny: 1, depth: Math.abs(rect.bottom - emoji.y) }
    ];

    overlaps.sort((a, b) => a.depth - b.depth);
    nx = overlaps[0].nx;
    ny = overlaps[0].ny;
    penetration = emoji.radius;
  } else {
    const distance = Math.sqrt(distanceSquared);
    dx /= distance;
    dy /= distance;
    nx = dx;
    ny = dy;
    penetration = emoji.radius - distance;
  }

  emoji.x += nx * penetration;
  emoji.y += ny * penetration;

  const velocityAlongNormal = emoji.vx * nx + emoji.vy * ny;
  if (velocityAlongNormal < 0) {
    const bounce = SETTINGS.buttonBounce;
    emoji.vx -= (1 + bounce) * velocityAlongNormal * nx;
    emoji.vy -= (1 + bounce) * velocityAlongNormal * ny;
  }

  if (ny < -0.5) {
    emoji.vx *= SETTINGS.buttonTopFriction;
    if (Math.abs(emoji.vy) < SETTINGS.minTopBounceVelocity) {
      emoji.vy = -SETTINGS.minTopBounceVelocity;
    }
  }
}

function resolveEmojiCollisions() {
  for (let i = 0; i < emojis.length; i += 1) {
    for (let j = i + 1; j < emojis.length; j += 1) {
      const first = emojis[i];
      const second = emojis[j];

      let dx = second.x - first.x;
      let dy = second.y - first.y;
      let distanceSquared = dx * dx + dy * dy;

      const minDistance = first.radius + second.radius;
      const minDistanceSquared = minDistance * minDistance;

      if (distanceSquared >= minDistanceSquared) {
        continue;
      }

      if (distanceSquared === 0) {
        dx = randomBetween(-0.5, 0.5) || 0.001;
        dy = randomBetween(-0.5, 0.5) || 0.001;
        distanceSquared = dx * dx + dy * dy;
      }

      const distance = Math.sqrt(distanceSquared);
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;

      if (!first.dragging && !second.dragging) {
        first.x -= nx * overlap * 0.5;
        first.y -= ny * overlap * 0.5;
        second.x += nx * overlap * 0.5;
        second.y += ny * overlap * 0.5;
      } else if (!first.dragging && second.dragging) {
        first.x -= nx * overlap;
        first.y -= ny * overlap;
      } else if (first.dragging && !second.dragging) {
        second.x += nx * overlap;
        second.y += ny * overlap;
      }

      const relativeVx = second.vx - first.vx;
      const relativeVy = second.vy - first.vy;
      const velocityAlongNormal = relativeVx * nx + relativeVy * ny;

      if (velocityAlongNormal > 0) {
        continue;
      }

      const impulse = (-(1 + SETTINGS.emojiBounce) * velocityAlongNormal) / 2;

      if (!first.dragging) {
        first.vx -= impulse * nx;
        first.vy -= impulse * ny;
      }

      if (!second.dragging) {
        second.vx += impulse * nx;
        second.vy += impulse * ny;
      }
    }
  }
}

function step(deltaTime) {
  const buttonRect = getButtonRect();

  for (const emoji of emojis) {
    if (emoji.dragging) {
      continue;
    }

    emoji.vy += SETTINGS.gravity * deltaTime;
    emoji.vx *= SETTINGS.airDrag;
    emoji.vy *= SETTINGS.airDrag;

    emoji.x += emoji.vx * deltaTime;
    emoji.y += emoji.vy * deltaTime;

    emoji.angle += emoji.spin * deltaTime;
    emoji.spin *= 0.995;

    resolveViewportCollision(emoji);
    resolveRectCollision(emoji, buttonRect);
  }

  resolveEmojiCollisions();

  for (const emoji of emojis) {
    if (emoji.dragging) {
      continue;
    }

    resolveViewportCollision(emoji);
    resolveRectCollision(emoji, buttonRect);
  }
}

function render() {
  for (const emoji of emojis) {
    const scale = emoji.dragging ? 1.08 : 1;
    emoji.element.style.transform = `translate3d(${emoji.x - emoji.radius}px, ${emoji.y - emoji.radius}px, 0) rotate(${emoji.angle}deg) scale(${scale})`;
    emoji.element.style.width = `${emoji.radius * 2}px`;
    emoji.element.style.height = `${emoji.radius * 2}px`;
    emoji.element.style.fontSize = `${emoji.radius * 1.25}px`;
    emoji.element.style.zIndex = emoji.dragging ? "60" : "20";
  }
}

function tick(now) {
  const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  accumulator += deltaTime;

  while (accumulator >= SETTINGS.fixedStep) {
    step(SETTINGS.fixedStep);
    accumulator -= SETTINGS.fixedStep;
  }

  render();
  rafId = requestAnimationFrame(tick);
}

function pushPointerSample(pointerHistory, event) {
  pointerHistory.push({
    x: event.clientX,
    y: event.clientY,
    t: performance.now()
  });

  while (pointerHistory.length > 6) {
    pointerHistory.shift();
  }
}

function calculateThrowVelocity(pointerHistory) {
  if (pointerHistory.length < 2) {
    return { vx: 0, vy: 0 };
  }

  const latest = pointerHistory[pointerHistory.length - 1];
  const earliest = pointerHistory[0];
  const duration = Math.max((latest.t - earliest.t) / 1000, 1 / 120);

  return {
    vx: clamp((latest.x - earliest.x) / duration, -1800, 1800),
    vy: clamp((latest.y - earliest.y) / duration, -1800, 1800)
  };
}

function onPointerDown(event) {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }

  const target = event.target.closest("[data-emoji-id]");
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const emojiId = Number.parseInt(target.dataset.emojiId ?? "", 10);
  const emoji = getEmojiById(emojiId);
  if (!emoji) {
    return;
  }

  event.preventDefault();

  dragState = {
    pointerId: event.pointerId,
    emojiId,
    offsetX: emoji.x - event.clientX,
    offsetY: emoji.y - event.clientY,
    pointerHistory: [{ x: event.clientX, y: event.clientY, t: performance.now() }],
    element: target
  };

  emoji.dragging = true;
  emoji.vx = 0;
  emoji.vy = 0;
  emoji.spin = 0;

  target.style.cursor = "grabbing";
  target.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const emoji = getEmojiById(dragState.emojiId);
  if (!emoji) {
    return;
  }

  emoji.x = clamp(event.clientX + dragState.offsetX, emoji.radius, worldWidth - emoji.radius);
  emoji.y = clamp(event.clientY + dragState.offsetY, emoji.radius, worldHeight - emoji.radius);

  pushPointerSample(dragState.pointerHistory, event);
}

function releasePointer(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const emoji = getEmojiById(dragState.emojiId);
  if (emoji) {
    const throwVelocity = calculateThrowVelocity(dragState.pointerHistory);
    emoji.dragging = false;
    emoji.vx = throwVelocity.vx;
    emoji.vy = throwVelocity.vy;
    emoji.spin = throwVelocity.vx * 0.08;
  }

  dragState.element.style.cursor = "grab";
  dragState.element.releasePointerCapture?.(event.pointerId);
  dragState = null;
}

function onResize() {
  worldWidth = window.innerWidth;
  worldHeight = window.innerHeight;

  for (const emoji of emojis) {
    emoji.x = clamp(emoji.x, emoji.radius, worldWidth - emoji.radius);
    emoji.y = clamp(emoji.y, emoji.radius, worldHeight - emoji.radius);
  }

  render();
}

function runFrames(frameCount) {
  const safeCount = clamp(Math.trunc(frameCount), 0, 2000);
  for (let frame = 0; frame < safeCount; frame += 1) {
    step(SETTINGS.fixedStep);
  }
  render();
}

function getState() {
  return emojis.map((emoji) => ({
    id: emoji.id,
    symbol: emoji.symbol,
    radius: round(emoji.radius),
    x: round(emoji.x),
    y: round(emoji.y),
    vx: round(emoji.vx),
    vy: round(emoji.vy),
    angle: round(emoji.angle)
  }));
}

window.__emojiLab = {
  spawnBurst,
  runFrames,
  getState
};

dropButton.addEventListener("click", () => {
  spawnBurst();
});

window.addEventListener("resize", onResize);
window.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", releasePointer);
window.addEventListener("pointercancel", releasePointer);

updateStatus();
render();

if (!isTestMode) {
  rafId = requestAnimationFrame(tick);
}

window.addEventListener("beforeunload", () => {
  if (rafId) {
    cancelAnimationFrame(rafId);
  }
});
