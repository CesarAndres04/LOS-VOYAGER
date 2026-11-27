/* Sección de Fotos: una galería que cambia de forma al desplazarse, con el formato «Gallery: Playground» de Motion
   (motion.dev/examples/react-gallery-playground), hecho aquí sin React y con la versión libre de Motion.

   Al bajar, las mismas fotos pasan por cinco formas:  Cinta → Carrusel → Anillo → Esfera → Mosaico.
   Los botones saltan a cada forma y al tocar una foto se abre en grande.
     Fotos.abrir()    muestra la sección (la llama el menú)
     Fotos.cerrar()   la oculta */
(function () {
  "use strict";
  const caja = document.getElementById("pasadizo"); if (!caja) return;
  const M = window.Motion, quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PRENSA = "prensa/";

  // [archivo, ancho, alto, pie, descripción, versión para prensa]
  const FOTOS = [
    ["vivo-dia-banda", 2048, 1536, "En vivo · 13.11.2026", "La banda tocando en vivo de día, con una estructura roja detrás", "04-los-voyagers-en-vivo-dia.jpg"],
    ["kiosko", 1600, 1600, "Kiosko · Lima", "Los cuatro integrantes junto a un kiosko de periódicos en Lima", "01-los-voyagers-kiosko.jpg"],
    ["vivo-dia-voz", 1536, 2048, "Voz", "El vocalista cantando con una guitarra roja", "06-los-voyagers-voz-en-vivo.jpg"],
    ["vereda", 1600, 1416, "Vereda · Lima", "La banda en una vereda de Lima a la hora azul", "02-los-voyagers-vereda.jpg"],
    ["vivo-noche-banda", 2048, 1536, "En vivo · 19.11.2026", "La banda tocando en un bar con luz rosada", "05-los-voyagers-en-vivo-noche.jpg"],
    ["vivo-dia-bateria", 1536, 2048, "Batería", "El baterista tocando en vivo de día"],
    ["cruce", 1200, 1200, "Cruce · de noche", "La banda parada en un cruce peatonal de noche, con luces de autos"],
    ["lentes", 1200, 800, "Kiosko · retrato", "Retrato de la banda, con un integrante con lentes de sol en primer plano", "03-los-voyagers-lentes.jpg"],
    ["vivo-dia-bajo", 1536, 2048, "Bajo", "El bajista tocando en vivo de día"],
    ["vivo-dia-duo", 2048, 1536, "Voz y bajo", "El vocalista y el bajista en el escenario de día"],
    ["vivo-dia-guitarra", 1536, 2048, "Guitarra", "El guitarrista tocando en vivo de día"],
    ["vivo-noche-guitarra", 1536, 2048, "De noche", "Un integrante tocando en un bar con luz rosada y azul"]
  ];
  const N = FOTOS.length, FORMAS = ["Cinta", "Carrusel", "Anillo", "Esfera", "Mosaico"];
  const lim = x => x < 0 ? 0 : x > 1 ? 1 : x, suave = t => t * t * (3 - 2 * t);

  const raiz = document.createElement("div"); raiz.id = "fotos"; raiz.hidden = true;
  raiz.innerHTML =
    '<div class="fo-scroll" tabindex="-1"><div class="fo-largo">' +
      '<div class="fo-escena"><div class="fo-mundo">' + FOTOS.map((f, i) =>
        '<button type="button" class="fo-carta" data-i="' + i + '" aria-label="Ver en grande: ' + f[4] + '"><img src="imagenes/mini/' + f[0] + '.webp" width="' + f[1] + '" height="' + f[2] + '" alt="" decoding="async" draggable="false"></button>').join("") +
      "</div></div></div></div>" +
    '<header class="fo-cab"><button type="button" class="fo-volver">Volver al menú</button><h2>Fotos</h2>' +
      '<div class="fo-formas" role="group" aria-label="Forma de la galería">' + FORMAS.map((n, i) => '<button type="button" data-forma="' + i + '" aria-pressed="false">' + n + "</button>").join("") + "</div></header>" +
    '<footer class="fo-pie"><p class="fo-pista">Desplázate para cambiar la forma</p><p>Libres para prensa citando a Los Voyagers · <a href="' + PRENSA + 'los-voyagers-kit-de-prensa.zip" download>Kit de prensa .zip</a></p></footer>' +
    '<div class="fo-detalle" role="dialog" aria-modal="true" aria-label="Foto en grande" hidden><div class="fo-velo"></div>' +
      '<figure><img class="fo-grande" src="imagenes/mini/' + FOTOS[0][0] + '.webp" alt=""><figcaption><span class="fo-texto"></span><span class="fo-cuenta"></span><a class="fo-bajar" download>Descargar</a></figcaption></figure>' +
      '<button type="button" class="fo-cerrar" aria-label="Cerrar">✕</button><button type="button" class="fo-antes" aria-label="Foto anterior">‹</button><button type="button" class="fo-despues" aria-label="Foto siguiente">›</button></div>';
  caja.append(raiz);

  const $ = s => raiz.querySelector(s), $$ = s => [...raiz.querySelectorAll(s)];
  const scroll = $(".fo-scroll"), cartas = $$(".fo-carta"), chips = $$(".fo-formas button"), pista = $(".fo-pista");
  const detalle = $(".fo-detalle"), grande = $(".fo-grande");
  let W = 1, H = 1, S = 200, vertical = false, tam = [];

  function medir() {
    const r = $(".fo-escena").getBoundingClientRect(); if (!r.width) return;
    W = r.width; vertical = W < r.height;
    // el alto libre es el que queda entre los botones de arriba y el texto del pie; la galería se centra ahí
    const arriba = $(".fo-formas").getBoundingClientRect().bottom - r.top + 14, abajo = $(".fo-pie").getBoundingClientRect().top - r.top - 10;
    H = Math.max(200, abajo - arriba);
    $(".fo-mundo").style.top = (arriba + H / 2) + "px"; $(".fo-escena").style.perspectiveOrigin = "50% " + (arriba + H / 2) + "px";
    S = vertical ? Math.min(W * .5, H * .4) : Math.min(W * .17, H * .5);
    tam = FOTOS.map(f => { const a = Math.sqrt(f[1] / f[2]); return [S * a, S / a]; });   // misma superficie, sin recortar a nadie
    cartas.forEach((c, i) => { c.style.width = tam[i][0] + "px"; c.style.height = tam[i][1] + "px"; c.style.margin = -tam[i][1] / 2 + "px 0 0 " + -tam[i][0] / 2 + "px"; });
    pinta();
  }

  /* ---------- Las cinco formas: dónde va la foto i cuando se lleva recorrida la fracción f ---------- */
  const forma = [
    (i, f) => ({ x: (i - f * (N - 1)) * S * 1.22, y: (i % 2 ? .1 : -.1) * S, z: 0, rx: 0, ry: 0, rz: i % 2 ? 2.5 : -2.5, s: 1, o: 1 }),
    (i, f) => { const d = i - f * (N - 1), a = Math.abs(d), g = Math.sign(d), c = Math.min(1, a), l = Math.max(0, a - 1);
      return { x: g * (c * S * .92 + l * S * .36), y: 0, z: -c * S * .75 - l * S * .06, rx: 0, ry: -Math.max(-1, Math.min(1, d)) * 54, rz: 0, s: 1.3 - .3 * c, o: lim(1 - (a - 4) / 2.5) }; },
    (i, f) => { const R = vertical ? Math.max(W * .62, S * 1.7) : Math.max(S * N * 1.1 / 6.2832, S * 2.1), a = (i / N - f) * 6.2832, c = Math.cos(a);
      return { x: Math.sin(a) * R, y: c * S * .38 - S * .05, z: (c - 1) * R * .62, rx: 0, ry: a * 57.2958, rz: -4, s: .92, o: .3 + .7 * (c + 1) / 2 }; },
    (i, f) => { const v = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - v * v), th = i * 2.39996 + f * 6.2832, R = Math.min(S * 1.55, vertical ? W * .46 : H * .44), c = Math.sin(th) * r;
      return { x: Math.cos(th) * r * R * 1.15, y: v * R * (vertical ? Math.min(1.15, H * .4 / R) : .84), z: (c - 1) * R * .7, rx: -v * 22, ry: Math.atan2(Math.cos(th) * r, c + .35) * 57.2958, rz: 0, s: vertical ? .6 : .68, o: .32 + .68 * (c + 1) / 2 }; },
    i => { const cols = vertical ? 3 : 4, filas = N / cols, cw = Math.min(W * .94, 1500) / cols, ch = H / filas, x = i % cols, y = Math.floor(i / cols);
      return { x: (x - (cols - 1) / 2) * cw, y: (y - (filas - 1) / 2) * ch, z: 0, rx: 0, ry: 0, rz: 0, s: Math.min(cw / tam[i][0], ch / tam[i][1]) * .9, o: 1 }; }
  ];
  const giro = (a, b, u) => a + ((((b - a) % 360) + 540) % 360 - 180) * u;
  function estado(i, P) {
    const s = P * 5, k = Math.min(4, Math.floor(s)), t = s - k;
    if (k === 4) return forma[4](i, 0);
    const a = forma[k](i, lim(t / .7)); if (t <= .7) return a;
    const b = forma[k + 1](i, 0), u = suave((t - .7) / .3), m = {};
    for (const n in a) m[n] = n === "ry" ? giro(a[n], b[n], u) : a[n] + (b[n] - a[n]) * u;
    return m;
  }

  let meta = 0, actual = 0, llegada = 1, cuadro = 0, antes = 0, formaVista = -1;
  function pinta() {
    if (!tam.length) return;
    cartas.forEach((c, i) => {
      const q = estado(i, actual), l = lim(llegada * 1.6 - i * .05), e = 1 - Math.pow(1 - l, 3);
      c.style.transform = "translate3d(" + (q.x * e).toFixed(1) + "px," + (q.y * e + (1 - e) * H * .5).toFixed(1) + "px," + (q.z - (1 - e) * 700).toFixed(1) + "px) rotateX(" + q.rx.toFixed(2) + "deg) rotateY(" + q.ry.toFixed(2) + "deg) rotateZ(" + q.rz.toFixed(2) + "deg) scale(" + q.s.toFixed(3) + ")";
      c.style.opacity = (q.o * e).toFixed(3);
      const vista = q.o * e > .25; c.style.visibility = q.o * e > .02 ? "" : "hidden"; c.style.pointerEvents = vista ? "" : "none";
    });
    const k = Math.min(4, Math.floor(actual * 5 + .15));
    if (k !== formaVista) { formaVista = k; chips.forEach((b, j) => b.setAttribute("aria-pressed", j === k)); raiz.dataset.forma = k; }
    pista.style.opacity = lim(1 - actual * 25).toFixed(2);
  }
  function paso(ahora) {
    cuadro = 0; if (raiz.hidden) return;
    const dt = Math.min(.05, antes ? (ahora - antes) / 1000 : .016); antes = ahora;
    actual += (meta - actual) * (quieto ? 1 : Math.min(1, dt * 8));
    if (Math.abs(meta - actual) < .00015) actual = meta;
    pinta();
    if (actual !== meta) pedir(); else antes = 0;
  }
  const pedir = () => { if (!cuadro && !raiz.hidden) cuadro = requestAnimationFrame(paso); };
  function leer() { const max = scroll.scrollHeight - scroll.clientHeight; meta = max > 0 ? lim(scroll.scrollTop / max) : 0; pedir(); }
  scroll.addEventListener("scroll", leer, { passive: true });
  chips.forEach(b => b.addEventListener("click", () => {
    const k = Number(b.dataset.forma), P = k === 0 ? 0 : k === 4 ? .92 : (k + .28) / 5;
    scroll.scrollTo({ top: P * (scroll.scrollHeight - scroll.clientHeight), behavior: quieto ? "auto" : "smooth" });
  }));
  addEventListener("resize", () => { if (!raiz.hidden) medir(); });

  /* ---------- Una foto en grande ---------- */
  let actualFoto = 0, volverA = null;
  function poner(i, paso2) {
    actualFoto = (i + N) % N; const f = FOTOS[actualFoto];
    grande.width = f[1]; grande.height = f[2]; grande.alt = f[4];
    grande.src = "imagenes/mini/" + f[0] + ".webp";
    const entera = new Image(); entera.onload = () => { if (FOTOS[actualFoto] === f) grande.src = entera.src; }; entera.src = "imagenes/" + f[0] + ".webp";
    $(".fo-texto").textContent = f[3]; $(".fo-cuenta").textContent = (actualFoto + 1) + " / " + N;
    $(".fo-bajar").href = f[5] ? PRENSA + f[5] : "imagenes/" + f[0] + ".webp";
    if (paso2 && M && !quieto) M.animate(grande, { x: [paso2 * 70, 0], opacity: [0, 1], scale: 1 }, { type: "spring", stiffness: 240, damping: 26 });
  }
  function desdeCarta() {
    const a = grande.getBoundingClientRect(), b = cartas[actualFoto].getBoundingClientRect();
    return { x: b.left + b.width / 2 - a.left - a.width / 2, y: b.top + b.height / 2 - a.top - a.height / 2, scale: Math.max(.08, b.height / Math.max(1, a.height)) };
  }
  function abrirFoto(i) {
    volverA = cartas[i]; poner(i); detalle.hidden = false; scroll.inert = $(".fo-cab").inert = $(".fo-pie").inert = true;
    if (M && !quieto) {
      const d = desdeCarta();
      M.animate($(".fo-velo"), { opacity: [0, 1] }, { duration: .35 });
      M.animate(grande, { x: [d.x, 0], y: [d.y, 0], scale: [d.scale, 1], opacity: [1, 1] }, { type: "spring", stiffness: 210, damping: 26 });
      M.animate($$(".fo-detalle figcaption, .fo-detalle > button"), { opacity: [0, 1] }, { duration: .3, delay: .2 });
    }
    $(".fo-cerrar").focus({ preventScroll: true });
  }
  async function cerrarFoto(ya) {
    if (detalle.hidden) return;
    if (M && !quieto && !ya) {
      M.animate($$(".fo-detalle figcaption, .fo-detalle > button, .fo-velo"), { opacity: 0 }, { duration: .25 });
      const d = desdeCarta();
      await M.animate(grande, { x: d.x, y: d.y, scale: d.scale, opacity: 0 }, { duration: .34, ease: [.4, 0, .2, 1] });
    }
    detalle.hidden = true; grande.style.transform = grande.style.opacity = ""; scroll.inert = $(".fo-cab").inert = $(".fo-pie").inert = false;
    if (!ya && volverA) volverA.focus({ preventScroll: true });
  }
  cartas.forEach(c => {
    c.addEventListener("click", () => abrirFoto(Number(c.dataset.i)));
    c.addEventListener("focus", () => { if (c.matches(":focus-visible")) c.classList.add("enfocada"); }); c.addEventListener("blur", () => c.classList.remove("enfocada"));
  });
  $(".fo-cerrar").addEventListener("click", () => cerrarFoto());
  $(".fo-velo").addEventListener("click", () => cerrarFoto());
  $(".fo-antes").addEventListener("click", () => poner(actualFoto - 1, -1));
  $(".fo-despues").addEventListener("click", () => poner(actualFoto + 1, 1));
  let desliz = null;
  grande.addEventListener("pointerdown", e => { desliz = e.clientX; });
  grande.addEventListener("pointerup", e => { if (desliz === null) return; const d = e.clientX - desliz; desliz = null; if (Math.abs(d) > 45) poner(actualFoto - Math.sign(d), -Math.sign(d)); });
  raiz.addEventListener("keydown", e => {
    if (detalle.hidden) return;
    if (e.key === "Escape") cerrarFoto(); if (e.key === "ArrowLeft") poner(actualFoto - 1, -1); if (e.key === "ArrowRight") poner(actualFoto + 1, 1);
  });
  // Dentro de la sección, la rueda, el dedo y las teclas no mueven el viaje
  for (const tipo of ["wheel", "pointerdown", "keydown"]) raiz.addEventListener(tipo, e => e.stopPropagation(), { passive: true });
  // La rueda sobre la cabecera o el pie también desplaza la galería
  for (const zona of [$(".fo-cab"), $(".fo-pie")]) zona.addEventListener("wheel", e => { scroll.scrollTop += e.deltaY; }, { passive: true });
  $(".fo-volver").addEventListener("click", () => { if (window.Menu) window.Menu.volver(); });

  window.Fotos = {
    abrir() {
      raiz.hidden = false; scroll.scrollTop = 0; meta = actual = 0; formaVista = -1; llegada = quieto ? 1 : 0; medir();
      if (M && !quieto) M.animate(0, 1, { duration: 1.5, delay: .5, ease: "linear", onUpdate: v => { llegada = v; pinta(); } });
      scroll.focus({ preventScroll: true });
    },
    cerrar() { cerrarFoto(true); raiz.hidden = true; },
    estado: () => ({ progreso: actual, forma: formaVista })
  };
})();
