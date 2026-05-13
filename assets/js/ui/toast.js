// Ephemeral toast notifications. Bottom-centered, stack up to 3.
import { el, qs, haptic } from '../util.js';

const STACK_MAX = 3;
let host;

function ensureHost() {
  if (host && document.body.contains(host)) return host;
  host = qs('#toast-host') || el('div', { id: 'toast-host', class: 'toast-host' });
  if (!host.parentNode) document.body.appendChild(host);
  return host;
}

export function toast(message, kind = 'info', { ms = 2800 } = {}) {
  const h = ensureHost();
  // Cap stack
  while (h.children.length >= STACK_MAX) h.firstChild.remove();

  const node = el('div', { class: `toast toast-${kind}`, role: 'status', 'aria-live': 'polite' },
    el('span', { class: 'toast-dot' }),
    el('span', { class: 'toast-text' }, message),
  );
  h.appendChild(node);
  if (kind === 'warn' || kind === 'error') haptic([20, 40, 20]);
  // fade-in via next-frame class toggle
  requestAnimationFrame(() => node.classList.add('in'));
  setTimeout(() => {
    node.classList.remove('in');
    node.classList.add('out');
    setTimeout(() => node.remove(), 300);
  }, ms);
  return node;
}
