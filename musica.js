/* Sección de Música: las canciones publicadas, con el formato «Now playing» de Motion (motion.dev/examples/js-now-playing),
   hecho aquí con la versión libre de Motion: un reproductor pequeño abajo que se abre en uno completo, y la carátula y el
   título viajan de uno al otro.

     Musica.abrir()    muestra la sección (la llama el menú)
     Musica.cerrar()   la oculta y pausa la canción
   La música solo suena cuando la persona le da a reproducir. */
(function () {
  "use strict";
  const caja = document.getElementById("pasadizo"); if (!caja) return;
  const M = window.Motion, quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Datos publicados (página anterior del proyecto) y tiempos de la letra
  const CANCIONES = [
    { id: "decidido", titulo: "Decidido", meta: "Single · 14.08.2026", dur: 246.1, audio: "audio/decidido.mp3", tapa: "assets/decidido-900.webp", tono: "#2442d6",
      enlaces: [["Spotify", "https://open.spotify.com/track/1PkFrKaeXV9bHYA51lHPke"], ["Apple Music", "https://music.apple.com/pe/album/decidido/6794141871?i=6794141872"], ["Deezer", "https://www.deezer.com/album/1036594372"]],
      letra: [[0, "Otra vez por aquí"], [7.56, "Enfrentándome a mi destino"], [14, "Siento que eres mucho para mí"], [20.9, "Temo se separen nuestros caminos"], [26.4, "Pero ya está decidido"], [33.4, "Pero ya está decidido"], [42.4, "Esto va más allá"], [45.2, "De mi comprensión"], [49.3, "La inestabilidad"], [52.5, "De tu falso amor"], [57, ""], [70.2, "Y ahora me ves así"], [73.7, "Peleándome para olvidarla"], [77.6, "Aunque una parte de mí"], [80.4, "Solo piensa en dejarla"], [85, "Yo sé que no tiene sentido"], [88.6, "Nada de lo que te digo"], [92, "A veces pienso aún en estar contigo"], [97.9, "Pero ya está decidido"], [105, "Pero ya está decidido"], [111.6, "Esto va más allá"], [116.1, "De mi comprensión"], [119.8, "La inestabilidad"], [124, "De tu falso amor"], [126.3, ""]] },
    { id: "vuelvo", titulo: "Vuelvo", meta: "Single y videoclip · 17.10.2025", dur: 188.8, audio: "audio/vuelvo.mp3", tapa: "assets/vuelvo-900.webp", tono: "#d63ad0",
      enlaces: [["Spotify", "https://open.spotify.com/track/7IpJkuCf6n0QJLOCswal4q"], ["Apple Music", "https://music.apple.com/pe/album/vuelvo/1842425913?i=1842425914"], ["Videoclip", "https://www.youtube.com/watch?v=T1SDRPZFOKY"]],
      letra: [[0, ""], [11.54, "Siempre que vuelvo aquí"], [14.04, "Siento que no pertenezco"], [17.5, "Y sigo pensando en ti"], [19.5, "Que pensamiento tan molesto"], [23, "¿Por qué será?"], [25.8, "Que sigues en mi mente"], [28.6, "¿Por qué será?"], [31.2, "No importa cuanto intente siempre"], [33.9, "Vuelvo"], [35.1, "A tu cuerpo"], [37.7, "Que me amarra"], [41.5, "Y me desarma"], [43.6, "Habrá una razón"], [48.2, "Para amar así"], [53, "Otra vez"], [54.6, "Habrá alguna solución"], [59.4, "Para mi corazón"], [61.8, "Que ya no puede más"], [66, "Ya no creo que pueda intentar"], [72.2, "Amar sin confesar"], [77, "Que ya no puedo"], [79.6, ""], [142.6, "Habrá una razón"], [146, "Para amar así"], [148.3, "Otra vez"], [151.2, "Habrá alguna solución"], [155.4, "Para mi corazón"], [157.8, "Que ya no puede más"], [162, "Ya no creo que pueda intentar"], [168.3, "Amar sin confesar"], [173, "Que ya no puedo"], [175.7, ""]] }
  ];
  const PERFILES = [["Spotify", "https://open.spotify.com/artist/79JBzLkRFj1qpFfbIcvW3l"], ["Apple Music", "https://music.apple.com/pe/artist/los-voyagers/1799073274"], ["YouTube", "https://www.youtube.com/@LosVoyagers"], ["Instagram", "https://www.instagram.com/los.voyagers/"], ["TikTok", "https://www.tiktok.com/@losvoyagers"]];

  const reloj = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const enlaces = lista => lista.map(([n, u]) => '<a href="' + u + '" target="_blank" rel="noopener">' + n + "</a>").join("");
  const ICONO = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    antes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5L9 12l11 7zM4 5h3v14H4z"/></svg>',
    despues: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5l11 7-11 7zM17 5h3v14h-3z"/></svg>',
    abajo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l8 9 8-9-3-1-5 6-5-6z"/></svg>'
  };

  const raiz = document.createElement("div"); raiz.id = "musica"; raiz.hidden = true;
  raiz.innerHTML =
    '<div class="mu-fondo">' +
      '<header class="mu-cab"><button type="button" class="mu-volver">Volver al menú</button><h2>Música</h2><p>Canciones publicadas</p></header>' +
      '<ul class="mu-lista">' + CANCIONES.map((c, i) =>
        '<li class="mu-tarjeta" style="--tono:' + c.tono + '"><div class="mu-arte"><span class="mu-disco" aria-hidden="true"></span>' +
        '<button type="button" class="mu-tapa" data-i="' + i + '" aria-label="Escuchar ' + c.titulo + '"><img src="' + c.tapa + '" width="900" height="900" alt="Carátula de ' + c.titulo + '" loading="lazy"><span class="mu-toca">' + ICONO.play + "</span></button></div>" +
        "<h3>" + c.titulo + '</h3><p class="mu-meta">' + c.meta + " · " + reloj(Math.round(c.dur)) + '</p><p class="mu-enlaces">' + enlaces(c.enlaces) + "</p></li>").join("") + "</ul>" +
      '<nav class="mu-perfiles" aria-label="Los Voyagers en otras plataformas">' + enlaces(PERFILES) + "</nav>" +
    "</div>" +
    '<div class="mu-mini"><button type="button" class="mu-abrir" aria-label="Abrir el reproductor"><img class="mu-mini-tapa" src="' + CANCIONES[0].tapa + '" alt=""><span><b class="mu-mini-titulo"></b><i>Los Voyagers</i></span></button>' +
      '<button type="button" class="mu-boton mu-mini-play"></button><span class="mu-mini-barra"><i></i></span></div>' +
    '<div class="mu-velo" hidden></div>' +
    '<div class="mu-lleno" role="dialog" aria-modal="true" aria-label="Reproductor" hidden>' +
      '<button type="button" class="mu-cerrar" aria-label="Minimizar el reproductor">' + ICONO.abajo + "</button>" +
      '<div class="mu-grande"><span class="mu-disco" aria-hidden="true"></span><img class="mu-grande-tapa" src="' + CANCIONES[0].tapa + '" alt=""></div>' +
      '<div class="mu-datos"><h3 class="mu-grande-titulo"></h3><p>Los Voyagers</p></div>' +
      '<p class="mu-letra" aria-live="off"></p>' +
      '<input class="mu-linea" type="range" min="0" max="1000" value="0" step="1" aria-label="Momento de la canción">' +
      '<div class="mu-tiempos"><span class="mu-ahora">0:00</span><span class="mu-total">0:00</span></div>' +
      '<div class="mu-controles"><button type="button" class="mu-boton mu-antes" aria-label="Canción anterior">' + ICONO.antes + '</button><button type="button" class="mu-boton mu-play"></button><button type="button" class="mu-boton mu-despues" aria-label="Canción siguiente">' + ICONO.despues + "</button></div>" +
      '<p class="mu-enlaces mu-grande-enlaces"></p>' +
    "</div>" +
    '<audio preload="none"></audio>';
  caja.append(raiz);

  const $ = s => raiz.querySelector(s), $$ = s => [...raiz.querySelectorAll(s)];
  const audio = $("audio"), mini = $(".mu-mini"), lleno = $(".mu-lleno"), velo = $(".mu-velo"), linea = $(".mu-linea");
  const miniTapa = $(".mu-mini-tapa"), granTapa = $(".mu-grande-tapa"), miniTitulo = $(".mu-mini-titulo"), granTitulo = $(".mu-grande-titulo");
  let actual = 0, abiertoLleno = false, arrastrando = false, ocupado = false, volverA = null;

  // El disco de vinilo del menú, detrás de cada carátula
  const vinilo = document.querySelector("#menu .m-disco");
  if (vinilo) $$(".mu-disco").forEach(d => { const c = vinilo.cloneNode(true); c.removeAttribute("class"); c.removeAttribute("style"); d.append(c); });

  const largo = () => audio.duration && isFinite(audio.duration) ? audio.duration : CANCIONES[actual].dur;
  function marcar() {
    const suena = !audio.paused;
    for (const b of [$(".mu-play"), $(".mu-mini-play")]) { b.innerHTML = suena ? ICONO.pausa : ICONO.play; b.setAttribute("aria-label", suena ? "Pausar" : "Reproducir"); }
    raiz.classList.toggle("suena", suena);
    $$(".mu-tarjeta").forEach((t, i) => { const esta = i === actual && suena; t.classList.toggle("sonando", esta); t.querySelector(".mu-toca").innerHTML = esta ? ICONO.pausa : ICONO.play; t.querySelector(".mu-tapa").setAttribute("aria-label", (esta ? "Pausar " : "Escuchar ") + CANCIONES[i].titulo); });
  }
  function avance() {
    const s = audio.currentTime || 0, k = Math.min(1, s / largo());
    if (!arrastrando) linea.value = Math.round(k * 1000);
    linea.style.setProperty("--k", (linea.value / 10) + "%");
    $(".mu-ahora").textContent = reloj(s); $(".mu-total").textContent = reloj(Math.round(largo()));
    $(".mu-mini-barra i").style.transform = "scaleX(" + k.toFixed(4) + ")";
    let texto = ""; for (const [t, l] of CANCIONES[actual].letra) { if (t <= s) texto = l; else break; }
    const p = $(".mu-letra"), nuevo = s > 0 ? texto : "";
    if (p.textContent !== nuevo) { p.textContent = nuevo; if (M && !quieto && nuevo) M.animate(p, { opacity: [0, 1], y: [8, 0] }, { duration: .35 }); }
  }
  function poner(i) {
    actual = (i + CANCIONES.length) % CANCIONES.length;
    const c = CANCIONES[actual];
    if (audio.getAttribute("src") !== c.audio) audio.src = c.audio;
    miniTapa.src = granTapa.src = c.tapa; miniTitulo.textContent = granTitulo.textContent = c.titulo;
    $(".mu-grande-enlaces").innerHTML = enlaces(c.enlaces);
    raiz.style.setProperty("--tono", c.tono);
    linea.value = 0; marcar(); avance();
  }
  const tocar = () => audio.play().catch(() => marcar());
  const alternar = () => audio.paused ? tocar() : audio.pause();
  function cambiar(paso) { const sonaba = !audio.paused; poner(actual + paso); if (sonaba) tocar(); if (M && !quieto) M.animate(granTapa, { x: [paso * 60, 0], opacity: [0, 1] }, { type: "spring", stiffness: 220, damping: 22 }); }

  /* ---------- Del reproductor pequeño al completo, y de vuelta ---------- */
  // Dónde estaría un elemento grande si ocupara el lugar de uno pequeño
  function desde(grande, chico) {
    const a = grande.getBoundingClientRect(), b = chico.getBoundingClientRect();
    return { x: b.left + b.width / 2 - a.left - a.width / 2, y: b.top + b.height / 2 - a.top - a.height / 2, escala: b.height / a.height };
  }
  function recorte() {
    const a = lleno.getBoundingClientRect(), b = mini.getBoundingClientRect();
    return "inset(" + Math.max(0, b.top - a.top) + "px " + Math.max(0, a.right - b.right) + "px " + Math.max(0, a.bottom - b.bottom) + "px " + Math.max(0, b.left - a.left) + "px round 14px)";
  }
  const resorte = { type: "spring", stiffness: 260, damping: 30 };
  async function expandir() {
    if (abiertoLleno || ocupado) return;
    abiertoLleno = true; ocupado = true; volverA = document.activeElement;
    lleno.hidden = velo.hidden = false; $(".mu-fondo").inert = mini.inert = true;
    if (M && !quieto) {
      const t = desde(granTapa, miniTapa), n = desde(granTitulo, miniTitulo), desdeMini = recorte();
      mini.style.visibility = "hidden";
      M.animate(velo, { opacity: [0, 1] }, { duration: .35 });
      const piezas = $$(".mu-cerrar, .mu-datos p, .mu-letra, .mu-linea, .mu-tiempos, .mu-controles, .mu-grande-enlaces, .mu-grande .mu-disco");
      M.animate(piezas, { opacity: [0, 1], y: [24, 0] }, { duration: .45, delay: M.stagger(.035, { startDelay: .16 }) });
      M.animate(granTitulo, { x: [n.x, 0], y: [n.y, 0], scale: [n.escala, 1] }, resorte);
      M.animate(granTapa, { x: [t.x, 0], y: [t.y, 0], scale: [t.escala, 1] }, resorte);
      await M.animate(lleno, { clipPath: [desdeMini, "inset(0px 0px 0px 0px round 22px)"] }, { duration: .5, ease: [.2, .9, .25, 1] });
      lleno.style.clipPath = "";
    } else mini.style.visibility = "hidden";
    ocupado = false; $(".mu-play").focus({ preventScroll: true });
  }
  async function encoger(ya) {
    if (!abiertoLleno || (ocupado && !ya)) return;
    abiertoLleno = false; ocupado = true;
    if (M && !quieto && !ya) {
      const t = desde(granTapa, miniTapa), n = desde(granTitulo, miniTitulo);
      M.animate(velo, { opacity: 0 }, { duration: .35 });
      M.animate($$(".mu-cerrar, .mu-datos p, .mu-letra, .mu-linea, .mu-tiempos, .mu-controles, .mu-grande-enlaces, .mu-grande .mu-disco"), { opacity: 0 }, { duration: .18 });
      M.animate(granTitulo, { x: n.x, y: n.y, scale: n.escala }, { duration: .42, ease: [.4, 0, .2, 1] });
      M.animate(granTapa, { x: t.x, y: t.y, scale: t.escala }, { duration: .42, ease: [.4, 0, .2, 1] });
      await M.animate(lleno, { clipPath: ["inset(0px 0px 0px 0px round 22px)", recorte()] }, { duration: .42, ease: [.4, 0, .2, 1] });
    }
    lleno.hidden = velo.hidden = true; lleno.style.clipPath = ""; granTapa.style.transform = granTitulo.style.transform = ""; granTapa.style.opacity = "";
    mini.style.visibility = ""; $(".mu-fondo").inert = mini.inert = false; ocupado = false;
    if (!ya && volverA && volverA.focus) volverA.focus({ preventScroll: true });
  }

  /* ---------- Eventos ---------- */
  $$(".mu-tapa").forEach(b => b.addEventListener("click", () => {
    const i = Number(b.dataset.i);
    if (i === actual && !audio.paused) return audio.pause();
    poner(i); tocar(); expandir();
  }));
  $(".mu-abrir").addEventListener("click", expandir);
  $(".mu-mini-play").addEventListener("click", alternar);
  $(".mu-play").addEventListener("click", alternar);
  $(".mu-antes").addEventListener("click", () => cambiar(-1));
  $(".mu-despues").addEventListener("click", () => cambiar(1));
  $(".mu-cerrar").addEventListener("click", () => encoger());
  velo.addEventListener("click", () => encoger());
  linea.addEventListener("input", () => { arrastrando = true; linea.style.setProperty("--k", (linea.value / 10) + "%"); $(".mu-ahora").textContent = reloj(linea.value / 1000 * largo()); });
  linea.addEventListener("change", () => { const s = linea.value / 1000 * largo(); const ir = () => { audio.currentTime = s; arrastrando = false; avance(); };
    if (audio.readyState) ir(); else { audio.addEventListener("loadedmetadata", ir, { once: true }); audio.load(); } });
  for (const ev of ["play", "pause"]) audio.addEventListener(ev, marcar);
  for (const ev of ["timeupdate", "loadedmetadata"]) audio.addEventListener(ev, avance);
  audio.addEventListener("ended", () => { poner(actual + 1); tocar(); });
  raiz.addEventListener("keydown", e => { if (e.key === "Escape" && abiertoLleno) { e.stopPropagation(); encoger(); } });
  // Dentro de la sección, la rueda, el dedo y las teclas no mueven el viaje
  for (const tipo of ["wheel", "pointerdown", "keydown"]) raiz.addEventListener(tipo, e => e.stopPropagation(), { passive: true });
  $(".mu-volver").addEventListener("click", () => { if (window.Menu) window.Menu.volver(); });

  poner(0);
  window.Musica = {
    abrir() {
      raiz.hidden = false;
      if (M && !quieto) M.animate($$(".mu-tarjeta"), { opacity: [0, 1], y: [50, 0] }, { type: "spring", stiffness: 150, damping: 19, delay: M.stagger(.12, { startDelay: .45 }) });
      $(".mu-volver").focus({ preventScroll: true });
    },
    cerrar() { audio.pause(); encoger(true); raiz.hidden = true; }
  };
})();
