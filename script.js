/* ==========================================================================
   100to Frio HVAC — script.js
   Todo lo esencial (menú, reveal, canvas, scroll, formulario) es JavaScript
   propio. anime.js (CDN) solo suma efectos extra: si no carga, la página se ve
   y funciona igual.
   ========================================================================== */
'use strict';

(() => {
  /* -------------------------------------------------------------------------
     Configuración. El número de WhatsApp vive SOLO aquí (formato 52 + 10 dígitos).
     Si queda vacío, los botones y el envío se ocultan con elegancia.
     ------------------------------------------------------------------------- */
  const WHATSAPP_NUMERO = '528180644896';
  const HORARIO = { dias: [1, 2, 3, 4, 5, 6], abre: 9, cierra: 19, zona: 'America/Mexico_City' };

  const raiz = document.documentElement;
  raiz.classList.add('js');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const suave = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anime = () => window.anime; // puede no existir si la CDN falla
  const aviso = (nombre, e) => { try { console.warn('[100to] ' + nombre, e); } catch (_) { /* sin consola */ } };
  const seguro = (nombre, fn) => { try { fn(); } catch (e) { aviso(nombre, e); } };

  /* Paleta para mezclar calor → frío sin pasar por morado: rojo → hielo → azul */
  const ROJO = [232, 50, 30];
  const HIELO = [196, 206, 224];
  const AZUL = [30, 136, 229];
  const mezcla = (t) => {
    const k = clamp(t);
    const [a, b, f] = k < 0.5 ? [ROJO, HIELO, k * 2] : [HIELO, AZUL, (k - 0.5) * 2];
    return [Math.round(lerp(a[0], b[0], f)), Math.round(lerp(a[1], b[1], f)), Math.round(lerp(a[2], b[2], f))];
  };

  /* -------------------------------------------------------------------------
     Motor: un solo requestAnimationFrame para todo + un solo handler de scroll
     ------------------------------------------------------------------------- */
  const tareas = new Set();
  const ticker = { add: (fn) => { tareas.add(fn); return () => tareas.delete(fn); } };
  const bucle = (t) => { tareas.forEach((f) => f(t)); requestAnimationFrame(bucle); };
  requestAnimationFrame(bucle);

  const alScroll = [];
  const reg = (fn) => {
    let fallo = false;
    alScroll.push(() => { if (fallo) return; try { fn(); } catch (e) { fallo = true; aviso('scroll', e); } });
  };
  let sucio = true;
  let scrollY = window.scrollY;
  let vh = window.innerHeight;
  window.addEventListener('scroll', () => { sucio = true; }, { passive: true });
  const alRedimensionar = [];
  window.addEventListener('resize', () => { vh = window.innerHeight; sucio = true; alRedimensionar.forEach((f) => seguro('resize', f)); });
  ticker.add(() => {
    if (!sucio) return;
    sucio = false;
    scrollY = window.scrollY;
    alScroll.forEach((f) => f());
  });

  /* Cola para lo que debe esperar a que termine el cargador */
  const colaListo = [];
  let listo = false;
  const onListo = (fn) => (listo ? fn() : colaListo.push(fn));
  const marcarListo = () => {
    if (listo) return;
    listo = true;
    raiz.classList.add('listo');
    colaListo.splice(0).forEach((f) => seguro('listo', f));
  };

  /* -------------------------------------------------------------------------
     1. Cargador (≤ 2.4 s; el CSS tiene un respaldo por si este código falla)
     ------------------------------------------------------------------------- */
  function cargador() {
    const el = $('#cargador');
    if (!el) { marcarListo(); return; }
    const grados = $('#cargadorGrados');
    const dur = reducir ? 400 : 1500;
    const t0 = performance.now();
    let fin = false;
    const salir = () => {
      if (fin) return;
      fin = true;
      el.classList.add('salir');
      marcarListo();
      setTimeout(() => el.remove(), 800);
    };
    const paso = (ahora) => {
      if (fin) return;
      const p = clamp((ahora - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      if (grados) grados.textContent = String(Math.round(38 - 16 * e));
      if (p < 1) requestAnimationFrame(paso); else salir();
    };
    requestAnimationFrame(paso);
    setTimeout(salir, 1800);
  }

  /* -------------------------------------------------------------------------
     2. Cabecera, menú móvil y navegación activa
     ------------------------------------------------------------------------- */
  function cabecera() {
    const cab = $('#cabecera');
    const burger = $('.burger');
    const menu = $('#menu');
    if (!cab || !burger || !menu) return;
    const etiqueta = $('.sr', burger);
    const abrir = (v) => {
      menu.classList.toggle('abierto', v);
      cab.classList.toggle('menu-on', v);
      document.body.classList.toggle('menu-abierto', v);
      burger.setAttribute('aria-expanded', String(v));
      if (etiqueta) etiqueta.textContent = v ? 'Cerrar menú' : 'Abrir menú';
    };
    burger.addEventListener('click', () => abrir(!menu.classList.contains('abierto')));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => abrir(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrir(false); });
    const mq = window.matchMedia('(min-width: 980px)');
    mq.addEventListener('change', (e) => { if (e.matches) abrir(false); });

    // Enlace activo según la sección en pantalla
    const links = $$('.menu__lista a');
    const porId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((l) => l.removeAttribute('aria-current'));
          const a = porId.get(e.target.id);
          if (a) a.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      porId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* -------------------------------------------------------------------------
     3. Progreso de scroll + termómetro lateral (de rojo/calor a azul/frío)
     ------------------------------------------------------------------------- */
  function progreso() {
    const cab = $('#cabecera');
    const barra = $('.progreso');
    const termo = $('.termometro');
    const grados = $('#termoGrados');
    reg(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp(scrollY / max) : 0;
      if (barra) barra.style.setProperty('--p', p.toFixed(4));
      if (cab) cab.classList.toggle('es-scroll', scrollY > 24);
      if (termo) {
        termo.style.setProperty('--nivel', (1 - p * 0.92).toFixed(3));
        termo.style.setProperty('--merc', 'rgb(' + mezcla(clamp((p - 0.25) / 0.5)).join(',') + ')');
        if (grados) grados.textContent = Math.round(38 - 20 * p) + '°';
      }
    });
  }

  /* -------------------------------------------------------------------------
     4. Texto partido en palabras + reveal al entrar en pantalla
     ------------------------------------------------------------------------- */
  function partir(el) {
    const recorrer = (nodo) => {
      Array.from(nodo.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const i = document.createElement('span');
            i.className = 'w-i';
            i.textContent = t;
            w.appendChild(i);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) {
          recorrer(n);
        }
      });
    };
    recorrer(el);
    $$('.w-i', el).forEach((s, i) => s.style.setProperty('--wi', String(i)));
  }

  function reveal() {
    $$('[data-split]').forEach(partir);
    // Escalonado automático en rejillas y listas
    $$('.tile').forEach((t, i) => { t.setAttribute('data-reveal', 'zoom'); t.style.setProperty('--d', (i % 3) * 0.09 + 's'); });
    $$('.faq__item').forEach((t, i) => t.style.setProperty('--d', i * 0.07 + 's'));
    $$('.semana li').forEach((li, i) => li.style.setProperty('--k', String(i)));

    const objetivos = $$('[data-reveal], [data-split]');
    const mostrar = (el) => {
      el.classList.add('is-in');
      if (el.hasAttribute('data-reveal')) {
        const d = parseFloat(el.style.getPropertyValue('--d')) || 0;
        // Se quita el atributo al terminar para devolver las transiciones propias del componente
        setTimeout(() => el.removeAttribute('data-reveal'), 1600 + d * 1000);
      }
    };
    const entrar = (el) => {
      if (el.hasAttribute('data-hero') && !listo) { onListo(() => mostrar(el)); return; }
      mostrar(el);
    };
    if (!('IntersectionObserver' in window)) { objetivos.forEach(entrar); return; }
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); entrar(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    objetivos.forEach((el) => io.observe(el));
  }

  /* -------------------------------------------------------------------------
     5. Hero: flujo de partículas calor → frío (canvas)
     ------------------------------------------------------------------------- */
  function flujo() {
    const cv = $('#flujo');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const host = cv.parentElement;
    let w = 0, h = 0, dpr = 1, vis = true, particulas = [];
    const raton = { x: -9999, y: -9999 };

    const nueva = () => ({ x: Math.random() * w, y: Math.random() * h, px: 0, py: 0, s: 0.6 + Math.random() * 1.1, v: Math.random() * 1000 });
    const medir = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = host.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particulas = Array.from({ length: w < 700 ? 64 : 140 }, nueva);
      particulas.forEach((p) => { p.px = p.x; p.py = p.y; });
    };
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(host); else window.addEventListener('resize', medir);
    medir();

    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      raton.x = e.clientX - r.left; raton.y = e.clientY - r.top;
    }, { passive: true });
    host.addEventListener('pointerleave', () => { raton.x = raton.y = -9999; });

    const paso = (t, fade) => {
      if (fade) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.075)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
      }
      const ancho = w >= 960;
      const cx = ancho ? w * 0.74 : w * 0.5;
      const cy = ancho ? h * 0.5 : h * 0.76;
      const R = Math.min(w, h) * 0.32;
      for (let i = 0; i < particulas.length; i++) {
        const p = particulas[i];
        p.px = p.x; p.py = p.y;
        const ang = Math.sin(p.y * 0.006 + t * 0.0004 + p.v) * 1.4 + Math.cos(p.x * 0.004 - t * 0.0003) * 0.9;
        let vx = Math.cos(ang) * p.s * 1.1 + 0.85;
        let vy = Math.sin(ang) * p.s * 0.65;
        // remolino alrededor de la escena (eco del remolino del logotipo)
        const dx = p.x - cx, dy = p.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const caida = Math.exp(-(d * d) / (2 * R * R));
        vx += (-dy / d) * 1.5 * caida;
        vy += (dx / d) * 1.5 * caida;
        // el cursor empuja las partículas
        const mx = p.x - raton.x, my = p.y - raton.y;
        const md = Math.sqrt(mx * mx + my * my);
        if (md < 130) { const f = (1 - md / 130) * 3.2; vx += (mx / (md + 0.01)) * f; vy += (my / (md + 0.01)) * f; }
        p.x += vx; p.y += vy;
        if (p.x > w + 12 || p.x < -12 || p.y > h + 12 || p.y < -12) { p.x = -8; p.y = Math.random() * h; p.px = p.x; p.py = p.y; }
        const c = mezcla((p.x - w * 0.2) / (w * 0.6));
        ctx.strokeStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.55)';
        ctx.lineWidth = 1.1 * p.s + 0.4;
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    };

    if (reducir) { for (let i = 0; i < 220; i++) paso(i * 16, false); return; }
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(host);
    ticker.add((t) => { if (vis) paso(t, true); });
  }

  /* -------------------------------------------------------------------------
     6. Hero: dial de temperatura (cicla enfriando) + escena 3D que sigue al cursor
     ------------------------------------------------------------------------- */
  function dial() {
    const valor = $('#dialValor');
    const perilla = $('#dialPerilla');
    const num = $('#dialNum');
    const est = $('#dialEstado');
    const marcas = $('#dialMarcas');
    const cont = $('#dial');
    if (!valor || !perilla || !num || !cont) return;
    const NS = 'http://www.w3.org/2000/svg';
    if (marcas) {
      for (let i = 0; i <= 40; i++) {
        const a = ((135 + i * (270 / 40)) * Math.PI) / 180;
        const mayor = i % 5 === 0;
        const r1 = mayor ? 170 : 175, r2 = 186;
        const l = document.createElementNS(NS, 'line');
        l.setAttribute('x1', (200 + Math.cos(a) * r1).toFixed(2)); l.setAttribute('y1', (200 + Math.sin(a) * r1).toFixed(2));
        l.setAttribute('x2', (200 + Math.cos(a) * r2).toFixed(2)); l.setAttribute('y2', (200 + Math.sin(a) * r2).toFixed(2));
        if (mayor) l.setAttribute('class', 'mayor');
        marcas.appendChild(l);
      }
    }
    const CICLO = 9000;
    const pintar = (ms) => {
      const t = (ms % CICLO) / CICLO;
      let temp, texto;
      if (t < 0.56) { const k = t / 0.56; temp = lerp(38, 22, 1 - Math.pow(1 - k, 3)); texto = 'Enfriando'; }
      else if (t < 0.86) { temp = 22; texto = 'Temperatura lista'; }
      else { const k = (t - 0.86) / 0.14; temp = lerp(22, 38, k * k * (3 - 2 * k)); texto = 'Calor del día'; }
      const fr = clamp((temp - 16) / 24);
      valor.style.strokeDashoffset = (100 - 100 * fr).toFixed(2);
      valor.style.stroke = 'rgb(' + mezcla(1 - (temp - 22) / 16).join(',') + ')';
      const a = ((135 + fr * 270) * Math.PI) / 180;
      perilla.setAttribute('cx', (200 + Math.cos(a) * 150).toFixed(2));
      perilla.setAttribute('cy', (200 + Math.sin(a) * 150).toFixed(2));
      const n = String(Math.round(temp));
      if (num.textContent !== n) num.textContent = n;
      if (est && est.textContent !== texto) est.textContent = texto;
    };
    pintar(0);
    if (reducir) { pintar(CICLO * 0.7); return; }
    let vis = true;
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(cont);
    ticker.add((t) => { if (vis) pintar(t); });
  }

  function escena3d() {
    const interior = $('#escenaInterior');
    const hero = $('.hero');
    if (!interior || !hero || reducir) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, vis = true;
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 18;
      ty = -((e.clientY - r.top) / r.height - 0.5) * 12;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(hero);
    ticker.add((t) => {
      if (!vis) return;
      cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
      const ry = cx + Math.sin(t / 3100) * 5;
      const rx = cy + Math.sin(t / 2400) * 2.5;
      interior.style.setProperty('--ry', ry.toFixed(2) + 'deg');
      interior.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    });
  }

  /* Entrada de la escena con anime.js (si no carga, simplemente aparece) */
  function introEscena() {
    const a = anime();
    if (!a || reducir || !$('.ens--dial')) return;
    raiz.classList.add('anime-ok');
    setTimeout(() => raiz.classList.remove('anime-ok'), 4500); // red de seguridad
    a.timeline({ easing: 'easeOutExpo' })
      .add({ targets: '.ens--dial', opacity: [0, 1], scale: [0.7, 1], duration: 1500 })
      .add({ targets: '.ens--a, .ens--b', opacity: [0, 1], translateY: [70, 0], duration: 1200, delay: a.stagger(160) }, '-=1000')
      .add({ targets: '.ens--p1, .ens--p2, .ens--p3, .ens--p4', opacity: [0, 1], translateY: [26, 0], scale: [0.8, 1], duration: 900, delay: a.stagger(120) }, '-=800');
  }

  /* -------------------------------------------------------------------------
     7. Cinta: la velocidad reacciona al scroll
     ------------------------------------------------------------------------- */
  function cinta() {
    const pistas = $$('.cinta__pista');
    if (!pistas.length || reducir) return;
    let anims = null;
    let ultimoY = window.scrollY, vel = 0, ultimaTasa = 1;
    ticker.add(() => {
      const y = window.scrollY;
      vel = lerp(vel, Math.min(Math.abs(y - ultimoY), 70), 0.08);
      ultimoY = y;
      const tasa = 1 + vel * 0.3;
      if (Math.abs(tasa - ultimaTasa) < 0.01) return;
      ultimaTasa = tasa;
      if (!anims) anims = pistas.map((p) => (p.getAnimations ? p.getAnimations()[0] : null));
      anims.forEach((an) => { if (an && an.updatePlaybackRate) an.updatePlaybackRate(tasa); });
    });
  }

  /* -------------------------------------------------------------------------
     8. Manifiesto: las palabras se encienden al hacer scroll
     ------------------------------------------------------------------------- */
  function manifiesto() {
    const p = $('[data-scrub]');
    if (!p) return;
    const palabras = [];
    const recorrer = (nodo) => {
      Array.from(nodo.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'mw';
            s.textContent = t;
            frag.appendChild(s);
            palabras.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) recorrer(n);
      });
    };
    recorrer(p);
    if (reducir) { palabras.forEach((s) => s.classList.add('on')); return; }
    reg(() => {
      const r = p.getBoundingClientRect();
      const ini = vh * 0.88, fin = vh * 0.4;
      const prog = clamp((ini - r.top) / (ini - fin + r.height));
      const n = Math.round(prog * palabras.length * 1.03);
      palabras.forEach((s, i) => { const on = i < n; if (on !== s.classList.contains('on')) s.classList.toggle('on', on); });
    });
  }

  /* -------------------------------------------------------------------------
     9. Servicios: las tarjetas se apilan y la anterior se encoge
     ------------------------------------------------------------------------- */
  function apilado() {
    const cartas = $$('.carta');
    if (cartas.length < 2) return;
    let tops = [];
    const medir = () => { tops = cartas.map((c) => parseFloat(getComputedStyle(c).top) || 80); };
    medir();
    alRedimensionar.push(medir);
    reg(() => {
      cartas.forEach((c, i) => {
        const sig = cartas[i + 1];
        if (!sig) return;
        const d = sig.getBoundingClientRect().top - tops[i] - 14;
        const p = clamp(1 - d / Math.max(c.offsetHeight, 1));
        c.style.setProperty('--s', (1 - p * 0.05).toFixed(4));
        c.style.setProperty('--o', (p * 0.5).toFixed(3));
      });
    });
  }

  /* -------------------------------------------------------------------------
     10. Sistemas: termostato interactivo (botones + deslizador)
     ------------------------------------------------------------------------- */
  function termostato() {
    const raizT = $('#termostato');
    if (!raizT) return;
    const botones = $$('.termostato__botones button', raizT);
    const paneles = $$('.panel', raizT);
    const pista = $('#termoPista');
    const rango = $('#termoRango');
    const nombres = ['Calefacción', 'Ventilación', 'Aire acondicionado'];
    let idx = 2;

    const seleccionar = (i, animar) => {
      idx = i;
      raizT.dataset.i = String(i);
      botones.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i)));
      paneles.forEach((p) => p.classList.toggle('on', Number(p.dataset.panel) === i));
      rango.setAttribute('aria-valuetext', nombres[i]);
      const a = anime();
      const act = paneles[i];
      if (a && animar && !reducir && act) {
        const objetivos = $$('.panel__texto > *', act).concat($$('.panel__arte', act));
        a({ targets: objetivos, opacity: [0, 1], translateY: [22, 0], duration: 800, delay: a.stagger(70), easing: 'easeOutExpo' });
      }
    };
    const mover = (i) => { pista.style.setProperty('--v', String(i)); rango.value = String(i); };
    const poner = (i, animar = true) => { if (i < 0 || i > 2) return; seleccionar(i, animar && i !== idx); mover(i); };

    botones.forEach((b) => b.addEventListener('click', () => poner(Number(b.dataset.i))));
    rango.addEventListener('input', () => {
      pista.classList.add('arrastrando');
      const v = parseFloat(rango.value);
      pista.style.setProperty('--v', v.toFixed(3));
      const i = Math.round(v);
      if (i !== idx) seleccionar(i, true);
    });
    const soltar = () => { pista.classList.remove('arrastrando'); mover(Math.round(parseFloat(rango.value))); };
    rango.addEventListener('change', soltar);
    rango.addEventListener('pointerup', soltar);
    rango.addEventListener('keydown', (e) => {
      const mapa = { ArrowLeft: idx - 1, ArrowDown: idx - 1, ArrowRight: idx + 1, ArrowUp: idx + 1, Home: 0, End: 2 };
      if (e.key in mapa) { e.preventDefault(); poner(clamp(mapa[e.key], 0, 2)); }
    });
    seleccionar(2, false);
    mover(2);
  }

  /* -------------------------------------------------------------------------
     11. Trabajo real: la foto se abre en grande con el scroll
     ------------------------------------------------------------------------- */
  function campo() {
    const pista = $('.campo__pista');
    const sec = $('.campo');
    if (!pista || !sec) return;
    if (reducir) return; // por defecto el CSS la deja abierta (q = 1)
    reg(() => {
      const r = pista.getBoundingClientRect();
      const total = Math.max(r.height - vh, 1);
      const p = clamp(-r.top / total);
      sec.style.setProperty('--q', suave(clamp(p / 0.58)).toFixed(4));
      sec.style.setProperty('--t', clamp((p - 0.5) / 0.22).toFixed(4));
    });
  }

  /* -------------------------------------------------------------------------
     12. Osciloscopio animado (canvas)
     ------------------------------------------------------------------------- */
  function osciloscopio() {
    const cv = $('#osc');
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const lectura = $('#oscLectura');
    let w = 0, h = 0, vis = false, ultimoTexto = 0;
    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(cv); else window.addEventListener('resize', medir);
    medir();

    const dibujar = (t) => {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        ctx.strokeStyle = i === 5 ? 'rgba(77,179,245,.28)' : 'rgba(77,179,245,.1)';
        const x = (w / 10) * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let j = 0; j <= 6; j++) {
        ctx.strokeStyle = j === 3 ? 'rgba(77,179,245,.28)' : 'rgba(77,179,245,.1)';
        const y = (h / 6) * j; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      const fase = t * 0.0021;
      const amp = h * 0.2 * (0.82 + 0.18 * Math.sin(t * 0.0007));
      // CH1: señal senoidal
      ctx.save();
      ctx.strokeStyle = '#4db3f5'; ctx.lineWidth = 2.2; ctx.shadowColor = 'rgba(77,179,245,.9)'; ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const u = x / w;
        const y = h * 0.3 + Math.sin(u * Math.PI * 6 + fase * 3) * amp + Math.sin(u * Math.PI * 17 + fase * 5) * amp * 0.08;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      // CH2: señal cuadrada con ancho de pulso variable
      ctx.save();
      ctx.strokeStyle = '#ff8a73'; ctx.lineWidth = 2.2; ctx.shadowColor = 'rgba(255,106,77,.85)'; ctx.shadowBlur = 12;
      ctx.beginPath();
      const umbral = Math.sin(t * 0.0012) * 0.55;
      let previo = null;
      for (let x = 0; x <= w; x += 2) {
        const u = x / w;
        const alto = Math.sin(u * Math.PI * 9 - fase * 4) > umbral;
        const y = h * 0.74 + (alto ? -amp * 0.55 : amp * 0.55);
        if (previo === null) ctx.moveTo(x, y); else { if (y !== previo) ctx.lineTo(x, previo); ctx.lineTo(x, y); }
        previo = y;
      }
      ctx.stroke();
      ctx.restore();
      if (lectura && t - ultimoTexto > 250) { ultimoTexto = t; lectura.textContent = (60 + Math.sin(t / 900) * 0.6).toFixed(1) + ' Hz'; }
    };

    if (reducir) { dibujar(4200); return; }
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; }).observe(cv); else vis = true;
    ticker.add((t) => { if (vis) dibujar(t); });
  }

  /* -------------------------------------------------------------------------
     13. Cómo trabajamos — línea de tiempo que se llena con el scroll
     ------------------------------------------------------------------------- */
  function metodo() {
    const ol = $('#lineaTiempo');
    if (!ol) return;
    const pasos = $$('.paso', ol);
    const nodos = pasos.map((p) => $('.paso__nodo', p));
    reg(() => {
      const r = ol.getBoundingClientRect();
      const objetivo = vh * 0.55;
      ol.style.setProperty('--lp', clamp((objetivo - r.top) / Math.max(r.height, 1)).toFixed(4));
      pasos.forEach((p, i) => {
        const nr = nodos[i].getBoundingClientRect();
        const on = nr.top + nr.height / 2 < objetivo;
        if (on === p.classList.contains('on')) return;
        p.classList.toggle('on', on);
        const a = anime();
        if (on && a && !reducir) a({ targets: $('svg', nodos[i]), rotate: [0, 180], duration: 900, easing: 'easeOutBack' });
      });
    });
  }

  /* -------------------------------------------------------------------------
     14. Galería: arrastrar con el ratón, botones y parallax interno
     ------------------------------------------------------------------------- */
  function galeria() {
    const riel = $('#riel');
    if (!riel) return;
    let abajo = false, movido = false, sx = 0, sl = 0;
    riel.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      abajo = true; movido = false; sx = e.clientX; sl = riel.scrollLeft;
      riel.classList.add('arrastrando');
    });
    window.addEventListener('pointermove', (e) => {
      if (!abajo) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4) movido = true;
      riel.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { if (!abajo) return; abajo = false; riel.classList.remove('arrastrando'); });
    riel.addEventListener('click', (e) => { if (movido) { e.preventDefault(); e.stopPropagation(); movido = false; } }, true);

    const salto = () => { const it = $('.riel__item', riel); return (it ? it.getBoundingClientRect().width : 300) + 16; };
    const prev = $('#galPrev'), next = $('#galNext');
    if (prev) prev.addEventListener('click', () => riel.scrollBy({ left: -salto(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => riel.scrollBy({ left: salto(), behavior: 'smooth' }));

    if (reducir) return;
    const imgs = $$('.riel__item img', riel);
    const parallax = () => {
      const centro = window.innerWidth / 2;
      imgs.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.right < -50 || r.left > window.innerWidth + 50) return;
        img.style.translate = (((r.left + r.width / 2 - centro) / window.innerWidth) * -34).toFixed(1) + 'px 0';
      });
    };
    riel.addEventListener('scroll', parallax, { passive: true });
    alRedimensionar.push(parallax);
    parallax();
  }

  /* -------------------------------------------------------------------------
     15. Micro-interacciones: inclinación 3D, foco en tarjetas, botones magnéticos
     ------------------------------------------------------------------------- */
  function interacciones() {
    const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    $$('.tile').forEach((t) => {
      t.addEventListener('pointermove', (e) => {
        const r = t.getBoundingClientRect();
        t.style.setProperty('--mx', e.clientX - r.left + 'px');
        t.style.setProperty('--my', e.clientY - r.top + 'px');
      }, { passive: true });
    });
    if (!fino || reducir) return;
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * 14).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 14).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    $$('[data-magnetico]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  /* -------------------------------------------------------------------------
     16. Horario en vivo: ¿estamos abiertos ahora?
     ------------------------------------------------------------------------- */
  function horario() {
    const estados = $$('[data-estado]');
    const semana = $('#semana');
    let fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-US', { timeZone: HORARIO.zona, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    } catch (e) { aviso('horario', e); return; }
    const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const ahora = () => {
      const p = {};
      fmt.formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
      return { dia: DIAS[p.weekday], h: (Number(p.hour) % 24) + Number(p.minute) / 60 };
    };
    const actualizar = () => {
      const { dia, h } = ahora();
      const laboral = HORARIO.dias.includes(dia);
      const abierto = laboral && h >= HORARIO.abre && h < HORARIO.cierra;
      let texto;
      if (abierto) texto = 'Abierto ahora · cerramos a las ' + HORARIO.cierra + ':00';
      else if (laboral && h < HORARIO.abre) texto = 'Cerrado · abrimos hoy a las ' + HORARIO.abre + ':00';
      else texto = HORARIO.dias.includes((dia + 1) % 7) ? 'Cerrado · abrimos mañana a las ' + HORARIO.abre + ':00' : 'Cerrado · abrimos el lunes a las ' + HORARIO.abre + ':00';
      estados.forEach((el) => {
        el.dataset.abierto = String(abierto);
        const t = $('[data-estado-texto]', el);
        if (t) t.textContent = texto;
      });
      if (semana) {
        $$('.semana__ahora', semana).forEach((m) => m.remove());
        $$('li', semana).forEach((li) => {
          const hoy = Number(li.dataset.dia) === dia;
          li.classList.toggle('hoy', hoy);
          if (hoy && abierto) {
            const barra = $('.semana__barra', li);
            const m = document.createElement('span');
            m.className = 'semana__ahora';
            m.style.left = (((h - 7) / 14) * 100).toFixed(2) + '%';
            if (barra) barra.appendChild(m);
          }
        });
      }
    };
    actualizar();
    setInterval(actualizar, 60000);
  }

  /* -------------------------------------------------------------------------
     17. WhatsApp: enlaces con mensaje + formulario de contacto
     ------------------------------------------------------------------------- */
  function whatsapp() {
    const enlaces = $$('[data-wa]');
    const form = $('#formulario');
    const nota = $('#formNota');
    const url = (msg) => 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(msg);

    if (!WHATSAPP_NUMERO) {
      enlaces.forEach((a) => { a.hidden = true; });
      const enviar = $('#formEnviar');
      if (enviar) enviar.hidden = true;
      if (nota) nota.textContent = 'Muy pronto podrás escribirnos por WhatsApp.';
      return;
    }
    enlaces.forEach((a) => {
      a.href = url(a.dataset.waMsg || 'Hola, quiero más información.');
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    if (!form) return;
    const campoNombre = form.elements.nombre;
    const error = $('#f-nombre-error');
    campoNombre.addEventListener('input', () => { campoNombre.removeAttribute('aria-invalid'); if (error) error.hidden = true; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = campoNombre.value.trim();
      if (!nombre) {
        campoNombre.setAttribute('aria-invalid', 'true');
        if (error) error.hidden = false;
        campoNombre.focus();
        return;
      }
      const extra = form.elements.mensaje.value.trim();
      let msg = 'Hola, soy ' + nombre + '. Quiero ' + form.elements.servicio.value + '. Es para mi ' + form.elements.lugar.value + '.';
      if (extra) msg += ' ' + extra;
      msg += ' ¿Me pueden orientar?';
      const a = document.createElement('a');
      a.href = url(msg); a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); a.remove();
      if (nota) nota.textContent = 'Listo, ' + nombre + ': se abrió WhatsApp con tu mensaje. Solo falta que lo envíes.';
    });
  }

  /* -------------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------------- */
  const anio = $('#anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  seguro('cargador', cargador);
  seguro('cabecera', cabecera);
  seguro('progreso', progreso);
  seguro('reveal', reveal);
  seguro('whatsapp', whatsapp);
  seguro('horario', horario);
  seguro('flujo', flujo);
  seguro('dial', dial);
  seguro('escena3d', escena3d);
  seguro('cinta', cinta);
  seguro('manifiesto', manifiesto);
  seguro('apilado', apilado);
  seguro('termostato', termostato);
  seguro('campo', campo);
  seguro('osciloscopio', osciloscopio);
  seguro('metodo', metodo);
  seguro('galeria', galeria);
  seguro('interacciones', interacciones);
  onListo(() => seguro('introEscena', introEscena));
})();
