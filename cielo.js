/* El fondo de la entrada, armado con componentes animados con Motion. Toma como referencia el fondo de la imagen del
   agujero negro: negro profundo, velos de luz desenfocados con sus colores y bordes rojo y azul en cada brillo.

   Componentes (cada uno es una función que crea sus piezas y las anima):
     velos      nubes de luz muy tenues que respiran y derivan
     capas      tres profundidades de estrellas que se mueven con el cursor
     destellos  estrellas que titilan, con separación de color
     estelas    hilos de luz que cruzan siguiendo la inclinación del disco
     cruces     guiños de videojuego que parpadean a saltos
   Uso:  const c = Cielo.crear(elemento);  c.entrar();  c.salto();  c.reponer();
   Sin tarjeta gráfica se anima solo lo pequeño, para no restar fluidez. Con «menos movimiento», todo queda quieto. */
(function () {
  "use strict";
  if (!window.Motion) return;
  const { animate, stagger } = window.Motion;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ligero = (() => { try { const c = document.createElement("canvas"); return !(c.getContext("webgl2") || c.getContext("webgl")); } catch { return true; } })();

  let semilla = 1977;
  const az = (a = 0, b = 1) => { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; return a + (semilla / 4294967296) * (b - a); };
  const pieza = (padre, clase, estilo) => { const e = document.createElement("i"); e.className = clase; Object.assign(e.style, estilo || {}); padre.append(e); return e; };
  const ciclo = (duracion, extra) => Object.assign({ duration: duracion, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }, extra);

  // [x %, y %, ancho vmax, alto vmax, color, opacidad]
  const VELOS = [[16, 36, 70, 30, "60,120,110", .2], [30, 52, 46, 22, "190,110,30", .13], [74, 64, 64, 28, "40,70,170", .17], [86, 30, 40, 26, "110,50,120", .1]];
  function velos(raiz) {
    if (ligero) return [];                                   // sin tarjeta gráfica van pintados en la capa de estrellas
    return VELOS.map(([x, y, an, al, tono, op], i) => {
      const v = pieza(raiz, "velo", { left: x + "%", top: y + "%", width: an + "vmax", height: al + "vmax", marginLeft: -an / 2 + "vmax", marginTop: -al / 2 + "vmax",
        background: "radial-gradient(closest-side, rgba(" + tono + "," + op + "), rgba(" + tono + "," + op * .35 + ") 52%, rgba(" + tono + ",0))", rotate: "12deg" });
      if (!quieto && !ligero) animate(v, { x: [-30, 34], y: [-14, 18], scale: [.9, 1.14], opacity: [.65, 1] }, ciclo(19 + i * 5, { delay: -i * 4 }));
      return v;
    });
  }

  function capas(raiz) {
    // [cantidad por millón de px, tamaño máx., brillo, recorrido con el cursor]
    const DEF = [[420, 1.1, .5, 6], [150, 1.7, .75, 14], [34, 2.6, 1, 28]];
    // sin tarjeta gráfica, cielo y velos van en un único lienzo: una sola capa que componer
    const lienzos = (ligero ? DEF.slice(0, 1) : DEF).map(() => { const c = document.createElement("canvas"); c.className = "capa"; raiz.append(c); return c; });
    function pinta() {
      const w = Math.ceil(innerWidth * 1.1), h = Math.ceil(innerHeight * 1.1), d = ligero ? 1 : Math.min(devicePixelRatio || 1, 1.5);
      semilla = 1977;
      DEF.forEach(([densidad, tam, brillo], i) => {
        const c = lienzos[ligero ? 0 : i], g = c.getContext("2d", { alpha: !ligero });
        if (!ligero || i === 0) {
          c.width = w * d; c.height = h * d; g.setTransform(d, 0, 0, d, 0, 0);
          if (ligero) {
            g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
            const vmax = Math.max(innerWidth, innerHeight) / 100;
            for (const [x, y, an, al, tono, op] of VELOS) {
              g.save(); g.translate(w * x / 100, h * y / 100); g.rotate(.21); g.scale(an * vmax / 2, al * vmax / 2);
              const r = g.createRadialGradient(0, 0, 0, 0, 0, 1); r.addColorStop(0, "rgba(" + tono + "," + op + ")"); r.addColorStop(.52, "rgba(" + tono + "," + op * .35 + ")"); r.addColorStop(1, "rgba(" + tono + ",0)");
              g.fillStyle = r; g.fillRect(-1, -1, 2, 2); g.restore();
            }
          }
        }
        for (let k = Math.round(w * h / 1e6 * densidad); k > 0; k--) {
          const x = az(0, w), y = az(0, h), m = Math.pow(az(), 4), t = az(), s = .4 + m * tam;
          const tono = t < .4 ? "175,200,255" : t < .75 ? "255,255,255" : "255,205,160";
          if (m > .55) {                                    // las brillantes llevan su borde rojo y azul
            g.fillStyle = "rgba(255,70,40,.45)"; g.fillRect(x - 1, y, s, s); g.fillStyle = "rgba(50,100,255,.55)"; g.fillRect(x + 1, y, s, s);
          }
          g.fillStyle = "rgba(" + tono + "," + (brillo * (.14 + .75 * m)).toFixed(3) + ")"; g.fillRect(x, y, s, s);
        }
      });
    }
    pinta(); addEventListener("resize", pinta);
    if (!quieto && !ligero) {
      let espera = false;
      addEventListener("pointermove", e => {
        if (espera) return; espera = true;
        requestAnimationFrame(() => {
          espera = false;
          const mx = e.clientX / innerWidth - .5, my = e.clientY / innerHeight - .5;
          lienzos.forEach((c, i) => animate(c, { x: -mx * DEF[i][3] * 2, y: -my * DEF[i][3] * 1.4 }, { type: "spring", stiffness: 40, damping: 18 }));
        });
      }, { passive: true });
    }
    return lienzos;
  }

  function destellos(raiz) {
    return Array.from({ length: ligero ? 4 : 18 }, () => {
      const s = az(1.4, 3.2), d = pieza(raiz, "destello", { left: az(2, 98) + "%", top: az(3, 95) + "%", width: s + "px", height: s + "px" });
      if (!quieto) animate(d, { opacity: [.12, 1, .2], scale: [.7, 1.5, .8] }, { duration: az(2.6, 6.5), delay: az(0, 5), repeat: Infinity, repeatType: "mirror", ease: "easeInOut" });
      return d;
    });
  }

  function estelas(raiz) {
    if (quieto) return [];
    return [[8, 20, 0], [58, 78, 3.4], [66, 12, 6.8]].slice(0, ligero ? 2 : 3).map(([x, y, demora]) => {
      const e = pieza(raiz, "estela", { left: x + "%", top: y + "%", width: az(110, 220) + "px" });
      // cruza inclinada como el disco (12,6°) y descansa antes de volver
      animate(e, { x: [0, 260], y: [0, 58], opacity: [0, .9, 0], scaleX: [.3, 1, .5] }, { duration: 2.4, delay: 2 + demora, repeat: Infinity, repeatDelay: 8 + demora, ease: "easeInOut" });
      return e;
    });
  }

  function cruces(raiz) {
    return Array.from({ length: 7 }, (_, i) => {
      const c = pieza(raiz, "cruz" + (i % 2 ? " roja" : ""), { left: az(4, 94) + "%", top: az(6, 92) + "%" });
      if (!quieto) animate(c, { scale: [.55, .55, 1, 1, .8, .8], opacity: [.25, .25, .75, .75, .45, .45] },
        { duration: az(2.8, 4.6), times: [0, .33, .34, .66, .67, 1], delay: az(0, 3), repeat: Infinity, ease: "linear" });
      return c;
    });
  }

  function crear(raiz) {
    const grupos = [velos(raiz), capas(raiz), destellos(raiz), estelas(raiz), cruces(raiz)];
    return {
      ligero,
      entrar() {
        if (quieto) return;
        animate(raiz, { opacity: [0, 1] }, { duration: 1.6, ease: "easeOut" });
        if (!ligero) animate(grupos[1], { scale: [1.09, 1] }, { duration: 3.4, delay: stagger(.18), ease: [.16, 1, .3, 1] });
      },
      salto() {                                              // al entrar a la página, el cielo se abre y se apaga
        if (!ligero) animate(grupos[1], { scale: 1.35 }, { duration: 1.9, delay: stagger(.1), ease: [.55, 0, 1, .45] });
        animate(raiz, { opacity: 0 }, { duration: .8, delay: 1 });
      },
      reponer() { raiz.style.opacity = ""; if (!ligero) grupos[1].forEach(c => animate(c, { scale: 1 }, { duration: 0 })); }
    };
  }

  window.Cielo = { crear };
})();
