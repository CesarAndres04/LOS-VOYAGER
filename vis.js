/* Un día-luz — visualizer de Los Voyagers.
   Audio: Web Audio (AnalyserNode) → bandas grave/medio/agudo, espectro en 32 bandas y detector de golpes.
   Fondo: un shader propio (WebGL 1) — neblina con deformación de dominio (fbm), anillo de espectro, ondas por golpe y estrellas.
   Datos reales de cada canción: tramos y colores (01_CONTENIDO/colores/paletas.json), letra con tiempos y BPM (EPK publicado). */
(() => {
  "use strict";

  const CANCIONES = {
    decidido: {
      titulo: "Decidido", src: "audio/decidido.mp3", bpm: 136, tono: "La menor", dur: 246.1, vozFin: 126.26,
      fondo: "#020001", frio: "#3765af", calido: "#b4279d",
      tramos: [["verso", 0, 25.44, "#6185bf"], ["coro", 25.44, 55.4, "#6a9ff3"], ["instrumental", 55.4, 68.86, "#bf24a6"], ["verso", 68.86, 84.64, "#668bc5"],
        ["pre-coro", 84.64, 96.32, "#829bc3"], ["coro", 96.32, 126.26, "#6da1f5"], ["instrumental", 126.26, 246.1, "#cc3ab3"]],
      letra: [[0, "Otra vez por aquí"], [7.56, "Enfrentándome a mi destino"], [14, "Siento que eres mucho para mí"], [20.9, "Temo se separen nuestros caminos"],
        [26.4, "Pero ya está decidido"], [33.4, "Pero ya está decidido"], [42.4, "Esto va más allá"], [45.2, "De mi comprensión"], [49.3, "La inestabilidad"],
        [52.5, "De tu falso amor"], [70.2, "Y ahora me ves así"], [73.7, "Peleándome para olvidarla"], [77.6, "Aunque una parte de mí"], [80.4, "Solo piensa en dejarla"],
        [85.0, "Yo sé que no tiene sentido"], [88.6, "Nada de lo que te digo"], [92, "A veces pienso aún en estar contigo"], [97.9, "Pero ya está decidido"],
        [105.0, "Pero ya está decidido"], [111.6, "Esto va más allá"], [116.1, "De mi comprensión"], [119.8, "La inestabilidad"], [124.0, "De tu falso amor"]],
      gravedad: [],
    },
    vuelvo: {
      titulo: "Vuelvo", src: "audio/vuelvo.mp3", bpm: 117.5, tono: "Mi mayor", dur: 188.8, vozFin: null,
      fondo: "#080906", frio: "#306397", calido: "#a26931",
      tramos: [["instrumental", 0, 11.54, "#cc8a4a"], ["verso", 11.54, 22.96, "#819bb7"], ["pre-coro", 22.96, 33.86, "#80a7d3"], ["gancho", 33.86, 43.64, "#989d9e"],
        ["coro", 43.64, 79.62, "#5fa3ea"], ["instrumental", 79.62, 142.62, "#af6f2e"], ["coro", 142.62, 175.72, "#65a9f0"], ["instrumental", 175.72, 188.8, "#a3682e"]],
      letra: [[11.54, "Siempre que vuelvo aquí"], [14.04, "Siento que no pertenezco"], [17.5, "Y sigo pensando en ti"], [19.5, "Que pensamiento tan molesto"], [23, "¿Por qué será?"],
        [25.8, "Que sigues en mi mente"], [28.6, "¿Por qué será?"], [31.2, "No importa cuanto intente siempre"], [33.9, "Vuelvo"], [35.1, "A tu cuerpo"], [37.7, "Que me amarra"],
        [41.5, "Y me desarma"], [43.6, "Habrá una razón"], [48.2, "Para amar así"], [53, "Otra vez"], [54.6, "Habrá alguna solución"], [59.4, "Para mi corazón"],
        [61.8, "Que ya no puede más"], [66, "Ya no creo que pueda intentar"], [72.2, "Amar sin confesar"], [77.0, "Que ya no puedo"], [79.6, ""], [142.6, "Habrá una razón"],
        [146.0, "Para amar así"], [148.3, "Otra vez"], [151.2, "Habrá alguna solución"], [155.4, "Para mi corazón"], [157.8, "Que ya no puede más"],
        [162.0, "Ya no creo que pueda intentar"], [168.3, "Amar sin confesar"], [173.0, "Que ya no puedo"], [175.7, ""]],
      // Asistencia gravitatoria: en estos momentos el cielo se curva (Júpiter y Saturno "amarraron" a la sonda y la lanzaron más lejos)
      gravedad: [33.9, 37.7, 59.4, 155.4],
    },
  };
  CANCIONES.decidido.letra.push([126.26, ""]);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const mezcla = (a, b, t) => a + (b - a) * t;

  /* ---------- Audio ---------- */
  const audio = $("#audio");
  let ctx, analizador, frec, pista = "decidido";
  const N = 32, espectro = new Float32Array(N), env = { g: 0, m: 0, a: 0 }, techo = { g: .3, m: .3, a: .3 };
  let mediaG = 0, ultimoGolpe = -9, golpe = 0;

  function iniciarAudio() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const fuente = ctx.createMediaElementSource(audio);
    analizador = ctx.createAnalyser();
    analizador.fftSize = 2048; analizador.smoothingTimeConstant = .72;
    fuente.connect(analizador); analizador.connect(ctx.destination);
    frec = new Uint8Array(analizador.frequencyBinCount);
  }
  const bin = hz => Math.min(frec.length - 1, Math.round(hz / (ctx.sampleRate / 2) * frec.length));
  function promedio(a, b) { let s = 0; const i0 = bin(a), i1 = Math.max(i0 + 1, bin(b)); for (let i = i0; i < i1; i++) s += frec[i]; return s / (i1 - i0) / 255; }

  // Si no suena nada (antes de sintonizar), el cielo late igual, al BPM de la canción elegida.
  function leer(t, dt) {
    const c = CANCIONES[pista];
    let g, m, a;
    if (analizador && !audio.paused) {
      analizador.getByteFrequencyData(frec);
      g = promedio(40, 160); m = promedio(300, 2000); a = promedio(3500, 11000);
      for (let i = 0; i < N; i++) { const f0 = 40 * Math.pow(300, i / N), f1 = 40 * Math.pow(300, (i + 1) / N); espectro[i] = mezcla(espectro[i], promedio(f0, f1), .5); }
    } else {
      const fase = (t * c.bpm / 60) % 1, pulso = Math.pow(1 - fase, 6);
      g = .22 + .3 * pulso; m = .25 + .08 * Math.sin(t * .7); a = .15 + .05 * Math.sin(t * 1.3);
      for (let i = 0; i < N; i++) espectro[i] = mezcla(espectro[i], (.35 + .25 * Math.sin(i * .55 + t * 1.6) * Math.sin(i * .21 - t * .8)) * (1 - i / N * .6) * (.6 + pulso * .6), .15);
    }
    // control automático de ganancia: cada banda se mide contra su propio techo reciente
    for (const [k, v] of [["g", g], ["m", m], ["a", a]]) {
      techo[k] = Math.max(v, techo[k] * (1 - dt * .15), .12);
      const n = Math.min(1, v / techo[k]);
      env[k] = n > env[k] ? mezcla(env[k], n, Math.min(1, dt * 18)) : mezcla(env[k], n, Math.min(1, dt * 4));
    }
    // golpe: el grave sube bastante sobre su media y pasó al menos medio pulso desde el anterior
    mediaG = mezcla(mediaG, env.g, Math.min(1, dt * 2.5));
    if (env.g > mediaG * 1.18 + .06 && t - ultimoGolpe > 30 / c.bpm) { ultimoGolpe = t; golpe = 1; onda(Math.min(1, env.g)); }
    golpe = Math.max(0, golpe - dt * 3.2);
  }

  /* ---------- WebGL ---------- */
  const lienzo = $("#cielo");
  const gl = lienzo.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FRAG = `
precision highp float;
uniform vec2 uRes,uCentro;uniform float uT,uG,uM,uA,uGolpe,uFin,uCurva,uOscuro,uRadio;
uniform vec3 uCol,uCal,uFri,uFondo;uniform float uEsp[32];uniform vec2 uOndas[6];
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n2(p);p=m*p;a*=.5;}return v;}
float esp(float x){float f=clamp(x,0.,1.)*30.;float a=0.,b=0.;for(int k=0;k<32;k++){float fk=float(k);if(fk==floor(f))a=uEsp[k];if(fk==floor(f)+1.)b=uEsp[k];}return mix(a,b,fract(f));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 d=uv-uCentro;
  float zoom=mix(1.,7.,uFin*uFin);d*=zoom;
  float r=length(d);
  float giro=uCurva*1.6*exp(-r*2.2);float cs=cos(giro),sn=sin(giro);d=mat2(cs,-sn,sn,cs)*d;
  vec2 p=(d+uCentro)*1.35;float t=uT*.035;
  vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
  vec2 w=vec2(fbm(p+(2.2+uG*2.4)*q+vec2(1.7,9.2)+.15*t),fbm(p+(2.2+uG*2.4)*q+vec2(8.3,2.8)-.12*t));
  float n=fbm(p+2.4*w);
  vec3 c=uFondo;
  c=mix(c,uFri*.85,smoothstep(.3,.9,n));
  c=mix(c,uCol*1.05,smoothstep(.42,.95,n*length(q)*1.5)*(.6+uM*.6));
  c+=uCal*pow(clamp(w.x*n*1.6,0.,1.),2.4)*(.6+uM*1.1);
  c+=uCol*pow(clamp(n-.45,0.,1.)*2.,3.)*.5*(1.+uG);
  c*=mix(1.,.08,uFin);
  float ang=atan(d.y,d.x);float x=abs(ang)/3.14159;
  float R=uRadio*(1.+.08*uGolpe)+esp(x)*.13;
  float anillo=.0016/(abs(r-R)+.0016)+.0009/(abs(r-uRadio*.62-esp(1.-x)*.05)+.002)*.6;
  c+=mix(uCol,vec3(1.),.35)*anillo*(.55+uA*.6)*(1.-uFin)*(1.-.85*uOscuro);
  for(int i=0;i<6;i++){float edad=uOndas[i].x;float fuerza=uOndas[i].y;if(fuerza>0.){float rad=uRadio+edad*.42;c+=uCol*fuerza*exp(-edad*1.1)*(.0025/(abs(r-rad)+.003))*(1.-uFin)*(1.-.85*uOscuro);}}
  vec2 gs=(uv+vec2(uT*.004,0.))*90.;vec2 id=floor(gs);float s=h(id);
  if(s>.986){vec2 o=fract(gs)-.5-(vec2(h(id+3.1),h(id+7.7))-.5)*.6;float b=.0025/dot(o,o)*.003;c+=vec3(.9,.92,1.)*b*(.5+.5*sin(uT*(1.+s*4.)+s*40.))*(.6+uA*.9);}
  float punto=uFin*(.0009/(r*r+.0009))*smoothstep(0.,.3,uFin);c+=vec3(.55,.7,1.)*punto;
  c*=1.-.55*smoothstep(.45,1.25,length(uv*vec2(.8,1.)));
  c*=mix(1.,.42,uOscuro);
  c+=(h(gl_FragCoord.xy+fract(uT)*91.)-.5)*.022;
  gl_FragColor=vec4(max(c,0.),1.);
}`;
  let U = {}, ok = false;
  function compilar() {
    if (!gl) return;
    const sh = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const k of ["uRes", "uCentro", "uT", "uG", "uM", "uA", "uGolpe", "uFin", "uCurva", "uOscuro", "uRadio", "uCol", "uCal", "uFri", "uFondo", "uEsp", "uOndas"]) U[k] = gl.getUniformLocation(pr, k);
    ok = true;
  }
  try { compilar(); } catch (e) { console.warn("Sin WebGL:", e); }
  // Respaldo sin WebGL (aceleración por hardware apagada, equipos viejos): el mismo cielo en Canvas 2D.
  const c2 = ok ? null : lienzo.getContext("2d");
  if (!ok) document.body.classList.add("sin-webgl");
  const ESTRELLAS = Array.from({ length: 170 }, () => [Math.random(), Math.random(), Math.random()]);
  const rgb = (v, a = 1) => `rgba(${v.map(x => Math.round(Math.min(1, x) * 255)).join(",")},${a})`;
  function dibujar2D(t, cx, cy, radio) {
    const W = lienzo.width, H = lienzo.height, X = x => W / 2 + x * H, Y = y => H / 2 - y * H;
    const z = 1 / (1 + 6 * fin * fin);
    c2.globalCompositeOperation = "source-over";
    c2.fillStyle = rgb(col.fondo); c2.fillRect(0, 0, W, H);
    // neblina: manchas grandes que se mueven lento y se inflan con el grave
    c2.globalCompositeOperation = "lighter";
    const manchas = [[col.fri, .9, .13, .55], [col.act, .7, .17, .42], [col.cal, .6, .11, .38], [col.fri, .5, .07, .6], [col.act, .4, .23, .3]];
    manchas.forEach(([c, a, v, r], i) => {
      const x = cx + Math.sin(t * v + i * 2.1) * .55 * z, y = cy + Math.cos(t * v * .8 + i * 1.3) * .32 * z;
      const rr = (r + env.g * .12) * H * z, g = c2.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), rr);
      g.addColorStop(0, rgb(c, (.32 + env.m * .2) * a * (1 - fin * .9))); g.addColorStop(1, rgb(c, 0));
      c2.fillStyle = g; c2.fillRect(0, 0, W, H);
    });
    // estrellas
    ESTRELLAS.forEach(([x, y, s]) => {
      const b = (.35 + .65 * (.5 + .5 * Math.sin(t * (1 + s * 4) + s * 40))) * (.5 + env.a * .8);
      c2.fillStyle = `rgba(230,235,255,${b * .8})`; c2.fillRect(((x * W + t * 4) % W), y * H, 1.4, 1.4);
    });
    const vivo = (1 - fin) * (1 - .85 * oscuro);
    if (vivo > .01) {
      // anillo de espectro + anillo interior
      const R = radio * (1 + .08 * golpe) * z, giro = curva * .9;
      c2.lineJoin = "round";
      for (const [ancho, alfa] of [[10, .08], [4, .18], [1.6, .9]]) {
        c2.beginPath();
        for (let k = 0; k <= 160; k++) {
          const ang = k / 160 * Math.PI * 2 - Math.PI, x = Math.abs(ang) / Math.PI;
          const f = x * 30, i = Math.floor(f), e = mezcla(espectro[Math.min(31, i)], espectro[Math.min(31, i + 1)], f - i);
          const r = (R + e * .13 * z) * H, a2 = ang + giro;
          const px = X(cx) + Math.cos(a2) * r, py = Y(cy) - Math.sin(a2) * r;
          k ? c2.lineTo(px, py) : c2.moveTo(px, py);
        }
        c2.strokeStyle = rgb(col.act.map(v => mezcla(v, 1, .35)), alfa * vivo * (.6 + env.a * .5)); c2.lineWidth = ancho * (H / 900); c2.stroke();
      }
      c2.beginPath(); c2.arc(X(cx), Y(cy), R * .62 * H, 0, Math.PI * 2); c2.strokeStyle = rgb(col.act, .35 * vivo); c2.lineWidth = 1.2 * (H / 900); c2.stroke();
      // ondas de cada golpe
      ondas.forEach(o => { if (o.edad < 6 && o.f > 0) { c2.beginPath(); c2.arc(X(cx), Y(cy), (radio + o.edad * .42) * z * H, 0, Math.PI * 2); c2.strokeStyle = rgb(col.act, o.f * Math.exp(-o.edad * 1.1) * .7 * vivo); c2.lineWidth = 2 * (H / 900); c2.stroke(); } });
    }
    // Decidido después de 2:06: queda un punto azul pálido
    if (fin > .05) { const g = c2.createRadialGradient(X(cx), Y(cy), 0, X(cx), Y(cy), 18 * (H / 900)); g.addColorStop(0, `rgba(160,190,255,${fin})`); g.addColorStop(1, "rgba(160,190,255,0)"); c2.fillStyle = g; c2.fillRect(0, 0, W, H); }
    c2.globalCompositeOperation = "source-over";
    const vin = c2.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, Math.max(W, H) * .75);
    vin.addColorStop(0, "rgba(0,0,0,0)"); vin.addColorStop(1, "rgba(0,0,0,.6)"); c2.fillStyle = vin; c2.fillRect(0, 0, W, H);
    if (oscuro > .01) { c2.fillStyle = `rgba(0,0,0,${oscuro * .58})`; c2.fillRect(0, 0, W, H); }
  }

  let escala = 1;
  function medir() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    escala = (innerWidth < 700 ? .55 : .7) * (gl ? 1 : .6); // el cielo es suave: se dibuja a menor resolución y se estira
    lienzo.width = Math.round(innerWidth * dpr * escala); lienzo.height = Math.round(innerHeight * dpr * escala);
    if (gl) gl.viewport(0, 0, lienzo.width, lienzo.height);
  }
  addEventListener("resize", medir); medir();

  const ondas = Array.from({ length: 6 }, () => ({ edad: 9, f: 0 }));
  let siguiente = 0;
  function onda(f) { ondas[siguiente] = { edad: 0, f: .4 + f * .6 }; siguiente = (siguiente + 1) % 6; }

  /* ---------- Estado visual que sigue a la canción ---------- */
  const col = { act: hex("#6185bf"), cal: hex("#b4279d"), fri: hex("#3765af"), fondo: hex("#020001") };
  const meta = { act: hex("#6185bf"), cal: hex("#b4279d"), fri: hex("#3765af"), fondo: hex("#020001") };
  let fin = 0, curva = 0, oscuro = 0, oscuroPuesto = -1;
  const velo = $("#oscurecer");

  function tramoEn(c, s) { return c.tramos.find(tr => s >= tr[1] && s < tr[2]) || c.tramos[c.tramos.length - 1]; }

  /* ---------- Interfaz ---------- */
  const elTramos = $("#tramos"), elTramo = $("#tramo"), elTiempo = $("#tiempo"), elFicha = $("#ficha"), elLetra = $("#letra"), elAntes = $("#antes"), elNotaFin = $("#notaFin");
  const elPanel = $("#panelLetra"), elLineas = $("#plLineas"), btnLetra = $("#verLetra");
  let cabezal, segPuesto = -1, notaPuesta = "", lineaActual = -1, tramoActual = null, iniciada = false, ultimaLinea = "", botonActual = null;
  const botonesLetra = new Map();

  function armarTramos() {
    const c = CANCIONES[pista];
    elTramos.innerHTML = c.tramos.map(tr => `<i style="flex:${(tr[2] - tr[1]).toFixed(2)};background:${tr[3]}" title="${tr[0]}"></i>`).join("") + '<span class="cabezal"></span>';
    cabezal = $(".cabezal", elTramos);
    elFicha.textContent = `${String(c.bpm).replace(".", ",")} BPM · ${c.tono}`;
    elTiempo.textContent = `0:00 / ${mmss(c.dur)}`;
    $$("[data-titulo]").forEach(e => e.textContent = c.titulo);
    document.body.dataset.cancion = pista;
    document.documentElement.style.setProperty("--bpm", c.bpm);
    meta.cal = hex(c.calido); meta.fri = hex(c.frio); meta.fondo = hex(c.fondo); meta.act = hex(c.tramos[0][3]);
    document.documentElement.style.setProperty("--cal", c.calido);
    document.documentElement.style.setProperty("--fri", c.frio);
    document.documentElement.style.setProperty("--bg", c.fondo);
    document.documentElement.style.setProperty("--acc", c.tramos[0][3]);
    lineaActual = -2; tramoActual = null; fin = 0; ultimaLinea = "";
    // panel con la letra completa: cada verso lleva a su segundo
    $("#plTitulo").textContent = `${c.titulo} · letra`;
    botonesLetra.clear(); botonActual = null;
    elLineas.innerHTML = c.letra.filter(l => l[1]).map(([t, x]) => `<li><button type="button" data-t="${t}">${x}</button></li>`).join("");
    $$("button", elLineas).forEach(b => botonesLetra.set(+b.dataset.t, b));
  }

  function cambiarPista(id, tocar) {
    if (id !== pista) {
      pista = id;
      audio.preload = "auto";
      audio.src = CANCIONES[id].src;
      audio.load();
      $$(".pistas button").forEach(b => b.setAttribute("aria-selected", b.dataset.pista === id));
      armarTramos();
      mostrarLetra(""); elLetra.classList.remove("pausa");
      vista(id); Fondo.cancion(id);
    }
    if (tocar) reproducir();
  }

  function reproducir() {
    iniciarAudio();
    if (!audio.src) audio.src = CANCIONES[pista].src;
    // Chrome deja el <audio> sin pedir el archivo si se cambia src con preload="none": se fuerza la carga
    if (audio.readyState === 0) { audio.preload = "auto"; audio.load(); }
    ctx.resume();
    audio.play().catch(e => console.warn("No se pudo reproducir:", e));
    if (!iniciada) { iniciada = true; try { if (innerWidth >= 1200 && localStorage.getItem("vis-letra") !== "0") abrirLetra(true); } catch { } }
    elAntes.hidden = true; elLetra.hidden = false;
    Fondo.activar(pista);
  }
  function pausar() { audio.pause(); }

  audio.addEventListener("play", () => { document.body.classList.add("sonando"); $("#play").setAttribute("aria-label", "Pausar"); });
  audio.addEventListener("pause", () => { document.body.classList.remove("sonando"); $("#play").setAttribute("aria-label", "Reproducir"); });
  audio.addEventListener("ended", () => cambiarPista(pista === "decidido" ? "vuelvo" : "decidido", true));

  $("#play").addEventListener("click", () => audio.paused ? reproducir() : pausar());
  $$(".pistas button").forEach(b => b.addEventListener("click", () => cambiarPista(b.dataset.pista, !audio.paused || !!ctx)));
  $$("[data-sintonizar]").forEach(b => {
    b.addEventListener("click", () => { cambiarPista(b.dataset.sintonizar, true); scrollTo({ top: 0, behavior: quieto ? "auto" : "smooth" }); });
    // al pasar por una tarjeta, el fondo de la portada cambia al de esa canción
    const id = b.dataset.sintonizar;
    ["mouseenter", "focus", "touchstart"].forEach(ev => b.addEventListener(ev, () => { if (!iniciada) vista(id); }, { passive: true }));
  });

  function ir(s) { audio.currentTime = s; lineaActual = -2; if (audio.paused) reproducir(); }
  function buscar(clientX) {
    const r = elTramos.getBoundingClientRect(), c = CANCIONES[pista];
    if (!audio.src) audio.src = c.src;
    ir(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * c.dur);
  }
  elTramos.addEventListener("click", e => buscar(e.clientX));
  elTramos.addEventListener("keydown", e => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime + (e.key === "ArrowRight" ? 5 : -5)); lineaActual = -2;
  });

  /* Letra completa: se abre desde la consola; cada verso lleva a su segundo */
  function abrirLetra(abrir) {
    elPanel.hidden = !abrir; btnLetra.setAttribute("aria-expanded", String(abrir));
    if (abrir && botonActual) centrar(botonActual, false);
  }
  btnLetra.addEventListener("click", () => { const abrir = elPanel.hidden; abrirLetra(abrir); try { localStorage.setItem("vis-letra", abrir ? "1" : "0"); } catch { } });
  $("#cerrarLetra").addEventListener("click", () => { abrirLetra(false); try { localStorage.setItem("vis-letra", "0"); } catch { } });
  elLineas.addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) ir(+b.dataset.t); });
  function centrar(b, suave) { elLineas.scrollTo({ top: b.offsetTop - elLineas.clientHeight / 2 + b.offsetHeight / 2, behavior: suave && !quieto ? "smooth" : "auto" }); }
  function resaltar(t) {
    const b = botonesLetra.get(t);
    if (!b || b === botonActual) return;
    botonActual && botonActual.removeAttribute("aria-current");
    b.setAttribute("aria-current", "true"); botonActual = b;
    if (!elPanel.hidden) centrar(b, true);
  }

  // La letra sube palabra por palabra desde una máscara; las palabras se mantienen enteras y cada una entra un poco después de la anterior.
  function mostrarLetra(texto) {
    const poner = () => {
      elLetra.classList.remove("sale");
      let k = 0;
      elLetra.innerHTML = texto.split(" ").map(p => `<span class="w"><span class="c" style="animation-delay:${(k++ * 70)}ms">${p}</span></span>`).join(" ");
    };
    if (elLetra.textContent.trim() && !quieto) { elLetra.classList.add("sale"); setTimeout(poner, 240); } else poner();
  }

  /* ---------- Fondo animado (módulo fondo.js) ----------
     El tiempo de la canción manda: la letra y el fondo salen de él. Todo lo que toca al video vive en fondo.js. */
  Fondo.iniciar({ audio });
  function vista(id) { Fondo.vista(id); }

  function sincronizar() {
    const c = CANCIONES[pista], s = audio.currentTime || 0;
    Fondo.sincronizar(s);
    const seg = Math.floor(s);
    if (seg !== segPuesto) {
      segPuesto = seg;
      elTramos.setAttribute("aria-valuenow", Math.round(s / c.dur * 100));
      elTiempo.textContent = `${mmss(s)} / ${mmss(c.dur)}`;
    }
    if (cabezal) cabezal.style.transform = `translateX(${(s / c.dur * elTramos.clientWidth).toFixed(1)}px)`;
    const tr = tramoEn(c, s);
    if (tr !== tramoActual) {
      tramoActual = tr; meta.act = hex(tr[3]);
      elTramo.textContent = tr[0];
      document.documentElement.style.setProperty("--acc", tr[3]);
      $$("i", elTramos).forEach((e, i) => e.classList.toggle("activo", c.tramos[i] === tr));
    }
    // Letra: la línea que se canta; en los instrumentales se queda la última, atenuada, para que nunca desaparezca
    let idx = -1;
    for (let i = 0; i < c.letra.length; i++) if (s >= c.letra[i][0]) idx = i;
    const despuesVoz = !!(c.vozFin && s > c.vozFin);
    if (idx !== lineaActual && iniciada) {
      lineaActual = idx;
      const l = idx >= 0 ? c.letra[idx] : null;
      if (l && l[1]) { ultimaLinea = l[1]; elLetra.classList.remove("pausa"); mostrarLetra(l[1]); resaltar(l[0]); }
      else if (ultimaLinea) elLetra.classList.add("pausa");
      else { elLetra.classList.remove("pausa"); mostrarLetra(c.titulo); }   // intro: el título, para que la pantalla nunca quede vacía
    }
    const enHueco = iniciada && (idx < 0 || !c.letra[idx][1]);
    const nota = !iniciada ? "" : despuesVoz ? "La letra termina aquí. Lo que sigue es la señal alejándose." : enHueco ? (idx < 0 ? "Intro instrumental" : "Instrumental") : "";
    if (nota !== notaPuesta) { notaPuesta = nota; elNotaFin.hidden = !nota; if (nota) elNotaFin.textContent = nota; }
    // Decidido: después de 2:06 no hay voz; la escena (canvas de respaldo) se aleja hasta quedar en un punto.
    fin = mezcla(fin, despuesVoz ? Math.min(1, (s - c.vozFin) / 40) : 0, .03);
    // Vuelvo: asistencia gravitatoria en los momentos marcados (canvas de respaldo)
    let g = 0;
    for (const m of c.gravedad) { const dt = s - m; if (dt > 0 && dt < 3.2) g = Math.max(g, Math.sin(dt / 3.2 * Math.PI)); }
    curva = mezcla(curva, g, .08);
  }

  /* ---------- Tipografía que respira con el grave ---------- */
  const elNombre = $("#nombre");
  let ultimoRespiro = 0, respiroPuesto = "";
  function respirar(ahora) {
    if (ahora - ultimoRespiro < 50) return;
    ultimoRespiro = ahora;
    const grande = !elLetra.hidden;
    const v = grande ? `"wght" ${Math.round((460 + env.g * 260 + env.m * 120) / 20) * 20}` : "";
    if (v === respiroPuesto) return;
    respiroPuesto = v;
    if (grande) elLetra.style.fontVariationSettings = v;
  }

  /* ---------- Bucle ---------- */
  let previo = performance.now(), t0 = previo, visible = true;
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; if (visible) { previo = performance.now(); requestAnimationFrame(cuadro); } });

  function centro() {
    const asp = innerWidth / innerHeight;
    return innerWidth < 960 ? [0, .2] : [Math.min(.55, asp * .5 - .42), .06];
  }

  function cuadro(ahora) {
    if (!visible) return;
    const dt = Math.min(.05, (ahora - previo) / 1000); previo = ahora;
    const t = (ahora - t0) / 1000;
    leer(t, dt);
    sincronizar();
    respirar(ahora);
    for (const k of ["act", "cal", "fri", "fondo"]) for (let i = 0; i < 3; i++) col[k][i] = mezcla(col[k][i], meta[k][i], Math.min(1, dt * 1.6));
    oscuro = mezcla(oscuro, Math.min(1, scrollY / (innerHeight * .9)), .12);
    document.body.classList.toggle("abajo", scrollY > innerHeight * .55);
    const oscuroQ = Math.round(oscuro * 50) / 50;
    if (oscuroQ !== oscuroPuesto) { oscuroPuesto = oscuroQ; velo.style.opacity = (oscuroQ * .7).toFixed(2); }
    ondas.forEach(o => o.edad += dt);
    const cubierto = document.body.classList.contains("cubierto");
    if (cubierto) { /* un video cubre el cielo: no se gasta GPU en el canvas */ }
    else if (ok) {
      const [cx, cy] = centro();
      gl.uniform2f(U.uRes, lienzo.width, lienzo.height);
      gl.uniform2f(U.uCentro, cx, cy);
      gl.uniform1f(U.uT, t); gl.uniform1f(U.uG, env.g); gl.uniform1f(U.uM, env.m); gl.uniform1f(U.uA, env.a);
      gl.uniform1f(U.uGolpe, golpe); gl.uniform1f(U.uFin, fin); gl.uniform1f(U.uCurva, curva); gl.uniform1f(U.uOscuro, oscuro);
      gl.uniform1f(U.uRadio, innerWidth < 960 ? .2 : .26);
      gl.uniform3fv(U.uCol, col.act); gl.uniform3fv(U.uCal, col.cal); gl.uniform3fv(U.uFri, col.fri); gl.uniform3fv(U.uFondo, col.fondo);
      gl.uniform1fv(U.uEsp, espectro);
      gl.uniform2fv(U.uOndas, ondas.flatMap(o => [o.edad, o.edad < 6 ? o.f : 0]));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (c2) {
      const [cx, cy] = centro();
      dibujar2D(t, cx, cy, innerWidth < 960 ? .2 : .26);
    }
    if (!quieto || !audio.paused) requestAnimationFrame(cuadro);
    else setTimeout(() => requestAnimationFrame(cuadro), 1500);
  }

  /* ---------- Datos de la misión ---------- */
  const T0 = Date.UTC(2026, 10, 18, 10, 16, 7), D0 = 25902e6, V = 17, C = 299792.458;
  const esp = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  function telemetria() {
    const d = D0 + (Date.now() - T0) / 1000 * V, s = d / C;
    $$("[data-voyager-km]").forEach(e => e.textContent = esp(d));
    $$("[data-voyager-luz]").forEach(e => e.textContent = `${Math.floor(s / 3600)} h ${String(Math.floor(s % 3600 / 60)).padStart(2, "0")} min`);
    $$("[data-mision-dias]").forEach(e => e.textContent = Math.floor((Date.now() - Date.UTC(2023, 9, 28, 5)) / 864e5));
  }
  telemetria(); setInterval(telemetria, 1000);

  // Trayectoria de la banda (la primera tocada sale del TikTok del 27-10-2023: "mañana primera tocada")
  const RUTA = [["2023-10-28", "Despegue", "Primera tocada · Lima"], ["2025-10-17", "Señal 1", "Sale «Vuelvo» + videoclip"], ["2026-07-04", "Sobrevuelo", "Bar El Dragón · Barranco"],
    ["2026-08-14", "Señal 2", "Sale «Decidido»"], ["2026-10-18", "Sobrevuelo", "Audición Suena La Noche · Music Market"], ["2026-11-13", "Sobrevuelo", "Escenario al aire libre · Lima"],
    ["2026-11-19", "Sobrevuelo", "Bar de noche · Lima"]];
  let previa = null;
  $("#ruta").innerHTML = RUTA.map(([f, tipo, que]) => {
    const d = new Date(f + "T12:00:00"), salto = previa ? `+${Math.round((d - previa) / 864e5)} d` : "T 0"; previa = d;
    return `<li><span class="salto m">${salto}</span><i aria-hidden="true"></i><span class="fecha m">${f.split("-").reverse().join(".")}</span><b>${tipo}</b><span class="que">${que}</span></li>`;
  }).join("") + [["T+∞", "Tu escenario", "Bares, festivales y ciclos en vivo · disponible"], ["25.902", "Presentación del EP", "Cinco canciones · fecha en órbita"]]
    .map(([cod, que, det]) => `<li class="futura"><span class="salto m">?</span><i aria-hidden="true"></i><span class="fecha m">${cod}</span><b>${que}</b><span class="que">${det}</span></li>`).join("");

  // Copiar bio
  $$("[data-copiar]").forEach(b => b.addEventListener("click", async () => {
    const aviso = $(".copiado");
    try { await navigator.clipboard.writeText($("#" + b.dataset.copiar).innerText); aviso.textContent = "Copiado"; } catch { aviso.textContent = "Selecciona y copia el texto"; }
    setTimeout(() => aviso.textContent = "", 2200);
  }));

  /* ---------- Animaciones con scroll (GSAP + ScrollTrigger) ---------- */
  if (window.gsap && window.ScrollTrigger && !quieto) {
    gsap.registerPlugin(ScrollTrigger);
    // Las fotos llegan fila por fila, como las imágenes que manda la sonda; al terminar quedan limpias.
    // Por defecto las fotos se ven; la "transmisión" solo corre la primera vez que entran en pantalla.
    $$(".foto .img").forEach(el => {
      el.dataset.estado = "Recibiendo señal…";
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter() {
        el.classList.add("transmite");
        el.addEventListener("animationend", () => { el.dataset.estado = "Recibida"; el.classList.add("recibida"); }, { once: true });
      } });
    });
    // Un solo momento de entrada: el nombre sube desde su máscara, línea por línea; los títulos de sección se destapan de abajo hacia arriba al llegar.
    // con la entrada abierta, el nombre espera: portal.js lo lanza al salir de ella
    const introNombre = gsap.from("#nombre span", { yPercent: 108, duration: 1.4, ease: "expo.out", stagger: .14, delay: .1, paused: document.documentElement.classList.contains("en-portal") });
    window.vgIntro = () => introNombre.play();
    $$(".sec .caja").forEach(c => gsap.from(c, { y: 48, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 92%", once: true } }));
    $$(".ruta li").forEach((li, i) => gsap.from(li.querySelector("i"), { "--trazo": 0, duration: .6, delay: i * .12, ease: "power2.out", scrollTrigger: { trigger: "#ruta", start: "top 80%" } }));
  } else {
    $$(".foto .img").forEach(el => { el.style.setProperty("--recibido", "100%"); el.style.setProperty("--etiqueta", 0); });
  }

  armarTramos();
  vista("decidido");
  // Enlace a un momento: index.html#vuelvo@59 abre «Vuelvo» en 0:59 (si el navegador deja, empieza a sonar)
  const momento = location.hash.match(/^#(decidido|vuelvo)(?:@(\d+(?:\.\d+)?))?$/);
  if (momento) {
    pista = ""; cambiarPista(momento[1], false);
    audio.preload = "auto";
    audio.addEventListener("loadedmetadata", () => { audio.currentTime = +(momento[2] || 0); reproducir(); }, { once: true });
    audio.load();
  }
  requestAnimationFrame(cuadro);
})();
