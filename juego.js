/* juego.js · los detalles juguetones (v1).
   - Parte los títulos de sección en letras: entran saltando, saltan al pasar el cursor y, de vez en cuando, una salta sola.
   - Al tocar, salen chispas de colores, como las estrellas del cielo de la entrada.
   Todo es decoración: sin JS o con «reducir movimiento» la página se lee igual. */
(() => {
  "use strict";
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

  $$("h2").forEach(h => {
    const txt = h.textContent.trim().replace(/\s+/g, " ");
    h.setAttribute("aria-label", txt); h.textContent = "";
    txt.split(" ").forEach((p, i, a) => {
      const w = document.createElement("span"); w.className = "pal"; w.setAttribute("aria-hidden", "true");
      for (const c of p) { const s = document.createElement("span"); s.className = "ch"; s.textContent = c; w.appendChild(s); }
      h.appendChild(w); if (i < a.length - 1) h.appendChild(document.createTextNode(" "));
    });
  });
  if (quieto) return;

  if (window.gsap && window.ScrollTrigger) {
    $$("h2").forEach(h => gsap.from($$(".ch", h), { y: "1.1em", rotation: () => gsap.utils.random(-32, 32), scale: .2, opacity: 0, duration: .9, ease: "back.out(2.4)", stagger: .035,
      clearProps: "transform,opacity", scrollTrigger: { trigger: h, start: "top 90%", once: true } }));
  }

  // De vez en cuando, una letra de un título visible salta sola
  const visibles = new Set();
  const ob = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)), { threshold: .4 });
  $$("h2").forEach(h => ob.observe(h));
  setInterval(() => {
    const hs = [...visibles]; if (!hs.length || document.hidden) return;
    const cs = $$(".ch", hs[Math.floor(Math.random() * hs.length)]), c = cs[Math.floor(Math.random() * cs.length)];
    if (!c) return; c.classList.add("salta"); setTimeout(() => c.classList.remove("salta"), 700);
  }, 2600);

  // Chispas al tocar
  const colores = ["#ff5a2c", "#ffb36b", "#6a9ff3", "#d6329f", "#f1ece2"];
  addEventListener("pointerdown", e => {
    if (e.target.closest("#portal") || !window.gsap) return;
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span"); s.className = "chispa"; s.textContent = "✦"; s.style.left = e.clientX + "px"; s.style.top = e.clientY + "px"; s.style.color = colores[i % colores.length];
      document.body.appendChild(s); const a = Math.random() * 6.283, d = 30 + Math.random() * 40;
      gsap.to(s, { x: Math.cos(a) * d, y: Math.sin(a) * d, rotation: gsap.utils.random(-90, 90), scale: gsap.utils.random(.6, 1.4), opacity: 0, duration: .7, ease: "power2.out", onComplete: () => s.remove() });
    }
  }, { passive: true });
})();
