// Sign-in screen. Since the OAuth client ID is baked into config.js, there's
// nothing for the end-user to configure on first run — just sign in. The
// override input is hidden behind a disclosure for forks or dev work.

import { el, haptic } from '../util.js';
import { getClientId, setClientId } from '../storage.js';
import { signIn } from '../auth.js';
import { BAKED_CLIENT_ID } from '../config.js';

export function renderSetup(root) {
  root.innerHTML = '';
  const override = getClientId() !== BAKED_CLIENT_ID;

  const googleIcon = el('svg', { viewBox: '0 0 24 24', class: 'google-g', 'aria-hidden': 'true' });
  googleIcon.innerHTML = `
    <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.3z"/>
    <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8C4.2 20.9 7.9 23 12 23z"/>
    <path fill="#FBBC05" d="M6 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.9H2.3C1.5 8.4 1 10.1 1 12s.5 3.6 1.3 5.1L6 14.3z"/>
    <path fill="#EA4335" d="M12 5.3c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 2 14.9 1 12 1 7.9 1 4.2 3.1 2.3 6.9L6 9.7c.9-2.6 3.2-4.4 6-4.4z"/>`;

  const card = el('div', { class: 'signin-card' },
    el('div', { class: 'signin-hero' },
      el('img', { src: 'assets/sprites/items/poke.png', alt: '', class: 'signin-ball' }),
      el('h1', { class: 'signin-title' }, 'PokéGym'),
      el('p', { class: 'signin-sub' }, 'Sign in with Google to sync your training to your own spreadsheet.'),
    ),

    el('button', { class: 'signin-btn', type: 'button', onClick: onSignIn },
      googleIcon,
      el('span', {}, 'Continue with Google'),
    ),

    el('ul', { class: 'signin-trust' },
      el('li', {}, '✓ Your spreadsheet. Your Drive. You own the data.'),
      el('li', {}, '✓ Only sees the one file it creates.'),
      el('li', {}, '✓ No server, no analytics, no tracking.'),
    ),

    el('details', { class: 'signin-advanced' },
      el('summary', {}, 'Fork or self-host? Override Client ID'),
      el('div', { class: 'signin-override' },
        el('input', {
          id: 'client-id-input',
          type: 'text',
          placeholder: 'xxx.apps.googleusercontent.com',
          autocomplete: 'off',
          autocapitalize: 'off',
          spellcheck: false,
          value: override ? getClientId() : '',
        }),
        el('button', { class: 'signin-override-save', type: 'button', onClick: saveOverride }, 'Save'),
      ),
      el('div', { class: 'signin-hint' },
        'Default is the author\'s client. Replace with yours if you\'ve forked. JS origin: ',
        el('code', {}, window.location.origin),
        ', redirect: ', el('code', {}, window.location.origin + window.location.pathname),
      ),
    ),
  );
  root.appendChild(card);
}

function onSignIn() {
  haptic(12);
  try { signIn(); } catch (e) { console.error(e); }
}

function saveOverride() {
  const input = document.getElementById('client-id-input');
  const value = (input?.value || '').trim();
  if (value && !value.endsWith('.apps.googleusercontent.com')) {
    input.classList.add('error');
    setTimeout(() => input.classList.remove('error'), 1200);
    return;
  }
  setClientId(value);
  haptic(12);
  // Falls back to baked id when cleared.
  try { signIn(); } catch (e) { console.error(e); }
}
