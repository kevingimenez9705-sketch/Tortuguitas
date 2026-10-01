// transition.js — efecto "portal" al entrar a la hoja de cada integrante.
// index.html: al tocar una tarjeta, un círculo con el color y la tortuga de
// la persona se expande desde la tarjeta hasta cubrir la pantalla y recién
// ahí navega. dashboard.html: si se llegó por el portal, la cortina se abre
// y el contenido entra con un leve zoom.
(() => {
  const KEY = 'tortuga-portal';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
    clear() { try { sessionStorage.removeItem(KEY); } catch (e) {} },
  };

  function buildOverlay(p) {
    const o = document.createElement('div');
    o.className = 'portal';
    o.style.setProperty('--portal-color', p.color);
    o.style.setProperty('--portal-x', p.x + 'px');
    o.style.setProperty('--portal-y', p.y + 'px');
    if (p.bg) o.style.setProperty('--portal-bg', p.bg);
    o.innerHTML =
      '<div class="portal-ring"></div><div class="portal-ring r2"></div>' +
      '<div class="portal-center">' +
      (p.avatar ? `<img class="portal-avatar" src="${p.avatar}" alt="" />` : '') +
      `<div class="portal-name">${p.name || ''}</div></div>`;
    document.body.appendChild(o);
    return o;
  }

  // ---------- Salida (index.html) ----------
  document.querySelectorAll('.unit-card').forEach(card => {
    card.addEventListener('click', e => {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      const img = card.querySelector('img.unit-avatar');
      const p = {
        color: card.style.borderTopColor || '#5c2430',
        bg: card.style.getPropertyValue('--tortuga-bg').trim(),
        avatar: img ? img.getAttribute('src') : null,
        name: (card.querySelector('.unit-name') || {}).textContent,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
      card.classList.add('unit-card--launch');
      buildOverlay(p);
      store.set({ color: p.color, bg: p.bg, avatar: p.avatar, name: p.name });
      setTimeout(() => { location.href = card.href; }, 950);
    });
  });
  // Volver con "atrás" (bfcache): sacar la cortina vieja.
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    document.querySelectorAll('.portal').forEach(n => n.remove());
    document.querySelectorAll('.unit-card--launch').forEach(n => n.classList.remove('unit-card--launch'));
  });

  // ---------- Entrada (dashboard.html) ----------
  if (document.querySelector('.hero')) {
    const p = store.get();
    store.clear();
    if (!p || reduce) return;
    const o = buildOverlay({ ...p, x: innerWidth / 2, y: innerHeight / 2 });
    o.classList.add('portal--open', 'portal--exit');
    document.body.classList.add('portal-arrive');
    setTimeout(() => o.remove(), 900);
    setTimeout(() => document.body.classList.remove('portal-arrive'), 1100);
  }
})();
