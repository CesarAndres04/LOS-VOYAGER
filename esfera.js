/* Puertas de sección · esfera de tarjetas (ver esfera.css).
   Cada sección abre con una esfera de tarjetas en 3D: gira sola, se arrastra y sigue con inercia, y cada tarjeta lleva a algo (ampliar una foto,
   sintonizar una canción, abrir un enlace). Es una versión propia del concepto de «galería esfera»; no usa código de terceros. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const primera = $(".foto img");
  if (!primera) return;
  const DIR = primera.getAttribute("src").replace(/[^/]+$/, "");           // fotos/ en local, imagenes/ publicado
  const T = n => `${DIR}esfera/${n}.webp`, G = n => `${DIR}${n}.webp`;
  const oro = Math.PI * (3 - Math.sqrt(5));

  /* ---------- Datos de cada puerta ---------- */
  const FOTOS = [
    ["kiosko", 1, "Los cuatro integrantes junto a un kiosko de periódicos en Lima", "Kiosko · Lima"],
    ["vivo-dia-banda", 1.333, "La banda tocando en vivo de día", "En vivo · 13.11.2026"],
    ["vivo-dia-voz", .75, "El vocalista cantando con guitarra roja", "Voz"],
    ["vereda", 1.131, "La banda en una vereda de Lima a la hora azul", "Vereda · Lima"],
    ["vivo-noche-banda", 1.333, "La banda en un bar de Lima con luz rosada", "En vivo · 19.11.2026"],
    ["vivo-dia-bateria", .75, "El baterista tocando en vivo de día", "Batería"],
    ["lentes", 1.5, "Retrato de la banda con lentes", "Lentes"],
    ["vivo-dia-guitarra", .75, "Guitarrista tocando de día", "Guitarra · día"],
    ["cruce", 1, "La banda en un cruce de noche", "Cruce · noche"],
    ["vivo-noche-guitarra", .75, "Guitarrista en un bar de noche", "Guitarra · noche"],
    ["vivo-dia-bajo", .75, "Bajista tocando en vivo de día", "Bajo"],
    ["vivo-dia-duo", 1.333, "Dos integrantes en el escenario de día", "En escena"],
  ].map(([n, a, alt, cap]) => ({ tipo: "foto", thumb: T(n), full: G(n), a, alt, cap }));

  const enlace = (rotulo, sub, href) => ({ tipo: "texto", t: rotulo, s: sub, href });
  const textoDe = sel => { const e = $(sel); return e ? e.textContent.trim() : ""; };
  const PUERTAS = {
    imagenes: () => FOTOS,
    senales: () => [
      { tipo: "disco", thumb: T("decidido"), a: 1, alt: "Portada de Decidido", cap: "Decidido", cancion: "decidido" },
      { tipo: "disco", thumb: T("vuelvo"), a: 1, alt: "Portada de Vuelvo", cap: "Vuelvo", cancion: "vuelvo" },
      enlace("Spotify", "Decidido", "https://open.spotify.com/track/1PkFrKaeXV9bHYA51lHPke"),
      enlace("Apple Music", "Vuelvo", "https://music.apple.com/pe/album/vuelvo/1842425913?i=1842425914"),
      enlace("Deezer", "Decidido", "https://www.deezer.com/album/1036594372"),
      enlace("Videoclip", "Vuelvo · YouTube", "https://www.youtube.com/watch?v=T1SDRPZFOKY"),
      { tipo: "texto", t: "136 BPM", s: "Decidido · La menor" },
      { tipo: "texto", t: "117,5 BPM", s: "Vuelvo · Mi mayor" },
      { tipo: "texto", t: "EP", s: "5 canciones · en preparación" },
    ],
    bitacora: () => [
      { tipo: "texto", t: "John", s: "voz y guitarra" }, { tipo: "texto", t: "Aarón", s: "guitarra" }, { tipo: "texto", t: "Gustavo", s: "bajo" }, { tipo: "texto", t: "Diego", s: "batería" },
      { tipo: "texto", t: "Lima", s: "Perú" }, { tipo: "texto", t: "2023", s: "primera tocada" }, { tipo: "texto", t: "Rock alternativo", s: "en español" },
      { tipo: "texto", t: "Vuelvo", s: "single · oct 2025" }, { tipo: "texto", t: "Decidido", s: "single · ago 2026" }, { tipo: "texto", t: "Voyager 1", s: "la sonda del nombre" },
    ],
    sobrevuelos: () => $$("#ruta li").map(li => ({ tipo: "texto", t: textoDe_(li, "b"), s: `${textoDe_(li, ".fecha")} · ${textoDe_(li, ".que")}`, futura: li.classList.contains("futura") })),
    canal: () => {
      const r = $$(".redes a").map(a => enlace(a.textContent.replace(/\s*↗/, ""), "abrir", a.href));
      const c = $(".correo"); if (c) r.unshift({ tipo: "texto", t: "Correo", s: c.textContent.trim(), href: c.href });
      return r;
    },
  };
  function textoDe_(li, sel) { const e = $(sel, li); return e ? e.textContent.trim() : ""; }

  /* ---------- Visor de fotos ---------- */
  let visor = null;
  function abrirVisor(it, origen) {
    if (!visor) {
      visor = document.createElement("div"); visor.className = "visor"; visor.setAttribute("role", "dialog"); visor.setAttribute("aria-modal", "true"); visor.hidden = true;
      const fig = document.createElement("figure"), foto = document.createElement("img");
      fig.appendChild(foto); fig.insertAdjacentHTML("beforeend", '<figcaption class="m"><span></span><a download>Descargar</a><button type="button" class="cierra">Cerrar</button></figcaption>');
      visor.appendChild(fig);
      document.body.appendChild(visor);
      const cierra = () => { visor.hidden = true; document.documentElement.classList.remove("visor-abierto"); if (visor._origen) visor._origen.focus(); };
      visor.addEventListener("click", e => { if (e.target === visor || e.target.closest(".cierra")) cierra(); });
      addEventListener("keydown", e => { if (e.key === "Escape" && !visor.hidden) cierra(); });
    }
    const im = $("img", visor); im.src = it.full; im.alt = it.alt; $("figcaption span", visor).textContent = it.cap; $("figcaption a", visor).href = it.full;
    visor._origen = origen; visor.hidden = false; document.documentElement.classList.add("visor-abierto"); $(".cierra", visor).focus();
  }

  /* ---------- La esfera ---------- */
  function crear(host, items) {
    // pocas tarjetas no hacen una esfera: se repiten en orden disperso hasta llenarla
    const meta = items[0].tipo === "texto" ? 16 : 22, base = items.slice();
    while (items.length < meta) items.push(base[items.length % base.length]);
    const N = items.length, mundo = document.createElement("div"); mundo.className = "esf-mundo";
    host.classList.add("esfera"); host.setAttribute("role", "group");
    host.setAttribute("aria-label", host.dataset.etiqueta || "Esfera de tarjetas: arrastra para girar");
    host.tabIndex = 0;
    const tarjetas = items.map((it, i) => {
      const u = 1 - (i + .5) / N * 2, r = Math.sqrt(1 - u * u), th = oro * i, az = Math.atan2(Math.cos(th) * r, Math.sin(th) * r), el = Math.asin(u);
      let c;
      if (it.tipo === "foto") { c = document.createElement("button"); c.type = "button"; c.className = "tj foto"; c.innerHTML = `<span class="ci"><img src="${it.thumb}" alt="${it.alt}" loading="lazy" decoding="async"></span><span class="cap m">${it.cap}</span>`; c.setAttribute("aria-label", `Ampliar: ${it.cap}`); c.addEventListener("click", () => abrirVisor(it, c)); }
      else if (it.tipo === "disco") { c = document.createElement("button"); c.type = "button"; c.className = "tj foto disco"; c.innerHTML = `<span class="ci"><img src="${it.thumb}" alt="${it.alt}" loading="lazy" decoding="async"></span><span class="cap m">Sintonizar · ${it.cap}</span>`; c.setAttribute("aria-label", `Escuchar ${it.cap} en el visualizer`);
        c.addEventListener("click", () => { const b = $(`.tapa[data-sintonizar="${it.cancion}"]`); if (b) b.click(); }); }
      else {
        c = document.createElement(it.href ? "a" : "div"); c.className = "tj texto" + (it.futura ? " futura" : ""); if (it.href) { c.href = it.href; if (!it.href.startsWith("mailto:")) { c.target = "_blank"; c.rel = "noopener"; } }
        c.style.setProperty("--f", Math.min(.21, 1.3 / Math.max(...it.t.split(" ").map(w => w.length))).toFixed(3));
        c.innerHTML = `<span class="ci"><b>${it.t}</b><span class="m">${it.s}</span></span>`;
      }
      c.style.setProperty("--a", it.tipo === "texto" ? .8 : it.a); c._az = az; c._el = el;
      const caja = document.createElement("div"); caja.className = "pos"; caja.appendChild(c); mundo.appendChild(caja); caja._c = c; caja._az = az; caja._el = el;
      return caja;
    });
    host.appendChild(mundo);
    const pista = document.createElement("p"); pista.className = "esf-pista m"; pista.textContent = "Arrastra para girar · toca una tarjeta"; host.appendChild(pista);

    const e = { rx: .14, ry: Math.random() * 6, vy: 0, k: quieto ? 1 : .04, R: 200, u: 120, visible: false, arrastra: false, movido: 0, quieta: false, ult: 0 };
    function medir() {
      const w = host.clientWidth, h = host.clientHeight; e.R = Math.max(130, Math.min(w * (w < 600 ? .36 : .34), h * .36, 330));
      e.u = e.R * .62;
      host.style.setProperty("--u", e.u + "px"); host.style.setProperty("--R", e.R + "px");
      tarjetas.forEach(t => { t.style.transform = `rotateY(${t._az}rad) rotateX(${t._el}rad) translateZ(${e.R}px)`; });
    }
    new ResizeObserver(medir).observe(host); medir();

    let ant = performance.now();
    function cuadro(ahora) {
      if (!e.visible) return;
      const dt = Math.min(.05, (ahora - ant) / 1000); ant = ahora;
      if (!e.arrastra) {
        const base = quieto ? 0 : (e.quieta ? .03 : .16);
        e.ry += (e.vy + base) * dt; e.vy *= Math.exp(-2.1 * dt); if (!e.focoMov) e.rx += (.14 - e.rx) * (1 - Math.exp(-1.4 * dt));
      }
      const k = e.k, ry = e.ry + (1 - k) * 3.2, cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(e.rx), sx = Math.sin(e.rx);
      mundo.style.transform = `scale(${.3 + .7 * k}) rotateX(${e.rx}rad) rotateY(${ry}rad)`;
      for (const t of tarjetas) {
        const x = Math.cos(t._el) * Math.sin(t._az), y = -Math.sin(t._el), z = Math.cos(t._el) * Math.cos(t._az);
        const z1 = -x * sy + z * cy, zv = y * sx + z1 * cx;   // cuánto mira al espectador (1 = de frente)
        const o = Math.max(0, Math.min(1, (zv + .15) / 1.05)) * Math.min(1, k * 1.8);
        t.style.opacity = o.toFixed(3); t.style.pointerEvents = zv > .05 ? "auto" : "none"; t.style.setProperty("--b", (.62 + .38 * Math.max(0, zv)).toFixed(3));
      }
      requestAnimationFrame(cuadro);
    }
    // Entra cuando aparece en pantalla: gira desde lejos y se abre
    new IntersectionObserver(([en]) => {
      const antes = e.visible; e.visible = en.isIntersecting;
      if (e.visible && !antes) { ant = performance.now(); requestAnimationFrame(cuadro); if (!e.entro) { e.entro = true; if (!quieto && window.gsap) gsap.to(e, { k: 1, duration: 2.2, ease: "expo.out" }); else e.k = 1; } }
    }, { threshold: .15 }).observe(host);

    // Arrastre con inercia (la tarjeta se activa solo si no hubo arrastre)
    let px = 0, py = 0, pt = 0;
    host.addEventListener("pointerdown", ev => {
      if (ev.button > 0) return; e.arrastra = true; e.movido = 0; px = ev.clientX; py = ev.clientY; pt = performance.now(); e.vy = 0; host.classList.add("agarra");
      const mueve = m => { const dx = m.clientX - px, dy = m.clientY - py, t = performance.now(), dt = Math.max(.008, (t - pt) / 1000); e.movido += Math.abs(dx) + Math.abs(dy);
        e.ry += dx / e.R * 1.25; e.rx = Math.max(-1.1, Math.min(1.1, e.rx - dy / e.R * (m.pointerType === "touch" ? 0 : 1)));
        e.vy = e.vy * .6 + (dx / e.R * 1.25 / dt) * .4; px = m.clientX; py = m.clientY; pt = t; };
      const suelta = () => { removeEventListener("pointermove", mueve); removeEventListener("pointerup", suelta); removeEventListener("pointercancel", suelta); e.arrastra = false; host.classList.remove("agarra"); e.vy = Math.max(-9, Math.min(9, e.vy)); };
      addEventListener("pointermove", mueve); addEventListener("pointerup", suelta); addEventListener("pointercancel", suelta);
    });
    host.addEventListener("click", ev => { if (e.movido > 7) { ev.preventDefault(); ev.stopPropagation(); } }, true);
    host.addEventListener("pointerover", ev => { e.quieta = !!ev.target.closest(".tj"); });
    host.addEventListener("pointerleave", () => { e.quieta = false; });
    // Teclado: flechas giran; al enfocar una tarjeta, la esfera la trae al frente
    host.addEventListener("keydown", ev => { if (ev.key === "ArrowLeft") e.vy -= 1.6; else if (ev.key === "ArrowRight") e.vy += 1.6; });
    host.addEventListener("focusin", ev => {
      const t = ev.target.closest(".pos"); if (!t || !window.gsap || quieto) return;
      const meta = -t._az, d = ((meta - e.ry) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      e.focoMov = true; gsap.to(e, { ry: e.ry + d, rx: -t._el, duration: .9, ease: "power3.out", onComplete: () => { e.focoMov = false; } });
    });
  }

  $$("[data-esfera]").forEach(h => { const f = PUERTAS[h.dataset.esfera]; if (f) { const it = f(); if (it.length) crear(h, it); } });
})();
