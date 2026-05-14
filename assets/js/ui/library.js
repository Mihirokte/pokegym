// Add-custom-exercise modal + library browser. Modifies the CustomExercises
// sheet via sync.upsertRow so they persist and appear in future dropdowns.

import { el, nowISO, uid } from '../util.js';
import { appendRow, removeRow } from '../sync.js';
import { mirrorSheet } from '../storage.js';
import { allExercises, EXERCISES } from '../data/exercises.js';
import { DAYS } from '../data/days.js';
import { toast } from './toast.js';

const SECTIONS = ['warmup', 'workout', 'cooldown'];
const TYPES = ['strength', 'cardio', 'mobility', 'isometric'];
const DAY_OPTIONS = [
  { value: '', label: 'Library only' },
  ...DAYS.map(d => ({ value: d.key, label: d.label })),
];

export function renderLibrary(root) {
  root.innerHTML = '';
  const custom = mirrorSheet('CustomExercises');
  const customMap = Object.fromEntries(custom.map(c => [c.id, c]));
  const all = allExercises(customMap);

  root.appendChild(el('div', { class: 'page-head' },
    el('h2', {}, 'Exercise Library'),
    el('p', { class: 'sub' }, `${all.length} exercises · ${custom.length} custom · add your own below`),
  ));

  root.appendChild(renderAddForm());

  const filter = el('input', { class: 'lib-search', type: 'search', placeholder: 'Search exercises…' });
  root.appendChild(filter);

  const list = el('div', { class: 'lib-list' });
  const renderList = (q = '') => {
    list.innerHTML = '';
    const needle = q.trim().toLowerCase();
    const rows = all.filter(ex => !needle || [ex.name, ex.muscle, ex.equipment, ex.type].some(v => String(v || '').toLowerCase().includes(needle)));
    for (const ex of rows) list.appendChild(renderRow(ex, customMap));
    if (rows.length === 0) list.appendChild(el('div', { class: 'empty' }, 'No exercises match.'));
  };
  filter.addEventListener('input', (e) => renderList(e.target.value));
  renderList();
  root.appendChild(list);
}

function renderAddForm() {
  const form = el('form', { class: 'add-form', onSubmit: (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    const row = {
      id: uid('custom'),
      name: (data.name || '').trim() || 'Unnamed',
      section: data.section || 'workout',
      muscle: data.muscle || '',
      equipment: data.equipment || '',
      type: data.type || 'strength',
      defaultSets: data.sets || '3',
      defaultReps: data.reps || '10',
      trackLoad: data.trackLoad === 'on' ? 'true' : 'false',
      isTime: data.isTime === 'on' ? 'true' : 'false',
      cue: data.cue || '',
      addedAt: nowISO(),
      dayKey: data.dayKey || '',
    };
    appendRow('CustomExercises', row);
    const where = row.dayKey
      ? `${DAYS.find(d => d.key === row.dayKey)?.label || row.dayKey}'s ${row.section}`
      : 'Library';
    toast(`Added "${row.name}" → ${where}`, 'ok');
    e.currentTarget.reset();
    setTimeout(() => renderLibrary(document.querySelector('.page.active')), 120);
  } });

  form.appendChild(el('div', { class: 'form-title' }, '+ Add exercise'));
  form.appendChild(row(
    input('name', 'Name', { required: true, full: true }),
  ));
  form.appendChild(row(
    select('dayKey', 'Add to day', DAY_OPTIONS),
    select('section', 'Section', SECTIONS.map(s => ({ value: s, label: s }))),
    select('type', 'Type', TYPES.map(t => ({ value: t, label: t }))),
  ));
  form.appendChild(row(
    input('muscle', 'Muscle group'),
    input('equipment', 'Equipment'),
    input('sets', 'Default sets', { type: 'number', min: 1, max: 10, value: 3 }),
  ));
  form.appendChild(row(
    input('reps', 'Default reps (e.g. 10 or 45s)'),
    check('trackLoad', 'Track weight/load'),
    check('isTime', 'Time-based (reps is seconds)'),
  ));
  form.appendChild(row(input('cue', 'Form cue (optional)', { full: true })));
  form.appendChild(el('div', { class: 'form-actions' },
    el('button', { type: 'submit', class: 'primary' }, 'Add'),
  ));
  return form;
}

function renderRow(ex, customMap) {
  const isCustom = !!customMap[ex.id];
  const dayKey = isCustom ? customMap[ex.id].dayKey : '';
  const dayLabel = dayKey ? (DAYS.find(d => d.key === dayKey)?.short || '') : '';
  return el('div', { class: `lib-row ${isCustom ? 'custom' : ''}` },
    el('div', { class: 'lib-main' },
      el('div', { class: 'lib-name' },
        ex.name,
        isCustom ? el('span', { class: 'lib-badge' }, 'CUSTOM') : null,
        dayLabel ? el('span', { class: 'lib-day' }, dayLabel) : null,
      ),
      el('div', { class: 'lib-sub' }, [ex.section, ex.muscle, ex.equipment, ex.type].filter(Boolean).join(' · ')),
      ex.cue && el('div', { class: 'lib-cue' }, ex.cue),
    ),
    el('div', { class: 'lib-target' }, `${ex.defaultSets}×${ex.defaultReps}`),
    isCustom && el('button', {
      class: 'lib-del', type: 'button', title: 'Delete',
      onClick: () => {
        if (!confirm(`Delete "${ex.name}"?`)) return;
        removeRow('CustomExercises', ex.id);
        toast('Deleted', 'info');
        setTimeout(() => renderLibrary(document.querySelector('.page.active')), 80);
      },
    }, '×'),
  );
}

function row(...nodes) { return el('div', { class: 'form-row' }, ...nodes); }

function input(name, label, opts = {}) {
  return el('label', { class: `form-field ${opts.full ? 'full' : ''}` },
    el('span', { class: 'form-label' }, label),
    el('input', { name, type: opts.type || 'text', min: opts.min, max: opts.max, value: opts.value ?? '', required: !!opts.required }),
  );
}

function select(name, label, options) {
  return el('label', { class: 'form-field' },
    el('span', { class: 'form-label' }, label),
    el('select', { name },
      ...options.map(o => el('option', { value: o.value }, o.label)),
    ),
  );
}

function check(name, label) {
  return el('label', { class: 'form-check' },
    el('input', { name, type: 'checkbox' }),
    el('span', {}, label),
  );
}
