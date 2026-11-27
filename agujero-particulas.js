/* El agujero negro con los colores de la imagen de referencia (agujero.jpg), en dos clases de zonas:

     ESTRUCTURA  El hueco, sus filos, el arco de arriba, la franja blanca y la media luna. Es lo que hace reconocible la figura:
                 se dibuja una vez, nítida y a la resolución de la pantalla, y NO se mueve con nada.
     VIVA        Las puntas y el borde de fuera del disco. Son partículas en 3D: corren, siguen la cámara, el cursor las
                 aparta y, al mantener pulsado, se levantan hacia un globo.

   `movilidad(x, y)` decide cuánto pertenece cada punto a la zona viva (0 = fijo, 1 = libre); entre ambas hay una transición.
   Estilo del globo: el ejemplo «TSL particle morph» de Motion, hecho aquí en Canvas 2D (funciona sin tarjeta gráfica).
   Un solo valor de Motion (0 = en su sitio, 1 = globo) mueve la zona viva. La usa agujero.js; no se llama desde la página. */
(function () {
  "use strict";

  const HUECO = [602, 358], CENTRO = [625, 345], INCL = .22, APL = .2;
  const GLOBO = [604, 352], RADIO = 188;
  const BOLA = [600.6, 357.7, 124.7];                    // el planeta: círculo que pasa por el borde del hueco en la referencia
  const X0 = 20, Y0 = 85, AN = 1180, AL = 500;            // recorte del lienzo de 1200 × 675 que se dibuja
  const lim = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const suave = (a, b, x) => { const t = lim((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  const CI = Math.cos(INCL), SI = Math.sin(INCL);
  // Cuánto puede moverse cada punto de la figura: nada cerca del agujero, todo en las puntas del disco
  function movilidad(x, y) {
    const qx = CI * (x - CENTRO[0]) + SI * (y - CENTRO[1]), qy = (-SI * (x - CENTRO[0]) + CI * (y - CENTRO[1])) / APL;
    const afuera = suave(250, 410, Math.hypot(qx, qy));
    const hueco = suave(165, 235, Math.hypot(x - HUECO[0], y - HUECO[1]));          // hueco, filos y arco
    const luna = y > 395 ? suave(125, 165, Math.hypot(x - 588, y - 385)) : 1;       // media luna de abajo
    return afuera * hueco * luna;
  }

  /* ---------- La luz que corre por la estructura ----------
     La forma no se mueve: lo que viaja es el brillo, a lo largo de las mismas líneas de la figura (las de agujero-estilo.js),
     con pulsos largos, más rápidos por dentro. La media luna de abajo tiene su propia vuelta. */
  const TF = 64, TC = 1024;                               // columnas finas: la luz avanza sin escalones
  function pulsos(az) {
    const t = new Float32Array(TF * TC);
    for (let f = 0; f < TF; f++) {
      const ondas = [[3 + (az() * 3 | 0), az() * 6.283, .55], [7 + (az() * 6 | 0), az() * 6.283, .3], [17 + (az() * 9 | 0), az() * 6.283, .15]];
      for (let c = 0; c < TC; c++) { let v = 0; for (const [n, fase, peso] of ondas) v += Math.sin(c / TC * 6.283185 * n + fase) * peso; t[f * TC + c] = v; }
    }
    return t;
  }
  function flujo(base, W, H) {
    const L = window.AgujeroEstilo && AgujeroEstilo.lineas && AgujeroEstilo.lineas();
    const donde = [], fila = [], mezcla = [], col = [], fuerza = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4; if (base[o + 3] < 14) continue;
      const X = x + X0, Y = y + Y0, d = Math.hypot(X - BOLA[0], Y - BOLA[1]);
      let f, c, a = .6;
      if (Y > 440 && Math.abs(d - BOLA[2] + 3) < 14) { f = 40 + (d - BOLA[2] + 17) / 7; c = Math.atan2(Y - BOLA[1], X - BOLA[0]) / 6.283185 * TC * 2; a = .6; }
      else {
        let q = -1, k = 0;
        if (L) { const lx = X - L.x0, ly = Y - L.y0; if (lx >= 0 && ly >= 0 && lx < L.an && ly < L.al) { q = L.q[ly * L.an + lx]; k = L.k[ly * L.an + lx]; } }
        if (q >= 0) { f = q * 9; c = k / 13 * TC; a *= 1 - .5 * suave(3.2, 4, q); }
        else { const qx = CI * (X - CENTRO[0]) + SI * (Y - CENTRO[1]), qy = (-SI * (X - CENTRO[0]) + CI * (Y - CENTRO[1])) / APL; f = Math.hypot(qx, qy) / 20; c = Math.atan2(qy, qx) / 6.283185 * TC; a = .26; }
      }
      f = Math.max(0, Math.min(TF - 1.001, f));
      donde.push(o); fila.push(f | 0); mezcla.push(f - (f | 0)); col.push(c & (TC - 1)); fuerza.push(a);
    }
    return { donde: Uint32Array.from(donde), fila: Uint8Array.from(fila), mezcla: Float32Array.from(mezcla), col: Uint16Array.from(col), fuerza: Float32Array.from(fuerza) };
  }

  /* ---------- El planeta que gira ----------
     Dentro de la sombra se ve una esfera casi a oscuras, con vetas que dan la vuelta y un borde azulado. */
  const PW = 256, PH = 128;
  function superficie(az) {
    const rejilla = Array.from({ length: 32 * 17 }, az);
    const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, v = (a, b) => rejilla[(Math.min(16, b)) * 32 + (a & 31)];
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return (v(xi, yi) * (1 - sx) + v(xi + 1, yi) * sx) * (1 - sy) + (v(xi, yi + 1) * (1 - sx) + v(xi + 1, yi + 1) * sx) * sy; };
    const t = new Float32Array(PW * PH);
    for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
      const x = i / PW * 32, y = j / PH * 16, w = n(x, y * .5 + 3) * 2.2;   // x da la vuelta entera: sin costura
      const veta = .5 + .5 * Math.sin(y * 2.1 + w * 2.6), grano = .6 * n(x, y + w) + .4 * n(x, y * 2 % 16);
      t[j * PW + i] = Math.pow(lim(veta * .55 + grano * .75 - .22), 2.1);
    }
    return t;
  }
  // La media luna se dibuja sobre el mismo círculo del planeta, para que todo quede alineado
  function mediaLuna(base, W, H) {
    const [bx, by, R] = BOLA;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, X = x + X0, Y = y + Y0, d = Math.hypot(X - bx, Y - by);
      // se borra la media luna de la imagen, que iba un poco corrida respecto del círculo
      const vieja = Math.hypot(X - 588, Y - 385);
      if (vieja > 78 && vieja < 130 && d < R + 36) base[o + 3] *= 1 - (vieja > 94 && X < 520 ? suave(404, 420, Y) : suave(418, 442, Y)) * suave(78, 90, vieja) * (1 - suave(120, 130, vieja));
      if (Y < 425 || Math.abs(d - R) > 14) continue;
      const ang = Math.atan2(Y - by, X - bx), abre = Math.pow(lim(Math.sin((ang - .5) / 2.2 * Math.PI)), .6) * suave(425, 462, Y);
      if (abre <= 0) continue;
      let r = 0, g = 0, b = 0;
      // de dentro hacia fuera: rojo, amarillo, verde agua y azul
      for (const [radio, ancho, cr, cg, cb, al] of [[R - 6, 1.5, 255, 74, 24, .95], [R - 3.8, 1.4, 255, 196, 70, .85], [R - 1.8, 1.3, 80, 205, 160, .65], [R + .3, 1.7, 40, 80, 255, .9], [R - 3, 6.5, 150, 120, 160, .14]]) {
        const v = Math.exp(-((d - radio) * (d - radio)) / (ancho * ancho)) * al * abre; r += cr * v; g += cg * v; b += cb * v;
      }
      const luz = Math.max(r, g, b); if (luz < 3) continue;
      const a0 = base[o + 3] / 255, a1 = Math.min(1, luz / 255), a = Math.min(1, a0 + a1);
      base[o] = (base[o] * a0 + r) / a; base[o + 1] = (base[o + 1] * a0 + g) / a; base[o + 2] = (base[o + 2] * a0 + b) / a; base[o + 3] = a * 255;
    }
  }
  // Un solo círculo, de borde suavizado; la luz del disco pasa por encima según su propia transparencia
  function planeta(W, H) {
    const donde = [], lat = [], lon = [], luz = [], canto = [], cubre = [];
    const [bx, by, R] = BOLA;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x + X0 + .5, Y = y + Y0 + .5, dist = Math.hypot(X - bx, Y - by), c = lim(R - dist + .5); if (c <= 0) continue;
      const u = (X - bx) / R, v = (Y - by) / R, z = Math.sqrt(Math.max(0, 1 - u * u - v * v)), ci = Math.cos(.3), si = Math.sin(.3), nx = u * ci + v * si, ny = -u * si + v * ci;
      donde.push((y * W + x) * 4);
      lat.push(Math.max(0, Math.min(PH - 1, ((Math.asin(Math.max(-1, Math.min(1, ny))) / Math.PI + .5) * PH) | 0)));
      lon.push((Math.atan2(nx, z) / 6.283185 + .5) * PW);
      luz.push((.25 + .75 * lim(.5 + u * .75 - v * .25)) * suave(0, .35, z));
      canto.push(Math.pow(1 - z, 3)); cubre.push(c);
    }
    return { donde: Uint32Array.from(donde), lat: Uint8Array.from(lat), lon: Float32Array.from(lon), luz: Float32Array.from(luz), canto: Float32Array.from(canto), cubre: Float32Array.from(cubre) };
  }

  function crear(op) {
    const M = window.Motion, quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forma = M ? M.motionValue(quieto ? 0 : 1) : { get: () => 0 };
    const ir = (a, ajustes) => { if (M && !quieto) M.animate(forma, a, Object.assign({ type: "spring", restDelta: .0005 }, ajustes)); };
    const abrir = demora => ir(0, { stiffness: 38, damping: 14, mass: 1, delay: demora || 0 });
    const juntar = () => ir(.42, { stiffness: 80, damping: 16, mass: .9 });   // levanta la zona viva sin deshacer la estructura

    // Un solo lienzo a la resolución de la imagen: en cada cuadro se copia la estructura (idéntica, píxel a píxel)
    // y encima se suman las partículas vivas. Así hay una sola capa que componer y la estructura no pierde nitidez.
    const ks = 1, W = AN, H = AL;
    const lienzo = document.createElement("canvas"); lienzo.width = W; lienzo.height = H;
    lienzo.setAttribute("aria-hidden", "true");
    Object.assign(lienzo.style, { position: "absolute", display: "none", pointerEvents: "none" });
    op.caja.append(lienzo);
    const g = lienzo.getContext("2d"), im = g.createImageData(W, H), d = im.data;
    let P = null, n = 0, chispas = null, puesto = "", base = null, corre = null, globo = null, ondas = null, vetas = null;

    // La estructura: la imagen con el negro transparente (el hueco lo ocupa el planeta); en la zona viva se atenúa para que manden las partículas
    function preparaFigura(img) {
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d", { willReadFrequently: true });
      x.imageSmoothingQuality = "high"; x.drawImage(img, X0, Y0, AN, AL, 0, 0, W, H);
      const px = x.getImageData(0, 0, W, H).data;
      for (let yy = 0, i = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++, i += 4) {
        const max = Math.max(px[i], px[i + 1], px[i + 2]);
        if (max < 7) { px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0; continue; }
        const k = 255 / max, queda = 1 - .5 * movilidad(xx + X0, yy + Y0);
        px[i] *= k; px[i + 1] *= k; px[i + 2] *= k; px[i + 3] = max * queda;
      }
      base = new Uint8ClampedArray(px);
      let semilla = 2026;
      const az = () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla / 4294967296; };
      ondas = pulsos(az); vetas = superficie(az);
      mediaLuna(base, W, H); corre = flujo(base, W, H); globo = planeta(W, H);
    }

    function sembrar(img) {
      preparaFigura(img);
      const c = document.createElement("canvas"); c.width = 1200; c.height = 675;
      const x2 = c.getContext("2d", { willReadFrequently: true }); x2.drawImage(img, 0, 0, 1200, 675);
      const px = x2.getImageData(0, 0, 1200, 675).data;
      let semilla = 1977;
      const az = () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla / 4294967296; };
      const paso = innerWidth < 700 ? 3.4 : op.ligero ? 3 : 2.4, puntos = [];
      for (let y = 100; y < 560; y += paso) for (let x = 30; x < 1190; x += paso) {
        const xx = x + (az() - .5) * paso, yy = y + (az() - .5) * paso, i = ((yy | 0) * 1200 + (xx | 0)) * 4;
        const max = Math.max(px[i], px[i + 1], px[i + 2]);
        if (max < 22 || (max < 60 && az() > max / 60)) continue;
        const libre = movilidad(xx, yy);
        if (libre < .04 || az() > .25 + libre) continue;                 // la estructura no lleva partículas
        puntos.push([xx, yy, px[i], px[i + 1], px[i + 2], libre]);
      }
      n = puntos.length;
      const F = () => new Float32Array(n);
      P = { x: F(), y: F(), z: F(), r: new Uint8Array(n), g: new Uint8Array(n), b: new Uint8Array(n),
        tx: F(), ty: F(), tz: F(), fase: F(), vel: F(), demora: F(), sx: F(), sy: F(), sz: F(), libre: F(), ex: F(), ey: F() };
      puntos.sort((a, b) => a[1] - b[1]);
      // en el globo cada franja da toda la vuelta, de izquierda a derecha: queda parejo y conserva las zonas de color
      const banda = Math.max(40, Math.round(n / 70)), vuelta = F();
      for (let a = 0; a < n; a += banda) {
        const trozo = puntos.slice(a, a + banda).sort((u, v) => u[0] - v[0]);
        trozo.forEach((p, j) => { puntos[a + j] = p; vuelta[a + j] = (j + az()) / trozo.length * 6.2831853; });
      }
      const ci = Math.cos(INCL), si = Math.sin(INCL);
      puntos.forEach(([x, y, r, gg, b, libre], i) => {
        P.libre[i] = libre; P.x[i] = x; P.y[i] = y; P.r[i] = r; P.g[i] = gg; P.b[i] = b;
        const dx = x - HUECO[0], dy = y - HUECO[1], rh = Math.hypot(dx, dy);
        const arco = suave(215, 160, rh) * suave(5, -45, dy);                 // la luz doblada sobre el agujero
        const qx = ci * (x - CENTRO[0]) + si * (y - CENTRO[1]), qy = (-si * (x - CENTRO[0]) + ci * (y - CENTRO[1])) / APL;
        // profundidad: lo de abajo del disco está adelante (z positivo) y lo de arriba, atrás
        P.z[i] = Math.max(-420, Math.min(420, qy * .85)) * (1 - arco) + (az() - .5) * 34;
        const l = Math.hypot(qx, qy) || 1, ex = -qy / l, ey = qx / l;
        if (arco > .5) { P.tx[i] = -dy / rh; P.ty[i] = dx / rh; }
        else { const vx = ci * ex - si * ey * APL, vy = si * ex + ci * ey * APL, m = Math.hypot(vx, vy) || 1; P.tx[i] = vx / m; P.ty[i] = vy / m; P.tz[i] = ey / m * .85; }
        P.fase[i] = az(); P.vel[i] = .2 + .46 * suave(420, 130, rh) + az() * .09; P.demora[i] = az();
        const sy = Math.max(-1, Math.min(1, 1 - 2 * (i + .5) / n + (az() - .5) * .035)), sr = Math.sqrt(1 - sy * sy);
        P.sx[i] = Math.cos(vuelta[i]) * sr; P.sy[i] = sy; P.sz[i] = Math.sin(vuelta[i]) * sr;
      });
      // chispas grandes que orbitan en primer plano y por detrás
      chispas = Array.from({ length: op.ligero ? 24 : 55 }, () => {
        const p = puntos[(az() * n) | 0];
        return { r: 360 + az() * 230, a: az() * 6.283, h: (az() - .5) * 70, w: .16 + az() * .3, c: [p[2], p[3], p[4]] };
      });
      abrir(.9);
    }
    const img = new Image(); img.onload = () => sembrar(img); img.src = op.imagen || "agujero.jpg";

    // Mantener pulsado el fondo junta las partículas; soltar las devuelve
    let pulsado = false;
    const aqui = op.superficie;
    const empieza = e => {
      if (e.type === "keydown") { if (e.code !== "Space" || e.repeat || aqui.hidden || /^(BUTTON|A|INPUT|SUMMARY)$/.test(e.target.tagName)) return; e.preventDefault(); }
      else if (e.target.closest && e.target.closest("button, a, input, details, nav")) return;
      pulsado = true; juntar();
    };
    const termina = () => { if (pulsado) { pulsado = false; abrir(); } };
    if (aqui) {
      aqui.addEventListener("pointerdown", empieza); addEventListener("keydown", empieza);
      for (const ev of ["pointerup", "pointercancel", "keyup", "blur"]) addEventListener(ev, termina);
    }

    // El cursor aparta las partículas de la zona viva
    const raton = { x: -9999, y: -9999, hace: 0 };
    addEventListener("pointermove", e => { raton.x = e.clientX; raton.y = e.clientY; raton.hace = performance.now(); }, { passive: true });

    // Suma un punto de luz suave: centro y, si es grande, sus cuatro vecinos más tenues (así no se ve como un cuadro)
    function suma(j, r, v, b) { d[j] += r; d[j + 1] += v; d[j + 2] += b; const a = r > v ? (r > b ? r : b) : (v > b ? v : b); const t = d[j + 3] + a * 1.6; d[j + 3] = t > 255 ? 255 : t; }
    function punto(x, y, t, r, v, b) {
      if (x < 1 || y < 1 || x > W - 2 || y > H - 2) return;
      const j = (y * W + x) * 4, fila = W * 4;
      suma(j, r, v, b);
      if (t > 1) {
        const q = t > 2 ? .6 : .32;
        suma(j - 4, r * q, v * q, b * q); suma(j + 4, r * q, v * q, b * q); suma(j - fila, r * q, v * q, b * q); suma(j + fila, r * q, v * q, b * q);
      }
    }

    /* s: { escala, ox, oy (px de la figura por px de pantalla y origen), cam, t, reloj, brillo, ener } */
    function cuadro(s) {
      if (!P) return;
      const sitio = s.escala.toFixed(4) + " " + s.ox.toFixed(1) + " " + s.oy.toFixed(1);
      if (sitio !== puesto) {
        puesto = sitio;
        Object.assign(lienzo.style, { left: (X0 - s.ox) / s.escala + "px", top: (Y0 - s.oy) / s.escala + "px", width: AN / s.escala + "px", height: AL / s.escala + "px" });
      }
      const m = forma.get(), brillo = s.brillo * (1 + .45 * s.ener), t = s.t, mm = lim(m);

      // la estructura solo aparece (al armarse la figura) y se enciende; nunca se desplaza
      const ver = (1 - suave(.45, 1, mm)) * lim(s.brillo);
      if (ver > .995) d.set(base);
      else if (ver < .005) d.fill(0);
      else for (let i = 0; i < d.length; i += 4) { d[i] = base[i]; d[i + 1] = base[i + 1]; d[i + 2] = base[i + 2]; d[i + 3] = base[i + 3] * ver; }
      // la luz corre por las líneas: cambia el brillo (y un poco el rojo y el azul), nunca la forma
      if (ver > .01) {
        const { donde, fila, mezcla, col, fuerza } = corre, paso = new Int32Array(TF);
        for (let f = 0; f < TF; f++) paso[f] = (t * (290 - 150 * f / TF)) | 0;
        const viva = 1 + .5 * s.ener;
        for (let i = 0; i < donde.length; i++) {
          const o = donde[i], f = fila[i], w = mezcla[i], k = fuerza[i] * viva, a = col[i] - paso[f], b = col[i] - paso[f + 1];
          // mezcla entre dos líneas vecinas: sin saltos de una a otra
          const m = (ondas[f * TC + (a & 1023)] * (1 - w) + ondas[(f + 1) * TC + (b & 1023)] * w) * k;
          d[o + 3] = base[o + 3] * (m < 0 ? 1 + m * .62 : 1 + m * .5) * ver;
          const tinte = (ondas[f * TC + ((a + 36) & 1023)] * (1 - w) + ondas[(f + 1) * TC + ((b + 36) & 1023)] * w) * k * .22;
          d[o] = base[o] * (1 + tinte); d[o + 2] = base[o + 2] * (1 - tinte);
        }
        // el planeta gira; la luz que ya había en cada punto queda por delante
        const G = globo, vuelta = t * 17;
        for (let i = 0; i < G.donde.length; i++) {
          const o = G.donde[i], u = G.lon[i] + vuelta, u0 = u | 0, fu = u - u0, fl = G.lat[i] * PW;
          const tono = vetas[fl + (u0 & 255)] * (1 - fu) + vetas[fl + ((u0 + 1) & 255)] * fu, l = G.luz[i], c = G.canto[i];
          const frente = d[o + 3] / 255, fondo = G.cubre[i] * ver * (1 - frente), a = frente + fondo; if (a <= 0) continue;
          d[o] = (d[o] * frente + (tono * l * 74 + c * 16) * fondo) / a;
          d[o + 1] = (d[o + 1] * frente + (tono * l * 58 + c * 34) * fondo) / a;
          d[o + 2] = (d[o + 2] * frente + (tono * l * 98 + c * 104) * fondo) / a;
          d[o + 3] = a * 255;
        }
      }

      // posición del cursor en la figura
      const caja = op.caja.getBoundingClientRect(), activo = performance.now() - raton.hace < 1800;
      const mx = s.ox + (raton.x - caja.left) * s.escala, my = s.oy + (raton.y - caja.top) * s.escala;

      // cámara 3D: giro lateral y de cabeceo según el cursor (o un vaivén propio)
      const lado = s.cam[0] * .13, alto = s.cam[1] * .055;
      const cl = Math.cos(lado), sl = Math.sin(lado), ca = Math.cos(alto), sa = Math.sin(alto);
      const giro = s.reloj * .42, cg = Math.cos(giro), sg = Math.sin(giro), ci = Math.cos(.34), si = Math.sin(.34);
      const { x: PX, y: PY, z: PZ, r: PR, g: PG, b: PB, tx, ty, tz, fase, vel, demora, sx, sy, sz, libre, ex, ey } = P;

      for (let i = 0; i < n; i++) {
        let k = m * 1.45 - demora[i] * .45; k = k < 0 ? (m < 0 ? m * .35 : 0) : k > 1 ? 1 + (m - 1) * .5 : k;
        const kk = k < 0 ? 0 : k > 1 ? 1 : k;
        let f = t * vel[i] + fase[i]; f -= f | 0;
        const L = libre[i], corre = (f - .5) * 62 * L * (1 - kk), vida = 1 - (2 * f - 1) * (2 * f - 1) * (1 - kk);
        // empuje del cursor: se alejan y vuelven solas; cuanto más libre la zona, más ceden
        let dx = ex[i] * .88, dy = ey[i] * .88;
        if (activo) { const ax = PX[i] - mx, ay = PY[i] - my, q = ax * ax + ay * ay; if (q < 5600 && q > 1) { const h = Math.sqrt(q), f2 = (1 - h / 75) * 9 * L / h; dx += ax * f2; dy += ay * f2; } }
        ex[i] = dx; ey[i] = dy;
        let x = PX[i] + tx[i] * corre + dx - HUECO[0], y = PY[i] + ty[i] * corre + dy - HUECO[1], z = PZ[i] + tz[i] * corre, luz = (.2 + .8 * vida) * (.25 + .75 * L);
        if (k !== 0) {
          // su lugar en el globo, que gira e ilumina de un lado
          const a = sx[i] * cg - sz[i] * sg, c = sx[i] * sg + sz[i] * cg, gx = a * ci - sy[i] * si, gy = a * si + sy[i] * ci;
          const vuelo = kk * (1 - kk) * 4 * (30 + 90 * demora[i]);
          x += (GLOBO[0] - HUECO[0] + gx * RADIO - x) * k + (demora[i] - .5) * vuelo;
          y += (GLOBO[1] - HUECO[1] + gy * RADIO - y) * k + (fase[i] - .5) * vuelo * .6;
          z += (c * RADIO - z) * k + vuelo * 1.4;
          const sol = lim(.52 + .48 * (gx * .62 - gy * .35 + c * .7));
          luz += (.12 + 1.15 * sol * sol - luz) * kk;
        }
        // proyección: primero gira, después lo cercano se agranda
        const w = L + (1 - L) * kk;                              // la cámara 3D solo mueve lo que está vivo
        const z1 = z * cl - x * sl * .35, x1 = x + (x * cl + z * sl - x) * w, y1 = y + (y * ca + z1 * sa - y) * w;
        const cerca = 1 + z1 * .00062;
        // la posición solo cambia lo que cambia la profundidad: con la cámara de frente la figura es la de la referencia
        const mueve = 1 + (cerca / (1 + z * .00062 * (1 - kk)) - 1) * w;
        const X = ((HUECO[0] + x1 * mueve - X0) * ks) | 0, Y = ((HUECO[1] + y1 * mueve - Y0) * ks) | 0;
        const a = luz * brillo * (.16 + .6 * cerca * cerca * cerca) * (.72 + .28 * kk);
        punto(X, Y, cerca > 1.16 ? 3 : cerca < 1 ? 1 : 2, PR[i] * a, PG[i] * a, PB[i] * a);
      }

      // chispas: una órbita 3D propia, con estela corta
      const ct = Math.cos(INCL), st = Math.sin(INCL);
      for (const q of chispas) {
        for (let e = 0; e < 4; e++) {
          const an = q.a + t * q.w - e * .018, fr = Math.sin(an);
          const px = Math.cos(an) * q.r, py = fr * q.r * APL + q.h, z = fr * q.r * .95;
          const x = CENTRO[0] - HUECO[0] + px * ct - py * st, y = CENTRO[1] - HUECO[1] + px * st + py * ct;
          const z1 = z * cl - x * sl * .35, x1 = x * cl + z * sl, y1 = y * ca + z1 * sa, cerca = 1 + z1 * .00085;
          if (z < 0 && x1 * x1 + y1 * y1 < 15000) continue;                  // se esconde tras el agujero
          const a = (1 - e / 4) * (.18 + .5 * lim(cerca - .45)) * (1 - .7 * mm);
          punto(((HUECO[0] + x1 * cerca - X0) * ks) | 0, ((HUECO[1] + y1 * cerca - Y0) * ks) | 0, cerca > 1.18 ? 4 : cerca > 1 ? 3 : 2, q.c[0] * a, q.c[1] * a, q.c[2] * a);
        }
      }
      g.putImageData(im, 0, 0);
    }

    return { lienzo, fijo: lienzo, cuadro, abrir, juntar, forma: () => forma.get(), total: () => n };
  }

  window.AgujeroParticulas = { crear };
})();
