/* Versión sin WebGL del agujero negro y los planetas (aceleración por hardware apagada).
   Misma geometría que agujero.js, dibujada en Canvas 2D: el cielo se pinta una vez, los anillos son texturas que giran
   y el planeta se calcula en un cuadro pequeño. La usa agujero.js por su cuenta; no se llama desde la página. */
(function () {
  "use strict";

  const CENTRO = [625, 345], INCL = .22, APL = .2, HUECO = [602, 358], LUNA = [590, 385], R = 122;
  const TAU = Math.PI * 2;

  function azarFijo(semilla) { return () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla / 4294967296; }; }
  const lienzo = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const lim = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const suave = (a, b, x) => { const t = lim((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  // Anillo de hebras de luz visto desde arriba (para girarlo y aplastarlo después)
  function anillo(r0, r1, cantidad, semilla, colores, esc) {
    const m = r1 + 14, c = lienzo(m * 2 * esc, m * 2 * esc), g = c.getContext("2d"), az = azarFijo(semilla);
    g.setTransform(esc, 0, 0, esc, m * esc, m * esc); g.globalCompositeOperation = "lighter"; g.lineCap = "round";
    for (let r = r0; r < r1; r += 5) {                      // bandas completas, tenues
      g.strokeStyle = "rgba(" + colores[(az() * colores.length) | 0] + "," + (.05 + az() * az() * .3).toFixed(3) + ")";
      g.lineWidth = 2 + az() * 7; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    }
    for (let i = 0; i < cantidad; i++) {                    // hebras sueltas: son las que dejan ver el giro
      const r = r0 + az() * (r1 - r0), a = az() * TAU, largo = .2 + az() * az() * 2.2, tono = colores[(az() * colores.length) | 0], al = .1 + az() * .45;
      g.lineWidth = .8 + az() * az() * 5;
      for (let k = 0; k < 4; k++) {                         // cola que se desvanece
        g.strokeStyle = "rgba(" + tono + "," + (al * (k + 1) / 4).toFixed(3) + ")";
        g.beginPath(); g.arc(0, 0, r, a + largo * k / 4, a + largo * (k + 1) / 4); g.stroke();
      }
    }
    return { c, m };
  }

  // Ruido 3D suave, para las superficies de los planetas
  function ruido3d() {
    const az = azarFijo(2026), t = new Float32Array(32768); for (let i = 0; i < t.length; i++) t[i] = az();
    const v = (x, y, z) => t[((x & 31) << 10) | ((y & 31) << 5) | (z & 31)];
    const n = (x, y, z) => {
      const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z); let a = x - X, b = y - Y, c = z - Z;
      a = a * a * (3 - 2 * a); b = b * b * (3 - 2 * b); c = c * c * (3 - 2 * c);
      const m = (p, q, f) => p + (q - p) * f;
      return m(m(m(v(X, Y, Z), v(X + 1, Y, Z), a), m(v(X, Y + 1, Z), v(X + 1, Y + 1, Z), a), b),
        m(m(v(X, Y, Z + 1), v(X + 1, Y, Z + 1), a), m(v(X, Y + 1, Z + 1), v(X + 1, Y + 1, Z + 1), a), b), c);
    };
    return (x, y, z) => { let s = 0, k = .5; for (let i = 0; i < 4; i++) { s += k * n(x, y, z); x = x * 2.03 + 3.1; y = y * 2.03 + 1.7; z = z * 2.03 + 5.3; k *= .5; } return s * 1.07; };
  }

  // Mapa de la superficie (longitud × latitud): color base y luz propia
  const TW = 384, TH = 192;
  function superficie(mundo) {
    const fbm = ruido3d(), base = new Float32Array(TW * TH), fuego = new Float32Array(TW * TH);
    const rayos = [], az = azarFijo(14); for (let i = 0; i < 14; i++) rayos.push(.35 + .75 * az());
    for (let j = 0; j < TH; j++) {
      const lat = (j / (TH - 1) - .5) * Math.PI, cl = Math.cos(lat), y = Math.sin(lat);
      for (let i = 0; i < TW; i++) {
        const lon = i / TW * TAU - Math.PI, x = cl * Math.sin(lon), z = cl * Math.cos(lon), p = j * TW + i;
        if (mundo === 1) {                                   // brasas
          const w = fbm(x * 2.2, y * 2.2, z * 2.2);
          base[p] = suave(.3, .75, fbm(x * 3.4 + w * 1.6, y * 3.4 + w * 1.6, z * 3.4 + w * 1.6));
          const f = fbm(x * 4.1 + w * 2.4 + 7, y * 4.1 + w * 2.4 + 7, z * 4.1 + w * 2.4 + 7);
          fuego[p] = Math.pow(1 - suave(0, .075, Math.abs(f - .5)), 1.6) * suave(.38, .66, fbm(x * 1.5 + 21, y * 1.5 + 21, z * 1.5 + 21));
        } else if (mundo === 2) {                            // viñeta
          const w = fbm(x * 5, y * 5, z * 5), h = fbm(x * 2.6 + w * .8, y * 2.6 + w * .8, z * 2.6 + w * .8);
          base[p] = (suave(.44, .56, h) - .5) * .6;
          const b = lat * 5.2 + fbm(x * 3, y * 3, z * 3) * 1.4; if (b - Math.floor(b) > .9) base[p] -= .3;
        } else {                                             // disco de oro: surcos y rayos grabados
          const polar = Math.acos(Math.max(-1, Math.min(1, y)));
          base[p] = (.66 + .34 * (.5 + .5 * Math.sin(polar * 55 + fbm(x * 9, y * 9, z * 9) * 1.6))) * (.8 + .2 * fbm(polar * 21, 5, 0));
          const s = z >= -.2 ? 1 : -1, fx = .35 * s, fy = .25 * s, fz = .9 * s, fl = Math.hypot(fx, fy, fz);
          const dist = Math.acos(Math.max(-1, Math.min(1, (x * fx + y * fy + z * fz) / fl)));
          const exx = fz / Math.hypot(fz, fx), exz = -fx / Math.hypot(fz, fx);
          const eyx = (fy * exz) / fl, eyy = (fz * exx - fx * exz) / fl, eyz = (-fy * exx) / fl;
          const rumbo = Math.atan2(x * eyx + y * eyy + z * eyz, x * exx + z * exz), k = Math.floor((rumbo + Math.PI) / TAU * 14) % 14;
          const medio = (k + .5) / 14 * TAU - Math.PI;
          let linea = Math.abs(rumbo - medio) * Math.sin(dist) < .012 && dist > .07 && dist < rayos[k] ? 1 : 0;
          if (linea && (dist * 23 + k * .37) % 1 < .35) linea = .4;
          if (Math.abs(dist - .07) < .012 || Math.abs(dist - 1.22) < .012) linea = 1;
          fuego[p] = linea ? linea * (.001 + dist) : 0;      // guarda la distancia para el pulso
        }
      }
    }
    return { base, fuego };
  }

  // La esfera: para cada punto se guarda qué parte del mapa se ve y cuánta luz recibe; al girar solo cambia la longitud
  function esfera(n) {
    const c = lienzo(n, n), g = c.getContext("2d"), im = g.createImageData(n, n), pts = [];
    const sx = .72, sy = -.22, sz = .52, sl = Math.hypot(sx, sy, sz);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u = (i + .5) / n * 2 - 1, v = (j + .5) / n * 2 - 1, d = Math.hypot(u, v); if (d >= 1) continue;
      const z = Math.sqrt(1 - d * d), nx = u, ny = -v;
      let x = Math.cos(.34) * nx - Math.sin(.34) * ny, y = Math.sin(.34) * nx + Math.cos(.34) * ny;
      const y2 = Math.cos(.28) * y + Math.sin(.28) * z, z2 = -Math.sin(.28) * y + Math.cos(.28) * z;
      pts.push({ o: (j * n + i) * 4, fila: Math.round((Math.asin(Math.max(-1, Math.min(1, y2))) / Math.PI + .5) * (TH - 1)),
        col: (Math.atan2(x, z2) / TAU + .5) * TW, luz: lim((nx * sx + ny * sy + z * sz) / sl), canto: Math.pow(1 - z, 3.2),
        lado: lim((nx * sx + ny * sy) / sl + .4), borde: lim((1 - d) * n * .5), i, j });
    }
    return { c, g, im, pts, n };
  }

  function pintaEsfera(e, mapa, mundo, giro, reloj, brillo) {
    const d = e.im.data, paso = giro * .16 / TAU * TW;
    for (const q of e.pts) {
      const c = (((q.col + paso) % TW) + TW) % TW | 0, p = q.fila * TW + c, b = mapa.base[p], f = mapa.fuego[p];
      let r, g, bl;
      if (mundo === 1) {
        const l = .14 + 1.25 * q.luz, fu = f * (.75 + .3 * Math.sin(reloj * 1.5 + b * 9));
        r = (.02 + .22 * b) * l + fu * 1.25 + q.canto * (q.lado * 1.4 + .1);
        g = (.016 + .17 * b) * l + fu * (.2 + .55 * f) + q.canto * (q.lado * .72 + .16);
        bl = (.022 + .17 * b) * l + fu * .1 + q.canto * (q.lado * .36 + .44);
      } else if (mundo === 2) {
        const tono = q.luz * .78 + b + .03, a = ((q.i + q.j) % 6) / 6 - .5, k = ((q.i - q.j + 600) % 6) / 6 - .5;
        let v = Math.hypot(a, k) < Math.sqrt(suave(.1, .9, tono)) * .72 || tono > .72 ? 1 : 0;
        if (q.canto > .09 && q.lado > .45) v = 1;
        r = v * .96; g = v * .95; bl = v * .92;
      } else {
        const l = .22 + 1.05 * q.luz, spec = Math.pow(q.luz, 18) * .55;
        r = .86 * l * b + spec + q.canto * .9; g = .58 * l * b + spec * .85 + q.canto * .56; bl = .2 * l * b + spec * .55 + q.canto * .18;
        if (f) {
          const pulso = Math.exp(-Math.pow((f - (reloj * .22 % 1) * 1.35) / .07, 2));
          r = r * .2 + pulso; g = g * .2 + pulso * .9; bl = bl * .2 + pulso * .6;
        }
      }
      d[q.o] = r * brillo * 255; d[q.o + 1] = g * brillo * 255; d[q.o + 2] = bl * brillo * 255; d[q.o + 3] = q.borde * 255;
    }
    e.g.putImageData(e.im, 0, 0);
  }

  window.AgujeroPlano = function (caja, escena) {
    const cielo = lienzo(1, 1); cielo.setAttribute("aria-hidden", "true");
    Object.assign(cielo.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
    caja.insertBefore(cielo, escena);
    const g = escena.getContext("2d");
    const GAS = ["255,255,255", "255,244,230", "255,178,70", "255,118,40", "236,80,160", "90,150,255", "110,225,235"];
    const aros = [anillo(104, 215, 330, 11, ["255,255,255", "255,240,225", "255,205,140", "190,215,255"], 1),
      anillo(200, 360, 360, 23, GAS, .9), anillo(340, 570, 300, 37, GAS.slice(2), .75)];
    const arco = anillo(124, 196, 210, 53, ["255,255,255", "255,255,255", "255,226,200", "190,205,255", "255,150,190"], 1.4);
    const disco = lienzo(1, 1), dg = disco.getContext("2d"), halo = lienzo(1, 1), hg = halo.getContext("2d");
    const mapas = {};
    let esf = null, k = 1, ox = 0, oy = 0, W = 1, H = 1, escala = 1, kd = 1, mundoAntes = -1;

    function pintaCielo(dpr) {
      const c = cielo.getContext("2d"), az = azarFijo(1977), w = cielo.width, h = cielo.height;
      c.fillStyle = "#010104"; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "lighter";
      const nube = (x, y, r, tono, al) => { const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(" + tono + "," + al + ")"); gr.addColorStop(1, "rgba(" + tono + ",0)"); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); };
      const TONOS = ["32,44,110", "92,36,28", "10,56,66", "70,60,86"];
      for (let i = 0; i < 90; i++) { const x = az() * w, y = h * (.75 - .55 * x / w) + (az() - .5) * h * .55; nube(x, y, (30 + az() * 150) * dpr, TONOS[(az() * 4) | 0], .05 + az() * .09); }
      const n = Math.round(w * h / (520 * dpr * dpr));
      for (let i = 0; i < n; i++) {
        const x = az() * w, y = az() * h, m = Math.pow(az(), 4), t = az();
        c.fillStyle = "rgba(" + (t < .4 ? "175,200,255" : t < .75 ? "255,255,255" : "255,200,150") + "," + (.15 + .8 * m).toFixed(3) + ")";
        const s = (.5 + m * 1.7) * dpr; c.fillRect(x, y, s, s);
        if (m > .8) nube(x, y, s * 4, "200,215,255", .16);
      }
      for (let i = 0; i < 9; i++) {                          // cruces de videojuego
        const x = Math.round(az() * w), y = Math.round(az() * h), u = Math.round(3 * dpr);
        c.fillStyle = i % 2 ? "rgba(115,215,255,.5)" : "rgba(255,130,97,.5)"; c.fillRect(x - u * 2, y, u * 5, u); c.fillRect(x, y - u * 2, u, u * 5);
      }
      c.globalCompositeOperation = "source-over";
    }

    function medir(w, h, e, x, y, dpr) {
      // Sin tarjeta gráfica conviene dibujar a menor resolución para que siga fluido
      const d = Math.min(dpr, 1);
      W = w; H = h; escala = e; ox = x; oy = y; k = d / e;
      for (const c of [cielo, escena]) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
      pintaCielo(d);
      kd = Math.min(k, 1.1);
      disco.width = Math.round(1220 * kd); disco.height = Math.round(264 * kd);
      halo.width = halo.height = Math.round(420 * kd);
      esf = esfera(Math.max(60, Math.min(250, Math.round(244 * k))));
    }

    function pintaDisco(T, fuerza, mundo) {
      const w = disco.width, h = disco.height;
      dg.setTransform(1, 0, 0, 1, 0, 0); dg.globalCompositeOperation = "source-over"; dg.clearRect(0, 0, w, h);
      dg.globalCompositeOperation = "lighter"; dg.globalAlpha = Math.min(1, fuerza);
      [.62, .4, .24].forEach((vel, i) => {
        const a = aros[i];
        dg.setTransform(kd, 0, 0, kd * APL, w / 2, h / 2); dg.rotate(T * vel); dg.drawImage(a.c, -a.m, -a.m, a.m * 2, a.m * 2);
      });
      dg.globalAlpha = 1;
      dg.setTransform(kd, 0, 0, kd, w / 2, h / 2);
      // izquierda cálida, derecha fría
      dg.globalCompositeOperation = "source-atop";
      const t = dg.createLinearGradient(-560, 0, 560, 0);
      t.addColorStop(0, "rgba(255,92,24,.55)"); t.addColorStop(.33, "rgba(255,170,60,.32)"); t.addColorStop(.55, "rgba(255,255,255,.18)"); t.addColorStop(.78, "rgba(80,205,235,.3)"); t.addColorStop(1, "rgba(40,90,255,.55)");
      dg.fillStyle = t; dg.fillRect(-610, -132, 1220, 264);
      // el lado que se acerca brilla en blanco
      dg.globalCompositeOperation = "lighter";
      dg.setTransform(kd, 0, 0, kd * APL, w / 2, h / 2);
      const foco = (x, y, r, al) => { const gr = dg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(255,250,242," + al + ")"); gr.addColorStop(.5, "rgba(255,236,224," + al * .4 + ")"); gr.addColorStop(1, "rgba(255,236,224,0)"); dg.fillStyle = gr; dg.fillRect(x - r, y - r, r * 2, r * 2); };
      foco(185, 100, 215, .8 * fuerza); foco(0, 0, 330, .2 * fuerza);
      // el interior queda libre (más ancho cuando hay un planeta)
      dg.globalCompositeOperation = "destination-out";
      const hueco = mundo ? 225 : 118, gr = dg.createRadialGradient(0, 0, 92, 0, 0, hueco);
      gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(.45, "rgba(0,0,0," + (mundo ? .9 : .75) + ")"); gr.addColorStop(1, "rgba(0,0,0,0)");
      dg.fillStyle = gr; dg.beginPath(); dg.arc(0, 0, hueco, 0, TAU); dg.fill();
    }

    function mitadDisco(delante, cx, cy) {
      g.save(); g.translate(CENTRO[0] + cx, CENTRO[1] + cy); g.rotate(INCL);
      g.beginPath(); g.rect(-640, delante ? -.6 : -160, 1280, 160); g.clip();
      g.globalCompositeOperation = "source-over"; g.drawImage(disco, -610, -132, 1220, 264); g.restore();
    }

    function pinta(s) {
      const { T, giro, reloj, mundo, piezas, cam, ener } = s;
      if (mundo !== mundoAntes) { mundoAntes = mundo; escena.style.filter = mundo === 2 ? "grayscale(1) contrast(1.7)" : ""; cielo.style.filter = mundo === 2 ? "grayscale(1) brightness(.55)" : ""; }
      cielo.style.opacity = Math.min(1, piezas.cielo.brillo);
      pintaDisco(T[0], piezas.disco.brillo * (1 + .3 * ener), mundo);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, escena.width, escena.height);
      g.setTransform(k, 0, 0, k, -ox * k, -oy * k);
      const cx = cam[0] * 8, cy = cam[1] * 8, hx = HUECO[0] + cam[0] * 6, hy = HUECO[1] + cam[1] * 6;
      // resplandor
      g.globalCompositeOperation = "source-over";
      const al = (.17 + .03 * Math.sin(reloj * 1.1) + .25 * ener) * piezas.disco.brillo;
      let gr = g.createRadialGradient(hx, hy, 90, hx, hy, 330); gr.addColorStop(0, "rgba(150,140,200," + al + ")"); gr.addColorStop(1, "rgba(150,140,200,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(hx, hy, 330, 0, TAU); g.fill();
      mitadDisco(false, cx, cy);

      if (mundo) {
        mapas[mundo] = mapas[mundo] || superficie(mundo);
        pintaEsfera(esf, mapas[mundo], mundo, giro, reloj, piezas.planeta.brillo);
        g.drawImage(esf.c, hx - R, hy - R, R * 2, R * 2);
      } else {
        g.fillStyle = "#000"; g.beginPath(); g.arc(hx, hy, 123, 0, TAU); g.arc(LUNA[0] + cx, LUNA[1] + cy, 101, 0, TAU); g.fill();
        // el arco de arriba: hebras que giran, desvanecidas hacia los costados
        const w = halo.width;
        hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = "source-over"; hg.clearRect(0, 0, w, w);
        hg.setTransform(kd, 0, 0, kd, w / 2, w / 2); hg.rotate(T[1] * .75); hg.globalCompositeOperation = "lighter";
        for (let i = 0; i < 2; i++) hg.drawImage(arco.c, -arco.m, -arco.m, arco.m * 2, arco.m * 2);
        hg.setTransform(kd, 0, 0, kd, w / 2, w / 2); hg.rotate(INCL);
        let m = hg.createRadialGradient(0, 0, 123, 0, 0, 185); m.addColorStop(0, "rgba(255,250,248,.85)"); m.addColorStop(.4, "rgba(255,244,246,.4)"); m.addColorStop(1, "rgba(255,240,250,0)");
        hg.fillStyle = m; hg.beginPath(); hg.arc(0, 0, 190, 0, TAU); hg.arc(0, 0, 123, 0, TAU, true); hg.fill();
        hg.globalCompositeOperation = "destination-in";
        const v = hg.createLinearGradient(0, -70, 0, 45); v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(1, "rgba(0,0,0,0)");
        hg.fillStyle = v; hg.fillRect(-210, -210, 420, 420);
        g.globalAlpha = Math.min(1, piezas.arco.brillo); g.drawImage(halo, hx - 210, hy - 210, 420, 420); g.globalAlpha = 1;
        g.strokeStyle = "rgba(60,110,255,.85)"; g.lineWidth = 3.5; g.beginPath(); g.arc(hx, hy, 123, Math.PI + INCL - .35, TAU + INCL + .35); g.stroke();
        // la media luna de abajo
        const late = (.75 + .2 * Math.sin(T[2] * 2.3)) * piezas.luna.brillo;
        for (const [r, tono, ancho] of [[101, "255,126,36", 3.5], [105.5, "60,130,255", 4]]) {
          const lg = g.createLinearGradient(0, LUNA[1] + 35, 0, LUNA[1] + 105); lg.addColorStop(0, "rgba(" + tono + ",0)"); lg.addColorStop(.6, "rgba(" + tono + "," + lim(late) + ")");
          g.strokeStyle = lg; g.lineWidth = ancho; g.beginPath(); g.arc(LUNA[0] + cx, LUNA[1] + cy, r, .1, Math.PI - .1); g.stroke();
        }
      }
      mitadDisco(true, cx, cy);
    }

    return { medir, pinta };
  };
})();
