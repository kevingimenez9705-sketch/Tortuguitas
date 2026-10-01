// transition.js — transiciones "portal" entre index.html y dashboard.html.
// Al tocar una tarjeta (o "← Equipo") un círculo con el color y la tortuga de
// la persona se expande desde el elemento tocado hasta cubrir la pantalla y
// recién ahí navega. En la página de llegada esa cortina se cierra hacia el
// centro y el contenido entra en cascada (también en cargas directas, sin
// cortina). Respeta prefers-reduced-motion y Ctrl/Cmd+clic (nueva pestaña).
//
// Se carga como PRIMER hijo de <body> (no al final): así la cortina de
// llegada tapa la página desde el primer pintado, mientras se descargan
// data.js (~1,3 MB) y Chart.js. Si se cargara al final, durante esa espera se
// veía un instante el dashboard genérico sin tematizar. Todo lo que necesita
// el DOM completo corre en DOMContentLoaded.
(() => {
  const KEY = 'tortuga-portal';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const store = {
    get() { try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; } },
    set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
    clear() { try { sessionStorage.removeItem(KEY); } catch (e) {} },
  };
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
      (p.avatar ? `<img class="portal-avatar" src="${esc(p.avatar)}" alt="" />` : '') +
      `<div class="portal-name">${esc(p.name)}</div><div class="portal-spinner"></div></div>`;
    document.body.appendChild(o);
    return o;
  }

  // ---------- Llegada: cortina inmediata ----------
  const arrived = reduce ? null : store.get();
  store.clear();
  let curtain = null;
  if (arrived) {
    curtain = buildOverlay({ ...arrived, x: innerWidth / 2, y: innerHeight / 2 });
    curtain.classList.add('portal--open');
  }
  // Sin cortina, el contenido arranca oculto hasta armar la cascada (si no,
  // se pintaría visible y "saltaría" a opacidad 0 al agregar .reveal).
  if (!reduce) root.classList.add('reveal-pending');

  // Engancha un link: describe(el) arma { color, bg, avatar, name } del portal.
  function portalLink(el, describe) {
    el.addEventListener('click', e => {
      if (reduce || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const p = { ...describe(el), x: r.left + r.width / 2, y: r.top + r.height / 2 };
      el.style.setProperty('--portal-glow', p.color);
      el.classList.add('portal-launch');
      buildOverlay(p).classList.add('portal--leaving');
      store.set({ color: p.color, bg: p.bg, avatar: p.avatar, name: p.name });
      setTimeout(() => { location.href = el.href; }, 800);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    try {
      const hero = document.querySelector('.hero');
      if (hero) {
        // dashboard.html -> equipo (← Equipo / ← Volver al equipo)
        document.querySelectorAll('a[href="index.html"]').forEach(a => portalLink(a, () => ({
          color: hero.dataset.color || '#5c2430',
          bg: hero.style.getPropertyValue('--tortuga-bg').trim(),
          avatar: null,
          name: 'Equipo',
        })));
      } else {
        // index.html -> hoja de cada integrante
        document.querySelectorAll('.unit-card').forEach(card => portalLink(card, c => {
          const img = c.querySelector('img.unit-avatar');
          return {
            color: c.style.borderTopColor || '#5c2430',
            bg: c.style.getPropertyValue('--tortuga-bg').trim(),
            avatar: img ? img.getAttribute('src') : null,
            name: (c.querySelector('.unit-name') || {}).textContent,
          };
        }));
        // Precarga lo pesado del dashboard (data.js + Chart.js) mientras se
        // mira el equipo: así la espera detrás del portal es casi nula.
        const prefetch = () => ['data.js', 'vendor/chart.umd.min.js'].forEach(href => {
          const l = document.createElement('link');
          l.rel = 'prefetch';
          l.href = href;
          document.head.appendChild(l);
        });
        (window.requestIdleCallback || (fn => setTimeout(fn, 1200)))(prefetch);
      }

      if (reduce) return;
      // Entrada en cascada: tarjetas del equipo, o hero + bloques del dashboard.
      const items = hero
        ? [hero, ...document.querySelectorAll('.container > *:not(.hero)')]
        : [...document.querySelectorAll('.unit-card')];
      const base = curtain ? 300 : 0;
      items.forEach((el, i) => {
        el.style.setProperty('--reveal-delay', (base + Math.min(i, 8) * 70) + 'ms');
        el.classList.add('reveal');
        // Se saca al terminar: la animación con fill "both" pisaría el
        // transform del :hover de las tarjetas.
        el.addEventListener('animationend', function done(ev) {
          if (ev.target !== el) return;
          el.classList.remove('reveal');
          el.removeEventListener('animationend', done);
        });
      });
    } finally {
      root.classList.remove('reveal-pending');
      if (curtain) {
        // Doble rAF: abrir la cortina recién cuando el dashboard ya está
        // armado y pintado debajo.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          curtain.classList.add('portal--exit');
          setTimeout(() => curtain.remove(), 1000);
        }));
      }
    }
  });

  // Volver con "atrás" (bfcache): sacar la cortina que quedó tapando.
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    document.querySelectorAll('.portal').forEach(n => n.remove());
    document.querySelectorAll('.portal-launch').forEach(n => n.classList.remove('portal-launch'));
  });
})();
