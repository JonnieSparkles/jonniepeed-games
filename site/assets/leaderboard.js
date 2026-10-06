/* Shared transport and unstyled arcade initials picker. Each game draws its board. */
(() => {
  'use strict';
  const API = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:8787' : 'https://scores.games.sparklelabs.org';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const validInitials = s => typeof s === 'string' && /^[A-Z0-9]{3}$/.test(s);

  async function request(path, options, retry) {
    const deadline = Date.now() + 4000;
    for (let attempt = 0; attempt <= (retry ? 1 : 0); attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remaining);
      try {
        const response = await fetch(API + path, { ...options, signal: controller.signal });
        const data = await response.json();
        if (response.status === 400 && data?.ok === false) return data;
        return response.ok && data?.ok === true && Array.isArray(data.scores) ? data : null;
      } catch (error) {
        if (!(error instanceof TypeError) || attempt === (retry ? 1 : 0) || controller.signal.aborted) return null;
      } finally { clearTimeout(timer); }
    }
    return null;
  }

  const api = {
    newRunId() {
      try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
      return 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + '-' + Math.random().toString(36).slice(2);
    },
    async load(game, board, score, meta) {
      try {
        const query = new URLSearchParams({ game, board });
        if (score !== undefined) query.set('score', score);
        if (meta !== undefined) query.set('meta', JSON.stringify(meta));
        const data = await request('/v1/top?' + query, {}, false);
        return data?.ok ? data : null;
      } catch (_) { return null; }
    },
    async submit(data) {
      try {
        return await request('/v1/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        }, true);
      } catch (_) { return null; }
    },
    initials() {
      try { const s = localStorage.getItem('jpg-initials'); if (validInitials(s)) return s; } catch (_) {}
      return 'AAA';
    },
    saveInitials(s) { try { if (validInitials(s)) localStorage.setItem('jpg-initials', s); } catch (_) {} },
    entry(container, { initials = api.initials(), onDone, onSkip }) {
      const letters = (validInitials(initials) ? initials : api.initials()).split('');
      let current = 0, busy = false;
      const root = document.createElement('div'); root.className = 'lb-entry';
      root.setAttribute('role', 'group'); root.setAttribute('aria-label', 'Enter three initials');
      const slots = document.createElement('div'); slots.className = 'lb-slots'; root.append(slots);
      const displays = [], slotNodes = [];
      const button = (text, label, handler) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'lb-button';
        b.textContent = text; b.setAttribute('aria-label', label); b.addEventListener('click', () => { if (!busy) handler(); });
        return b;
      };
      const refresh = () => displays.forEach((d, i) => {
        d.textContent = letters[i]; d.setAttribute('aria-label', `Initial ${i + 1}: ${letters[i]}`);
        slotNodes[i].classList.toggle('lb-current', current === i);
      });
      const select = i => { current = (i + 3) % 3; refresh(); displays[current].focus(); };
      const cycle = (i, delta) => {
        letters[i] = alphabet[(alphabet.indexOf(letters[i]) + delta + alphabet.length) % alphabet.length]; select(i);
      };
      for (let i = 0; i < 3; i++) {
        const slot = document.createElement('div'); slot.className = 'lb-slot'; slotNodes.push(slot);
        const display = button(letters[i], `Initial ${i + 1}`, () => select(i));
        display.classList.add('lb-letter'); display.addEventListener('focus', () => { current = i; refresh(); });
        displays.push(display);
        slot.append(button('▲', `Next character for initial ${i + 1}`, () => cycle(i, 1)), display,
          button('▼', `Previous character for initial ${i + 1}`, () => cycle(i, -1)));
        slots.append(slot);
      }
      const actions = document.createElement('div'); actions.className = 'lb-actions';
      actions.append(button('OK', 'Save score', () => onDone(letters.join(''))), button('Skip', 'Skip score entry', onSkip));
      root.append(actions);
      root.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab') return;
        // Keep the game window's shortcuts from seeing picker keystrokes.
        e.stopPropagation();
        if (busy) { e.preventDefault(); return; }
        if (/^[a-z0-9]$/i.test(e.key)) { letters[current] = e.key.toUpperCase(); select(current + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'Backspace') select(current - 1);
        else if (e.key === 'ArrowRight') select(current + 1);
        else if (e.key === 'ArrowUp') cycle(current, 1);
        else if (e.key === 'ArrowDown') cycle(current, -1);
        else if (e.key === 'Enter') { if (e.target === actions.lastChild) onSkip(); else onDone(letters.join('')); }
        else if (e.key === 'Escape') onSkip();
        else return;
        e.preventDefault();
      });
      container.append(root); refresh(); displays[0].focus();
      return {
        destroy() { root.remove(); },
        setBusy(value) { busy = value; root.setAttribute('aria-busy', String(value)); root.querySelectorAll('button').forEach(b => { b.disabled = value; }); if (!value) displays[current].focus(); }
      };
    }
  };
  window.Leaderboard = api;
})();
