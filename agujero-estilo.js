/* El agujero negro con el estilo de la imagen de referencia, dibujado y animado con código.
   Funciona igual con o sin tarjeta gráfica (Canvas 2D).

   Cómo está hecho:
   1. VUELTAS: cinco líneas cerradas, del borde del agujero hacia fuera, por donde corre la luz (suben sobre el agujero,
      se abren hacia las puntas y vuelven por delante). Entre ellas se arma una malla, una sola vez.
   2. PALETA: 25 × 52 colores medidos sobre la referencia (no es la imagen: son 1300 puntos de color).
   3. HEBRAS: una textura de rayas generada al azar que corre a lo largo de las líneas, más rápido por dentro.
      El rojo y el azul se leen un poco corridos: de ahí salen los bordes de arcoíris.
   La usa agujero.js; no se llama desde la página. */
(function () {
  "use strict";

  const VUELTAS = [
    [[478,326],[484,308],[505,278],[545,246],[601,233],[657,247],[699,283],[721,327],[724,377],[690,381],[630,371],[565,356],[512,340]],
    [[430,322],[455,298],[490,255],[537,222],[601,211],[670,226],[724,270],[767,330],[852,404],[772,414],[650,398],[560,377],[480,351]],
    [[330,300],[398,283],[462,245],[524,208],[601,196],[682,210],[742,258],[812,326],[950,422],[832,438],[665,420],[540,392],[412,346]],
    [[222,262],[318,254],[428,234],[514,198],[601,187],[692,203],[764,258],[862,334],[1062,440],[902,466],[690,449],[500,402],[326,328]],
    [[80,205],[250,188],[405,195],[502,178],[601,171],[712,190],[796,254],[935,336],[1185,482],[965,515],[720,492],[455,420],[200,300]]
  ];
  const PALETA = "z7y4ycXGpairbXJ4SE1TMDQ7Ki82KzA2IygsHSInKC0wMDU+O0BRMjlQLThWMD5nNkZ5L0OFKUaSKlCmLl63LFm3Klm9JlG6MGLJNGzMNm3NQ3nSRHXRTIPUd6DesL3mwr7axa67s5GQmm5liE9BhUQ4ej81dD8yd0MyeEAyeT8yfUI1gUY4gkg5ilA/k1lJllpJn2NRtn9syZ6Q7ezq8fHx3+Ljtbq8g4mOanF4YGhvWWFmT1ZaT1dbT1ZYYWhuXGNvUltuUV11Tl2AVmaOT2WbTHCsVIjDVZHSVpHWVJHaV5TcWpjhaqvmdrXrisHvmszyvOf45Pf7+f39/P7++Pr77efo18C9xZ+RtHlkn2NUkmZXj2VUl2hZm2xem2lanGtdn3BkpXdpqX5wrX5uuY59zaua4NHI8/n3+/37/P389Pb12t/gxs/SusbIs76/qbOwmqWekp6Rj5mLhpGIfYmHfIeIf5KUjJqjkaK1k7XGnszaqdnqq9vuseHwuOTzw+v3zPD32/b65/n89P39+/7+8fj57/j67PX27fbw7vf18vf37vDt4NrOwaaMlYJ9hIaNi4mTkIqWkYyZk4+dlpGgmZSjmZanpZyoubS41NTT5e3v6e/x8/j3+fz6+/z89fr54/T03e7p0+HUwcq2rLaem6aIkJl9ipF8h5SFkp2MoLKevMa4y9XPzuLd1e3p3fHx4PX15vj27Pr68v389v38+v79/f7+/v/++/799vv56vP28/b2+fv4+Pr28ff16PP01ejtssnJen9/T158TF6EUmORUWaWVGqYWGqbWWedYWqdenygpaa4xcnW2d/n4t/o7fL17fX28/j57vb32vHu1OTYy9W6t7iZnJ+Bh41wfYJnf39rhYp2mJmIsaydzMa02trL3+LX4ebh5unr6e/z8fX29fn6+fz8+/79/f7+///+/////v7+/v/9+vn8+fv6+vz69vjz9fDr6ebly83WlJmzWFxyOjdGOTJANzBHMzFQMzVSNjNUOzNVTEFgbF9olZCRta60zMfP0tDL5+Pm7vH06fL05fT13vLtztjIrK2LjYlme3hccW9cZ2RZZ2NacXNkiYR1n5GGu6WRyrSizLyuzMbBz9HV2+Dm6uzt8fT19vn3+/37///9///////////+/v7+/f39/v7+///+/v78/Pzz+PLg5NXDr4R+d0ZEaDMocDAdcC4caSkeYiYfZichZzAqcz84fVdLiHpwoZqUvLiyzcXF2NnP1tng5e7w6PX15PLvtr+phYhlg4BgdW5aVlFMQEE+Rkc+VVxJb29Zg39sno51r5qHr6KUrrClucO6zNfP3Ofd5/Dl8fXp+vvu/v34/v/9///+///+/v7+/v///v/////////+/v78/P7w9vPN3LWFwn5HvnM4xnIuxWkmulkfu1UgtVQjs1owrGFCmGBRiW1on4OCvKemzqWj5dLS0tXNzdjf7vLx1N/VmKB+iIRYi3hQclxGRz47KzIuMjsxTVlGY2tUcnRgi4Rxm5ODoZmQpZ6WrqOYv7Wlzcu73drK6ODN8+vW+/jt/f35/v77/v/9/v78/fz6/f7+/f/+/f7++/79+f739fzj7uS15MOC47pm5bNT6alH6KBB6J5C45hE3o5UwH5hmGdif2FjimhqpXyCrYZs5r+q4dPAysa55eXZysqlrqZoqINFlGk8gGBEUUZAOUdDSlxUZXJmc31qenlrioR7mZKGo46Ion95m3JoontssZmKxrGh0Lms28e58+Tb+fjr/fzv/f369/Hx7uzv8fr88fz+9Pz+8/z+8Pz87Pz06vfh4+W72deY089738Zo5Mdq6s1v68p247F4v5F8jG9oalpZXVJTdF9XeoJitZds47mMw7aXyruczriBzqxkqWo2gVg7dWROVlJKVXBneZB/l5+LmJqAloh2m4h+pox4rXtsnllWg0hEfEpGj2pgpYh6s5qKxbKj5NDB8eDI9uvZ+PTt2NTixNvi1Ovx0ur54PD85vf94Pb83vX54vTxyuHfsMOtpb2Mp7+FwMqL0deX29ie1sacuaOQh4N1W3BmUXJcbIFgfZetmaOd1rOH2K57y6Z32sCHyJNgiEstW0I2VVVIWV9VdpSFqbOWwLeUvKyFsJByrIZvsn1fqmFRiz9EYi04WTA7aktNhWxgnIh1sKOcybe30rm75M7D3trUqsLArca0tMKuscjTx9rv2O36zen6z+X12eTtusvZepWib5qNcKGRh66fl7yvs8i2w8KytaGbiIKFX3Z/ZXqEdIWeWnSNcpKjrb254cqr3r6Ny614lWZEY0IqQzgxS1FLa3lvlqSTua2Qyq+HxaJ2t4hisHpbqWhKkUtDYys3QyEwQCUzUDw/b11OjX5jnpyNrKyarp6M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";

  const X0 = 40, Y0 = 130, AN = 1170, AL = 410;           // recorte del lienzo de 1200 × 675 donde vive la luz
  const TF = 512, TC = 1024;                              // textura de hebras: filas (hacia fuera) × columnas (alrededor)
  const lim = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const suave = (a, b, x) => { const t = lim((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const cr = (a, b, c, d, t) => .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);

  function punto(q, k) {                                  // q: 0..4 hacia fuera · k: 0..13 alrededor
    const i = Math.floor(k), t = k - i;
    const en = (v, e) => { const p = VUELTAS[v]; return cr(p[(i + 12) % 13][e], p[i % 13][e], p[(i + 1) % 13][e], p[(i + 2) % 13][e], t); };
    const j = Math.min(Math.floor(q), 3), u = q - j, v = d => Math.max(0, Math.min(4, j + d));
    return [cr(en(v(-1), 0), en(v(0), 0), en(v(1), 0), en(v(2), 0), u), cr(en(v(-1), 1), en(v(0), 1), en(v(1), 1), en(v(2), 1), u)];
  }

  function hebras() {
    let semilla = 1977;
    const az = () => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return semilla / 4294967296; };
    const linea = n => { const a = Array.from({ length: n }, az); return x => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return a[((i % n) + n) % n] * (1 - s) + a[(((i + 1) % n) + n) % n] * s; }; };
    const fina = linea(512), media = linea(512), gruesa = linea(512);
    const ancho = 11, nubes = Array.from({ length: 64 * ancho }, az);
    const nube = (f, c) => {                              // manchas largas que se mueven; sin cortes al dar la vuelta
      const fi = Math.floor(f), ff = f - fi, ci = Math.floor(c), cf = c - ci;
      const v = (a, b) => nubes[((a % 64) * ancho + (b % ancho))];
      const s = cf * cf * (3 - 2 * cf);
      return (v(fi, ci) * (1 - s) + v(fi, ci + 1) * s) * (1 - ff) + (v(fi + 1, ci) * (1 - s) + v(fi + 1, ci + 1) * s) * ff;
    };
    const t = new Float32Array(TF * TC); let suma = 0;
    for (let f = 0; f < TF; f++) {
      const raya = .34 * fina(f * .34) + .42 * media(f * .135) + .24 * gruesa(f * .052);
      const filo = Math.pow(lim((raya - .22) * 1.75), 1.6);
      for (let c = 0; c < TC; c++) {
        const m = .62 * nube(f * .09, c / TC * ancho) + .38 * nube(f * .33 + 17, c / TC * ancho * 1 + 5.3);
        const v = (.18 + 2.1 * filo) * (.42 + 1.15 * m);
        t[f * TC + c] = v; suma += v;
      }
    }
    const k = (TF * TC) / suma; for (let i = 0; i < t.length; i++) t[i] *= k;   // promedio 1: no cambia el brillo
    return t;
  }

  // Líneas de flujo: para cada píxel del recorte, a qué línea pertenece (q) y en qué punto de ella cae (k)
  function lineas() {
    const mq = new Float32Array(AN * AL).fill(-1), mk = new Float32Array(AN * AL);
    const NQ = 150, NK = 520, xs = new Float32Array((NQ + 1) * (NK + 1)), ys = new Float32Array((NQ + 1) * (NK + 1));
    for (let a = 0; a <= NQ; a++) for (let b = 0; b <= NK; b++) { const p = punto(a / NQ * 4, b / NK * 13); xs[a * (NK + 1) + b] = p[0] - X0; ys[a * (NK + 1) + b] = p[1] - Y0; }
    const triangulo = (x1, y1, q1, k1, x2, y2, q2, k2, x3, y3, q3, k3) => {
      const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3); if (Math.abs(d) < 1e-6) return;
      const ix = Math.max(0, Math.floor(Math.min(x1, x2, x3))), fx = Math.min(AN - 1, Math.ceil(Math.max(x1, x2, x3)));
      const iy = Math.max(0, Math.floor(Math.min(y1, y2, y3))), fy = Math.min(AL - 1, Math.ceil(Math.max(y1, y2, y3)));
      for (let y = iy; y <= fy; y++) for (let x = ix; x <= fx; x++) {
        const px = x + .5, py = y + .5;
        const w1 = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / d, w2 = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / d, w3 = 1 - w1 - w2;
        if (w1 < -.002 || w2 < -.002 || w3 < -.002) continue;
        mq[y * AN + x] = w1 * q1 + w2 * q2 + w3 * q3; mk[y * AN + x] = w1 * k1 + w2 * k2 + w3 * k3;
      }
    };
    for (let a = NQ - 1; a >= 0; a--) for (let b = 0; b < NK; b++) {
      const i = a * (NK + 1) + b, j = i + NK + 1, q1 = a / NQ * 4, q2 = (a + 1) / NQ * 4, k1 = b / NK * 13, k2 = (b + 1) / NK * 13;
      triangulo(xs[i], ys[i], q1, k1, xs[i + 1], ys[i + 1], q1, k2, xs[j], ys[j], q2, k1);
      triangulo(xs[i + 1], ys[i + 1], q1, k2, xs[j + 1], ys[j + 1], q2, k2, xs[j], ys[j], q2, k1);
    }

    return { q: mq, k: mk, x0: X0, y0: Y0, an: AN, al: AL };
  }

  // La malla: para cada píxel con luz, su color, su fila y columna en la textura y cuánto se notan las rayas
  function malla() {
    const { q: mq, k: mk } = lineas();
    const bin = atob(PALETA), pal = i => bin.charCodeAt(i);
    let n = 0; for (let i = 0; i < mq.length; i++) if (mq[i] >= 0) n++;
    const donde = new Uint32Array(n), fila = new Uint16Array(n), col = new Uint16Array(n), rgb = new Float32Array(n * 3), filo = new Float32Array(n), fuera = new Float32Array(n);
    let m = 0;
    for (let i = 0; i < mq.length; i++) {
      const q = mq[i]; if (q < 0) continue;
      const k = mk[i], a = Math.min(23.999, q * 6), b = (k * 4) % 52, ai = a | 0, af = a - ai, bi = b | 0, bf = b - bi, bj = (bi + 1) % 52;
      const borde = 1 - suave(3.45, 3.99, q);
      for (let c = 0; c < 3; c++) {
        const v = (pal((ai * 52 + bi) * 3 + c) * (1 - bf) + pal((ai * 52 + bj) * 3 + c) * bf) * (1 - af) +
                  (pal(((ai + 1) * 52 + bi) * 3 + c) * (1 - bf) + pal(((ai + 1) * 52 + bj) * 3 + c) * bf) * af;
        rgb[m * 3 + c] = v * borde;
      }
      const gris = (rgb[m * 3] + rgb[m * 3 + 1] + rgb[m * 3 + 2]) / 3;
      for (let c = 0; c < 3; c++) rgb[m * 3 + c] = Math.max(0, gris + (rgb[m * 3 + c] - gris) * 1.32);
      // rayas marcadas a la izquierda y por dentro; a la derecha y en las puntas la luz está desenfocada
      const x = i % AN + X0, claro = (rgb[m * 3] + rgb[m * 3 + 1] + rgb[m * 3 + 2]) / 765;
      const foco = 1 - .78 * suave(720, 960, x), orilla = 1 - .8 * suave(2.5, 3.6, q), punta = 1 - .7 * suave(260, 110, x);
      filo[m] = .8 * foco * orilla * punta * (1 - .62 * suave(.78, .97, claro));
      donde[m] = i; fila[m] = Math.min(TF - 4, 2 + (q / 4 * (TF - 5)) | 0); col[m] = (k / 13 * TC) & (TC - 1); fuera[m] = q; m++;
    }
    return { n, donde, fila, col, rgb, filo };
  }

  function crear() {
    const t = hebras(), M = malla();
    const luz = document.createElement("canvas"); luz.width = AN; luz.height = AL;
    const lg = luz.getContext("2d"), im = lg.createImageData(AN, AL), d = im.data;
    const brillo = document.createElement("canvas"); brillo.width = AN >> 3; brillo.height = AL >> 3;
    const bg = brillo.getContext("2d");
    const corre = new Int32Array(TF);

    const borde = (g, q) => { g.beginPath(); for (let i = 0; i <= 156; i++) { const p = punto(q, i / 12); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); };

    function textura(reloj, fuerza) {
      for (let f = 0; f < TF; f++) corre[f] = (reloj * (150 - 105 * f / TF)) | 0;
      const { n, donde, fila, col, rgb, filo } = M;
      for (let m = 0; m < n; m++) {
        const f = fila[m], c = col[m], s = filo[m], j = m * 3, o = donde[m] * 4;
        // rojo, verde y azul leen filas vecinas: la separación de color de la referencia
        const r = t[(f + 2) * TC + ((c - corre[f + 2]) & 1023)], v = t[f * TC + ((c - corre[f]) & 1023)], a = t[(f - 2) * TC + ((c - corre[f - 2]) & 1023)];
        const R = rgb[j] * (1 + s * (r - 1)) * fuerza, G = rgb[j + 1] * (1 + s * (v - 1)) * fuerza, B = rgb[j + 2] * (1 + s * (a - 1)) * fuerza;
        // opaco donde hay luz y transparente donde es tenue: así el fondo se ve a través
        const tope = R > G ? (R > B ? R : B) : (G > B ? G : B), alfa = tope > 255 ? 255 : tope, k = alfa > 0 ? 255 / alfa : 0;
        d[o] = R * k; d[o + 1] = G * k; d[o + 2] = B * k; d[o + 3] = alfa;
      }
      // fuera de la malla queda transparente
      lg.putImageData(im, 0, 0);
      bg.clearRect(0, 0, brillo.width, brillo.height); bg.drawImage(luz, 0, 0, brillo.width, brillo.height);
    }

    // Dibuja en un contexto ya puesto en coordenadas del lienzo de 1200 × 675
    function pinta(g, s) {
      const { T, reloj, piezas, ener } = s;
      textura(T[0], piezas.disco.brillo * (1.04 + .35 * ener));
      g.globalCompositeOperation = "source-over"; g.fillStyle = "#000";
      borde(g, 0); g.fill(); g.beginPath(); g.arc(588, 385, 108, .12, Math.PI - .12); g.fill();
      g.globalCompositeOperation = "lighter";
      g.drawImage(luz, X0, Y0);
      g.globalAlpha = .1 + .03 * Math.sin(reloj * 1.1) + .3 * ener; g.drawImage(brillo, X0, Y0, AN, AL); g.globalAlpha = 1;
      g.lineCap = "butt";
      // filo azul sobre el agujero y filo rojo bajo él, con un destello que lo recorre
      const trazo = (desde, hasta, tono, ancho, salto) => {
        const p = punto(salto, desde % 13), q = punto(salto, hasta % 13), medio = punto(salto, (desde + hasta) / 2 % 13);
        const x0 = Math.min(p[0], q[0], medio[0]), x1 = Math.max(p[0], q[0], medio[0]), deg = g.createLinearGradient(x0, 0, x1, 0);
        for (let i = 0; i <= 8; i++) {
          const orillas = Math.pow(Math.sin(Math.PI * (i + .15) / 8.3), .5), vivo = .74 + .26 * Math.sin(i * 1.4 - T[1] * 2.6);
          deg.addColorStop(i / 8, "rgba(" + tono + "," + (orillas * vivo).toFixed(3) + ")");
        }
        g.strokeStyle = deg; g.lineWidth = ancho; g.beginPath();
        for (let i = 0; i <= 60; i++) { const r = punto(salto, (desde + (hasta - desde) * i / 60) % 13); i ? g.lineTo(r[0], r[1]) : g.moveTo(r[0], r[1]); }
        g.stroke();
      };
      const fa = piezas.arco.brillo;
      if (fa > 0) { g.globalAlpha = Math.min(1, fa); trazo(.4, 8.1, "20,60,255", 4.2, .02); trazo(.8, 7.6, "110,190,255", 1.4, .05); trazo(8.35, 12.8, "255,44,20", 2.2, .025); g.globalAlpha = 1; }
      // media luna inferior: tres filos de color
      const fl = Math.min(1, piezas.luna.brillo); if (fl > 0) {
        for (const [r, tono, ancho, al] of [[101.5, "255,70,20", 2.2, .95], [103.6, "255,190,60", 2, .85], [105.6, "60,200,150", 1.8, .6], [107.6, "30,60,255", 2.4, .8], [105, "120,110,140", 9, .16]]) {
          const deg = g.createLinearGradient(482, 0, 694, 0);
          for (let i = 0; i <= 10; i++) {
            const orillas = Math.pow(Math.sin(Math.PI * (i + .2) / 10.4), .8), vivo = .66 + .34 * Math.sin(i * 1.15 - T[2] * 2.2);
            deg.addColorStop(i / 10, "rgba(" + tono + "," + Math.min(1, al * fl * orillas * vivo * 1.35).toFixed(3) + ")");
          }
          g.strokeStyle = deg; g.lineWidth = ancho; g.beginPath(); g.arc(588, 385, r, .2, 2.82); g.stroke();
        }
      }
      g.globalCompositeOperation = "source-over";
    }

    return { pinta };
  }

  window.AgujeroEstilo = { crear, lineas };
})();
