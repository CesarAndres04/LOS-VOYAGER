/* El pasadizo: lo que se ve al cruzar la entrada. Un paisaje gráfico (papel gris, esfera oscura con estrellas, franjas
   de color que salen de ella, el Centro de Lima y los equipos de la banda en tinta, reflejo y líneas técnicas) en el que se
   avanza hacia dentro de los colores. Las ilustraciones están en pasadizo-arte.js.

     Avanzar:    rueda o deslizar hacia arriba · flechas o barra espaciadora · botón «Entrar»
     p = 0       el paisaje          p ≈ .5   las franjas llenan la pantalla
     p ≈ .8      túnel de color      p = 1    el destino (aquí irá el contenido de la banda)

   Todo se dibuja con código en un lienzo 2D; las capas quietas se preparan una vez por tamaño de pantalla.
   La entrada (portal.js) llama a Pasadizo.entrar(); el botón «.marca» devuelve a la entrada. */
(function () {
  "use strict";
  const caja = document.getElementById("pasadizo");

  // Distancia de la Voyager 1 (pie de la entrada): dato de la NASA/JPL del 18-nov-2026 y su velocidad
  const T0 = Date.UTC(2026, 10, 18, 10, 16, 7), miles = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const km = () => document.querySelectorAll("[data-voyager-km]").forEach(e => { e.textContent = miles(25902e6 + (Date.now() - T0) / 1000 * 17); });
  km(); setInterval(km, 1000);
  if (!caja) return;

  const M = window.Motion, quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lienzo = caja.querySelector("canvas"), g = lienzo.getContext("2d", { alpha: false });
  const boton = caja.querySelector(".avanzar"), pista = caja.querySelector(".pista"), destino = caja.querySelector(".destino");
  const sinGPU = (() => { try { const c = document.createElement("canvas"); return !(c.getContext("webgl2") || c.getContext("webgl")); } catch { return true; } })();
  // Azules y morados, con celeste y rosa para los brillos
  const COLORES = ["#1a1f7a", "#2442d6", "#2f7dff", "#35c6ff", "#a8ecff", "#3a1478", "#6a2bd9", "#9b4dff", "#d63ad0", "#ff4fc3"];
  const lim = x => x < 0 ? 0 : x > 1 ? 1 : x, mezcla = (a, b, t) => a + (b - a) * t;
  const suave = (a, b, x) => { const t = lim((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let semilla = 1977;
  const az = (a = 0, b = 1) => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return a + (semilla / 4294967296) * (b - a); };
  const hoja = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

  let W = 0, H = 0, D = 1, CX = 0, COL = 0, ALTO_ESF = 0, HORIZ = 0;
  let papel, lejos, cerca, reflejo, esfera, fondoViaje, penumbra, destellos = [], franjas = [], rayos = [], barras = [];
  const llegada = M ? M.motionValue(0) : { get: () => 1 }, avance = M ? M.motionValue(0) : { v: 0, get() { return this.v; } };
  let meta = 0, activo = false, cuadro = 0, antes = 0, t = 0, listo = false;

  /* ---------- Capas que se preparan una vez ---------- */
  // Una ilustración (pasadizo-arte.js) apoyada en el horizonte, con un filo de papel alrededor para que se despegue del fondo
  function ilustracion(dibujar, unidad, filo) {
    const c = hoja(W, H), x = c.getContext("2d");
    x.save(); x.translate(0, HORIZ); x.scale(unidad, unidad); dibujar(x, W / unidad); x.restore();
    if (!filo) return c;
    const silueta = hoja(W, H), s = silueta.getContext("2d");
    s.drawImage(c, 0, 0); s.globalCompositeOperation = "source-in"; s.fillStyle = "#ece8da"; s.fillRect(0, 0, W, H);
    const junto = hoja(W, H), j = junto.getContext("2d"), r = filo * unidad;
    for (let k = 0; k < 12; k++) j.drawImage(silueta, Math.cos(k / 12 * 6.283) * r, Math.sin(k / 12 * 6.283) * r);
    j.drawImage(c, 0, 0); return junto;
  }

  function preparar() {
    D = sinGPU ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    W = Math.round(innerWidth * D); H = Math.round(innerHeight * D);
    if (!W || !H) return;
    lienzo.width = W; lienzo.height = H;
    const vertical = H > W;
    CX = W * .52; COL = W * (vertical ? .52 : .215); ALTO_ESF = H * (vertical ? .2 : .22); HORIZ = H * .8;
    semilla = 1977;
    const u = D, f = (x, y) => .5 + .5 * Math.sin(x * 12.9898 + y * 78.233) * Math.sin(x * 3.7);

    // papel gris con grano y líneas técnicas
    papel = hoja(W, H); let x = papel.getContext("2d", { alpha: false });
    x.fillStyle = "#dad7cc"; x.fillRect(0, 0, W, H);
    for (let i = W * H / 90; i > 0; i--) { x.fillStyle = az() < .5 ? "rgba(255,255,255,.22)" : "rgba(40,40,44,.13)"; x.fillRect(az(0, W), az(0, H), u, u); }
    const raya = (a, b, c, d, tono, an) => { x.strokeStyle = tono || "rgba(25,25,30,.5)"; x.lineWidth = (an || 1) * u; x.beginPath(); x.moveTo(a * W, b * H); x.lineTo(c * W, d * H); x.stroke(); };
    raya(0, .53, .18, .53); raya(.18, .53, .18, .66); raya(.22, .28, .22, .62); raya(.22, .28, .39, .28); raya(.22, .245, .3, .245); raya(.3, .245, .3, .53, "rgba(255,255,255,.85)");
    raya(.27, .285, .4, .285, "#fff", 4); raya(.28, .3, .4, .3); raya(.645, .315, .79, .315, "#d63ad0", 1.4); raya(.69, .35, .75, .35); raya(.69, .35, .69, .56); raya(.64, .53, .765, .53); raya(.765, .53, .765, .69);
    raya(.79, .37, .85, .37); raya(.81, .385, .875, .385); raya(.775, .45, .775, .66); raya(.9, .53, 1, .53);
    for (const y of [.665, .68, .76, .86, .885, .93, .965]) { raya(0, y, az(.08, .3), y); raya(az(.7, .92), y, 1, y); }
    raya(.655, .15, .655, .74, "#19a7d8", 2); raya(.662, .15, .662, .74, "#19a7d8", 1);
    // marcas sueltas
    const caja2 = (a, b, an, al, tono) => { x.fillStyle = tono; x.fillRect(a * W, b * H, an * u, al * u); };
    caja2(.175, .347, 17, 16, "#9b4dff"); caja2(.137, .442, 18, 11, "#ff4fc3"); caja2(.157, .442, 18, 11, "#1a1f7a"); caja2(.822, .273, 15, 42, "#121216"); caja2(.213, .543, 2, 22, "#a8321f");
    x.strokeStyle = "#141418"; x.lineWidth = 2.4 * u;
    const ax = .354 * W, ay = .442 * H;
    for (let k = 0; k < 3; k++) { const an = k * Math.PI / 3; x.beginPath(); x.moveTo(ax - Math.cos(an) * 8 * u, ay - Math.sin(an) * 8 * u); x.lineTo(ax + Math.cos(an) * 8 * u, ay + Math.sin(an) * 8 * u); x.stroke(); }
    x.fillStyle = "#e5281d"; x.save(); x.translate(ax, .48 * H); x.rotate(Math.PI / 4); x.fillRect(-6 * u, -6 * u, 12 * u, 12 * u); x.restore(); x.fillStyle = "#fff"; x.fillRect(ax - u, .48 * H - u, 2 * u, 2 * u);
    x.strokeStyle = "#fff"; x.lineWidth = 1.5 * u; for (const [a, b] of [[.272, .15], [.272, .183]]) { x.beginPath(); x.arc(a * W, b * H, 6 * u, 0, 7); x.stroke(); x.beginPath(); x.moveTo(a * W - 6 * u, b * H - 6 * u); x.lineTo(a * W + 6 * u, b * H + 6 * u); x.stroke(); }

    // el Centro de Lima al fondo y los equipos de la banda delante
    const unidad = vertical ? W / 820 : Math.min(W / 1600, H / 900);
    lejos = ilustracion(PasadizoArte.lima, unidad * (vertical ? 1.04 : 1.1), 0);
    cerca = ilustracion(PasadizoArte.equipo, unidad * (vertical ? .94 : .76), 7);

    // reflejo: las ilustraciones dadas vuelta y cortadas en franjas que se corren
    reflejo = hoja(W, H - HORIZ); x = reflejo.getContext("2d");
    const junto = hoja(W, H); const j = junto.getContext("2d"); j.drawImage(lejos, 0, 0); j.drawImage(cerca, 0, 0);
    for (let y = 0; y < H - HORIZ; y += 3 * u) {
      const origen = HORIZ - y * 1.35 - 3 * u; if (origen < 0) break;
      x.globalAlpha = lim(.62 - y / (H - HORIZ) * .5);
      x.drawImage(junto, 0, origen, W, 3 * u, (f(y * .08, 3) - .5) * 70 * u * (y / (H - HORIZ) + .2), y, W, 3 * u);
    }

    // la esfera oscura con estrellas
    const R = Math.max(W * (vertical ? .62 : .235), H * .3);
    esfera = hoja(R * 2, R * 2); x = esfera.getContext("2d");
    x.fillStyle = "#141417"; x.beginPath(); x.arc(R, R, R, 0, 7); x.fill(); x.save(); x.clip();
    for (let i = R * R / 75; i > 0; i--) { const r = Math.sqrt(az()) * R, an = az(0, 6.283); x.fillStyle = "rgba(235,235,240," + (Math.pow(az(), 1.4) * .85 + .15).toFixed(2) + ")"; const s = (az() < .02 ? 2.6 : 1.2) * u; x.fillRect(R + Math.cos(an) * r, R + Math.sin(an) * r, s, s); }
    const sombra = x.createRadialGradient(R, R * .7, R * .1, R, R, R); sombra.addColorStop(0, "rgba(120,120,130,.18)"); sombra.addColorStop(.75, "rgba(0,0,0,0)"); sombra.addColorStop(1, "rgba(0,0,0,.35)"); x.fillStyle = sombra; x.fillRect(0, 0, R * 2, R * 2); x.restore();

    // franjas: posición (-0.5 a 0.5 del ancho de la columna), grosor, color y sus gotas de luz
    franjas = []; let px = -.5, ant = -1;
    while (px < .5) {
      const an = az() < .22 ? az(.05, .085) : az(.012, .042); let c = (az() * COLORES.length) | 0; if (c === ant) c = (c + 1) % COLORES.length; ant = c;
      franjas.push({ x: px, w: Math.min(an, .5 - px), c: COLORES[c], v: az(.16, .6), f: az(), l: az(.08, .35), largo: az(.9, 1.12) });
      px += an + (az() < .25 ? az(.003, .012) : 0);
    }
    // los colores suben dentro del círculo negro y se apagan entre las estrellas: franjas y espacio son una sola pieza
    x = esfera.getContext("2d"); x.globalCompositeOperation = "source-atop";
    const izq = CX - W * .005 - R;
    for (const s of franjas) {
      const sx = CX + s.x * COL - izq, sw = s.w * COL + .6, alto = R * (.35 + s.f * .5);
      const pie = R + Math.sqrt(Math.max(0, R * R - Math.pow(sx + sw / 2 - R, 2)));       // borde del círculo en esa franja
      const grad = x.createLinearGradient(0, pie - alto, 0, pie);
      grad.addColorStop(0, s.c + "00"); grad.addColorStop(.55, s.c + "30"); grad.addColorStop(.85, s.c + "a8"); grad.addColorStop(1, s.c);
      x.fillStyle = grad; x.fillRect(sx, pie - alto, sw, alto + 2);
    }
    for (let i = 160; i > 0; i--) { x.fillStyle = "rgba(255,255,255," + az(.35, .95).toFixed(2) + ")"; const s = az(1, 2.4) * u; x.fillRect(R + az(-.55, .55) * COL * 1.2, R * 2 - az(0, R * .6), s, s); }
    x.globalCompositeOperation = "source-over";
    barras = [[.15, .548, .855, "#d63ad0", 6, .006], [.315, .642, .875, "#2442d6", 8, -.004], [.48, .625, .824, "#35c6ff", 4, .009], [.69, .92, .836, "#6a2bd9", 6, -.007], [.785, .825, .797, "#ff4fc3", 6, .012], [.72, .77, .86, "#9b4dff", 5, -.01], [.38, .41, .81, "#2f7dff", 6, .005], [.84, .93, .795, "#a8ecff", 3, -.006]];
    // fondo del viaje: noche morada y azul, más oscura en el centro
    fondoViaje = hoja(W, H); x = fondoViaje.getContext("2d", { alpha: false });
    x.fillStyle = "#120d22"; x.fillRect(0, 0, W, H);
    const radio = Math.hypot(W, H) / 2;
    for (const [px2, py2, r2, tono] of [[.02, .3, .62, "150,30,140"], [.98, .62, .66, "170,34,150"], [.3, 0, .6, "30,80,170"], [.72, 1, .62, "36,70,160"], [.5, .5, .55, "70,36,120"]]) {
      const nube = x.createRadialGradient(px2 * W, py2 * H, 0, px2 * W, py2 * H, r2 * radio); nube.addColorStop(0, "rgba(" + tono + ",.55)"); nube.addColorStop(1, "rgba(" + tono + ",0)");
      x.fillStyle = nube; x.fillRect(0, 0, W, H);
    }
    const boca = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, radio * .42); boca.addColorStop(0, "rgba(16,10,22,1)"); boca.addColorStop(.25, "rgba(16,10,22,.85)"); boca.addColorStop(1, "rgba(16,10,22,0)");
    x.fillStyle = boca; x.fillRect(0, 0, W, H);

    // el viaje con su claro oscuro ya mezclado, para el final
    penumbra = hoja(W, H); { const y = penumbra.getContext("2d"), claro = y.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * .62);
      claro.addColorStop(0, "rgba(14,9,22,.88)"); claro.addColorStop(.5, "rgba(14,9,22,.6)"); claro.addColorStop(1, "rgba(14,9,22,0)"); y.fillStyle = claro; y.fillRect(0, 0, W, H); }

    // los destellos se dibujan una vez (halo de color y alma blanca, afinados en las puntas) y luego solo se colocan
    destellos = [["47,125,255", "190,240,255"], ["53,198,255", "230,252,255"], ["155,77,255", "232,210,255"], ["255,63,200", "255,214,246"]].map(([halo, alma]) => {
      const c = hoja(256, 32), y = c.getContext("2d");
      for (const [alto, tono, a] of [[15, halo, .16], [9, halo, .34], [4.6, halo, .85], [1.9, alma, 1]]) {
        const largo = y.createLinearGradient(0, 0, 256, 0); largo.addColorStop(0, "rgba(" + tono + ",0)"); largo.addColorStop(.55, "rgba(" + tono + "," + a * .8 + ")"); largo.addColorStop(.88, "rgba(" + tono + "," + a + ")"); largo.addColorStop(1, "rgba(" + tono + ",0)");
        y.fillStyle = largo; y.beginPath(); y.ellipse(128, 16, 128, alto, 0, 0, 6.2832); y.fill();
      }
      return c;
    });
    rayos = Array.from({ length: sinGPU ? 460 : 800 }, (_, i) => ({ a: az(0, 6.283), z: az(.03, 1), s: destellos[(az() * 4) | 0], w: az(.55, 1.5), r: az(.14, 1.3), v: az(.75, 1.25) }));
    listo = true;
  }

  /* ---------- Cada cuadro ---------- */
  // Dibuja una capa ampliada alrededor del punto de fuga, como quien se acerca
  function capa(img, escala, bajar, alfa, y0) {
    if (alfa <= .01) return;
    const fy = H * .55; g.globalAlpha = alfa;
    g.drawImage(img, CX - CX * escala, fy - (fy - (y0 || 0)) * escala + bajar, img.width * escala, img.height * escala);
    g.globalAlpha = 1;
  }
  function columnas(desde, hasta, ancho, alfa, cae) {
    if (alfa <= .01) return;
    for (const s of franjas) {
      const x = CX + s.x * ancho, w = Math.max(1, s.w * ancho), fin = desde + (hasta - desde) * lim(cae * 1.25 - s.f * .25) * s.largo;
      g.globalAlpha = alfa; g.fillStyle = s.c; g.fillRect(x, desde, w + .6, Math.max(0, fin - desde));
      if (s.l > .2) {                                          // hilo de luz con su halo, como un tubo encendido
        const cx = x + w * (.2 + s.f * .6);
        g.globalAlpha = alfa * .2; g.fillStyle = s.f > .5 ? "#ff8fe6" : "#8fe4ff"; g.fillRect(cx - 4 * D, desde, 9 * D, Math.max(0, fin - desde));
        g.globalAlpha = alfa * .8; g.fillStyle = "#fff"; g.fillRect(cx, desde, Math.max(1, 1.2 * D), Math.max(0, fin - desde));
      }
      // gotas: tramos claros que bajan sin parar
      const alto = (hasta - desde) * s.l;
      for (let k = 0; k < 2; k++) {
        const y = desde + ((t * s.v + s.f + k * .5) % 1) * (hasta - desde + alto) - alto;
        const a = Math.max(desde, y), b = Math.min(fin, y + alto); if (b <= a) continue;
        g.globalAlpha = alfa * .34; g.fillStyle = "#fff"; g.fillRect(x, a, Math.max(1, w * .5), b - a);
        g.globalAlpha = alfa * .5; g.fillRect(x, b - 3 * D, w, 3 * D);
      }
    }
    g.globalAlpha = 1;
  }

  function dibuja() {
    const p = lim(avance.get()), l = lim(llegada.get());
    const z = Math.pow(p, 1.5), ancho = COL * (1 + z * 11), tunel = suave(.52, .8, p), fin = suave(.84, .99, p);
    g.fillStyle = "#dad7cc"; g.fillRect(0, 0, W, H);
    if (tunel < .999) {
      const quedan = 1 - suave(.2, .62, p);
      capa(papel, 1 + p * .9, 0, 1 - suave(.35, .6, p));
      capa(lejos, 1 + p * 1.4, p * H * .5 + (1 - l) * H * .16, quedan * l);
      const arriba = -2, abajo = mezcla(HORIZ, H, suave(0, .4, p));
      columnas(arriba, abajo, ancho, 1, l);
      capa(cerca, 1 + p * 2.6, p * H * .9 + (1 - l) * H * .28, quedan);
      // la luz se refleja abajo
      if (quedan > .01) {
        g.globalAlpha = quedan * l; g.drawImage(reflejo, (Math.sin(t * 1.7) * 3) * D, HORIZ + p * H * .7); g.globalAlpha = 1;
        columnas(HORIZ + p * H * .7, H + p * H * .7, ancho, .42 * l * quedan, 1);
        for (const [a, b, y, tono, grosor, vel] of barras) {
          const corre = Math.sin(t * 90 * vel + a * 9) * W * .018, entra = suave(0, 1, l * 1.4 - a * .4);
          g.globalAlpha = quedan; g.fillStyle = tono; g.fillRect(a * W + corre - p * W * vel * 60, y * H + p * H * .75, (b - a) * W * entra, grosor * D);
        }
        g.globalAlpha = 1;
      }
      const R = esfera.width / 2, ey = ALTO_ESF - R - p * H * .75 - (1 - l) * H * .3, es = 1 + p * 1.4;
      g.drawImage(esfera, CX - W * .005 - R * es, ey - R * es, R * 2 * es, R * 2 * es);
    }
    // el viaje a la velocidad de la luz: destellos que nacen en el centro y pasan a los lados
    if (tunel > .001) {
      g.globalAlpha = tunel; g.drawImage(fondoViaje, 0, 0);
      const cx = W / 2, cy = H / 2, radio = Math.hypot(cx, cy);
      const empuje = .16 + .52 * suave(.55, .85, p) * (1 - fin * .62);
      g.globalCompositeOperation = "lighter";
      const salto = sinGPU && fin > .9 ? 3 : 1;
      for (let i = 0; i < rayos.length; i += salto) {
        const r = rayos[i];
        r.z -= pasoDt * empuje * r.v; if (r.z < .035) { r.z += .965; r.a = (r.a + 2.399) % 6.2832; }
        const lejos = radio * .085 * r.r / r.z;                      // distancia al centro: crece al acercarse
        if (lejos > radio * 1.35) continue;
        const largo = lejos * (.34 + .55 * empuje), grosor = (3 + lejos * .042) * r.w * D * .85;
        const c = Math.cos(r.a), s = Math.sin(r.a);
        g.globalAlpha = tunel * lim((1 - r.z) * 2.6) * lim(lejos / (radio * .09)) * (1 - fin * .3);
        g.setTransform(c, s, -s, c, cx + c * lejos, cy + s * lejos);
        g.drawImage(r.s, -largo / 2, -grosor / 2, largo, grosor);
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      if (fin > .01) {                                              // un claro oscuro para que se lea el texto
        g.globalAlpha = fin; g.drawImage(penumbra, 0, 0); g.globalAlpha = 1;
      }
    }
    // estados de la interfaz
    caja.classList.toggle("dentro", p > .45);
    caja.classList.toggle("llego", p > .92);
    destino.style.opacity = suave(.86, .99, p).toFixed(2);
    destino.style.visibility = p > .86 ? "visible" : "hidden";
    if (destino.inert !== p <= .92) destino.inert = p <= .92;      // el menú solo se puede usar cuando ya llegaste
    pista.style.opacity = (1 - suave(0, .12, p)).toFixed(2);
  }

  let pasoDt = .016, ultimo = 0;
  function paso(ahora) {
    cuadro = 0; if (!activo || !listo || pausado) return;
    if (sinGPU && ahora - ultimo < 28) { pedir(); return; }
    ultimo = ahora;
    pasoDt = Math.min(.05, antes ? (ahora - antes) / 1000 : .016); antes = ahora; if (!quieto) t += pasoDt;
    dibuja();
    pedir();
  }
  let pausado = false;
  function pedir() { if (activo && !pausado && !document.hidden && !cuadro) cuadro = requestAnimationFrame(paso); }

  /* ---------- Avanzar ---------- */
  function ir(v, ajustes) {
    meta = lim(v);
    if (!M || quieto) { if (!M) avance.v = meta; else avance.set(meta); return pedir(); }
    M.animate(avance, meta, ajustes || { type: "spring", stiffness: 55, damping: 19, restDelta: .0004 });
  }
  caja.addEventListener("wheel", e => { e.preventDefault(); ir(meta + e.deltaY * (e.deltaMode ? 16 : 1) / 2600); }, { passive: false });
  let toque = null;
  caja.addEventListener("pointerdown", e => { if (!e.target.closest("button")) toque = e.clientY; });
  addEventListener("pointermove", e => { if (toque !== null && activo) { ir(meta + (toque - e.clientY) / (innerHeight * 1.3)); toque = e.clientY; } }, { passive: true });
  for (const n of ["pointerup", "pointercancel"]) addEventListener(n, () => { toque = null; });
  addEventListener("keydown", e => {
    if (!activo || e.target.closest("button")) return;
    if (["ArrowDown", "PageDown", "Space"].includes(e.code)) { e.preventDefault(); ir(meta + .14); }
    if (["ArrowUp", "PageUp"].includes(e.code)) { e.preventDefault(); ir(meta - .14); }
  });
  boton.addEventListener("click", () => ir(1, { duration: 5.5, ease: [.45, .05, .3, 1] }));

  const api = {
    entrar() {
      activo = true; caja.hidden = false; caja.inert = false; meta = 0; antes = 0;
      if (M) { avance.set(0); llegada.set(quieto ? 1 : 0); if (!quieto) M.animate(llegada, 1, { duration: 2.4, delay: .35, ease: [.16, 1, .3, 1] }); } else avance.v = 0;
      if (!listo || lienzo.width !== Math.round(innerWidth * (sinGPU ? 1 : Math.min(devicePixelRatio || 1, 1.5)))) preparar();
      pedir(); if (quieto) requestAnimationFrame(dibuja);
    },
    salir() { if (window.Menu) window.Menu.cerrar(); activo = false; caja.inert = true; cancelAnimationFrame(cuadro); cuadro = 0; },
    avanzar: ir, estado: () => ({ activo, p: avance.get() }),
    pausa(v) { pausado = v; antes = 0; if (!v) pedir(); }
  };
  addEventListener("resize", () => { listo = false; if (activo) { preparar(); pedir(); } });
  document.addEventListener("visibilitychange", () => { antes = 0; pedir(); });
  window.Pasadizo = api;
  // las letras de los equipos se dibujan con Bangers: si llega después, se rehacen las capas
  if (document.fonts && document.fonts.load) document.fonts.load('40px "Bangers"').then(() => { listo = false; if (activo) { preparar(); pedir(); } }).catch(() => { });
  // Si el enlace ya apunta al pasadizo, se entra directo
  if (document.documentElement.classList.contains("sin-portal")) api.entrar();
})();
