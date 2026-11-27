/* Ilustraciones del pasadizo, dibujadas con código en tinta negra sobre papel (grabado y cómic):
     PasadizoArte.lima(g, ancho)     el Centro de Lima: cerro, cúpula, balcones de cajón, portada, catedral, torre y palmeras
     PasadizoArte.equipo(g, ancho)   lo de la banda: parlantes, guitarra, bajo, batería, micrófono, tornamesa y discos
   Se dibuja en unidades propias, con el suelo en y = 0 y la altura hacia arriba en negativo. `ancho` va en esas unidades. */
(function () {
  "use strict";
  const T = "#17161a", P = "#ece8da", G = "#8d8a82", R = "#d9452f";
  let semilla = 7;
  const az = (a = 0, b = 1) => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return a + (semilla / 4294967296) * (b - a); };

  /* ---------- Herramientas de dibujo ---------- */
  const caja = (g, x, y, w, h, relleno, borde, an, radio) => {
    g.beginPath(); if (radio && g.roundRect) g.roundRect(x, y, w, h, radio); else g.rect(x, y, w, h);
    if (relleno) { g.fillStyle = relleno; g.fill(); } if (borde) { g.strokeStyle = borde; g.lineWidth = an || 2; g.stroke(); }
  };
  const circulo = (g, x, y, r, relleno, borde, an) => { g.beginPath(); g.arc(x, y, r, 0, 6.2832); if (relleno) { g.fillStyle = relleno; g.fill(); } if (borde) { g.strokeStyle = borde; g.lineWidth = an || 2; g.stroke(); } };
  const forma = (g, puntos, relleno, borde, an) => { g.beginPath(); puntos.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); if (relleno) { g.fillStyle = relleno; g.fill(); } if (borde) { g.strokeStyle = borde; g.lineWidth = an || 2; g.lineJoin = "round"; g.stroke(); } };
  const linea = (g, x1, y1, x2, y2, tono, an) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = tono; g.lineWidth = an || 2; g.lineCap = "round"; g.stroke(); };
  const arco = (g, x, y, w, h, relleno) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h + w / 2); g.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y); g.closePath(); g.fillStyle = relleno; g.fill(); };
  const texto = (g, s, x, y, tam, tono, ancho, giro) => { g.save(); g.translate(x, y); if (giro) g.rotate(giro); g.font = tam + "px Bangers, Audiowide, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = tono; g.fillText(s, 0, 0, ancho); g.restore(); };
  const pinaculo = (g, x, y, s) => { caja(g, x - 5 * s, y - 6 * s, 10 * s, 6 * s, T, P, 1.2); circulo(g, x, y - 14 * s, 8 * s, T, P, 1.4); linea(g, x, y - 22 * s, x, y - 34 * s, T, 2.4 * s); };
  const cornisa = (g, x, y, w) => { caja(g, x - 7, y - 8, w + 14, 8, T); linea(g, x - 5, y - 10.5, x + w + 5, y - 10.5, P, 1.6); caja(g, x - 3, y - 15, w + 6, 3, T); };
  const ventanas = (g, x, y, w, h, n, alto) => { const paso = w / n; for (let i = 0; i < n; i++) { const vx = x + i * paso + paso * .22, vw = paso * .56; arco(g, vx, y, vw, alto, P); linea(g, vx + vw / 2, y, vx + vw / 2, y - alto + vw / 2, T, 1.6); linea(g, vx, y - alto * .45, vx + vw, y - alto * .45, T, 1.6); linea(g, vx - 4, y + 3, vx + vw + 4, y + 3, P, 1.4); } };

  /* ---------- El Centro de Lima ---------- */
  function palmera(g, x, alto, lado) {
    g.beginPath(); g.moveTo(x - 9, 0); g.quadraticCurveTo(x - 5 + lado * 24, -alto * .55, x - 4 + lado * 30, -alto); g.lineTo(x + 5 + lado * 30, -alto); g.quadraticCurveTo(x + 9 + lado * 24, -alto * .55, x + 11, 0); g.fillStyle = T; g.fill();
    for (let y = 18; y < alto - 14; y += 15) { const k = y / alto, cx = x + lado * 30 * k * k; linea(g, cx - 6, -y, cx + 6, -y - 5, P, 1.4); }
    const cx = x + lado * 30, cy = -alto;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + i / 8 * Math.PI + az(-.12, .12), l = az(95, 150), mx = cx + Math.cos(a) * l * .55, my = cy + Math.sin(a) * l * .75 - 18, fx = cx + Math.cos(a) * l, fy = cy + Math.sin(a) * l * .45 + 26;
      g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my - 20, fx, fy); g.quadraticCurveTo(mx, my + 14, cx, cy + 6); g.fillStyle = T; g.fill();
      g.beginPath(); g.moveTo(cx, cy); g.quadraticCurveTo(mx, my - 4, fx, fy); g.strokeStyle = P; g.lineWidth = 1.5; g.stroke();
      for (let k = .22; k < .95; k += .085) { const qx = (1 - k) * (1 - k) * cx + 2 * (1 - k) * k * mx + k * k * fx, qy = (1 - k) * (1 - k) * cy + 2 * (1 - k) * k * (my - 4) + k * k * fy; linea(g, qx, qy, qx + Math.cos(a) * 11, qy + 13, P, .9); }
    }
    circulo(g, cx - 7, cy + 10, 8, T, P, 1.4); circulo(g, cx + 8, cy + 11, 8, T, P, 1.4);
  }
  function cerro(g, w) {
    g.beginPath(); g.moveTo(-20, 0); g.lineTo(-20, -120);
    for (let x = -20; x <= w + 20; x += 34) { const y = -150 - Math.sin(x / w * 5.2 + 1) * 55 - Math.sin(x / w * 13) * 20; g.quadraticCurveTo(x + 17, y - az(18, 34), x + 34, y); }
    g.lineTo(w + 20, 0); g.closePath(); g.fillStyle = T; g.fill();
    for (let i = w / 7; i > 0; i--) { const x = az(0, w), y = -az(30, 150); g.beginPath(); g.arc(x, y, az(4, 11), Math.PI * 1.05, Math.PI * 1.9); g.strokeStyle = P; g.lineWidth = 1.1; g.stroke(); }
    // casitas en la ladera
    for (let i = w / 55; i > 0; i--) { const x = az(0, w), y = -az(70, 160), a = az(14, 30); caja(g, x, y, a, 13, P, T, 1.5); caja(g, x + 3, y + 3, 4, 7, T); caja(g, x + a - 8, y + 3, 4, 7, T); }
  }
  function cupula(g, x) {
    caja(g, x - 150, -170, 300, 170, T, P, 2); cornisa(g, x - 150, -170, 300); ventanas(g, x - 138, -96, 276, 70, 6, 56); ventanas(g, x - 138, -16, 276, 60, 6, 52);
    caja(g, x - 92, -270, 184, 86, T, P, 2); ventanas(g, x - 84, -194, 168, 70, 5, 58); cornisa(g, x - 92, -270, 184);
    g.beginPath(); g.moveTo(x - 86, -286); g.bezierCurveTo(x - 90, -382, x - 38, -416, x, -418); g.bezierCurveTo(x + 38, -416, x + 90, -382, x + 86, -286); g.closePath(); g.fillStyle = T; g.fill(); g.strokeStyle = P; g.lineWidth = 2.5; g.stroke();
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * 25, -288); g.quadraticCurveTo(x + i * 22, -380, x, -418); g.strokeStyle = P; g.lineWidth = 1.5; g.stroke(); }
    for (const i of [-52, 0, 52]) circulo(g, x + i, -320, 7, P, T, 2);
    caja(g, x - 22, -462, 44, 40, T, P, 2); ventanas(g, x - 18, -426, 36, 30, 3, 26); cornisa(g, x - 22, -462, 44);
    g.beginPath(); g.moveTo(x - 20, -477); g.quadraticCurveTo(x, -520, x + 20, -477); g.fillStyle = T; g.fill(); linea(g, x, -498, x, -532, T, 4); circulo(g, x, -520, 5, T);
    for (const i of [-135, -105, 105, 135]) pinaculo(g, x + i, -185, 1.1);
  }
  function balcones(g, x) {
    caja(g, x - 115, -255, 230, 255, P, T, 4); caja(g, x - 125, -268, 250, 14, T);
    for (let i = -112; i < 115; i += 16) linea(g, x + i, -268, x + i + 8, -280, T, 3);
    // los dos balcones de cajón, con su celosía de madera
    for (const [bx, by, bw] of [[-106, -140, 104], [8, -158, 98]]) {
      caja(g, x + bx, by - 82, bw, 82, T, T, 3); caja(g, x + bx - 6, by - 92, bw + 12, 10, T);
      for (let i = 0; i < 4; i++) { const vx = x + bx + 5 + i * (bw - 10) / 4, vw = (bw - 10) / 4 - 4; caja(g, vx, by - 76, vw, 38, P); linea(g, vx + vw / 2, by - 76, vx + vw / 2, by - 38, T, 1.6); linea(g, vx, by - 58, vx + vw, by - 58, T, 1.6);
        caja(g, vx, by - 30, vw, 24, null, P, 1.4); linea(g, vx, by - 30, vx + vw, by - 6, P, 1); linea(g, vx + vw, by - 30, vx, by - 6, P, 1); }
      for (const i of [8, bw / 2, bw - 8]) forma(g, [[x + bx + i - 5, by], [x + bx + i + 5, by], [x + bx + i, by + 16]], T);
    }
    arco(g, x - 36, 0, 72, 104, T); linea(g, x, 0, x, -68, P, 1.6); for (const i of [-92, 62]) { caja(g, x + i, -92, 30, 62, T); linea(g, x + i + 15, -92, x + i + 15, -30, P, 1.5); }
  }
  function portada(g, x) {
    caja(g, x - 135, -215, 270, 215, T, P, 2.5); cornisa(g, x - 135, -215, 270);
    arco(g, x - 54, 0, 108, 178, P); for (const i of [-112, 80]) arco(g, x + i, 0, 34, 100, P);
    g.beginPath(); g.arc(x, -124, 66, Math.PI, 0); g.strokeStyle = P; g.lineWidth = 2; g.stroke();
    for (const i of [-124, -70, 66, 120]) { caja(g, x + i, -196, 4, 196, P); caja(g, x + i - 3, -198, 10, 6, P); }
    // el remate con volutas y escudo
    g.beginPath(); g.moveTo(x - 88, -230); g.bezierCurveTo(x - 80, -262, x - 44, -244, x - 34, -278); g.bezierCurveTo(x - 20, -312, x + 20, -312, x + 34, -278); g.bezierCurveTo(x + 44, -244, x + 80, -262, x + 88, -230); g.closePath(); g.fillStyle = T; g.fill(); g.strokeStyle = P; g.lineWidth = 2; g.stroke();
    circulo(g, x, -260, 20, P, T, 3); circulo(g, x, -260, 9, T);
    for (const s of [-1, 1]) { for (const [dx, r] of [[62, 14], [40, 9]]) { g.beginPath(); g.arc(x + s * dx, -240, r, 0, 4.7); g.strokeStyle = P; g.lineWidth = 1.8; g.stroke(); } pinaculo(g, x + s * 120, -230, 1.25); }
    pinaculo(g, x, -296, 1.1);
  }
  function torre(g, x, base, ancho, pisos, reloj) {
    let y = -base, w = ancho;
    caja(g, x - w / 2 - 8, y, w + 16, base, T, P, 2);
    pisos.forEach((h, i) => {
      caja(g, x - w / 2, y - h, w, h, T, P, 2); ventanas(g, x - w / 2 + 8, y - 10, w - 16, h, i ? 1 : 2, h - 24); cornisa(g, x - w / 2, y - h, w);
      for (const s of [-1, 1]) { caja(g, x + s * (w / 2 - 7) - 2, y - h + 4, 4, h - 6, P); pinaculo(g, x + s * (w / 2 + 2), y - h - 14, .8); }
      y -= h + 15; w *= .82;
    });
    if (reloj) { circulo(g, x, -base * .55, ancho * .19, P, T, 4); linea(g, x, -base * .55, x, -base * .55 - ancho * .13, T, 3); linea(g, x, -base * .55, x + ancho * .09, -base * .55 + 4, T, 3); }
    g.beginPath(); g.moveTo(x - w / 2 - 6, y); g.quadraticCurveTo(x - w * .3, y - 30, x - w * .13, y - 44); g.lineTo(x, y - 92); g.lineTo(x + w * .13, y - 44); g.quadraticCurveTo(x + w * .3, y - 30, x + w / 2 + 6, y); g.closePath(); g.fillStyle = T; g.fill(); g.strokeStyle = P; g.lineWidth = 2; g.stroke();
    for (const s of [-.28, 0, .28]) linea(g, x + s * w, y - 4, x + s * w * .25, y - 50, P, 1.3);
    linea(g, x, y - 92, x, y - 116, T, 4); linea(g, x - 8, y - 106, x + 8, y - 106, T, 3);
  }
  function catedral(g, x) {
    torre(g, x - 140, 150, 96, [84, 62]); torre(g, x + 140, 150, 96, [84, 62]);
    caja(g, x - 92, -200, 184, 200, T, P, 2.5); cornisa(g, x - 92, -200, 184);
    forma(g, [[x - 80, -216], [x, -272], [x + 80, -216]], T, P, 2.5); circulo(g, x, -234, 14, P, T, 3); linea(g, x, -272, x, -298, T, 5); linea(g, x - 10, -288, x + 10, -288, T, 4);
    ventanas(g, x - 80, -128, 160, 60, 5, 48); arco(g, x - 30, 0, 60, 104, P); arco(g, x - 20, 0, 40, 86, T); for (const i of [-72, 44]) arco(g, x + i, 0, 28, 70, P);
    for (const i of [-84, -46, 42, 80]) caja(g, x + i, -196, 4, 192, P);
  }
  function lima(g, w) {
    semilla = 11;
    const vertical = w < 1100;
    circulo(g, w * (vertical ? .83 : .79), vertical ? -640 : -600, 52, R);
    cerro(g, w);
    if (vertical) { cupula(g, w * .17); portada(g, w * .5); torre(g, w * .84, 180, 128, [104, 88, 66], true); palmera(g, w * .02, 330, 1); palmera(g, w * .99, 300, -1); }
    else { cupula(g, w * .17); balcones(g, w * .325); portada(g, w * .48); catedral(g, w * .665); torre(g, w * .87, 190, 134, [108, 92, 68], true); palmera(g, w * .045, 360, 1); palmera(g, w * .765, 250, 1); palmera(g, w * .975, 380, -1); }
  }

  /* ---------- Los equipos de la banda ---------- */
  function cono(g, x, y, r) {
    circulo(g, x, y, r, T, P, 3); circulo(g, x, y, r * .82, null, P, 1.5); circulo(g, x, y, r * .62, G); circulo(g, x, y, r * .6, null, T, 2);
    for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; linea(g, x + Math.cos(a) * r * .32, y + Math.sin(a) * r * .32, x + Math.cos(a) * r * .56, y + Math.sin(a) * r * .56, T, 1.1); }
    circulo(g, x, y, r * .28, T, P, 2); g.beginPath(); g.arc(x, y, r * .19, 3.4, 4.8); g.strokeStyle = P; g.lineWidth = 2.5; g.stroke();
    for (let i = 0; i < 4; i++) { const a = i * 1.5708 + .785; circulo(g, x + Math.cos(a) * r * .91, y + Math.sin(a) * r * .91, 2.6, P); }
  }
  function parlante(g, x, w, giro) {
    g.save(); g.translate(x, 0); g.rotate(giro || 0);
    const gabinete = (y, h) => { caja(g, -w / 2, y - h, w, h, T, T, 5, 10); caja(g, -w / 2 + 8, y - h + 8, w - 16, h - 16, null, P, 2.4, 6); for (const [cx, cy] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { const ex = cx * (w / 2 - 6), ey = cy ? y - 6 : y - h + 6; forma(g, [[ex - cx * 18, ey], [ex, ey], [ex, ey + (cy ? -18 : 18)]], P, T, 1.5); } };
    gabinete(0, w * 1.18);
    for (const cx of [-.23, .23]) for (const cy of [.31, .84]) cono(g, cx * w, -cy * w, w * .19);
    caja(g, -w * .19, -w * .6, w * .38, 20, P, T, 2); texto(g, "VOYAGER 1", 0, -w * .6 + 11, 17, T, w * .34);
    const top = -w * 1.18 - 4; gabinete(top, w * .47);
    caja(g, -w * .4, top - w * .4, w * .8, w * .17, P, T, 2); texto(g, "LOS VOYAGERS", 0, top - w * .312, w * .12, T, w * .72);
    for (let i = 0; i < 6; i++) { const k = -w * .34 + i * w * .136; circulo(g, k, top - w * .13, w * .042, P, T, 2); linea(g, k, top - w * .13, k + Math.cos(i * 1.4 - 2) * w * .035, top - w * .13 + Math.sin(i * 1.4 - 2) * w * .035, T, 2.4); }
    circulo(g, w * .43, top - w * .13, 4, R);
    g.beginPath(); g.moveTo(-w * .18, top - w * .47); g.quadraticCurveTo(0, top - w * .62, w * .18, top - w * .47); g.strokeStyle = T; g.lineWidth = 8; g.stroke();
    g.restore();
  }
  function cuerdas(g, x, alto, giro, bajo) {
    g.save(); g.translate(x, -8); g.rotate(giro); const s = alto / 400; g.scale(s, s);
    // pie
    linea(g, -52, 10, 0, -46, T, 7); linea(g, 52, 10, 0, -46, T, 7); linea(g, 0, -40, 0, -150, T, 7);
    // cuerpo de doble cuerno
    const cuerpo = () => { g.beginPath(); g.moveTo(-14, -168); g.bezierCurveTo(-34, -176, -46, -196, -56, -196); g.bezierCurveTo(-70, -194, -56, -162, -58, -140); g.bezierCurveTo(-62, -116, -90, -100, -88, -66); g.bezierCurveTo(-84, -20, -44, -8, 0, -10); g.bezierCurveTo(48, -8, 86, -24, 86, -64); g.bezierCurveTo(88, -98, 58, -108, 54, -132); g.bezierCurveTo(52, -148, 68, -170, 54, -176); g.bezierCurveTo(42, -178, 32, -164, 14, -162); g.closePath(); };
    cuerpo(); g.fillStyle = T; g.fill(); g.strokeStyle = T; g.lineWidth = 5; g.stroke();
    g.save(); cuerpo(); g.clip(); g.beginPath(); g.ellipse(0, -88, 74, 74, 0, 0, 7); g.strokeStyle = P; g.lineWidth = 2; g.setLineDash([2, 7]); g.stroke(); g.setLineDash([]); g.restore();
    forma(g, [[-18, -162], [22, -158], [44, -118], [60, -62], [44, -38], [10, -52], [-34, -58], [-42, -100], [-30, -122]], P, T, 2.5);
    for (const y of bajo ? [-108] : [-142, -104]) { caja(g, -31, y, 62, 22, P, T, 2.5, 4); for (let i = 0; i < (bajo ? 4 : 6); i++) { const k = -22 + i * (bajo ? 15 : 9); circulo(g, k, y + 7, 2.2, T); circulo(g, k, y + 15, 2.2, T); } }
    caja(g, -34, -66, 68, 14, G, T, 2.5, 3);
    for (const [kx, ky] of [[48, -52], [58, -30]]) { circulo(g, kx, ky, 9, G, T, 2.5); circulo(g, kx, ky, 4, P, T, 1.5); }
    // calcomanías
    g.save(); g.translate(-52, -44); g.rotate(-.3); circulo(g, 0, 0, 19, T, P, 2.5); texto(g, "LV", 0, 2, 24, P); g.restore();
    g.save(); g.translate(2, -27); g.rotate(.08); caja(g, -36, -9, 72, 18, P, T, 1.5); texto(g, "SIN RETORNO", 0, 1, 15, T, 66); g.restore();
    forma(g, [[-68, -104], [-52, -106], [-60, -88], [-48, -90], [-72, -62], [-64, -84], [-76, -82]], P);
    // mástil, trastes y clavijero
    const largo = bajo ? 262 : 222, tope = -160 - largo;
    forma(g, [[-13, -158], [-9, tope], [9, tope], [13, -158]], T, T, 3);
    for (let y = -172, paso = 19; y > tope + 4; y -= paso, paso *= .945) { linea(g, -11, y, 11, y, P, 1.7); if (((y / 19) | 0) % 3 === 0) circulo(g, 0, y + paso / 2, 2.4, P); }
    forma(g, [[-10, tope], [-20, tope - 26], [-16, tope - 66], [6, tope - 74], [20, tope - 52], [12, tope - 22], [10, tope]], T, T, 3);
    for (let i = 0; i < (bajo ? 4 : 6); i++) { const y = tope - 14 - i * (bajo ? 15 : 10); linea(g, -16, y, -30, y - 2, T, 3.5); circulo(g, -33, y - 2, 5, P, T, 2); }
    texto(g, "LV", 2, tope - 40, 20, P, 24, -1.5);
    for (let i = 0; i < (bajo ? 4 : 6); i++) { const k = -(bajo ? 6 : 7.5) + i * (bajo ? 4 : 3); linea(g, k * 2.3, -58, k * .8, tope, G, .9); }
    g.restore();
  }
  function plato(g, x, y, r, inclina) { linea(g, x, 0, x, y, T, 4); linea(g, x, -34, x - 28, 0, T, 4); linea(g, x, -34, x + 28, 0, T, 4); g.save(); g.translate(x, y); g.rotate(inclina); g.beginPath(); g.ellipse(0, 0, r, r * .17, 0, 0, 7); g.fillStyle = G; g.fill(); g.strokeStyle = T; g.lineWidth = 3; g.stroke(); g.beginPath(); g.ellipse(0, -1, r * .62, r * .1, 0, 0, 7); g.strokeStyle = P; g.lineWidth = 1.2; g.stroke(); circulo(g, 0, -4, 6, T); g.restore(); }
  function tambor(g, x, y, w, h) { caja(g, x - w / 2, y, w, h, T, T, 3, 4); for (let i = x - w / 2 + 14; i < x + w / 2; i += 22) { linea(g, i, y + 8, i, y + h - 8, P, 3); circulo(g, i, y + h / 2, 4, P, T, 1.5); } g.beginPath(); g.ellipse(x, y, w / 2, w * .1, 0, 0, 7); g.fillStyle = P; g.fill(); g.strokeStyle = T; g.lineWidth = 4; g.stroke(); caja(g, x - w / 2, y + h - 5, w, 5, P, T, 1.5); }
  function bateria(g, x) {
    g.save(); g.translate(x, 0);
    plato(g, -182, -228, 62, -.16); plato(g, 184, -246, 70, .14); plato(g, -128, -176, 40, 0); plato(g, -128, -186, 40, 0);
    tambor(g, -66, -258, 92, 62); tambor(g, 62, -264, 100, 66);
    linea(g, 152, 0, 140, -60, T, 4); tambor(g, 146, -128, 96, 78); linea(g, -142, 0, -128, -50, T, 4); tambor(g, -132, -112, 92, 44);
    // bombo
    const r = 112; circulo(g, 0, -r, r, T); circulo(g, 0, -r, r - 9, P, T, 3); circulo(g, 0, -r, r - 20, null, T, 2.5);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; caja(g, Math.cos(a) * (r - 5) - 5, -r + Math.sin(a) * (r - 5) - 5, 10, 10, P, T, 2); }
    // el planeta y el nombre en el parche
    circulo(g, 0, -r - 4, 27, T); g.save(); g.translate(0, -r - 4); g.rotate(-.28); g.beginPath(); g.ellipse(0, 0, 62, 13, 0, 0, 7); g.strokeStyle = T; g.lineWidth = 5; g.stroke(); g.restore(); g.beginPath(); g.arc(0, -r - 4, 19, 3.5, 4.7); g.strokeStyle = P; g.lineWidth = 3; g.stroke();
    texto(g, "LOS", 0, -r - 56, 30, T); texto(g, "VOYAGERS", 0, -r + 50, 40, T, 150);
    linea(g, -86, -34, -118, 2, T, 8); linea(g, 86, -34, 118, 2, T, 8);
    g.restore();
  }
  function microfono(g, x, alto) { linea(g, x, 0, x - 34, 2, T, 6); linea(g, x, -26, x + 34, 2, T, 6); linea(g, x, 0, x, -alto, T, 6); linea(g, x, -alto, x - 62, -alto - 34, T, 6); g.save(); g.translate(x - 72, -alto - 40); g.rotate(-1.05); caja(g, -8, 0, 16, 34, T, T, 2, 4); circulo(g, 0, -10, 18, G, T, 4); for (let i = -12; i <= 12; i += 6) { linea(g, i, -24, i, 4, T, 1); linea(g, -16, -10 + i, 16, -10 + i, T, 1); } g.restore(); g.beginPath(); g.moveTo(x - 66, -alto - 8); g.bezierCurveTo(x - 30, -alto + 70, x + 20, -alto * .45, x + 8, -4); g.strokeStyle = T; g.lineWidth = 3; g.stroke(); }
  function discos(g, x, w) {
    for (let i = 0; i < 9; i++) { const px = x - w / 2 + 6 + i * (w - 36) / 9; forma(g, [[px, -62], [px + 14, -134 + (i % 3) * 5], [px + 40, -128 + (i % 3) * 5], [px + 28, -62]], i % 2 ? T : P, T, 2.5); }
    g.save(); g.translate(x + 8, -134); g.rotate(-.05); caja(g, -52, -44, 104, 96, T, P, 3); circulo(g, 0, -4, 25, null, P, 3); circulo(g, 0, -4, 8, R); texto(g, "VUELVO", 0, 36, 24, P, 90); g.restore();
    caja(g, x - w / 2, -76, w, 76, P, T, 4); for (let i = x - w / 2 + 12; i < x + w / 2; i += 26) linea(g, i, -72, i, -4, G, 1.4); caja(g, x - 62, -52, 124, 30, T); texto(g, "DECIDIDO", 0 + x, -36, 24, P, 112);
  }
  function tornamesa(g, x) {
    caja(g, x - 118, -68, 236, 68, P, T, 4); for (let i = 0; i < 5; i++) circulo(g, x - 92 + i * 30, -26, 8, T, T, 2); caja(g, x + 56, -52, 50, 34, T); circulo(g, x + 70, -35, 8, null, P, 2); circulo(g, x + 93, -35, 8, null, P, 2); linea(g, x - 104, -50, x + 40, -50, T, 2.5);
    caja(g, x - 118, -122, 236, 50, T, T, 4); for (let i = 0; i < 11; i++) caja(g, x - 102 + i * 11, -108, 6, 22, P); circulo(g, x + 76, -98, 14, P, T, 3); circulo(g, x + 36, -98, 7, P);
    caja(g, x - 108, -150, 216, 24, P, T, 4); g.beginPath(); g.ellipse(x - 22, -154, 76, 15, 0, 0, 7); g.fillStyle = T; g.fill(); for (const r of [58, 40]) { g.beginPath(); g.ellipse(x - 22, -154, r, r * .19, 0, 0, 7); g.strokeStyle = G; g.lineWidth = 1.2; g.stroke(); } g.beginPath(); g.ellipse(x - 22, -154, 20, 4, 0, 0, 7); g.fillStyle = R; g.fill();
    circulo(g, x + 76, -156, 7, T); linea(g, x + 76, -158, x + 22, -168, T, 4); caja(g, x + 14, -172, 14, 8, T);
  }
  function cables(g, w) { semilla = 23; g.strokeStyle = T; g.lineCap = "round"; for (let i = 0; i < 6; i++) { const x = w * (.05 + i * .16); g.lineWidth = 4; g.beginPath(); g.moveTo(x, -az(6, 30)); g.bezierCurveTo(x + w * .05, az(2, 10), x + w * .08, -az(26, 52), x + w * .15, -az(2, 16)); g.stroke(); } }
  function equipo(g, w) {
    cables(g, w);
    if (w < 1100) { parlante(g, w * .115, 160); cuerdas(g, w * .275, 350, -.12); bateria(g, w * .57); cuerdas(g, w * .875, 390, .13, true); return; }   // en el celular, menos piezas y sin amontonar
    parlante(g, w * .075, 205, -.015); cuerdas(g, w * .185, 385, -.12); discos(g, w * .285, 215); bateria(g, w * .485); microfono(g, w * .645, 262); tornamesa(g, w * .715); cuerdas(g, w * .825, 420, .11, true); parlante(g, w * .925, 215, .015);
  }

  window.PasadizoArte = { lima, equipo };
})();
