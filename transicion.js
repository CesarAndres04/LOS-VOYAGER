/* La transición entre la entrada y el pasadizo: dos efectos mezclados, inspirados en «Curtains: Mixed effects» de Motion
   (hecho aquí con la versión libre de Motion y un lienzo, sin su código de pago).

     Cubrir    cortinas de color en facetas, que caen y suben alternadas desde el centro hacia los lados
     Revelar   un iris redondo, como el planeta, con anillos de colores que se abren sobre lo que viene

   Uso:  Transicion.pasar(() => { ...cambiar de pantalla mientras está todo cubierto... }, { demora });
   Sin Motion o con «menos movimiento», simplemente se cambia de pantalla. */
(function () {
  "use strict";
  const M = window.Motion, quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORES = ["#1a1f7a", "#2442d6", "#2f7dff", "#35c6ff", "#6a2bd9", "#9b4dff", "#d63ad0", "#ff4fc3"];
  const FONDO = "#120d22";
  const lim = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let ocupada = false;

  // La sonda de colores de la entrada, convertida en imagen para dibujarla sobre las cortinas
  let nave = null;
  function prepararNave() {
    const svg = document.querySelector(".pl-sonda .sonda"); if (nave || !svg) return;
    const copia = svg.cloneNode(true); copia.removeAttribute("style"); copia.removeAttribute("class");
    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg"); copia.setAttribute("width", "720"); copia.setAttribute("height", "720");
    nave = new Image(); nave.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(copia));
  }
  prepararNave();

  function pasar(cambiar, op) {
    op = op || {};
    if (!M || quieto) { cambiar(); return Promise.resolve(); }
    if (ocupada) return Promise.resolve();
    ocupada = true; prepararNave();
    const c = document.createElement("canvas"); c.className = "cortinas"; c.setAttribute("aria-hidden", "true");
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", width: "100%", height: "100%", zIndex: "200", pointerEvents: "auto", touchAction: "none" });
    const W = c.width = innerWidth, H = c.height = innerHeight, g = c.getContext("2d");
    document.body.append(c);

    let semilla = 41;
    const az = (a = 0, b = 1) => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return a + (semilla / 4294967296) * (b - a); };
    const n = W < 700 ? 8 : 15, cortinas = [];
    let x = 0, antes = -1;
    const pesos = Array.from({ length: n }, () => az(.6, 1.5)), total = pesos.reduce((a, b) => a + b, 0);
    pesos.forEach((p, i) => {
      const w = p / total * W;
      let k = (az() * COLORES.length) | 0; if (k === antes) k = (k + 3) % COLORES.length; antes = k;
      const centro = Math.abs((x + w / 2) / W - .5) * 2;
      cortinas.push({ x, w, color: COLORES[k], otro: COLORES[(k + 2) % COLORES.length], tercero: COLORES[(k + 5) % COLORES.length],
        baja: i % 2 === 0, demora: centro * .34 + az(0, .08), corte: az(-.9, .9), f: az(), g: az() });
      x += w;
    });

    // Cada cortina: cuerpo, punta cortada en diagonal, facetas y un filo blanco
    function cortina(s, p) {
      const u = suave(lim((p - s.demora) / .58)); if (u <= 0) return;
      const punta = Math.min(150, H * .17), largo = (H + punta * 2.2) * u;
      g.save(); g.translate(s.x, s.baja ? 0 : H); if (!s.baja) g.scale(1, -1);
      const a = largo - punta * (.5 + s.corte * .5), b = largo - punta * (.5 - s.corte * .5), w = s.w + 1;
      const franja = (desde, color) => { g.fillStyle = color; g.beginPath(); g.moveTo(0, -2); g.lineTo(w, -2); g.lineTo(w, b + desde); g.lineTo(0, a + desde); g.closePath(); g.fill(); };
      franja(46 * (1 - u * u), s.otro); franja(0, s.color);
      g.fillStyle = s.tercero; g.beginPath(); g.moveTo(0, a); g.lineTo(w * (.35 + s.f * .5), a + (b - a) * (.35 + s.f * .5)); g.lineTo(0, a - H * (.12 + s.g * .2)); g.closePath(); g.fill();
      g.fillStyle = FONDO; g.globalAlpha = .35; g.beginPath(); g.moveTo(w, b - H * (.3 + s.f * .3)); g.lineTo(w, b); g.lineTo(w * (.25 + s.g * .4), b - H * .06); g.closePath(); g.fill(); g.globalAlpha = 1;
      g.fillStyle = "rgba(255,255,255,.16)"; g.fillRect(w * (.12 + s.g * .6), 0, Math.max(2, w * .07), Math.max(0, Math.min(a, b) - punta * .3));
      g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, a); g.lineTo(w, b); g.stroke();
      g.fillStyle = s.otro; const t = 7 + s.f * 7; g.fillRect(w * s.g, b + 16 + s.f * 30, t, t); g.fillStyle = "#fff"; g.fillRect(w * s.f, a + 8 + s.g * 44, t * .5, t * .5);
      g.restore();
    }
    // barras horizontales que cruzan, como las del pasadizo
    const barras = Array.from({ length: 9 }, (_, i) => ({ y: az(.08, .94), w: az(.12, .4), h: az(4, 13), color: i % 3 ? COLORES[(az() * COLORES.length) | 0] : "#ffffff", d: az(.3, .75), lado: i % 2 ? 1 : -1 }));
    // en el centro: un panel facetado y la sonda volando
    function emblema(k, giro) {
      if (k <= 0) return;
      const m = Math.min(W, H) * .3, e = k < 1 ? 1 - Math.pow(1 - k, 3) : k;
      g.save(); g.translate(W / 2, H / 2); g.scale(e, e);
      const placa = (radio, color, vuelta) => { g.fillStyle = color; g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.2832 + vuelta, r = radio * (1 + (i % 2 ? .16 : -.04)); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * .82); } g.closePath(); g.fill(); };
      placa(m * 1.2, "#ffffff", giro * .5); placa(m * 1.14, "#ff4fc3", giro * .5 + .09); placa(m * 1.02, "#35c6ff", -giro * .4 + .5); placa(m * .93, FONDO, giro * .3);
      if (nave && nave.complete && nave.naturalWidth) { g.rotate(Math.sin(giro * 1.7) * .18 - .06); g.drawImage(nave, -m * 1.1, -m * 1.1, m * 2.2, m * 2.2); }
      g.restore();
    }
    const dibujaCubrir = p => {
      g.clearRect(0, 0, W, H); for (const s of cortinas) cortina(s, p);
      for (const b of barras) { const u = suave(lim((p - b.d) / .4)); if (u <= 0) continue; const ancho = b.w * W, desde = b.lado > 0 ? -ancho : W, hasta = W * (.5 - b.lado * (.5 - b.y) * .7) - ancho / 2; g.fillStyle = b.color; g.fillRect(desde + (hasta - desde) * u, b.y * H, ancho, b.h); }
      emblema(lim((p - .68) / .45), p * 1.4);
    };

    const cx = W * .52, cy = H * .45, lejos = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
    function dibujaRevelar(p) {
      g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, W, H); for (const s of cortinas) cortina(s, 1.2);
      for (const b of barras) { const ancho = b.w * W; g.fillStyle = b.color; g.fillRect(W * (.5 - b.lado * (.5 - b.y) * .7) - ancho / 2 + b.lado * p * W * .9, b.y * H, ancho, b.h); }
      emblema(1 - lim(p * 2.2), 1.7 + p * 4);
      const r = Math.pow(p, 1.5) * (lejos + 80);
      // anillos de color en arcos, girando alrededor de la abertura
      [["#ffffff", 4, 3, 1], ["#35c6ff", 16, 16, 7], ["#ff4fc3", 36, 14, 5], ["#6a2bd9", 60, 24, 3]].forEach(([color, fuera, ancho, partes], k) => {
        g.strokeStyle = color; g.lineWidth = ancho; const giro = p * (k % 2 ? -2.6 : 2.2) + k;
        for (let i = 0; i < partes; i++) { g.beginPath(); g.arc(cx, cy, r + fuera * lim(p * 3), giro + i / partes * 6.2832, giro + (i + (partes > 1 ? .72 : 1)) / partes * 6.2832); g.stroke(); }
      });
      g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill(); g.globalCompositeOperation = "source-over";
    }

    const tramo = (dibujar, hasta, ajustes) => M.animate(0, hasta, Object.assign({ ease: "linear", onUpdate: dibujar }, ajustes)).then(() => dibujar(hasta));
    return tramo(dibujaCubrir, 1.2, { duration: 1.15, delay: op.demora || 0 })
      .then(() => { cambiar(); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); })
      .then(() => tramo(dibujaRevelar, 1, { duration: 1.15, delay: .5 }))
      .catch(e => console.error(e))
      .then(() => { c.remove(); ocupada = false; });
  }

  window.Transicion = { pasar };
})();
