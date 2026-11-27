/* Componentes animados de la entrada, hechos con Motion (motion.dev; copia en assets/vendor/motion.js).
   Cada pieza se crea una vez y se anima por separado:
     Componentes.titulo(logo)      el nombre se arma letra por letra y a ratos sufre interferencia
     Componentes.sonda(boton)      flota, gira, emite ondas y parpadea
     Componentes.vineta(...)       la viñeta de cómic que sale al acercarse a la sonda
     Componentes.agujero(a)        el agujero se enciende por partes
     Componentes.caida(...)        la sonda cae en espiral hacia el agujero
     Componentes.energia()         0 a 1: cuánto se aviva el agujero (sube con la sonda)
   Si la persona pide menos movimiento, todo queda quieto y en su sitio. */
(function () {
  "use strict";
  if (!window.Motion) return;
  const { animate, motionValue, stagger } = window.Motion;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SALIDA = [.16, 1, .3, 1], CAE = [.55, 0, .85, .35];

  const nivel = motionValue(0);
  const avivar = (a, ajustes) => animate(nivel, a, ajustes || { type: "spring", stiffness: 60, damping: 18 });

  const pieza = (clase, padre) => { const s = document.createElement("span"); s.className = clase; s.setAttribute("aria-hidden", "true"); padre.append(s); return s; };

  function titulo(logo) {
    const nombre = logo.querySelector(".l2 i"), arriba = logo.querySelector(".l1"), abajo = logo.querySelector(".l3");
    const texto = nombre.textContent; nombre.setAttribute("aria-label", texto); nombre.textContent = "";
    const letras = [...texto].map(c => { const s = document.createElement("span"); s.className = "letra-v"; s.setAttribute("aria-hidden", "true"); s.textContent = c; nombre.append(s); return s; });
    if (!quieto) {
      // interferencia: un corte breve cada 11 segundos
      animate(nombre.parentElement, { opacity: [1, 1, .3, 1, .55, 1], x: [0, 0, -4, 3, 0, 0] },
        { duration: 11, times: [0, .71, .715, .72, .73, .74], repeat: Infinity, ease: "linear" });
    }
    return {
      entrar() {
        if (quieto) return;
        animate(letras, { opacity: [0, 1], y: [34, 0], filter: ["blur(10px)", "blur(0px)"] }, { duration: 1.1, ease: SALIDA, delay: stagger(.09, { startDelay: .35 }) });
        animate(arriba, { opacity: [0, 1], letterSpacing: ["2.6em", "1.5em"] }, { duration: 1.8, ease: SALIDA, delay: .2 });
        animate(abajo, { opacity: [0, 1], y: [12, 0] }, { duration: 1, ease: SALIDA, delay: 1.4 });
      }
    };
  }

  function sonda(boton) {
    const flota = boton.querySelector(".flota");
    const ondas = [pieza("onda", boton), pieza("onda", boton), pieza("onda", boton)];
    const baliza = pieza("baliza", flota);
    if (!quieto) {
      animate(flota, { y: [-7, 7], rotate: [-2.5, 2.5] }, { duration: 6.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" });
      ondas.forEach((o, i) => animate(o, { scale: [.25, 2.4], opacity: [.75, 0] }, { duration: 5.4, delay: i * 1.8, repeat: Infinity, ease: "easeOut" }));
      animate(baliza, { opacity: [0, 0, 1, .15, 0] }, { duration: 3.2, times: [0, .76, .84, .92, 1], repeat: Infinity });
    }
    return {
      entrar(estado) {
        if (quieto) { estado.k = 1; return; }
        estado.k = 0; animate(0, 1, { duration: 4.2, delay: .5, ease: SALIDA, onUpdate: v => { estado.k = v; } });
      },
      // la sonda responde cuando alguien se acerca
      atender(si) {
        avivar(si ? .65 : 0);
        if (!quieto) animate(flota, { scale: si ? 1.14 : 1 }, { type: "spring", stiffness: si ? 320 : 200, damping: si ? 14 : 18 });
      }
    };
  }

  // Dibujo de la viñeta: facetas planas de color. El fondo se voltea según de qué lado quede la sonda; el texto no.
  const VINETA = `<svg class="vin" viewBox="0 0 320 210" aria-hidden="true"><g class="fondo"><polygon points="29.0,31.0 302.0,18.0 308.0,147.0 256.0,160.0 37.0,167.0 21.0,104.0" fill="#000"/><polygon points="24.0,25.0 297.0,12.0 303.0,141.0 251.0,154.0 32.0,161.0 16.0,98.0" fill="#0f0c40"/><polygon points="24.0,25.0 78.0,22.0 17.0,86.0" fill="#b3126f"/><polygon points="24.0,25.0 50.0,24.0 19.0,64.0" fill="#e8351f"/><polygon points="240.0,15.0 297.0,12.0 300.0,66.0" fill="#12a8bd"/><polygon points="270.0,13.0 297.0,12.0 299.0,40.0" fill="#ffd447"/><polygon points="16.0,98.0 32.0,161.0 62.0,160.0 22.0,120.0" fill="#2456d6"/><polygon points="32.0,161.0 49.0,160.0 26.0,138.0" fill="#1fbd78"/><polygon points="303.0,141.0 251.0,154.0 301.0,100.0" fill="#f78a1d"/><polygon points="303.0,141.0 278.0,147.0 302.0,120.0" fill="#e8351f"/><polygon points="37.5,40.5 101.5,26.5 229.5,22.5 281.5,48.5 289.5,114.5 259.5,140.5 145.5,150.5 109.5,198.5 107.5,152.5 47.5,148.5 21.5,110.5 25.5,66.5" fill="#ffd447"/><polygon points="40.0,38.0 104.0,24.0 232.0,20.0 284.0,46.0 292.0,112.0 262.0,138.0 148.0,148.0 112.0,196.0 110.0,150.0 50.0,146.0 24.0,108.0 28.0,64.0" fill="#ffffff"/><polygon points="24.0,108.0 50.0,146.0 42.0,114.0" fill="#12a8bd"/><polygon points="50.0,146.0 110.0,150.0 62.0,140.0" fill="#2456d6"/><polygon points="110.0,150.0 112.0,196.0 123.0,162.0" fill="#e8351f"/><polygon points="123.0,162.0 112.0,196.0 148.0,148.0" fill="#f78a1d"/><polygon points="232.0,20.0 284.0,46.0 254.0,36.0" fill="#ffd447"/><polygon points="284.0,46.0 292.0,112.0 281.0,68.0" fill="#b3126f"/><polygon points="292.0,112.0 262.0,138.0 278.0,114.0" fill="#12a8bd"/><polygon points="40.0,38.0 28.0,64.0 52.0,36.0" fill="#1fbd78"/><rect x="304" y="160" width="6" height="6" fill="#ffd447"/><rect x="312" y="172" width="4" height="4" fill="#12a8bd"/><rect x="293" y="172" width="4" height="4" fill="#e8351f"/><rect x="8" y="12" width="5" height="5" fill="#12a8bd"/><rect x="18" y="4" width="4" height="4" fill="#ffffff"/><rect x="70" y="180" width="5" height="5" fill="#b3126f"/><rect x="82" y="190" width="3" height="3" fill="#ffd447"/><rect x="232" y="168" width="4" height="4" fill="#1fbd78"/></g><g class="texto"><text x="160" y="66" text-anchor="middle" font-family="Bangers, sans-serif" font-size="27" letter-spacing="1.5" fill="#0f0c40">¡NOSOTROS SOMOS</text><text x="160" y="123" text-anchor="middle" font-family="Bangers, sans-serif" font-size="50" letter-spacing="1" fill="#e8351f" stroke="#0f0c40" stroke-width="4.5" paint-order="stroke" textLength="226" lengthAdjust="spacingAndGlyphs">LOS VOYAGERS!</text></g></svg>`;

  /* La viñeta de cómic: aparece cuando el cursor se acerca a la sonda (o al enfocarla con el teclado).
     En pantallas táctiles, el primer toque la muestra y el segundo entra. */
  function vineta(boton, portal, nave, alCambiar) {
    const v = document.createElement("div"); v.className = "vineta"; v.setAttribute("role", "img"); v.setAttribute("aria-label", "¡Nosotros somos Los Voyagers!");
    v.innerHTML = VINETA;
    portal.append(v);
    let visible = false, anim = null;
    function colocar() {
      const r = boton.getBoundingClientRect(), w = v.offsetWidth, h = v.offsetHeight, m = 12;
      const cx = r.left + r.width / 2;
      const arriba = r.top - h - 4 > m;                       // encima de la sonda si cabe; si no, debajo
      const derecha = cx < innerWidth / 2;
      let x = derecha ? cx - w * .35 : cx - w * .65;      // la cola del globo queda sobre la sonda
      x = Math.max(m, Math.min(innerWidth - w - m, x));
      const y = Math.max(m, Math.min(innerHeight - h - m, arriba ? r.top - h + r.height * .08 : r.bottom - r.height * .08));
      v.style.left = x + "px"; v.style.top = y + "px";
      v.classList.toggle("debajo", !arriba); v.classList.toggle("derecha", !derecha);
      v.style.transformOrigin = (cx - x) + "px " + (arriba ? "100%" : "0%");
    }
    function mostrar(si) {
      if (si === visible || (!si && portal.classList.contains("entrando"))) return;   // al entrar se va con la sonda, no antes
      visible = si; if (anim) anim.stop();
      if (si) colocar();
      v.classList.toggle("abierta", si);
      nave.atender(si); if (alCambiar) alCambiar(si);
      if (quieto) { v.style.opacity = si ? 1 : 0; return; }
      anim = si ? animate(v, { opacity: [0, 1], scale: [.4, 1], rotate: [-9, -2] }, { type: "spring", stiffness: 420, damping: 19 })
                : animate(v, { opacity: 0, scale: .7 }, { duration: .18, ease: "easeIn" });
    }
    addEventListener("pointermove", e => {
      if (e.pointerType === "touch" || portal.hidden || portal.classList.contains("entrando")) return;
      const r = boton.getBoundingClientRect(), d = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2);
      const radio = Math.max(95, r.width * .75);
      if (d < radio) mostrar(true); else if (d > radio + 55) mostrar(false);
    }, { passive: true });
    boton.addEventListener("focus", () => { if (boton.matches(":focus-visible")) mostrar(true); });
    boton.addEventListener("blur", () => mostrar(false));
    let tactil = false;
    boton.addEventListener("pointerdown", e => { tactil = e.pointerType === "touch"; });
    boton.addEventListener("click", e => {
      if (tactil && !visible) { e.stopImmediatePropagation(); e.preventDefault(); mostrar(true); }
    });
    portal.addEventListener("pointerdown", e => { if (e.pointerType === "touch" && !boton.contains(e.target)) mostrar(false); });
    addEventListener("resize", () => { if (visible) colocar(); });
    // Al entrar, la viñeta acompaña a la sonda en su caída: gira, se achica y desaparece con ella
    let viaje = null;
    function viajar(p) {
      const r = boton.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (!viaje) {
        mostrar(true); if (anim) anim.stop(); anim = null;
        const q = { w: v.offsetWidth, h: v.offsetHeight, l: parseFloat(v.style.left), t: parseFloat(v.style.top) };
        viaje = { w: q.w, h: q.h, dx: q.l + q.w / 2 - x, dy: q.t + q.h / 2 - y, escala: parseFloat(boton.style.scale) || 1 };
        v.style.transformOrigin = "50% 50%";
      }
      const k = (parseFloat(boton.style.scale) || viaje.escala) / viaje.escala;
      v.style.left = (x + viaje.dx * k - viaje.w / 2) + "px"; v.style.top = (y + viaje.dy * k - viaje.h / 2) + "px";
      v.style.transform = "scale(" + k.toFixed(3) + ") rotate(" + (-2 + p * p * 220).toFixed(1) + "deg)";
      v.style.opacity = (1 - Math.max(0, (p - .8) / .2)).toFixed(3);
    }
    function esconder() {
      if (anim) anim.stop(); anim = null; viaje = null; visible = false;
      v.classList.remove("abierta"); v.style.opacity = 0; v.style.transform = "";
      if (alCambiar) alCambiar(false);
    }
    return { mostrar, viajar, esconder };
  }

  function agujero(a) {
    if (!a || quieto) return;
    const parte = (nombre, demora, desde) => {
      a.ajustar({ [nombre]: { brillo: desde } });
      animate(desde, 1, { duration: 2.2, delay: demora, ease: "easeOut", onUpdate: v => a.ajustar({ [nombre]: { brillo: v } }) });
    };
    parte("disco", 0, 0); parte("arco", .7, 0); parte("luna", 1.5, 0); parte("planeta", .3, 0);
    // arranca girando rápido y se asienta
    animate(3.2, 1, { duration: 3.5, ease: SALIDA, onUpdate: v => a.ajustar({ disco: { velocidad: v }, arco: { velocidad: v }, luna: { velocidad: v } }) });
  }

  // La sonda cae en espiral. `desde` y `hacia` van en píxeles del escenario.
  function caida(boton, desde, hacia, alPaso) {
    const w = boton.offsetWidth, h = boton.offsetHeight, escala = parseFloat(boton.style.scale) || 1;
    const dx = desde.x - hacia.x, dy = desde.y - hacia.y, radio = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const dibujo = boton.querySelector(".sonda");
    avivar(1, { duration: 1.2, ease: "easeIn" });
    animate(boton.querySelectorAll(".onda, .baliza"), { opacity: 0 }, { duration: .2 });
    return animate(0, 1, {
      duration: 1.55, ease: CAE,
      onUpdate: p => {
        const r = radio * (1 - p), a = ang + p * Math.PI * 2.6;
        boton.style.left = (hacia.x + Math.cos(a) * r - w / 2) + "px";
        boton.style.top = (hacia.y + Math.sin(a) * r * (1 - .45 * Math.sin(p * Math.PI)) - h / 2) + "px";
        boton.style.scale = (escala * (1 - .93 * p)).toFixed(3);
        boton.style.opacity = (1 - Math.max(0, (p - .82) / .18)).toFixed(3);
        dibujo.style.rotate = (p * p * 760).toFixed(1) + "deg";
        if (alPaso) alPaso(p);
      }
    });
  }

  function reponer(boton) {
    avivar(0, { duration: .4 });
    boton.querySelector(".sonda").style.rotate = "";
  }

  window.Componentes = { titulo, vineta, sonda, agujero, caida, reponer, energia: () => nivel.get(), animar: animate, quieto };
})();
