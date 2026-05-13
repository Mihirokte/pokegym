// Rest timer overlay. Appears at the bottom of the session view. Uses
// requestAnimationFrame for smooth updates, vibrates on zero, plays a short
// WebAudio chime.

import { el, haptic, formatDuration } from '../util.js';
import { TIMER_DEFAULTS } from '../config.js';
import { getSettings } from '../storage.js';

let root, label, ringFg, secsEl, state, rafId, audioCtx;

function getAudio() {
  if (audioCtx) return audioCtx;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  return audioCtx;
}

function beep(freq = 880, ms = 140) {
  const ctx = getAudio();
  if (!ctx || !getSettings().soundOn) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = freq;
  o.type = 'sine';
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
  o.connect(g).connect(ctx.destination);
  o.start();
  o.stop(ctx.currentTime + ms / 1000 + 0.02);
}

export function mountTimer(parent) {
  if (root && parent.contains(root)) return;
  root = el('div', { class: 'timer hidden', id: 'rest-timer' });

  const ring = el('svg', { viewBox: '0 0 80 80', class: 'timer-ring' });
  ring.innerHTML = `
    <circle cx="40" cy="40" r="34" class="ring-bg"/>
    <circle cx="40" cy="40" r="34" class="ring-fg"/>
  `;
  ringFg = ring.querySelector('.ring-fg');
  const secs = el('div', { class: 'timer-secs' }, '0:00');
  secsEl = secs;
  label = el('div', { class: 'timer-label' }, 'Rest');

  const presets = el('div', { class: 'timer-presets' },
    ...TIMER_DEFAULTS.presets.map(p =>
      el('button', { class: 'timer-preset', onClick: () => start(p), type: 'button' }, `${p}s`),
    ),
  );

  const controls = el('div', { class: 'timer-controls' },
    el('button', { class: 'timer-btn', onClick: toggle, type: 'button' }, '⏯'),
    el('button', { class: 'timer-btn', onClick: addTen, type: 'button' }, '+10'),
    el('button', { class: 'timer-btn danger', onClick: stop, type: 'button' }, '×'),
  );

  const left = el('div', { class: 'timer-dial' }, ring, secs);
  const right = el('div', { class: 'timer-body' }, label, presets, controls);

  root.append(left, right);
  parent.appendChild(root);
}

function render() {
  if (!state) return;
  const remain = Math.max(0, state.endsAt - Date.now());
  const frac = state.total > 0 ? (state.total * 1000 - remain) / (state.total * 1000) : 1;
  const clamped = Math.max(0, Math.min(1, frac));
  const circumference = 2 * Math.PI * 34;
  const dash = circumference;
  const offset = dash * clamped;
  ringFg.setAttribute('stroke-dasharray', String(dash));
  ringFg.setAttribute('stroke-dashoffset', String(offset));
  secsEl.textContent = formatDuration(remain / 1000);
  if (remain <= 0) {
    stop();
    onComplete();
    return;
  }
  rafId = requestAnimationFrame(render);
}

function onComplete() {
  if (getSettings().hapticOn) haptic([60, 30, 60]);
  beep(920, 120); setTimeout(() => beep(1280, 160), 180);
  label.textContent = 'Rest — Done';
  root.classList.add('complete');
  setTimeout(() => { root.classList.remove('complete'); hide(); }, 2400);
}

export function start(totalSec, opts = {}) {
  if (!root) return;
  state = {
    total: totalSec,
    endsAt: Date.now() + totalSec * 1000,
    paused: false,
  };
  root.classList.remove('hidden', 'complete');
  label.textContent = opts.label || 'Rest';
  if (getSettings().hapticOn) haptic(6);
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(render);
}

export function addTen() {
  if (!state) return;
  state.endsAt += 10_000;
  state.total += 10;
}

export function toggle() {
  if (!state) return;
  if (state.paused) {
    state.endsAt = Date.now() + state.remain;
    state.paused = false;
    rafId = requestAnimationFrame(render);
  } else {
    state.remain = Math.max(0, state.endsAt - Date.now());
    state.paused = true;
    cancelAnimationFrame(rafId);
    label.textContent = 'Paused';
  }
}

export function stop() {
  cancelAnimationFrame(rafId);
  state = null;
}

export function hide() {
  if (!root) return;
  root.classList.add('hidden');
  stop();
}
