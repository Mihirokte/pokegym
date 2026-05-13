// First-run setup. Collects the user's Google OAuth Client ID, then kicks
// off the OAuth redirect. Once signed in, the spreadsheet auto-creates.

import { el, haptic } from '../util.js';
import { getClientId, setClientId } from '../storage.js';
import { signIn } from '../auth.js';

export function renderSetup(root) {
  root.innerHTML = '';
  const origin = window.location.origin;
  const redirect = window.location.origin + window.location.pathname;

  const card = el('div', { class: 'setup-card' },
    el('img', { class: 'setup-logo', src: 'assets/sprites/items/poke.png', alt: '' }),
    el('h1', { class: 'setup-title' }, 'PokéGym'),
    el('p', { class: 'setup-sub' }, 'Connect Google to begin. Your spreadsheet lives in your Drive.'),

    el('div', { class: 'setup-steps' },
      step(1, 'OAuth Client', [
        'In ',
        link('console.cloud.google.com/apis/credentials'),
        ', open your Web OAuth Client (or create one).',
      ]),
      step(2, 'Enable APIs', [
        'Enable ',
        el('code', {}, 'Google Sheets API'),
        ' and ',
        el('code', {}, 'Google Drive API'),
        ' in the API library.',
      ]),
      step(3, 'Authorize this URL', [
        'Add ',
        el('code', {}, origin),
        ' to JavaScript origins and ',
        el('code', {}, redirect),
        ' to redirect URIs.',
      ]),
      step(4, 'Paste your Client ID', []),
    ),

    el('div', { class: 'setup-input' },
      el('input', {
        id: 'client-id-input',
        type: 'text',
        placeholder: 'xxxxxxxxxxxx-xxxxxxx.apps.googleusercontent.com',
        autocomplete: 'off',
        autocapitalize: 'off',
        autocorrect: 'off',
        spellcheck: false,
        value: getClientId() || '',
      }),
      el('button', { class: 'primary', type: 'button', onClick: saveAndSignIn }, 'Sign in'),
    ),

    el('div', { class: 'setup-note' },
      'The client ID is a public identifier — safe to save in your browser. ',
      el('a', { href: 'https://github.com/Mihirokte/pokegym/blob/main/SETUP.md', target: '_blank', rel: 'noopener' }, 'Full setup guide'),
      '.',
    ),
  );
  root.appendChild(card);
}

function step(n, title, content) {
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
  if (!value.endsWith('.apps.googleusercontent.com')) {
    input?.focus();
    input?.classList.add('error');
    setTimeout(() => input?.classList.remove('error'), 1200);
    return;
  }
  setClientId(value);
  haptic(20);
  try { signIn(); } catch (e) { console.error(e); }
}
