/* fondo.js · el fondo animado de cada canción, como módulo intercambiable.
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
   QUÉ ES
     Una animación que sigue a la canción. No tiene reloj propio: el tiempo de la canción (el <audio>, el mismo que dirige la letra) manda,
     y la animación se coloca donde ese tiempo diga, avance, retroceda o salte. Si el usuario toca un verso o arrastra la línea de tiempo,
     el fondo llega al mismo segundo que la letra. Si pausa, se queda quieto en ese cuadro. Si no pausa, ninguno de los dos se detiene,
     tampoco cuando se vuelve a la entrada: el fondo sigue corriendo por debajo.

   CÓMO SE CAMBIA LA ANIMACIÓN (cuando salga la nueva versión de Sinestesia)
     1. Para otros videos: se editan las rutas de MANIFIESTOS (o se llama a Fondo.registrar). Nada más cambia.
     2. Para otro tipo de animación (un render en vivo, WebGL, Canvas): se escribe un «motor» con esta forma y se instala con Fondo.usarMotor(motor):
          {
            cargar(id, manifiesto)      // prepara lo que haga falta para esa canción; puede llamarse muchas veces seguidas (idempotente)
            sincronizar(t, ctx)         // colócate en el segundo t. ctx = { sonando, esperando }. Se llama cada cuadro y en cada evento del audio
            listo()                     // true cuando ya está dibujando y cubre el cielo de respaldo
            liberar()                   // suelta recursos al cambiar de motor
          }
        La regla del contrato: la animación es una FUNCIÓN DEL TIEMPO. Dado t, dibuja siempre lo mismo. Así adelantar o retroceder funciona.
     3. En el manifiesto, «desfase» (segundos) corrige un adelanto o atraso constante entre la animación y la canción.

   DEPURAR
     Abrir la página con ?depurar muestra el tiempo del audio, el del fondo, la deriva y la velocidad. Fondo.estado() devuelve lo mismo
     para pruebas automáticas.
*/
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const limita = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Qué animación va con cada canción ---------- */
  const MANIFIESTOS = {
    decidido: { motor: "video", video: "video/decidido-galaxia", vertical: "video/decidido-galaxia-vertical", teaser: "video/teaser-decidido", teaserVertical: "video/teaser-decidido-vertical", desfase: 0 },
    vuelvo:   { motor: "video", video: "video/vuelvo-galaxia",   vertical: "video/vuelvo-galaxia-vertical",   teaser: "video/teaser-vuelvo",   teaserVertical: "video/teaser-vuelvo-vertical",   desfase: 0 },
  };

  /* ---------- Ajustes de sincronía ---------- */
  const AJ = {
    salto: .3,          // diferencia (s) a partir de la cual se salta en vez de ajustar la velocidad
    saltoPausa: .04,    // en pausa se busca el cuadro exacto, para que arrastrar la línea de tiempo se vea al instante
    ajuste: .05,        // diferencia mínima para corregir con la velocidad
    ritmoMax: .08,      // la velocidad se mueve como mucho ±8 %
    entreSaltos: 140,   // ms mínimos entre dos saltos (al arrastrar rápido se pide solo el último)
  };

  const S = { audio: null, cancion: "decidido", vista: "decidido", activo: false, motor: null, teaser: {}, teaserClave: {}, vid: null, sonoAntes: false, ultimo: { t: 0, v: 0, d: 0, r: 1 } };
  const esVertical = () => innerHeight > innerWidth;
  const fuentes = base => `<source src="${base}.webm" type='video/webm; codecs="av01.0.05M.10"'><source src="${base}.mp4" type="video/mp4">`;

  /* ---------- Motor de video (los .webm/.mp4 que sale de Sinestesia) ---------- */
  function crearMotorVideo() {
    const vid = $("#fondo"); let clave = "", ultimoSalto = 0, man = null;
    vid.addEventListener("canplay", () => vid.classList.add("lista"));
    vid.addEventListener("loadedmetadata", () => { if (S.audio) pon(S.audio.currentTime || 0, { sonando: !S.audio.paused, esperando: false }); });
    function pon(t, ctx) {
      if (!man || vid.readyState < 1) return;
      const dur = vid.duration || Infinity, objetivo = limita(t + (man.desfase || 0), 0, Math.max(0, dur - .04)), pasado = t + (man.desfase || 0) >= dur;
      if (!vid.seeking) {
        const d = vid.currentTime - objetivo, ahora = performance.now();
        const umbral = ctx.sonando && !ctx.esperando && !pasado ? AJ.salto : AJ.saltoPausa;
        if (Math.abs(d) > umbral) {
          if (ahora - ultimoSalto > AJ.entreSaltos) { ultimoSalto = ahora; vid.currentTime = objetivo; }
          if (vid.playbackRate !== 1) vid.playbackRate = 1;
        } else {
          const r = ctx.sonando && !ctx.esperando && Math.abs(d) > AJ.ajuste ? limita(1 - d * .8, 1 - AJ.ritmoMax, 1 + AJ.ritmoMax) : 1;
          if (Math.abs(vid.playbackRate - r) > .005) vid.playbackRate = r;
        }
        S.ultimo.d = vid.currentTime - objetivo;
      }
      const debePlay = ctx.sonando && !ctx.esperando && !pasado;
      if (debePlay && vid.paused) vid.play().catch(() => {});
      if (!debePlay && !vid.paused) vid.pause();
      S.ultimo.v = vid.currentTime; S.ultimo.r = vid.playbackRate;
    }
    return {
      cargar(id, m) {
        man = m; const k = id + (esVertical() ? "-v" : "-h"); if (k === clave) return;
        clave = k;                           // la imagen anterior se queda hasta que el nuevo video esté listo
        vid.innerHTML = fuentes(esVertical() && m.vertical ? m.vertical : m.video); vid.preload = "auto"; vid.load();
      },
      sincronizar: pon,
      listo: () => vid.classList.contains("lista"),
      liberar() { vid.pause(); vid.removeAttribute("src"); vid.innerHTML = ""; vid.load(); clave = ""; vid.classList.remove("lista"); },
    };
  }

  /* ---------- Portada: un teaser en bucle de cada canción, antes del play ---------- */
  function cargarTeaser(id) {
    const el = S.teaser[id], m = MANIFIESTOS[id]; if (!el || !m) return;
    const clave = esVertical() ? "v" : "h"; if (S.teaserClave[id] === clave) return; S.teaserClave[id] = clave;
    const base = clave === "v" ? m.teaserVertical : m.teaser;
    el.poster = `${base}.jpg`; el.innerHTML = fuentes(base); el.load();
    if (quieto) el.classList.add("lista"); else el.play().catch(() => {});
  }

  /* ---------- Sincronía ---------- */
  function ctxDelAudio() {
    const a = S.audio; return { sonando: !!a && !a.paused && !a.ended, esperando: !!a && !a.paused && a.readyState < 3 };
  }
  function sincronizar(t) {
    const cuerpo = document.body.classList, ctx = ctxDelAudio(); S.ultimo.t = t;
    if (S.activo && S.motor) {
      S.motor.sincronizar(t, ctx);
      cuerpo.toggle("video", S.motor.listo());
    }
    const tz = S.teaser[document.body.dataset.vista], cubre = cuerpo.contains("video");
    if (tz) {
      if (cubre && !tz.paused) tz.pause();
      else if (!cubre && tz.paused && !quieto && tz.readyState >= 2) tz.play().catch(() => {});
    }
    cuerpo.toggle("cubierto", cubre || !!(tz && tz.classList.contains("lista")));
    if (depura) pintaDepura();
  }

  /* ---------- API pública ---------- */
  const Fondo = {
    registrar(id, manifiesto) { MANIFIESTOS[id] = manifiesto; },
    usarMotor(m) { if (S.motor && S.motor.liberar) S.motor.liberar(); S.motor = m; if (S.activo) S.motor.cargar(S.cancion, MANIFIESTOS[S.cancion]); },
    iniciar({ audio }) {
      S.audio = audio; S.vid = $("#fondo"); S.teaser = { decidido: $("#tDecidido"), vuelvo: $("#tVuelvo") };
      Object.values(S.teaser).forEach(el => el && el.addEventListener("loadeddata", () => el.classList.add("lista")));
      if (!S.motor) S.motor = crearMotorVideo();
      // Cualquier cosa que le pase al audio se refleja al instante en el fondo, sin esperar al siguiente cuadro
      ["seeking", "seeked", "play", "playing", "pause", "waiting", "stalled", "ratechange", "loadedmetadata", "ended"].forEach(ev => audio.addEventListener(ev, () => sincronizar(audio.currentTime || 0)));
      document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar(audio.currentTime || 0); });
      addEventListener("pageshow", () => sincronizar(audio.currentTime || 0));
      addEventListener("resize", () => { Fondo.vista(S.vista); if (S.activo) S.motor.cargar(S.cancion, MANIFIESTOS[S.cancion]); });
    },
    // Qué canción está elegida (sin empezar a mostrar el video grande)
    cancion(id) { S.cancion = id; if (S.activo) S.motor.cargar(id, MANIFIESTOS[id]); },
    // Empieza a mandar el fondo: desde aquí sigue al audio
    activar(id) { S.activo = true; S.cancion = id; S.motor.cargar(id, MANIFIESTOS[id]); },
    // Portada: qué teaser se ve mientras no hay video
    vista(id) {
      S.vista = id; document.body.dataset.vista = id; cargarTeaser(id);
      for (const k in S.teaser) if (k !== id && S.teaser[k]) S.teaser[k].pause();
    },
    sincronizar,
    estado() {
      const a = S.audio, u = S.ultimo; return { activo: S.activo, cancion: S.cancion, audio: a ? a.currentTime : 0, fondo: u.v, deriva: u.d, ritmo: u.r, sonando: ctxDelAudio().sonando, listo: !!S.motor && S.motor.listo() };
    },
  };
  window.Fondo = Fondo;

  /* ---------- Depuración (?depurar) ---------- */
  const depura = /[?&]depurar\b/.test(location.search); let caja = null;
  function pintaDepura() {
    if (!caja) { caja = document.createElement("pre"); caja.style.cssText = "position:fixed;left:8px;bottom:80px;z-index:200;margin:0;padding:8px 10px;background:rgba(0,0,0,.78);color:#9fffb0;font:11px/1.5 monospace;pointer-events:none"; document.body.appendChild(caja); }
    const e = Fondo.estado();
    caja.textContent = `fondo · ${e.cancion}\naudio  ${e.audio.toFixed(2)} s\nfondo  ${e.fondo.toFixed(2)} s\nderiva ${(e.deriva * 1000).toFixed(0)} ms\nritmo  ${e.ritmo.toFixed(3)}\n${e.sonando ? "suena" : "pausa"} · ${e.listo ? "listo" : "cargando"}`;
  }
})();
