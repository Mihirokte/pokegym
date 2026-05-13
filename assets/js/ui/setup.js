// Setup / onboarding. First launch (or after "reset config") asks the user
// for their Google OAuth Client ID and explains how to get one.

import { el, haptic } from '../util.js';
import { getClientId, setClientId } from '../storage.js';
import { signIn } from '../auth.js';
import { enterDemo } from '../demo.js';

export function renderSetup(root) {
  root.innerHTML = '';
  const card = el('div', { class: 'setup-card' },
    el('img', { class: 'setup-logo', src: 'assets/sprites/items/poke.png', alt: '' }),
    el('h1', { class: 'setup-title' }, 'PokéGym'),
    el('p', { class: 'setup-sub' }, 'Track your gym sessions. Evolve your team. Earn badges.'),

    el('div', { class: 'demo-block' },
      el('button', { class: 'demo-btn', type: 'button', onClick: tryDemo },
        el('span', { class: 'demo-label' }, '▶  Try the demo'),
        el('span', { class: 'demo-hint' }, 'Full UI · sample data · no account needed'),
      ),
      el('div', { class: 'demo-divider' }, el('span', {}, 'or set up for real')),
    ),

    el('div', { class: 'setup-steps' },
      stepItem(1, 'Create a Google Cloud OAuth Client', [
        'Go to ',
        link('console.cloud.google.com/apis/credentials'),
        ', create (or pick) a project, click Create Credentials → OAuth client ID → Web application.',
      ]),
      stepItem(2, 'Enable Google Sheets + Drive APIs', [
        'In the APIs & Services library, enable both ',
        el('code', {}, 'Google Sheets API'),
        ' and ',
        el('code', {}, 'Google Drive API'),
        '.',
      ]),
      stepItem(3, 'Authorize this site', [
        'Add ',
        el('code', {}, window.location.origin),
        ' to Authorized JavaScript origins, and ',
        el('code', {}, window.location.origin + window.location.pathname),
        ' to Authorized redirect URIs.',
      ]),
      stepItem(4, 'Paste the Client ID below', []),
    ),

    el('div', { class: 'setup-input' },
      el('input', {
        id: 'client-id-input',
        type: 'text',
        placeholder: 'xxxxxxxxxxxx-xxxxxxx.apps.googleusercontent.com',
        autocomplete: 'off',
        value: getClientId() || '',
      }),
      el('button', { class: 'primary', type: 'button', onClick: saveAndSignIn }, 'Save & Sign In'),
    ),

    el('div', { class: 'setup-note' },
      'The client ID is a public identifier — safe to save in the browser. Full guide: ',
      el('a', { href: 'SETUP.md', target: '_blank' }, 'SETUP.md'),
      '.',
    ),
  );
  root.appendChild(card);
}

function stepItem(n, title, content) {
  return el('div', { class: 'setup-step' },
    el('div', { class: 'step-num' }, n),
    el('div', { class: 'step-body' },
      el('div', { class: 'step-title' }, title),
      content.length ? el('div', { class: 'step-content' }, ...content) : null,
    ),
  );
}

function link(url) {
  const fullUrl = url.startsWith('http') ? url : 'https://' + url;
  return el('a', { href: fullUrl, target: '_blank', rel: 'noopener' }, url);
}

function saveAndSignIn() {
  const input = document.getElementById('client-id-input');
  const value = (input?.value || '').trim();
  if (!value) {
    input?.focus();
    input?.classList.add('error');
    setTimeout(() => input?.classList.remove('error'), 1200);
    return;
  }
  setClientId(value);
  haptic(20);
  try { signIn(); } catch (e) {
    console.error(e);
  }
}

function tryDemo() {
  haptic([10, 30, 10]);
  enterDemo();
  // Kick a render — app.js listens on auth changes, not a custom event. Easiest
  // is a hard reload so the mirror + routes re-initialise cleanly.
  location.hash = '#session';
  location.reload();
}
