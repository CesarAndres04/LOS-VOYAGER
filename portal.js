/* Entrada · «Sistema Voyager» (ver portal.css).
   Un cielo de estrellas y destellos en Canvas 2D. Al elegir un planeta, el campo de estrellas se abre desde él (como un salto a velocidad de curvatura),
   el planeta crece hasta llenar la pantalla y todo se disuelve en el visualizer: las canciones empiezan a sonar al entrar. */
(() => {
  "use strict";
  const root = document.documentElement, portal = document.getElementById("portal");
  if (!portal) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv = $("#estrellas"), g = cv.getContext("2d");
  const planetas = $$(".pl", portal), resto = ["main", ".barra", ".saltar", "#panelLetra"];
  const COLORES = ["#ffffff", "#ffe2c7", "#cfe0ff", "#ffc7e6"];

  let W = 0, H = 0, estrellas = [], tunel = [], px = 0, py = 0, tx = 0, ty = 0, abierto = root.classList.contains("en-portal"), ocupado = false;
  const estado = { p: 0, modo: "reposo", ox: 0, oy: 0 }, KMAX = 16;
  const sprites = COLORES.map(c => {
    const s = document.createElement("canvas"); s.width = s.height = 64; const x = s.getContext("2d");
    const grad = x.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, c); grad.addColorStop(.12, c + "cc"); grad.addColorStop(.4, c + "22"); grad.addColorStop(1, c + "00");
    x.fillStyle = grad; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = c; x.lineCap = "round"; x.lineWidth = 2; x.beginPath(); x.moveTo(32, 3); x.lineTo(32, 61); x.moveTo(3, 32); x.lineTo(61, 32); x.stroke();
    x.lineWidth = 1; x.globalAlpha = .55; x.beginPath(); x.moveTo(15, 15); x.lineTo(49, 49); x.moveTo(49, 15); x.lineTo(15, 49); x.stroke();
    return s;
  });

  function medir() {
    const d = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); g.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(Math.max(110, Math.min(360, W * H / 5200)));
    estrellas = Array.from({ length: n }, () => {
      const z = .25 + Math.random() * .75, brillo = Math.random() < .14;
      return { x: Math.random() * W, y: Math.random() * H, z, r: .5 + z * 1.15, f: Math.random() * 6.28, v: .6 + Math.random() * 1.6,
        brillo, t: brillo ? 12 + z * 24 : 0, c: Math.floor(Math.random() * COLORES.length) };
    });
  }
  addEventListener("resize", medir); medir();
  addEventListener("pointermove", e => { tx = (e.clientX / W - .5) * 2; ty = (e.clientY / H - .5) * 2; }, { passive: true });


  /* ---------- La esfera de partículas ----------
     Una nube de puntos sobre una esfera (espiral áurea) y un anillo. Entra desde el desorden, se mece, se deja empujar por el cursor
     (se aparta y vuelve), se aprieta al mantener pulsado y gira con inercia al lanzarla. El nombre flota dentro. */
  const orb = { pts: [], cx: 0, cy: 0, R: 100, t0: performance.now(), ay: 0, tilt: 0, wy: 0, esc: 1, vesc: 0, escObj: 1, arrastra: false, ult: null, vel: 0 };
  const ptr = { x: -9999, y: -9999 };
  const PAL = [[95, 143, 232], [150, 80, 220], [214, 50, 159], [255, 90, 44], [255, 179, 107]];
  const spritesOrb = Array.from({ length: 24 }, (_, i) => {
    const u = i / 23 * (PAL.length - 1), a = PAL[Math.floor(u)], b = PAL[Math.min(PAL.length - 1, Math.floor(u) + 1)], f = u - Math.floor(u);
    const c = a.map((v, k) => Math.round(v + (b[k] - v) * f)), s = document.createElement("canvas"); s.width = s.height = 32; const x = s.getContext("2d");
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(.18, `rgba(${c},.95)`); gr.addColorStop(.5, `rgba(${c},.28)`); gr.addColorStop(1, `rgba(${c},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return s;
  });
  function crearOrb() {
    const movil = W < 700, nE = movil ? 1500 : 3000, nA = movil ? 240 : 520, oro = Math.PI * (3 - Math.sqrt(5)), pts = [];
    const esparcir = () => { const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), r = 2 + Math.random() * 3.2; return [Math.sin(b) * Math.cos(a) * r, Math.sin(b) * Math.sin(a) * r, Math.cos(b) * r]; };
    for (let i = 0; i < nE; i++) {
      const y = 1 - (i + .5) / nE * 2, r = Math.sqrt(1 - y * y), th = oro * i, e = esparcir(), s = .93 + Math.random() * .07;
      pts.push({ x: Math.cos(th) * r * s, y: y * s, z: Math.sin(th) * r * s, c: Math.max(0, Math.min(23, Math.round(((1 - y) / 2 + (Math.random() - .5) * .3) * 23))), dx: e[0], dy: e[1], dz: e[2], vx: 0, vy: 0, vz: 0, re: Math.random() * 1.7, anillo: false });
    }
    for (let i = 0; i < nA; i++) {
      const a = Math.random() * 6.283, rr = 1.38 + (Math.random() - .5) * .2, e = esparcir();
      pts.push({ x: Math.cos(a) * rr, y: (Math.random() - .5) * .05, z: Math.sin(a) * rr, c: 15 + Math.floor(Math.random() * 9), dx: e[0], dy: e[1], dz: e[2], vx: 0, vy: 0, vz: 0, re: 1 + Math.random() * 1.4, anillo: true });
    }
    orb.pts = pts; orb.nombre = movil;
  }
  function medirOrb() {
    const st = $("#stage"), lg = $(".logo", portal); if (!st || !lg) return;
    const a = st.getBoundingClientRect(), l = lg.getBoundingClientRect();
    orb.cx = l.left + l.width / 2; orb.cy = l.top + l.height / 2; orb.R = a.width * (a.height > a.width ? .29 : .2);
  }
  addEventListener("resize", () => { medirOrb(); if (orb.nombre !== (W < 700)) crearOrb(); });
  addEventListener("pointermove", e => { ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
  portal.addEventListener("pointerdown", e => {
    if (e.target.closest(".pl, .saltar-entrada") || ocupado) return;
    if (Math.hypot(e.clientX - orb.cx, e.clientY - orb.cy) < orb.R * 1.7) { orb.arrastra = true; orb.ult = [e.clientX, e.clientY, performance.now()]; orb.escObj = .84; orb.vel = 0; if (portal.setPointerCapture) portal.setPointerCapture(e.pointerId); }
  });
  const suelta = () => { if (!orb.arrastra) return; orb.arrastra = false; orb.escObj = 1; orb.vesc += 1.6; orb.wy = Math.max(-10, Math.min(10, orb.vel)); };
  portal.addEventListener("pointerup", suelta); portal.addEventListener("pointercancel", suelta);
  portal.addEventListener("pointermove", e => {
    if (!orb.arrastra) return;
    const ahora = performance.now(), dt = Math.max(.008, (ahora - orb.ult[2]) / 1000), dx = e.clientX - orb.ult[0], dy = e.clientY - orb.ult[1];
    orb.ay += dx / orb.R * 1.5; orb.tilt = Math.max(-.7, Math.min(.7, orb.tilt + dy / orb.R * .9)); orb.vel = orb.vel * .6 + (dx / orb.R * 1.5 / dt) * .4;
    orb.ult = [e.clientX, e.clientY, ahora];
  });
  function dibujarOrb(dt, seg, explota) {
    const pts = orb.pts, R = orb.R, t = (performance.now() - orb.t0) / 1000;
    if (!pts.length) return;
    if (!quieto) {
      orb.ay += (.22 + orb.wy) * dt; orb.wy *= Math.exp(-1.5 * dt); orb.tilt *= Math.exp(-1.2 * dt);
      if (!orb.arrastra) { const cerca = Math.hypot(ptr.x - orb.cx, ptr.y - orb.cy) < R * 1.1; orb.escObj = cerca ? 1.05 : 1; }
      orb.vesc += (orb.escObj - orb.esc) * 70 * dt; orb.vesc *= Math.exp(-6.5 * dt); orb.esc += orb.vesc * dt;
    }
    const ax = .36 + orb.tilt + (quieto ? 0 : Math.sin(t * .5) * .1), cx = Math.cos(ax), sx = Math.sin(ax), esc = orb.esc;
    const mx = (ptr.x - orb.cx) / R, my = (ptr.y - orb.cy) / R, rad = .42, base = W < 700 ? 2.3 : 3.1, ex = explota || 0, mult = 1 + ex * ex * 9;
    const cs = Math.cos(orb.ay), sn = Math.sin(orb.ay), cr = Math.cos(orb.ay * 1.7), sr = Math.sin(orb.ay * 1.7);
    g.globalCompositeOperation = "lighter";
    const damp = Math.exp(-3.6 * dt), cargar = 30 * dt;
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i]; if (t < q.re) continue;
      const ca = q.anillo ? cr : cs, sa = q.anillo ? sr : sn;   // el anillo gira más rápido
      const x1 = q.x * ca + q.z * sa, z1 = -q.x * sa + q.z * ca, y2 = q.y * cx - z1 * sx, z2 = q.y * sx + z1 * cx;
      if (!quieto) {
        q.vx -= q.dx * cargar; q.vy -= q.dy * cargar; q.vz -= q.dz * cargar;
        const vx = x1 * esc + q.dx - mx, vy = y2 * esc + q.dy - my, d2 = vx * vx + vy * vy;
        if (d2 < rad * rad && d2 > 1e-5) { const d = Math.sqrt(d2), f = (1 - d / rad) * 2.4; q.vx += vx / d * f; q.vy += vy / d * f; q.vz += f * .6; }
        q.vx *= damp; q.vy *= damp; q.vz *= damp; q.dx += q.vx * dt * 36; q.dy += q.vy * dt * 36; q.dz += q.vz * dt * 36;
      } else { q.dx = q.dy = q.dz = 0; }
      const X = x1 * esc + q.dx, Y = y2 * esc + q.dy, Z = z2 * esc + q.dz, pe = 1 / (1 - Z * .16);
      const ap = Math.min(1, (t - q.re) / .5), prof = Math.max(0, Math.min(1, (Z + 1.6) / 3.2));
      const a = (.25 + .75 * prof) * ap * (quieto ? 1 : .85 + .15 * Math.sin(seg * 2 + i)) * (1 - Math.min(1, ex * 1.1));
      if (a <= .01) continue;
      const sz = base * pe * (.7 + .5 * prof) * 4.2 * (q.anillo ? .8 : 1);
      g.globalAlpha = a * (q.anillo ? .8 : 1);
      g.drawImage(spritesOrb[q.c], orb.cx + X * R * pe * mult - sz / 2, orb.cy + Y * R * pe * mult - sz / 2, sz, sz);
    }
    g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  }
  crearOrb();

  let ultimo = 0;
  function cuadro(ahora) {
    if (!abierto) return;
    const dt = Math.min(.05, (ahora - ultimo) / 1000 || .016); ultimo = ahora;
    px += (tx - px) * .06; py += (ty - py) * .06;
    g.clearRect(0, 0, W, H);
    const seg = ahora / 1000;
    if (estado.modo === "reposo") {
      for (const e of estrellas) {
        if (!quieto) { e.y -= e.z * 5 * dt; if (e.y < -20) { e.y = H + 20; e.x = Math.random() * W; } }
        const x = e.x - px * e.z * 16, y = e.y - py * e.z * 16;
        const a = quieto ? .85 : .55 + .45 * Math.sin(seg * e.v + e.f);
        if (e.brillo) { g.globalAlpha = a * (.5 + e.z * .5); g.drawImage(sprites[e.c], x - e.t / 2, y - e.t / 2, e.t, e.t); }
        else { g.globalAlpha = a * (.3 + e.z * .7); g.fillStyle = "#f4f0ff"; g.beginPath(); g.arc(x, y, e.r, 0, 6.283); g.fill(); }
      }
      dibujarOrb(dt, seg, 0);
    } else {
      // Salto: cada estrella se aleja del planeta elegido en línea recta y deja una estela
      const p = estado.p, k1 = Math.exp(p * Math.log(KMAX)), k0 = Math.exp(Math.max(0, p - .09) * Math.log(KMAX));
      g.lineCap = "round";
      const pinta = (e, ancho) => {
        const dx = e.x - estado.ox, dy = e.y - estado.oy;
        const x1 = estado.ox + dx * k1, y1 = estado.oy + dy * k1;
        if (x1 < -80 || x1 > W + 80 || y1 < -80 || y1 > H + 80) return;
        g.globalAlpha = Math.min(1, .35 + e.z * .65); g.strokeStyle = p > .55 ? "#dfe9ff" : "#f4f0ff"; g.lineWidth = Math.max(.6, ancho * (e.r + p * 1.4));
        g.beginPath(); g.moveTo(estado.ox + dx * k0, estado.oy + dy * k0); g.lineTo(x1, y1); g.stroke();
      };
      for (const e of estrellas) pinta(e, 1);
      for (const e of tunel) pinta(e, .9);
      dibujarOrb(dt, seg, p);
    }
    g.globalAlpha = 1;
    requestAnimationFrame(cuadro);
  }
  function arrancar() { abierto = true; ultimo = performance.now(); requestAnimationFrame(cuadro); }
  medirOrb(); if (document.fonts) document.fonts.ready.then(medirOrb);
  if (abierto) arrancar();

  /* ---------- Entrar y volver ---------- */
  const inerte = v => resto.forEach(s => $$(s).forEach(el => { try { el.inert = v; } catch { } }));
  if (abierto) inerte(true);

  function limpiar() {
    if (window.gsap) gsap.set([...planetas, ...$$(".logo, .indicio, .pie-portal, .et", portal)], { clearProps: "transform,opacity,scale,x,y,zIndex,visibility,filter" });
    portal.classList.remove("entrando"); estado.modo = "reposo"; estado.p = 0; tunel = [];
    $(".bloom", portal).style.opacity = 0;
  }
  function cerrar() {
    abierto = false; ocupado = false; portal.hidden = true; limpiar(); inerte(false);
  }
  // Abre el paso al visualizer por debajo de la entrada
  function revelar(destino) {
    root.classList.remove("en-portal"); inerte(false);
    if (destino) { const el = $(destino); if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: "instant" }); }
    else scrollTo({ top: 0, behavior: "instant" });
    if (window.vgIntro) window.vgIntro();
    if (window.gsap && !quieto && !destino) gsap.from(".receptor .pantalla", { scale: 1.1, opacity: 0, filter: "blur(14px)", duration: 1.6, ease: "expo.out", clearProps: "transform,opacity,filter" });
  }

  function zambullir(el) {
    if (ocupado) return; ocupado = true;
    const destino = el.dataset.ir || "";
    const cuerpo = $(".cuerpo, .sonda", el), r = cuerpo.getBoundingClientRect();
    const ox = r.left + r.width / 2, oy = r.top + r.height / 2, color = getComputedStyle(el).getPropertyValue("--c").trim() || "#ff5a2c";
    portal.classList.add("entrando");
    if (quieto || !window.gsap) { gsap_sin(destino); return; }

    estado.ox = ox; estado.oy = oy; estado.p = 0; estado.modo = "salto";
    const diag = Math.hypot(W, H);
    tunel = Array.from({ length: 170 }, () => {
      const a = Math.random() * 6.283, rr = (.012 + Math.random() * .1) * diag / 3;
      return { x: ox + Math.cos(a) * rr, y: oy + Math.sin(a) * rr, z: .4 + Math.random() * .6, r: .5 + Math.random() };
    });
    const lejos = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    const escala = Math.min(lejos / (r.width / 2) * 1.1, 4.2); // no se agranda más: así la foto no se pixela ni se cortan las caras
    const bloom = $(".bloom", portal); bloom.style.setProperty("--c", color); bloom.style.left = ox + "px"; bloom.style.top = oy + "px";
    el.style.zIndex = 5;

    const tl = gsap.timeline({ onComplete: cerrar });
    tl.to($(".et", el), { opacity: 0, duration: .2 }, 0);
    tl.to($$(".logo, .indicio, .pie-portal", portal), { opacity: 0, duration: .5, ease: "power1.in" }, 0);
    tl.to($$(".logo", portal), { scale: 1.5, duration: 1, ease: "power2.in" }, 0);
    planetas.filter(o => o !== el).forEach(o => {
      const q = o.getBoundingClientRect(), dx = q.left + q.width / 2 - W / 2, dy = q.top + q.height / 2 - H / 2;
      tl.to(o, { x: dx * 1.7, y: dy * 1.7, scale: 2.6, opacity: 0, duration: 1.15, ease: "power2.in" }, .02);
    });
    tl.to(el, { scale: escala, duration: 1.3, ease: "power3.in" }, .1);
    tl.to($$(".cuerpo, .sonda, .aro", el), { opacity: 0, duration: .45, ease: "power1.in" }, .9);
    tl.to(estado, { p: 1, duration: 1.35, ease: "power2.in" }, 0);
    tl.fromTo(bloom, { opacity: 0, scale: .1 }, { opacity: 1, scale: 1, duration: .55, ease: "power2.in" }, .85);
    tl.call(() => revelar(destino), null, 1.3);
    tl.to(portal, { opacity: 0, duration: .9, ease: "power1.out" }, 1.32);
  }
  // Sin movimiento: un fundido corto
  function gsap_sin(destino) {
    portal.style.transition = "opacity .45s"; portal.style.opacity = 0;
    revelar(destino);
    setTimeout(() => { portal.style.transition = ""; portal.style.opacity = ""; cerrar(); }, 480);
  }

  planetas.forEach(el => el.addEventListener("click", e => { if (el.dataset.ir) e.preventDefault(); zambullir(el); }));
  $("#saltarEntrada").addEventListener("click", () => {
    if (ocupado) return; ocupado = true;
    if (quieto || !window.gsap) { gsap_sin(""); return; }
    gsap.to(portal, { opacity: 0, duration: .6, ease: "power1.out", onStart: () => revelar(""), onComplete: cerrar });
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && abierto && !ocupado) $("#saltarEntrada").click(); });

  // Entrada de la propia entrada: los planetas llegan uno por uno
  if (abierto && window.gsap && !quieto) {
    gsap.from(planetas, { scale: .15, opacity: 0, duration: 1.4, ease: "expo.out", stagger: .09, delay: .25 });
    gsap.from(".logo .l2 i", { yPercent: 110, duration: 1.3, ease: "expo.out", delay: .1 });
    gsap.from([".logo .l1", ".logo .l3", ".indicio", ".pie-portal"], { opacity: 0, y: 14, duration: 1.1, ease: "power2.out", stagger: .1, delay: .5 });
  }

  // Volver al sistema: el nombre de la barra reabre la entrada (la música sigue sonando)
  $(".marca").addEventListener("click", e => {
    e.preventDefault();
    if (abierto) return;
    scrollTo({ top: 0, behavior: "instant" }); root.classList.add("en-portal"); inerte(true);
    portal.hidden = false; portal.style.opacity = 1; ocupado = false; estado.modo = "reposo";
    arrancar();
    if (window.gsap && !quieto) {
      gsap.from(portal, { opacity: 0, duration: .7, ease: "power1.out" });
      gsap.from(planetas, { scale: .3, opacity: 0, duration: 1.1, ease: "expo.out", stagger: .07, clearProps: "transform,opacity,scale,x,y,zIndex,visibility,filter" });
    }
  });
})();
