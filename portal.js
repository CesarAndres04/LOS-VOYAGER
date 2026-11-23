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
    }
    g.globalAlpha = 1;
    requestAnimationFrame(cuadro);
  }
  function arrancar() { abierto = true; ultimo = performance.now(); requestAnimationFrame(cuadro); }
  if (abierto) arrancar();

  /* ---------- Entrar y volver ---------- */
  const inerte = v => resto.forEach(s => $$(s).forEach(el => { try { el.inert = v; } catch { } }));
  if (abierto) inerte(true);

  function limpiar() {
    if (window.gsap) gsap.set([...planetas, ...$$(".logo, .orbitas, .indicio, .pie-portal, .et", portal)], { clearProps: "transform,opacity,scale,x,y,zIndex,visibility,filter" });
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
    const escala = lejos / (r.width / 2) * 1.1;
    const bloom = $(".bloom", portal); bloom.style.setProperty("--c", color); bloom.style.left = ox + "px"; bloom.style.top = oy + "px";
    el.style.zIndex = 5;

    const tl = gsap.timeline({ onComplete: cerrar });
    tl.to($(".et", el), { opacity: 0, duration: .2 }, 0);
    tl.to($$(".logo, .orbitas, .indicio, .pie-portal", portal), { opacity: 0, duration: .5, ease: "power1.in" }, 0);
    tl.to($$(".logo", portal), { scale: 1.5, duration: 1, ease: "power2.in" }, 0);
    planetas.filter(o => o !== el).forEach(o => {
      const q = o.getBoundingClientRect(), dx = q.left + q.width / 2 - W / 2, dy = q.top + q.height / 2 - H / 2;
      tl.to(o, { x: dx * 1.7, y: dy * 1.7, scale: 2.6, opacity: 0, duration: 1.15, ease: "power2.in" }, .02);
    });
    tl.to(el, { scale: escala, duration: 1.3, ease: "power3.in" }, .1);
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
    gsap.from(".orbitas", { opacity: 0, scale: .6, duration: 1.8, ease: "expo.out" });
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
