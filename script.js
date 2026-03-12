const app = document.getElementById("app");
const emojiLayer = document.getElementById("emojiLayer");
const dropButton = document.getElementById("dropButton");
const resetButton = document.getElementById("resetButton");
const emojiCountInput = document.getElementById("emojiCount");
const status = document.getElementById("status");
const emojiTemplate = document.getElementById("emojiTemplate");

if (
  !(app instanceof HTMLElement) ||
  !(emojiLayer instanceof HTMLElement) ||
  !(dropButton instanceof HTMLButtonElement) ||
  !(resetButton instanceof HTMLButtonElement) ||
  !(emojiCountInput instanceof HTMLInputElement) ||
  !(status instanceof HTMLElement) ||
  !(emojiTemplate instanceof HTMLTemplateElement)
) {
  throw new Error("필수 DOM 요소를 찾을 수 없습니다.");
}

const query = new URLSearchParams(window.location.search);
const seed = Number.parseInt(query.get("seed") ?? "", 10);
const isTestMode = query.get("test") === "1";

const random = Number.isFinite(seed) ? createRng(seed) : Math.random;
const emojiPattern = /\p{Extended_Pictographic}/u;

const SETTINGS = {
  defaultBurstCount: 20,
  maxBurstCount: 800,
  gravity: 2400,
  airDrag: 0.992,
  wallBounce: 0.82,
  floorBounce: 0.74,
  buttonBounce: 0.78,
  emojiBounce: 0.84,
  floorFriction: 0.985,
  buttonTopFriction: 0.99,
  minTopBounceVelocity: 160,
  fixedStep: 1 / 120,
  maxPhysicsStepsPerFrame: 4,
  collisionCellSize: 56
};

const emojis = [];
const emojiById = new Map();
let nextEmojiId = 1;
let worldWidth = window.innerWidth;
let worldHeight = window.innerHeight;
let lastFrameTime = performance.now();
let accumulator = 0;
let rafId = 0;
let dragState = null;

const emojiCatalog = buildEmojiCatalog();
const availableSymbols = [];
const pairKeyBase = emojiCatalog.length + 1;
const broadPhaseBuckets = new Map();
const seenCollisionPairs = new Set();
const collisionPairKeys = [];
const BUCKET_COORD_OFFSET = 32768;
const BUCKET_COORD_SPAN = 65536;
let nextSymbolIndex = 0;

resetSymbolPool();
emojiCountInput.value = String(SETTINGS.defaultBurstCount);

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

function shuffleInPlace(list) {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }

  return list;
}

function buildEmojiCatalog() {
  const ranges = [
    [0x1f300, 0x1faff],
    [0x2600, 0x27bf]
  ];

  const excluded = new Set([0x200d, 0xfe0f, 0x20e3]);
  for (let code = 0x1f3fb; code <= 0x1f3ff; code += 1) {
    excluded.add(code);
  }

  const unique = new Set();
  for (const [start, end] of ranges) {
    for (let code = start; code <= end; code += 1) {
      if (excluded.has(code)) {
        continue;
      }

      const symbol = String.fromCodePoint(code);
      if (emojiPattern.test(symbol)) {
        unique.add(symbol);
      }
    }
  }

  return [...unique];
}

function resetSymbolPool() {
  availableSymbols.length = 0;
  const shuffled = shuffleInPlace([...emojiCatalog]);
  availableSymbols.push(...shuffled);
  nextSymbolIndex = 0;
}

function getRemainingUniqueCount() {
  return Math.max(availableSymbols.length - nextSymbolIndex, 0);
}

function resetAll() {
  emojis.length = 0;
  emojiById.clear();
  nextEmojiId = 1;
  dragState = null;
  emojiLayer.replaceChildren();
  resetSymbolPool();
  updateStatus("초기화 완료");
}

function getRequestedCount() {
  const parsed = Number.parseInt(emojiCountInput.value ?? "", 10);
  const fallback = Number.isFinite(parsed) ? parsed : SETTINGS.defaultBurstCount;
  const count = clamp(Math.trunc(fallback), 1, SETTINGS.maxBurstCount);

  emojiCountInput.value = String(count);
  return count;
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
  return emojiById.get(id) ?? null;
}

function getBucketKey(cellX, cellY) {
  return (cellY + BUCKET_COORD_OFFSET) * BUCKET_COORD_SPAN + (cellX + BUCKET_COORD_OFFSET);
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

function applyEmojiVisualStyle(element, radius, id, symbol) {
  const codePoint = symbol.codePointAt(0) ?? 0;
  const hue = (codePoint * 31 + id * 17) % 360;
  const highlight = `hsla(${hue} 82% 66% / 0.34)`;
  const base = `hsla(${(hue + 35) % 360} 54% 14% / 0.9)`;

  element.style.width = `${radius * 2}px`;
  element.style.height = `${radius * 2}px`;
  element.style.fontSize = `${radius * 1.25}px`;
  element.style.zIndex = "20";
  element.style.willChange = "transform";
  element.style.background = `radial-gradient(120% 120% at 26% 18%, ${highlight} 0%, ${base} 62%, rgba(10, 10, 14, 0.92) 100%)`;
  element.style.borderColor = `hsla(${hue} 75% 70% / 0.36)`;
  element.style.boxShadow = `0 10px 26px rgba(0, 0, 0, 0.45), inset 0 0 0 1px hsla(${hue} 88% 72% / 0.12)`;
}

function createEmoji(symbol) {
  const radius = randomBetween(18, 24);
  const id = nextEmojiId;
  const element = makeEmojiElement(id, symbol);
  applyEmojiVisualStyle(element, radius, id, symbol);

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
    lastRenderX: Number.NaN,
    lastRenderY: Number.NaN,
    lastRenderAngle: Number.NaN,
    lastRenderScale: Number.NaN,
    element
  };

  nextEmojiId += 1;
  emojiById.set(id, emoji);
  emojiLayer.appendChild(emoji.element);
  emojis.push(emoji);
}

function spawnBurst(requestedCount = SETTINGS.defaultBurstCount) {
  const count = clamp(Math.trunc(requestedCount), 1, SETTINGS.maxBurstCount);
  const spawnable = Math.min(count, getRemainingUniqueCount());
  const startLength = emojis.length;

  for (let index = 0; index < spawnable; index += 1) {
    const symbol = availableSymbols[nextSymbolIndex];
    nextSymbolIndex += 1;
    if (typeof symbol !== "string") {
      break;
    }
    createEmoji(symbol);
  }

  const created = emojis.length - startLength;

  if (created === count) {
    updateStatus();
    return;
  }

  if (created === 0) {
    updateStatus("고유 이모지가 모두 소진되었습니다. 초기화를 눌러 다시 시작하세요");
    return;
  }

  updateStatus(`요청 ${count}개 중 ${created}개만 생성됨(중복 방지)`);
}

function updateStatus(extraMessage = "") {
  if (emojis.length === 0) {
    status.textContent = `개수를 입력하고 떨어뜨리기를 누르세요 · 남은 고유 이모지 ${getRemainingUniqueCount()}개`;
    return;
  }

  const base = `현재 ${emojis.length}개 · 남은 고유 이모지 ${getRemainingUniqueCount()}개`;
  status.textContent = extraMessage ? `${base} · ${extraMessage}` : base;
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

  if (
    emoji.x + emoji.radius < rect.left ||
    emoji.x - emoji.radius > rect.right ||
    emoji.y + emoji.radius < rect.top ||
    emoji.y - emoji.radius > rect.bottom
  ) {
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

function resolveEmojiCollisionsLegacy() {
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

function resolveEmojiCollisions() {
  if (isTestMode) {
    resolveEmojiCollisionsLegacy();
    return;
  }

  broadPhaseBuckets.clear();
  seenCollisionPairs.clear();
  collisionPairKeys.length = 0;

  const { collisionCellSize } = SETTINGS;

  for (let index = 0; index < emojis.length; index += 1) {
    const emoji = emojis[index];
    const minCellX = Math.floor((emoji.x - emoji.radius) / collisionCellSize);
    const maxCellX = Math.floor((emoji.x + emoji.radius) / collisionCellSize);
    const minCellY = Math.floor((emoji.y - emoji.radius) / collisionCellSize);
    const maxCellY = Math.floor((emoji.y + emoji.radius) / collisionCellSize);

    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const bucketKey = getBucketKey(cellX, cellY);
        let bucket = broadPhaseBuckets.get(bucketKey);
        if (!bucket) {
          bucket = [];
          broadPhaseBuckets.set(bucketKey, bucket);
        }
        bucket.push(index);
      }
    }
  }

  for (const bucket of broadPhaseBuckets.values()) {
    const bucketSize = bucket.length;
    if (bucketSize < 2) {
      continue;
    }

    for (let firstBucketIndex = 0; firstBucketIndex < bucketSize; firstBucketIndex += 1) {
      const firstIndex = bucket[firstBucketIndex];
      for (let secondBucketIndex = firstBucketIndex + 1; secondBucketIndex < bucketSize; secondBucketIndex += 1) {
        const secondIndex = bucket[secondBucketIndex];
        const minIndex = Math.min(firstIndex, secondIndex);
        const maxIndex = Math.max(firstIndex, secondIndex);
        const pairKey = minIndex * pairKeyBase + maxIndex;

        if (seenCollisionPairs.has(pairKey)) {
          continue;
        }

        seenCollisionPairs.add(pairKey);
        collisionPairKeys.push(pairKey);
      }
    }
  }

  collisionPairKeys.sort((left, right) => left - right);

  for (const pairKey of collisionPairKeys) {
    const firstIndex = Math.trunc(pairKey / pairKeyBase);
    const secondIndex = pairKey % pairKeyBase;
    const first = emojis[firstIndex];
    const second = emojis[secondIndex];

    if (!first || !second) {
      continue;
    }

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

function step(deltaTime, buttonRect) {
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
    const renderX = Math.round((emoji.x - emoji.radius) * 100) / 100;
    const renderY = Math.round((emoji.y - emoji.radius) * 100) / 100;
    const renderAngle = Math.round(emoji.angle * 100) / 100;

    if (
      renderX === emoji.lastRenderX &&
      renderY === emoji.lastRenderY &&
      renderAngle === emoji.lastRenderAngle &&
      scale === emoji.lastRenderScale
    ) {
      continue;
    }

    emoji.element.style.transform = `translate3d(${renderX}px, ${renderY}px, 0) rotate(${renderAngle}deg) scale(${scale})`;
    emoji.lastRenderX = renderX;
    emoji.lastRenderY = renderY;
    emoji.lastRenderAngle = renderAngle;
    emoji.lastRenderScale = scale;
  }
}

function tick(now) {
  const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;
  accumulator += deltaTime;
  const buttonRect = getButtonRect();
  let processedSteps = 0;

  while (accumulator >= SETTINGS.fixedStep && processedSteps < SETTINGS.maxPhysicsStepsPerFrame) {
    step(SETTINGS.fixedStep, buttonRect);
    accumulator -= SETTINGS.fixedStep;
    processedSteps += 1;
  }

  if (processedSteps === SETTINGS.maxPhysicsStepsPerFrame) {
    accumulator = Math.min(accumulator, SETTINGS.fixedStep);
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

  emoji.element.style.zIndex = "60";
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
    emoji.element.style.zIndex = "20";
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
    step(SETTINGS.fixedStep, getButtonRect());
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
  resetAll,
  runFrames,
  getState,
  getRemainingUniqueCount,
  getCatalogSize: () => emojiCatalog.length
};

dropButton.addEventListener("click", () => {
  const count = getRequestedCount();
  spawnBurst(count);
});

resetButton.addEventListener("click", () => {
  resetAll();
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
