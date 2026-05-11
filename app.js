const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const ANIMATIONS = {
  idle: { label: "Idle", rowColor: "#087d7a" },
  walk: { label: "Walk", rowColor: "#c78a14" },
  run: { label: "Run", rowColor: "#d94c35" },
  attack: { label: "Attack", rowColor: "#6654c8" },
  dying: { label: "Dying", rowColor: "#4c565c" }
};

const MAX_CANVAS_DIMENSION = 16384;
const MAX_CANVAS_PIXELS = 90000000;

const elements = {
  frontUpload: document.querySelector("#frontUpload"),
  backUpload: document.querySelector("#backUpload"),
  sideUpload: document.querySelector("#sideUpload"),
  frontName: document.querySelector("#frontName"),
  backName: document.querySelector("#backName"),
  sideName: document.querySelector("#sideName"),
  promptInput: document.querySelector("#promptInput"),
  frameCount: document.querySelector("#frameCount"),
  frameCountValue: document.querySelector("#frameCountValue"),
  cellSize: document.querySelector("#cellSize"),
  cellSizeValue: document.querySelector("#cellSizeValue"),
  generateButton: document.querySelector("#generateButton"),
  sampleButton: document.querySelector("#sampleButton"),
  sheetCanvas: document.querySelector("#sheetCanvas"),
  stripCanvas: document.querySelector("#stripCanvas"),
  sheetStats: document.querySelector("#sheetStats"),
  downloadPngButton: document.querySelector("#downloadPngButton"),
  downloadJsonButton: document.querySelector("#downloadJsonButton"),
  playButton: document.querySelector("#playButton"),
  previewSelect: document.querySelector("#previewSelect"),
  aiEndpoint: document.querySelector("#aiEndpoint"),
  runAiButton: document.querySelector("#runAiButton"),
  copyPromptButton: document.querySelector("#copyPromptButton"),
  aiPrompt: document.querySelector("#aiPrompt"),
  statusBox: document.querySelector("#statusBox")
};

const state = {
  refs: {
    front: null,
    back: null,
    side: null
  },
  files: {
    front: null,
    back: null,
    side: null
  },
  metadata: null,
  generatedAtScale: 1,
  playing: false,
  animationTimer: 0,
  activeFrame: 0
};

const sheetContext = elements.sheetCanvas.getContext("2d");
const stripContext = elements.stripCanvas.getContext("2d");

function setStatus(message, tone = "warn") {
  elements.statusBox.textContent = message;
  elements.statusBox.style.borderLeftColor = tone === "good" ? "var(--teal)" : tone === "bad" ? "var(--coral)" : "var(--amber)";
  elements.statusBox.style.background = tone === "good" ? "#e9f8f5" : tone === "bad" ? "#fff0ed" : "#fff8e8";
  elements.statusBox.style.color = tone === "good" ? "#064c49" : tone === "bad" ? "#782516" : "#5a3c05";
}

function selectedAnimations() {
  return Array.from(document.querySelectorAll("#animationToggles input:checked")).map((input) => input.value);
}

function getSettings() {
  return {
    prompt: elements.promptInput.value.trim(),
    frameCount: Number(elements.frameCount.value),
    cellSize: Number(elements.cellSize.value),
    animations: selectedAnimations(),
    directions: DIRECTIONS.slice()
  };
}

function updateRangeLabels() {
  elements.frameCountValue.textContent = elements.frameCount.value;
  elements.cellSizeValue.textContent = elements.cellSize.value;
  updateAiPrompt();
}

function buildAiPrompt() {
  const settings = getSettings();
  const actions = settings.animations.map((id) => ANIMATIONS[id].label).join(", ");
  const prompt = settings.prompt || "pixel art fantasy hero with a clean readable silhouette";
  return [
    "Create a transparent-background pixel art sprite sheet from three reference views: front, back, and side.",
    `Character: ${prompt}.`,
    `Generate these animations: ${actions || "none selected"}.`,
    `Frames per animation: ${settings.frameCount}. Sprite cell size: ${settings.cellSize} x ${settings.cellSize} px.`,
    "Directions required for every animation: N, NE, E, SE, S, SW, W, NW.",
    "Keep the character identity, colors, outfit details, weapon scale, and silhouette consistent across all frames.",
    "Use nearest-neighbor pixel edges, transparent background, no shadows outside the sprite cell, and no labels in the image.",
    "Output a grid sprite sheet plus JSON metadata with animation name, direction, row, frame index, x, y, width, height, and durationMs."
  ].join("\n");
}

function updateAiPrompt() {
  elements.aiPrompt.value = buildAiPrompt();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

async function handleUpload(kind, file, labelElement) {
  if (!file) return;
  try {
    const image = await loadImageFromFile(file);
    state.refs[kind] = image;
    state.files[kind] = file;
    labelElement.textContent = file.name;
    setStatus(`${file.name} loaded. Generate again to update the sheet.`, "good");
  } catch (error) {
    setStatus(error.message, "bad");
  }
}

function makeSampleSprite(view) {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 48, 48);

  const palette = {
    outline: "#1c2024",
    skin: "#d8a06a",
    hair: view === "back" ? "#2c1d1b" : "#39231f",
    tunic: view === "back" ? "#1f6f70" : "#0b8f83",
    trim: "#f0c15a",
    pants: "#313c67",
    boot: "#2a2629",
    blade: "#b9c3c9"
  };

  const px = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  if (view === "side") {
    px(18, 5, 12, 4, palette.outline);
    px(16, 9, 16, 12, palette.outline);
    px(18, 10, 12, 10, palette.skin);
    px(27, 13, 3, 3, palette.outline);
    px(20, 4, 10, 5, palette.hair);
    px(18, 22, 14, 14, palette.outline);
    px(20, 23, 12, 12, palette.tunic);
    px(31, 25, 7, 4, palette.outline);
    px(32, 26, 8, 2, palette.blade);
    px(20, 36, 5, 7, palette.pants);
    px(27, 36, 5, 7, palette.pants);
    px(18, 43, 8, 3, palette.boot);
    px(27, 43, 8, 3, palette.boot);
  } else {
    px(16, 5, 16, 4, palette.outline);
    px(14, 9, 20, 13, palette.outline);
    px(17, 10, 14, 11, palette.skin);
    px(16, 4, 16, 6, palette.hair);
    if (view === "front") {
      px(19, 14, 3, 3, palette.outline);
      px(27, 14, 3, 3, palette.outline);
    }
    px(14, 22, 20, 15, palette.outline);
    px(16, 23, 16, 13, palette.tunic);
    px(16, 27, 16, 3, palette.trim);
    px(9, 24, 6, 12, palette.outline);
    px(34, 24, 6, 12, palette.outline);
    px(11, 25, 4, 10, palette.skin);
    px(34, 25, 4, 10, palette.skin);
    px(17, 37, 5, 7, palette.pants);
    px(27, 37, 5, 7, palette.pants);
    px(14, 44, 9, 3, palette.boot);
    px(26, 44, 9, 3, palette.boot);
  }

  return canvas;
}

function useSampleCharacter() {
  state.refs.front = makeSampleSprite("front");
  state.refs.back = makeSampleSprite("back");
  state.refs.side = makeSampleSprite("side");
  state.files.front = null;
  state.files.back = null;
  state.files.side = null;
  elements.frontName.textContent = "Sample front";
  elements.backName.textContent = "Sample back";
  elements.sideName.textContent = "Sample side";
  if (!elements.promptInput.value.trim()) {
    elements.promptInput.value = "small heroic adventurer with teal armor, gold belt, dark boots, readable pixel silhouette";
  }
  updateAiPrompt();
  generateSheet();
}

function sourceForDirection(direction) {
  const { front, back, side } = state.refs;
  if (direction === "S") return { image: front || side || back, mirror: false, blend: null };
  if (direction === "N") return { image: back || side || front, mirror: false, blend: null };
  if (direction === "E") return { image: side || front || back, mirror: false, blend: null };
  if (direction === "W") return { image: side || front || back, mirror: true, blend: null };
  if (direction === "NE") return { image: side || back || front, mirror: false, blend: back || null };
  if (direction === "NW") return { image: side || back || front, mirror: true, blend: back || null };
  if (direction === "SE") return { image: side || front || back, mirror: false, blend: front || null };
  return { image: side || front || back, mirror: true, blend: front || null };
}

function directionVector(direction) {
  const vectors = {
    N: { x: 0, y: -1 },
    NE: { x: 0.7, y: -0.7 },
    E: { x: 1, y: 0 },
    SE: { x: 0.7, y: 0.7 },
    S: { x: 0, y: 1 },
    SW: { x: -0.7, y: 0.7 },
    W: { x: -1, y: 0 },
    NW: { x: -0.7, y: -0.7 }
  };
  return vectors[direction];
}

function motionFor(animation, frame, frameCount, direction) {
  const phase = frameCount <= 1 ? 0 : frame / frameCount;
  const wave = Math.sin(phase * Math.PI * 2);
  const bounce = Math.abs(wave);
  const vector = directionVector(direction);
  const motion = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    effect: null
  };

  if (animation === "idle") {
    motion.y = -bounce * 0.035;
    motion.scaleY = 1 + wave * 0.015;
  }

  if (animation === "walk") {
    motion.x = vector.x * wave * 0.055;
    motion.y = -bounce * 0.045;
    motion.rotation = wave * 0.04;
  }

  if (animation === "run") {
    motion.x = vector.x * wave * 0.09;
    motion.y = -bounce * 0.07;
    motion.rotation = wave * 0.075;
    motion.effect = "speed";
  }

  if (animation === "attack") {
    const strike = Math.sin(Math.min(phase, 0.75) / 0.75 * Math.PI);
    motion.x = vector.x * strike * 0.16;
    motion.y = vector.y * strike * 0.06;
    motion.rotation = vector.x * strike * 0.12;
    motion.effect = frame > frameCount * 0.35 && frame < frameCount * 0.72 ? "slash" : null;
  }

  if (animation === "dying") {
    const fall = frame / Math.max(1, frameCount - 1);
    motion.y = fall * 0.18;
    motion.rotation = (direction === "W" || direction === "NW" || direction === "SW" ? -1 : 1) * fall * 1.15;
    motion.scaleY = 1 - fall * 0.18;
    motion.alpha = 1 - fall * 0.45;
    motion.effect = "dust";
  }

  return motion;
}

function drawPixelatedImage(ctx, image, x, y, width, height, mirror = false) {
  const ratio = Math.min(width / image.width, height / image.height);
  const drawWidth = Math.max(1, Math.floor(image.width * ratio));
  const drawHeight = Math.max(1, Math.floor(image.height * ratio));
  const drawX = x + Math.floor((width - drawWidth) / 2);
  const drawY = y + Math.floor((height - drawHeight) / 2);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (mirror) {
    ctx.translate(drawX + drawWidth, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
  } else {
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }
  ctx.restore();
}

function drawEffect(ctx, effect, cell, direction, frame, frameCount) {
  const vector = directionVector(direction);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (effect === "speed") {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    const baseY = cell * 0.62;
    for (let i = 0; i < 3; i += 1) {
      const length = cell * (0.1 + i * 0.04);
      const x = cell * 0.5 - vector.x * cell * (0.18 + i * 0.06);
      ctx.fillRect(x, baseY + i * cell * 0.05, length, Math.max(1, cell * 0.02));
    }
  }

  if (effect === "slash") {
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#f3d777";
    ctx.lineWidth = Math.max(2, cell * 0.035);
    ctx.beginPath();
    const startX = cell * (0.5 + vector.x * 0.05);
    const startY = cell * (0.42 + vector.y * 0.04);
    ctx.moveTo(startX - vector.y * cell * 0.18, startY + vector.x * cell * 0.18);
    ctx.lineTo(startX + vector.x * cell * 0.28, startY + vector.y * cell * 0.28);
    ctx.stroke();
  }

  if (effect === "dust") {
    ctx.globalAlpha = 0.28 + frame / Math.max(1, frameCount) * 0.25;
    ctx.fillStyle = "#8d7460";
    const y = cell * 0.78;
    ctx.fillRect(cell * 0.25, y, cell * 0.17, Math.max(1, cell * 0.035));
    ctx.fillRect(cell * 0.52, y + cell * 0.04, cell * 0.22, Math.max(1, cell * 0.035));
  }
  ctx.restore();
}

function drawFrame(ctx, animation, direction, frame, frameCount, cell) {
  const source = sourceForDirection(direction);
  const motion = motionFor(animation, frame, frameCount, direction);
  ctx.clearRect(0, 0, cell, cell);

  if (!source.image) return;

  ctx.save();
  ctx.globalAlpha = motion.alpha;
  ctx.translate(cell / 2 + motion.x * cell, cell / 2 + motion.y * cell);
  ctx.rotate(motion.rotation);
  ctx.scale(motion.scaleX, motion.scaleY);

  if (source.blend && source.blend !== source.image) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    drawPixelatedImage(ctx, source.blend, -cell * 0.35, -cell * 0.38, cell * 0.7, cell * 0.78, source.mirror);
    ctx.restore();
  }

  drawPixelatedImage(ctx, source.image, -cell * 0.36, -cell * 0.4, cell * 0.72, cell * 0.8, source.mirror);
  ctx.restore();
  drawEffect(ctx, motion.effect, cell, direction, frame, frameCount);
}

function computeCanvasScale(width, height) {
  const dimensionScale = Math.min(1, MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
  const pixelScale = Math.min(1, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height)));
  return Math.min(dimensionScale, pixelScale);
}

function generateMetadata(settings, actualCell, totalWidth, totalHeight) {
  const rows = [];
  let row = 0;
  settings.animations.forEach((animation) => {
    DIRECTIONS.forEach((direction) => {
      rows.push({
        animation,
        direction,
        row,
        frames: Array.from({ length: settings.frameCount }, (_, frame) => ({
          frame,
          x: frame * actualCell,
          y: row * actualCell,
          width: actualCell,
          height: actualCell,
          durationMs: animation === "run" ? 70 : animation === "attack" ? 85 : 110
        }))
      });
      row += 1;
    });
  });

  return {
    app: "AI Sprite Sheet Generator",
    createdAt: new Date().toISOString(),
    prompt: settings.prompt,
    requestedCellSize: settings.cellSize,
    generatedCellSize: actualCell,
    frameCount: settings.frameCount,
    directions: DIRECTIONS,
    animations: settings.animations,
    sheet: {
      width: totalWidth,
      height: totalHeight,
      rows: rows.length,
      columns: settings.frameCount
    },
    rows
  };
}

function refreshPreviewOptions(metadata) {
  elements.previewSelect.innerHTML = "";
  metadata.rows.forEach((row) => {
    const option = document.createElement("option");
    option.value = `${row.animation}:${row.direction}`;
    option.textContent = `${ANIMATIONS[row.animation].label} ${row.direction}`;
    elements.previewSelect.append(option);
  });
}

function drawStrip() {
  if (!state.metadata) return;
  const selected = elements.previewSelect.value;
  const [animation, direction] = selected.split(":");
  const row = state.metadata.rows.find((item) => item.animation === animation && item.direction === direction);
  if (!row) return;

  const frameCount = row.frames.length;
  const stripCell = Math.max(48, Math.min(128, Math.floor(elements.stripCanvas.clientWidth / Math.max(1, frameCount))));
  elements.stripCanvas.width = stripCell * frameCount;
  elements.stripCanvas.height = stripCell;
  stripContext.imageSmoothingEnabled = false;
  stripContext.clearRect(0, 0, elements.stripCanvas.width, elements.stripCanvas.height);

  row.frames.forEach((frame, index) => {
    stripContext.drawImage(
      elements.sheetCanvas,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      index * stripCell,
      0,
      stripCell,
      stripCell
    );
  });

  if (state.playing) {
    stripContext.save();
    stripContext.strokeStyle = "#d94c35";
    stripContext.lineWidth = Math.max(2, Math.floor(stripCell * 0.04));
    stripContext.strokeRect(state.activeFrame * stripCell + 2, 2, stripCell - 4, stripCell - 4);
    stripContext.restore();
  }
}

function generateSheet() {
  const settings = getSettings();
  if (settings.animations.length === 0) {
    setStatus("Choose at least one animation before generating.", "bad");
    return;
  }

  if (!state.refs.front && !state.refs.back && !state.refs.side) {
    useSampleCharacter();
    return;
  }

  const requestedWidth = settings.cellSize * settings.frameCount;
  const requestedHeight = settings.cellSize * settings.animations.length * DIRECTIONS.length;
  const renderScale = computeCanvasScale(requestedWidth, requestedHeight);
  const actualCell = Math.max(1, Math.floor(settings.cellSize * renderScale));
  const totalWidth = actualCell * settings.frameCount;
  const totalHeight = actualCell * settings.animations.length * DIRECTIONS.length;

  elements.sheetCanvas.width = totalWidth;
  elements.sheetCanvas.height = totalHeight;
  sheetContext.imageSmoothingEnabled = false;
  sheetContext.clearRect(0, 0, totalWidth, totalHeight);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = actualCell;
  tempCanvas.height = actualCell;
  const tempContext = tempCanvas.getContext("2d");
  tempContext.imageSmoothingEnabled = false;

  let row = 0;
  settings.animations.forEach((animation) => {
    DIRECTIONS.forEach((direction) => {
      for (let frame = 0; frame < settings.frameCount; frame += 1) {
        drawFrame(tempContext, animation, direction, frame, settings.frameCount, actualCell);
        sheetContext.drawImage(tempCanvas, frame * actualCell, row * actualCell);
      }
      row += 1;
    });
  });

  state.generatedAtScale = renderScale;
  state.metadata = generateMetadata(settings, actualCell, totalWidth, totalHeight);
  refreshPreviewOptions(state.metadata);
  drawStrip();

  const megapixels = Math.round((totalWidth * totalHeight) / 100000) / 10;
  elements.sheetStats.textContent = `${totalWidth} x ${totalHeight}px, ${state.metadata.sheet.rows} rows, ${settings.frameCount} columns, ${megapixels} MP`;
  elements.downloadPngButton.disabled = false;
  elements.downloadJsonButton.disabled = false;

  if (renderScale < 1) {
    setStatus(`Generated a scaled preview because the requested sheet is too large for browser canvas limits. Lower sprite size, frame count, or selected animations for full-size PNG export.`, "warn");
  } else {
    setStatus("Sprite sheet generated. Download PNG and JSON when ready.", "good");
  }
  updateAiPrompt();
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function downloadPng() {
  if (!state.metadata) return;
  elements.sheetCanvas.toBlob((blob) => {
    if (!blob) {
      setStatus("The browser could not export this PNG. Try a smaller sheet.", "bad");
      return;
    }
    const suffix = state.generatedAtScale < 1 ? "preview" : "full";
    downloadBlob(blob, `sprite-sheet-${suffix}.png`);
  }, "image/png");
}

function downloadJson() {
  if (!state.metadata) return;
  const blob = new Blob([JSON.stringify(state.metadata, null, 2)], { type: "application/json" });
  downloadBlob(blob, "sprite-sheet-metadata.json");
}

function tickPlayback() {
  if (!state.playing || !state.metadata) return;
  const [animation, direction] = elements.previewSelect.value.split(":");
  const row = state.metadata.rows.find((item) => item.animation === animation && item.direction === direction);
  const duration = row?.frames?.[state.activeFrame]?.durationMs || 110;
  state.activeFrame = (state.activeFrame + 1) % (row?.frames?.length || 1);
  drawStrip();
  state.animationTimer = window.setTimeout(tickPlayback, duration);
}

function togglePlayback() {
  state.playing = !state.playing;
  elements.playButton.classList.toggle("primary", state.playing);
  if (state.playing) {
    tickPlayback();
  } else {
    window.clearTimeout(state.animationTimer);
    state.activeFrame = 0;
    drawStrip();
  }
}

async function copyPrompt() {
  updateAiPrompt();
  try {
    await navigator.clipboard.writeText(elements.aiPrompt.value);
    setStatus("AI production prompt copied.", "good");
  } catch {
    elements.aiPrompt.focus();
    elements.aiPrompt.select();
    setStatus("Prompt selected. Use your keyboard copy shortcut.", "warn");
  }
}

async function runAiJob() {
  const endpoint = elements.aiEndpoint.value.trim();
  if (!endpoint) {
    generateSheet();
    setStatus("No private AI endpoint set, so I generated the local preview. Add a backend URL when you are ready for production AI images.", "warn");
    return;
  }

  const settings = getSettings();
  const formData = new FormData();
  formData.append("spec", JSON.stringify(settings));
  formData.append("prompt", buildAiPrompt());
  Object.entries(state.files).forEach(([kind, file]) => {
    if (file) formData.append(kind, file, file.name);
  });

  try {
    elements.runAiButton.disabled = true;
    setStatus("Sending references to the private AI endpoint...", "warn");
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData
    });
    if (!response.ok) throw new Error(`AI endpoint returned ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("image/")) {
      const blob = await response.blob();
      const image = await loadImageFromFile(new File([blob], "ai-result.png", { type: blob.type }));
      elements.sheetCanvas.width = image.width;
      elements.sheetCanvas.height = image.height;
      sheetContext.clearRect(0, 0, image.width, image.height);
      sheetContext.drawImage(image, 0, 0);
      setStatus("AI result loaded into the preview.", "good");
    } else {
      const result = await response.json();
      setStatus(result.message || "AI job finished. Check your backend response for the generated asset URL.", "good");
    }
  } catch (error) {
    setStatus(error.message, "bad");
  } finally {
    elements.runAiButton.disabled = false;
  }
}

elements.frontUpload.addEventListener("change", (event) => handleUpload("front", event.target.files[0], elements.frontName));
elements.backUpload.addEventListener("change", (event) => handleUpload("back", event.target.files[0], elements.backName));
elements.sideUpload.addEventListener("change", (event) => handleUpload("side", event.target.files[0], elements.sideName));
elements.frameCount.addEventListener("input", updateRangeLabels);
elements.cellSize.addEventListener("input", updateRangeLabels);
elements.promptInput.addEventListener("input", updateAiPrompt);
document.querySelector("#animationToggles").addEventListener("change", updateAiPrompt);
elements.generateButton.addEventListener("click", generateSheet);
elements.sampleButton.addEventListener("click", useSampleCharacter);
elements.downloadPngButton.addEventListener("click", downloadPng);
elements.downloadJsonButton.addEventListener("click", downloadJson);
elements.playButton.addEventListener("click", togglePlayback);
elements.previewSelect.addEventListener("change", () => {
  state.activeFrame = 0;
  drawStrip();
});
elements.copyPromptButton.addEventListener("click", copyPrompt);
elements.runAiButton.addEventListener("click", runAiJob);

updateRangeLabels();
useSampleCharacter();
