// Offline render check. No speakers required: every named sound is rendered
// through the same bus/master/limiter graph the live engine uses, then measured
// for silence, clipping, peak and duration.
//
// Open src/audio/check.html on the dev server, or in a browser as a file.
// `window.__audioCheck` holds the machine-readable result.

import { SOUND_NAMES, resolveSound } from "./sounds.js";
import { connectOutput } from "./engine.js";
import { KEY_VARIANTS, renderKey, installTyping } from "./typing.js";
import { buildBed } from "./ambience.js";

const SAMPLE_RATE = 44100;
const PEAK_CEILING = 0.85;
const CLIP_LINE = 0.99;
const SILENCE_FLOOR = 0.004;

function analyse(buffer) {
  const data = buffer.getChannelData(0);
  let peak = 0;
  let sum = 0;
  let loud = 0;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const abs = Math.abs(value);
    if (abs > peak) peak = abs;
    sum += value * value;
    if (abs > 0.0005) loud++;
  }
  return {
    samples: data.length,
    seconds: buffer.duration,
    peak,
    rms: Math.sqrt(sum / Math.max(1, data.length)),
    loudRatio: loud / Math.max(1, data.length),
  };
}

function assess(name, expectedSeconds, stats) {
  const checks = {
    samples: stats.samples > 0,
    nonSilent: stats.peak > SILENCE_FLOOR,
    audibleRms: stats.rms > 0.0001,
    noClipping: stats.peak < CLIP_LINE,
    boundedPeak: stats.peak <= PEAK_CEILING,
    saneDuration: expectedSeconds >= 0.02 && expectedSeconds <= 3.5,
    renderedDuration: Math.abs(stats.seconds - expectedSeconds) < 0.02,
  };
  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  return { name, passed: failed.length === 0, failed, checks };
}

async function renderSound(name) {
  const spec = resolveSound(name);
  if (!spec) {
    return { name, passed: false, failed: ["missing"], stats: null, checks: {} };
  }

  const seconds = Math.max(0.3, spec.duration + 0.2);
  const ctx = new OfflineAudioContext(1, Math.ceil(SAMPLE_RATE * seconds), SAMPLE_RATE);
  const { buses } = connectOutput(ctx, { volume: 1 });
  spec.render(ctx, buses[spec.bus] || buses.ui, 0.01, { gain: 1 });
  const buffer = await ctx.startRendering();
  const stats = analyse(buffer);
  return { ...assess(name, seconds, stats), bus: spec.bus, designMs: Math.round(spec.duration * 1000), stats };
}

async function renderKeyVariant(variant) {
  const seconds = 0.25;
  const ctx = new OfflineAudioContext(1, Math.ceil(SAMPLE_RATE * seconds), SAMPLE_RATE);
  const { buses } = connectOutput(ctx, { volume: 1 });
  renderKey(ctx, buses.keyboard, 0.01, { variant, gain: 1, pitch: 1 });
  const buffer = await ctx.startRendering();
  const stats = analyse(buffer);
  return {
    ...assess(`keyboard.${variant}`, seconds, stats),
    bus: "keyboard",
    designMs: Math.round(0.08 * 1000),
    stats,
  };
}

async function renderAmbience() {
  const seconds = 3;
  const ctx = new OfflineAudioContext(1, Math.ceil(SAMPLE_RATE * seconds), SAMPLE_RATE);
  const bed = buildBed(ctx, ctx.destination, { load: 0.8 });
  bed.stop(2.6);
  const buffer = await ctx.startRendering();
  const stats = analyse(buffer);
  const checks = {
    samples: stats.samples > 0,
    nonSilent: stats.peak > 0.001,
    noClipping: stats.peak < CLIP_LINE,
    boundedPeak: stats.peak <= 0.5,
    saneDuration: true,
    renderedDuration: Math.abs(stats.seconds - seconds) < 0.02,
  };
  const failed = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([key]) => key);
  return {
    name: "ambience.office",
    bus: "ambience",
    designMs: 2600,
    passed: failed.length === 0,
    failed,
    checks,
    stats,
  };
}

/** The keyboard listener must ignore repeats, modifiers and shortcuts. */
function checkTypingRouting() {
  const input = document.createElement("input");
  input.type = "text";
  document.body.append(input);
  const seen = [];
  const uninstall = installTyping((variant) => seen.push(variant));
  const fire = (key, options = {}) =>
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...options }));

  fire("a");
  fire("a", { repeat: true });
  fire("a", { ctrlKey: true });
  fire("a", { altKey: true });
  fire("Control");
  fire("Shift");
  fire("Escape");
  fire("Enter");
  fire("Backspace");
  fire(" ");

  uninstall();
  input.remove();

  const expected = ["key", "enter", "backspace", "space"];
  const passed = seen.length === expected.length && seen.every((variant, index) => variant === expected[index]);
  return {
    name: "keyboard.routing",
    bus: "keyboard",
    designMs: 0,
    passed,
    failed: passed ? [] : ["routing"],
    checks: { routing: passed },
    seen,
    stats: null,
  };
}

function fmt(value, digits = 4) {
  return Number(value).toFixed(digits);
}

export async function run() {
  const body = document.getElementById("rows");
  const summary = document.getElementById("summary");
  const status = document.getElementById("status");
  if (body) body.innerHTML = "";
  if (summary) summary.textContent = "Rendering…";
  if (status) status.textContent = "running";

  window.__audioCheck = { done: false, results: [] };

  const names = [...SOUND_NAMES];
  const results = [];
  const total = names.length + KEY_VARIANTS.length + 2;

  for (const name of names) {
    const result = await renderSound(name);
    results.push(result);
    addRow(body, result);
    if (summary) summary.textContent = `${results.length} / ${total} rendered`;
  }

  for (const variant of KEY_VARIANTS) {
    const result = await renderKeyVariant(variant);
    results.push(result);
    addRow(body, result);
  }

  const ambience = await renderAmbience();
  results.push(ambience);
  addRow(body, ambience);

  const routing = checkTypingRouting();
  results.push(routing);
  addRow(body, routing);

  const failed = results.filter((result) => !result.passed).length;
  const worstPeak = Math.max(...results.map((result) => result.stats?.peak || 0));
  const summaryText = `${results.length} renders · ${failed} failed · peak ${fmt(worstPeak)} / ${PEAK_CEILING} ceiling`;
  if (summary) summary.textContent = summaryText;
  if (status) {
    status.textContent = failed ? "failed" : "passed";
    status.className = failed ? "fail" : "pass";
  }

  const payload = {
    done: true,
    passed: failed === 0,
    failed,
    total: results.length,
    peakCeiling: PEAK_CEILING,
    worstPeak,
    results: results.map((result) => ({
      name: result.name,
      bus: result.bus,
      designMs: result.designMs,
      passed: result.passed,
      failed: result.failed,
      samples: result.stats?.samples,
      seconds: result.stats ? Number(fmt(result.stats.seconds, 3)) : null,
      peak: result.stats ? Number(fmt(result.stats.peak)) : null,
      rms: result.stats ? Number(fmt(result.stats.rms, 5)) : null,
      loudRatio: result.stats ? Number(fmt(result.stats.loudRatio, 4)) : null,
      seen: result.seen,
    })),
  };
  window.__audioCheck = payload;
  return payload;
}

function addRow(body, result) {
  if (!body) return;
  const row = document.createElement("tr");
  const cells = [
    result.name,
    result.bus || "—",
    result.designMs ? `${result.designMs} ms` : "—",
    result.stats ? fmt(result.stats.peak) : "—",
    result.stats ? fmt(result.stats.rms, 5) : "—",
    result.stats ? fmt(result.stats.seconds, 2) + " s" : "—",
    result.passed ? "PASS" : `FAIL (${result.failed.join(", ")})`,
  ];
  for (const [index, value] of cells.entries()) {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (index === cells.length - 1) cell.className = result.passed ? "pass" : "fail";
    row.append(cell);
  }
  body.append(row);
}

const again = document.getElementById("again");
again?.addEventListener("click", () => run());

window.audioCheck = { run };
window.__audioCheckPromise = run();
