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
      const z = .25 + Math.random() * .75, brillo = Math.random() < .025;
      return { x: Math.random() * W, y: Math.random() * H, z, r: .5 + z * 1.15, f: Math.random() * 6.28, v: .6 + Math.random() * 1.6,
        brillo, t: brillo ? 12 + z * 24 : 0, c: Math.floor(Math.random() * COLORES.length) };
    });
  }
  addEventListener("resize", medir); medir();
  addEventListener("pointermove", e => { tx = (e.clientX / W - .5) * 2; ty = (e.clientY / H - .5) * 2; }, { passive: true });


  /* ---------- El agujero negro ----------
     Es el centro del sistema (agujero.js): la luz de su disco orbita en 3D y los planetas giran a su alrededor. */
  const centro = { x: 0, y: 0 };                          // en pantalla; ahí queda la sombra del agujero
  const CENTRO_ALTO = .57;                                // altura del centro dentro del escenario: arriba va el nombre
  const cajaAgujero = $(".agujero", portal);
  let agujero = null;
  function medirCentro() {
    const st = $("#stage"), lg = $(".logo", portal); if (!st || !lg) return;
    const a = st.getBoundingClientRect();
    if (!a.width) return;
    centro.x = a.left + a.width / 2; centro.y = a.top + a.height * CENTRO_ALTO; centro.lg = lg.getBoundingClientRect();
  }
  function encuadre(w, h) {
    medirCentro();
    const disco = w < h ? w * .96 : Math.min(w * .64, h * 1.12);    // ancho del disco en pantalla: lejos, con espacio alrededor
    const escala = 1070 / disco;
    centro.escala = escala;                                // píxeles de la figura por píxel de pantalla
    return { escala, ox: 604 - (centro.x || w / 2) * escala, oy: 360 - (centro.y || h * .54) * escala };
  }
  let cielo = null;
  function encender() {
    const caja = $(".cielo-v", portal); if (!cielo && caja && window.Cielo) { cielo = Cielo.crear(caja); portal.classList.toggle("ligera", cielo.ligero); }
    if (!agujero && cajaAgujero && window.Agujero) agujero = Agujero.crear(cajaAgujero, { sinCielo: !!cielo, encuadre, mundo: new URLSearchParams(location.search).get("mundo") || "particulas", superficie: portal, energia: () => window.Componentes ? Componentes.energia() : 0 }); }
  const reencuadrar = () => { medirCentro(); if (agujero) agujero.medir(); };
  addEventListener("resize", reencuadrar);


  /* ---------- La sonda, por delante del aro ----------
     Recorre solo la mitad delantera del anillo, de un lado al otro y de vuelta, girando sobre sí misma. Nunca pasa por detrás. */
  const sp = { k: quieto ? 1 : 0, lock: false, quieta: false, t: 0 };
  const stageEl = $("#stage");
  const ORBITA = 455;                                      // radio de su recorrido, en píxeles de la figura (el aro llega a ~570)
  function deriva(dt) {
    const el = planetas[0];
    if (sp.lock || !stageEl || !el || !centro.escala) return;
    const st = stageEl.getBoundingClientRect(), vertical = st.height > st.width;
    if (!quieto && !sp.quieta) sp.t += dt;
    const k = sp.k, t = sp.t;
    // ángulo sobre el disco: π/2 es el punto más cercano; oscila sin llegar nunca a las puntas ni detrás
    const a = Math.PI / 2 + Math.sin(t * .13 + .75) * (vertical ? .78 : 1.12), z = Math.sin(a);
    const lejos = 1 + (1 - k) * 1.6;                       // al entrar llega desde fuera
    const px = Math.cos(a) * ORBITA * lejos, py = (z * ORBITA * .2 + (vertical ? 170 : 22) + Math.sin(t * .31 + 1) * 14) * lejos;
    const ci = Math.cos(.22), si = Math.sin(.22);          // la misma inclinación que el disco
    // del centro del disco (625, 345) al punto que la página usa como centro (604, 360)
    const x = (625 - 604 + px * ci - py * si) / centro.escala, y = (345 - 360 + px * si + py * ci) / centro.escala;
    const w = el.offsetWidth, h = el.offsetHeight, esc = (.62 + .36 * z) * (.4 + .6 * k);
    const cx = Math.max(w * esc * .42, Math.min(innerWidth - w * esc * .42, centro.x + x));
    el.style.left = (cx - st.left - w / 2).toFixed(1) + "px"; el.style.top = (centro.y - st.top + y - h / 2).toFixed(1) + "px";
    el.style.scale = esc.toFixed(3);
    el.style.setProperty("--giro", (Math.sin(t * .17) * 20 + Math.sin(t * .061) * 26).toFixed(1) + "deg");
    el.style.opacity = Math.min(1, k * 1.5).toFixed(3); el.style.zIndex = 20;
  }
  planetas.forEach(el => {
    const para = () => { sp.quieta = true; }, sigue = () => { sp.quieta = false; };
    if (!window.Componentes) { el.addEventListener("pointerenter", para); el.addEventListener("pointerleave", sigue); }
    el.addEventListener("focus", () => { para(); }); el.addEventListener("blur", sigue);
  });

  let ultimo = 0, limpio = false;
  function cuadro(ahora) {
    if (!abierto) return;
    const dt = Math.min(.05, (ahora - ultimo) / 1000 || .016); ultimo = ahora;
    px += (tx - px) * .06; py += (ty - py) * .06;
    // Con el agujero encima, las estrellas de reposo no se ven: no vale la pena repintar el lienzo en cada cuadro
    const tapado = estado.modo === "reposo" && agujero && agujero.opaco;
    if (!tapado || !limpio) g.clearRect(0, 0, W, H);
    limpio = tapado; cv.style.visibility = tapado ? "hidden" : "";
    const seg = ahora / 1000;
    if (estado.modo === "reposo") {
      if (!agujero || !agujero.opaco) for (const e of estrellas) {
        if (!quieto) { e.y -= e.z * 2.2 * dt; if (e.y < -20) { e.y = H + 20; e.x = Math.random() * W; } }
        const x = e.x - px * e.z * 16, y = e.y - py * e.z * 16;
        const a = quieto ? .6 : .36 + .34 * Math.sin(seg * e.v * .6 + e.f);
        if (e.brillo) { g.globalAlpha = a * (.5 + e.z * .5); g.drawImage(sprites[e.c], x - e.t / 2, y - e.t / 2, e.t, e.t); }
        else { g.globalAlpha = a * (.3 + e.z * .7); g.fillStyle = "#f4f0ff"; g.beginPath(); g.arc(x, y, e.r, 0, 6.283); g.fill(); }
      }
      deriva(dt);
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
      if (cajaAgujero) { cajaAgujero.style.opacity = Math.max(0, 1 - p * 1.25); cajaAgujero.style.transform = "scale(" + (1 + p * p * .9).toFixed(3) + ")"; }
    }
    g.globalAlpha = 1;
    requestAnimationFrame(cuadro);
  }
  function arrancar() { abierto = true; encender(); ultimo = performance.now(); requestAnimationFrame(cuadro); }
  medirCentro(); if (document.fonts) document.fonts.ready.then(reencuadrar);
  deriva(0);
  if (abierto) arrancar();

  /* ---------- Entrar y volver ---------- */
  const inerte = v => resto.forEach(s => $$(s).forEach(el => { try { el.inert = v; } catch { } }));
  if (abierto) inerte(true);

  // Las piezas animadas (componentes.js, hechas con Motion)
  const C = window.Componentes, boton = planetas[0];
  const nombre = C && C.titulo($(".logo", portal)), nave = C && boton && C.sonda(boton);
  // mientras se muestra la viñeta, la sonda se detiene (va antes que el click que entra)
  const globo = nave && C.vineta(boton, portal, nave, si => { sp.quieta = si; });
  function presentar() {
    if (!C) { sp.k = 1; return; }
    nombre.entrar(); nave.entrar(sp); C.agujero(agujero); if (cielo) cielo.entrar();
    if (!C.quieto) C.animar($(".pie-portal", portal), { opacity: [0, 1] }, { duration: 1, delay: 1.8 });
  }
  let enCurso = [];

  function limpiar() {
    enCurso.forEach(a => a.stop()); enCurso = [];
    $$(".logo, .pie-portal, .et", portal).forEach(el => { el.style.opacity = ""; });
    if (C && boton) C.reponer(boton);
    if (globo) globo.esconder();
    if (cielo) cielo.reponer();
    portal.classList.remove("entrando"); estado.modo = "reposo"; estado.p = 0; tunel = [];
    const bloom = $(".bloom", portal); bloom.style.opacity = 0; bloom.style.transform = "";
    if (cajaAgujero) cajaAgujero.style.opacity = cajaAgujero.style.transform = "";
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
    if (window.Pasadizo) window.Pasadizo.entrar();
    const pantalla = $(".receptor .pantalla");
    if (C && !C.quieto && !destino && pantalla)
      C.animar(pantalla, { scale: [1.1, 1], opacity: [0, 1], filter: ["blur(14px)", "blur(0px)"] }, { duration: 1.6, ease: [.16, 1, .3, 1] })
        .then(() => { pantalla.style.transform = pantalla.style.opacity = pantalla.style.filter = ""; });
  }

  // Al tocar la sonda: cae en espiral al agujero, bajan las cortinas de color y el iris abre la página
  function zambullir(el) {
    if (ocupado) return; ocupado = true; sp.lock = true;
    const destino = el.dataset.ir || "";
    portal.classList.add("entrando");
    if (quieto || !C || !window.Transicion) { sinMovimiento(destino); return; }
    const st = stageEl.getBoundingClientRect(), r = el.getBoundingClientRect();
    const luego = (valor, hasta, ajustes) => { const a = C.animar(valor, hasta, ajustes); enCurso.push(a); return a; };
    luego($$(".et, .logo, .pie-portal", portal), { opacity: 0 }, { duration: .45 });
    if (globo) globo.viajar(0);
    enCurso.push(C.caida(el, { x: r.left + r.width / 2 - st.left, y: r.top + r.height / 2 - st.top }, { x: centro.x - st.left, y: centro.y - st.top }, globo ? globo.viajar : null));
    window.Transicion.pasar(() => { revelar(destino); cerrar(); }, { demora: 1.05 });
  }
  // Sin movimiento: un fundido corto
  function sinMovimiento(destino) {
    portal.style.transition = "opacity .45s"; portal.style.opacity = 0;
    revelar(destino);
    setTimeout(() => { portal.style.transition = ""; portal.style.opacity = ""; cerrar(); }, 480);
  }

  planetas.forEach(el => el.addEventListener("click", e => { if (el.dataset.ir) e.preventDefault(); zambullir(el); }));
  $("#saltarEntrada").addEventListener("click", () => {
    if (ocupado) return; ocupado = true;
    if (quieto || !C || !window.Transicion) { sinMovimiento(""); return; }
    window.Transicion.pasar(() => { revelar(""); cerrar(); });
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && abierto && !ocupado) $("#saltarEntrada").click(); });

  // La entrada de la propia entrada
  if (abierto) presentar();

  // Volver al sistema: el nombre de la barra reabre la entrada (la música sigue sonando)
  const volver = $(".marca");
  function regresar() {
    scrollTo({ top: 0, behavior: "instant" }); root.classList.add("en-portal"); inerte(true);
    portal.hidden = false; portal.style.opacity = 1; ocupado = false; estado.modo = "reposo";
    sp.lock = false;
    arrancar(); reencuadrar(); presentar();
  }
  if (volver) volver.addEventListener("click", e => {
    e.preventDefault();
    if (abierto) return;
    if (window.Transicion && !quieto) window.Transicion.pasar(() => { if (window.Pasadizo) window.Pasadizo.salir(); regresar(); });
    else regresar();
  });
})();
