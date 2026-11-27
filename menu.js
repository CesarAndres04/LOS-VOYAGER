/* El menú al final del viaje: elegir Música o Fotos. Cada planeta se abre al acercarse y la sonda guía.
   El paso a cada sección usa la misma transición de cortinas. Música está en musica.js y Fotos en fotos.js. */
(function () {
  "use strict";
  const menu = document.getElementById("menu"); if (!menu || !window.Motion) return;
  const { animate } = window.Motion, quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const caja = menu.parentElement, seccion = caja.querySelector(".seccion");
  const op = [...menu.querySelectorAll(".m-opcion")], globo = menu.querySelector(".m-globo"), nave = menu.querySelector(".m-nave");
  const resorte = { type: "spring", stiffness: 190, damping: 17 };

  // La misma sonda de la entrada (con su recorte renombrado, para que no choque con la original)
  const original = document.querySelector(".pl-sonda .sonda");
  if (original) nave.innerHTML = original.outerHTML.replace(/id="plato"/g, 'id="plato-menu"').replace(/url\(#plato\)/g, "url(#plato-menu)").replace(/ style="[^"]*"/, "").replace('class="sonda"', 'class="sonda-menu"');

  const partes = op.map(b => {
    const dibujo = b.querySelector(".m-obj > svg"), cuerpo = b.querySelector(".m-obj"), cartas = [...b.querySelectorAll(".m-carta")], anillos = b.querySelectorAll(".m-anillo");
    let giro = null;
    if (!quieto) {
      if (dibujo.classList.contains("m-disco")) giro = animate(dibujo, { rotate: 360 }, { duration: 9, ease: "linear", repeat: Infinity });
      else animate(dibujo, { y: [-6, 6], rotate: [-2.5, 2.5] }, { duration: 5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" });
      animate(cuerpo, { y: [-8, 8] }, { duration: 4.5 + (b.dataset.lado > 0 ? 1 : 0), repeat: Infinity, repeatType: "mirror", ease: "easeInOut" });
    }
    return { cuerpo, cartas, anillos, giro };
  });
  // Al abrirse, las carátulas salen del disco y las fotos se abren en abanico
  const abanico = n => n === 2 ? [[-52, -44, -16], [54, -50, 14]] : [[-62, -34, -18], [2, -66, 3], [66, -30, 17]];
  function activar(i, si) {
    const p = partes[i], lado = si ? Number(op[i].dataset.lado) : 0;
    menu.classList.toggle("lado-musica", lado < 0); menu.classList.toggle("lado-fotos", lado > 0);
    p.cartas.forEach((c, k) => {
      const [x, y, r] = abanico(p.cartas.length)[k];
      animate(c, si ? { opacity: 1, x: x + "%", y: y + "%", rotate: r, scale: 1 } : { opacity: 0, x: "0%", y: "0%", rotate: 0, scale: .6 }, Object.assign({ delay: si ? k * .05 : 0 }, resorte));
    });
    animate(p.anillos, { opacity: si ? 1 : .45, scale: si ? 1.08 : 1 }, resorte);
    animate(p.cuerpo, { scale: si ? 1.08 : 1 }, resorte);
    if (p.giro) p.giro.speed = si ? 4 : 1;
    animate(nave, si ? { x: lado * (innerWidth < innerHeight ? 0 : 38), rotate: lado * 22 } : { x: 0, rotate: 0 }, resorte);
    globo.textContent = si ? (i ? "¡Mira quiénes somos!" : "¡Dale al volumen!") : "¡Elige tu planeta!";
    animate(globo, { scale: [.8, 1], rotate: [lado * -6, lado * -2] }, resorte);
  }
  const pasar = cambio => window.Transicion ? window.Transicion.pasar(cambio) : cambio();
  let ultimo = null;
  const esMusica = b => Number(b.dataset.lado) < 0;
  const quieto2 = v => { if (window.Pasadizo && window.Pasadizo.pausa) window.Pasadizo.pausa(v); };   // detrás de una sección no hace falta dibujar
  function cerrar() { if (window.Musica) window.Musica.cerrar(); if (window.Fotos) window.Fotos.cerrar(); seccion.hidden = true; menu.style.display = ""; quieto2(false); }
  const volver = () => pasar(() => { cerrar(); if (ultimo) ultimo.focus({ preventScroll: true }); });

  op.forEach((b, i) => {
    b.addEventListener("pointerenter", e => { if (e.pointerType !== "touch") activar(i, true); });
    b.addEventListener("pointerleave", e => { if (e.pointerType !== "touch") activar(i, false); });
    b.addEventListener("focus", () => { if (b.matches(":focus-visible")) activar(i, true); });
    b.addEventListener("blur", () => activar(i, false));
    b.addEventListener("click", () => pasar(() => {
      ultimo = b; activar(i, false); menu.style.display = "none"; quieto2(true);
      if (esMusica(b) && window.Musica) return window.Musica.abrir();
      if (!esMusica(b) && window.Fotos) return window.Fotos.abrir();
      seccion.querySelector("h2").textContent = b.dataset.titulo; seccion.hidden = false;
      seccion.querySelector("button").focus({ preventScroll: true });
    }));
  });
  seccion.querySelector("button").addEventListener("click", volver);
  // Dentro de una sección, la rueda y las teclas no mueven el viaje
  for (const tipo of ["wheel", "pointerdown", "keydown"]) seccion.addEventListener(tipo, e => e.stopPropagation(), { passive: true });

  window.Menu = { cerrar, volver };
})();
