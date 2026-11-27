/* Agujero negro hecho solo con código (sin fotos ni videos): se dibuja entero en cada cuadro.
   Uso:  const a = Agujero.crear(elemento, { energia: () => 0 });
         a.ajustar({ disco: { velocidad: 2 }, cielo: { brillo: .5 } });
         a.destruir();
   `encuadre(ancho, alto)` es opcional: decide dónde y de qué tamaño se dibuja.
   `energia` es opcional (0 a 1): si se le pasa el nivel del audio, la luz se aviva con la música.

   `mundo` es opcional: "agujero" (por defecto), "brasas", "vineta" u "oro" (planeta sólido que gira).

   Piezas programables (brillo y, si se mueve, velocidad). La geometría está en un lienzo de 1200 × 675:
   - cielo   Espacio profundo: tres capas de estrellas, nebulosas, banda de polvo y la luz curvada junto al agujero.
   - sombra  El agujero (siempre negro).
   - disco   Anillos de gas en órbita, más rápidos por dentro.
   - arco    La luz del disco de atrás, doblada por encima del agujero.
   - luna    La media luna de abajo.
   - cometas Destellos que dan la vuelta por delante y siguen por detrás.
   - polvo   Partículas en órbita 3D que se ocultan detrás del agujero.
   - arcade  Estrellas de píxeles, una fugaz cada tanto y líneas de pantalla.
   - camara  Vaivén 3D que sigue al cursor. */
(function () {
  "use strict";

  const CENTRO = [625, 345], INCL = .22, APL = .2;   // centro, inclinación (rad) y aplastamiento del disco
  const HUECO = [602, 358], RHUECO = 122;            // sombra del agujero
  const LUNA = [590, 385];                           // media luna inferior

  const PIEZAS = {
    disco: { brillo: 1, velocidad: 1 },
    arco: { brillo: 1, velocidad: 1 },
    luna: { brillo: 1, velocidad: 1 },
    cometas: { brillo: 1, velocidad: 1 },
    polvo: { brillo: 1, velocidad: 1 },
    planeta: { brillo: 1, velocidad: 1 },
    cielo: { brillo: 1 },
    arcade: { brillo: 1 },
    camara: { brillo: 1 }
  };

  const VS = `#version 300 es
  void main(){ vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2); gl_Position = vec4(p*2.-1., 0., 1.); }`;

  const FS = `#version 300 es
  precision highp float;
  uniform sampler2D azar;
  uniform vec2 res, cam;
  uniform vec3 vista;          // px de imagen por px de pantalla, y origen
  uniform vec4 tiempo;         // disco, arco, luna, cometas
  uniform vec4 fuerza;         // disco, arco, luna, cometas
  uniform vec3 otros;          // cielo, arcade, píxeles de dispositivo por px CSS
  uniform float reloj, ener, giro, brilloPlaneta;
  uniform int mundo;           // 0 agujero · 1 brasas · 2 viñeta · 3 disco de oro
  out vec4 sale;

  const vec2 C = vec2(${CENTRO[0]}., ${CENTRO[1]}.), H = vec2(${HUECO[0]}., ${HUECO[1]}.), L = vec2(${LUNA[0]}., ${LUNA[1]}.);
  const float INCL = ${INCL}, APL = ${APL}, TAU = 6.2831853;

  mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
  float hash(vec2 p){ vec3 q = fract(vec3(p.xyx)*.1031); q += dot(q, q.yzx + 33.33); return fract((q.x+q.y)*q.z); }
  // Ruido suave leído de una textura al azar (barato y sin cortes)
  float n2(vec2 x){ vec2 p = floor(x), f = fract(x); f = f*f*(3.-2.*f); return texture(azar, (p + f + .5)/256.).r; }
  float fbm(vec2 x){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a*n2(x); x = mat2(1.6, 1.2, -1.2, 1.6)*x + 3.1; a *= .5; } return v; }
  float campana(float x){ return exp(-x*x); }

  // Hebras de gas: cada anillo gira a su velocidad; se mezclan anillos vecinos para que no se enrosquen
  float hebra(float r, float a, float paso, float vel, float lob, float T){
    float x = r / paso, i = floor(x), f = smoothstep(0., 1., fract(x)), v[2];
    for (int k = 0; k < 2; k++) {
      float n = i + float(k), g = a - T * vel * pow(260. / max(n*paso, 90.), 1.25);
      v[k] = n2(vec2(cos(g), sin(g))*lob + mod(vec2(n*37.7, n*17.3), 256.));
    }
    return mix(v[0], v[1], f);
  }
  float cometa(float r, float a, float r0, float ancho, float fase){
    float d = mod(fase - a, TAU);
    return exp(-d*2.4) * smoothstep(0., .18, d) * campana((r - r0)/ancho);
  }

  // ---- Disco de acreción ----
  float disco(float r, float a){
    float env = smoothstep(101., 116., r) * (1. - smoothstep(400., 600., r));
    if (env <= 0.) return 0.;
    float T = tiempo.x;
    float f = hebra(r, a, 27., .75, 1.6, T)*.40 + hebra(r, a, 9.5, 1.0, 2.8, T)*.36 + hebra(r, a, 3.6, 1.35, 4.6, T)*.24;
    f = pow(clamp((f - .25)*2.15, 0., 1.35), 1.5)*1.6 + .17;
    float surcos = .52 + .48*smoothstep(.22, .62, n2(vec2(r/15., 3.5)));
    float base = .34 + 1.05*campana((r - 175.)/95.) + .66*campana((r - 330.)/135.);
    float doppler = .62 + .62*smoothstep(-.7, 1., cos(a - .45));
    float foco = campana((a - .42)/.55) * campana((r - 232.)/92.);
    return env * (base*f*surcos*doppler + foco*(.6 + .9*f));
  }
  // ---- Arco: la parte de atrás del disco, doblada por la gravedad ----
  float arco(float rh, float ah, float arriba){
    float ala = 1. - clamp(arriba, 0., 1.);                 // hacia los costados se abre y se funde con el disco
    float ancho = 50. + 30.*smoothstep(-.2, 1., cos(ah)) + 85.*ala*ala;
    float x = (rh - 123.)/ancho;
    if (x < -.1 || x > 1.4) return 0.;
    float T = tiempo.y;
    float f = hebra(rh + 400., ah, 15., 1.1, 1.8, T)*.38 + hebra(rh + 400., ah, 6., 1.5, 3., T)*.38 + hebra(rh + 400., ah, 2.8, 2.0, 5., T)*.24;
    f = pow(clamp((f - .25)*2.1, 0., 1.35), 1.5)*1.35 + .16;
    return smoothstep(-.03, .07, x) * (1. - smoothstep(.38, 1.3, x)) * (1.2 - .55*x) * f * smoothstep(-.38, .22, arriba);
  }

  // ---- Cielo: espacio profundo ----
  vec3 estrellas(vec2 s, float celda, float prob, float radio, float luz){
    vec2 id = floor(s/celda), f = s - id*celda;
    float h = hash(id + celda);
    if (h > prob) return vec3(0.);
    vec2 pos = (.15 + .7*vec2(hash(id + 7.1), hash(id + 13.7))) * celda;
    float m = pow(hash(id + 3.3), 3.);                       // pocas brillantes, muchas tenues
    float d = length(f - pos) / (radio*(.55 + m));
    float titila = .82 + .18*sin(reloj*(.6 + 2.*hash(id + 1.9)) + h*600.);
    float temp = hash(id + 9.2);
    vec3 col = temp < .5 ? mix(vec3(.62,.74,1.), vec3(1.), temp*2.) : mix(vec3(1.), vec3(1.,.72,.5), temp*2. - 1.);
    return col * (exp(-d*d*1.6) + m*.12*exp(-d*.9)) * (.12 + 1.1*m) * luz * titila;
  }
  vec3 cielo(vec2 s, vec2 tam){
    vec2 u = (s - tam*.5) / max(tam.x, tam.y);
    vec2 d = rot(.62)*u;
    float banda = campana((d.y + .05*sin(d.x*5.))/.17);
    vec2 q = u*3.2 + vec2(reloj*.004, 0.);
    float w = fbm(q + 11.);
    float gas = fbm(q*1.35 + w*1.8);
    float polvo = smoothstep(.42, .72, fbm(q*2.7 + w*2.3 + 31.));
    vec3 col = vec3(.0035, .004, .0085);
    col += vec3(.030, .040, .095) * pow(smoothstep(.3, .85, gas), 1.6);
    col += vec3(.085, .030, .022) * pow(smoothstep(.48, .9, fbm(q*.9 - w + 5.)), 2.);
    col += vec3(.006, .045, .050) * pow(smoothstep(.52, .92, fbm(q*1.7 + w + 19.)), 2.);
    col += vec3(.070, .062, .075) * banda * smoothstep(.25, .8, gas);
    col *= 1. - .78*polvo*banda;
    float limpio = 1. - .75*polvo*banda;
    col += estrellas(s + cam*2.,       9.,  .20 + .42*banda, .62, .42) * limpio;
    col += estrellas(s + cam*5. + 51., 31., .42,             .92, .85) * limpio;
    col += estrellas(s + cam*9. + 17., 117.,.46,             1.45, 1.35);
    return col;
  }
  // Toques de videojuego: cruces de píxeles que parpadean a saltos y una estrella fugaz
  vec3 pixeles(vec2 s, vec2 tam){
    vec3 col = vec3(0.);
    vec2 b = floor(s/3.), id = floor(b/46.), f = b - id*46.;
    float h = hash(id + 91.);
    if (h < .13) {
      vec2 pos = floor(8. + 30.*vec2(hash(id + 2.), hash(id + 4.)));
      vec2 d = abs(f - pos);
      float paso = mod(floor(reloj*2.2 + h*90.), 7.);
      float brazo = paso < 1. ? 2. : paso < 3. ? 1. : 0.;
      float on = step(min(d.x, d.y), .1) * step(max(d.x, d.y), brazo + .1);
      vec3 tono = hash(id + 6.) < .5 ? vec3(.45,.85,1.) : vec3(1.,.5,.38);
      col += tono * on * (.2 + .17*brazo);
    }
    float turno = floor(reloj/9.), k = fract(reloj/9.)*6.;
    if (k < 1.) {
      vec2 de = vec2(.12 + .7*hash(vec2(turno, 1.)), .05 + .3*hash(vec2(turno, 2.))) * tam;
      vec2 dir = normalize(vec2(hash(vec2(turno, 3.)) < .5 ? -1. : 1., .45));
      vec2 pp = (floor(s/3.) + .5)*3. - (de + dir*k*tam.x*.3);
      float largo = -dot(pp, dir), lado = abs(dot(pp, vec2(-dir.y, dir.x)));
      if (largo > 0. && largo < 90. && lado < 2.2) col += vec3(.75,.88,1.) * floor((1. - largo/90.)*5.)/5. * sin(k*3.1416);
    }
    return col;
  }

  // ---- Planeta sólido (mundos 1 a 3) ----
  float n3(vec3 x){ float i = floor(x.z), f = fract(x.z); f = f*f*(3.-2.*f);
    return mix(n2(x.xy + mod(vec2(37.,17.)*i, 256.)), n2(x.xy + mod(vec2(37.,17.)*(i+1.), 256.)), f); }
  float fbm3(vec3 x){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a*n3(x); x = x*2.03 + vec3(3.1, 1.7, 5.3); a *= .5; } return v; }
  vec3 planeta(vec2 dh){
    const float R = 122.;
    vec2 u = dh / R; float z = sqrt(max(0., 1. - dot(u, u)));
    vec3 nor = vec3(u.x, -u.y, z);                               // normal de la esfera
    vec3 q = nor; q.xy = rot(.34) * q.xy; q.yz = rot(-.28) * q.yz;      // eje inclinado
    q.xz = rot(giro*.16) * q.xz;                                 // gira sobre su eje
    float lat = asin(clamp(q.y, -1., 1.)), lon = atan(q.x, q.z);
    vec3 sol = normalize(vec3(.72, -.22, .52));                  // la luz llega del lado brillante del disco
    float luz = clamp(dot(nor, sol), 0., 1.), canto = pow(1. - z, 3.2);
    if (mundo == 1) {                                            // Brasas: roca oscura que todavía arde por dentro
      float w = fbm3(q*2.2);
      float h = fbm3(q*3.4 + w*1.6);
      float grieta = pow(1. - smoothstep(0., .075, abs(fbm3(q*4.1 + w*2.4 + 7.) - .5)), 1.6) * smoothstep(.38, .66, fbm3(q*1.5 + 21.));
      float late = .7 + .3*sin(reloj*1.5 + w*14.) + 1.2*ener;
      vec3 col = mix(vec3(.018,.014,.018), vec3(.20,.15,.15), smoothstep(.3,.75,h)) * (.14 + 1.25*luz);
      col += mix(vec3(1.,.16,.02), vec3(1.,.72,.25), grieta) * grieta * late * 1.15;
      float nube = smoothstep(.52, .8, fbm3(q*vec3(1.6,5.,1.6) + vec3(reloj*.03, 0., 0.) + 40.));
      col = mix(col, vec3(.34,.30,.36)*(.1 + luz), nube*.38);
      col += canto * (vec3(1.,.5,.25)*smoothstep(-.1,.9,dot(nor.xy, sol.xy))*1.5 + vec3(.12,.2,.55)*.8);
      return col * brilloPlaneta;
    }
    if (mundo == 2) {                                            // Viñeta: solo tinta, para que dialogue con la sonda
      float h = fbm3(q*2.6 + fbm3(q*5.)*.8);
      float tono = luz*.72 + (smoothstep(.44,.56,h) - .5)*.55 + .03;
      float banda = step(.9, fract(lat*5.2 + fbm3(q*3.)*1.4));
      vec3 c = vec3(smoothstep(.1, .9, tono) - banda*.35);
      c = max(c, vec3(smoothstep(.07, .1, canto) * step(.05, dot(nor.xy, sol.xy))));   // filo blanco
      return clamp(c, 0., 1.) * brilloPlaneta;
    }
    // Disco de oro: surcos que giran y el mapa de rayos grabado, como el disco que lleva la Voyager
    vec3 g = vec3(q.x, q.z, -q.y);
    float polar = acos(clamp(g.z, -1., 1.)), ang = atan(g.y, g.x);
    float surco = .5 + .5*sin(polar*150. + n3(q*9.)*1.6);
    float pista = smoothstep(.25,.75, n2(vec2(polar*21., 5.)));
    float spec = pow(clamp(dot(reflect(-sol, nor), vec3(0.,0.,1.)), 0., 1.), 14.);
    vec3 col = vec3(.86,.58,.2) * (.22 + 1.05*luz) * (.66 + .34*surco) * (.75 + .35*pista);
    // 14 rayos desde un punto de la superficie, con marcas a saltos
    vec3 foco = normalize(vec3(.35, .25, .9)); if (dot(q, foco) < 0.) foco = -foco; vec3 ex = normalize(cross(vec3(0.,1.,0.), foco)), ey = cross(foco, ex);
    float dist = acos(clamp(dot(q, foco), -1., 1.)), rumbo = atan(dot(q, ey), dot(q, ex));
    float k = floor((rumbo + 3.14159) / TAU * 14.), centroK = (k + .5)/14.*TAU - 3.14159;
    float largo = .35 + .75*hash(vec2(k, 8.));
    float linea = (1. - smoothstep(.004, .009, abs(rumbo - centroK)*sin(dist))) * step(.07, dist) * step(dist, largo);
    linea *= .45 + .55*step(.35, fract(dist*23. + k*.37));
    float aro = 1. - smoothstep(.004, .01, min(abs(dist - .07), abs(dist - 1.22)));
    float pulso = campana((dist - fract(reloj*.22)*1.35)/.05);       // un pulso recorre los rayos
    col = mix(col, vec3(.09,.045,.01), clamp(linea + aro, 0., 1.)*.85);
    col += vec3(1.,.9,.62) * (linea + aro) * pulso * (1.1 + ener);
    col += vec3(1.,.88,.6)*spec*(.35 + .4*surco) + canto*vec3(1.,.62,.2)*.9;
    return col * brilloPlaneta;
  }

  void main(){
    vec2 frag = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y);
    vec2 css = frag / otros.z, tam = res / otros.z;
    vec2 p = frag * vista.x + vista.yz;
    float esc = vista.x * otros.z;                            // px de imagen por px CSS

    // Cámara 3D: lo de adelante se desplaza más que lo del fondo
    vec2 q0 = rot(-INCL) * (p - C);
    float prof = clamp(q0.y / 95., -1., 1.) * smoothstep(60., 300., length(vec2(q0.x, q0.y/APL)));
    p -= cam * (6. + 20.*prof);

    vec2 q = rot(-INCL) * (p - C);
    vec2 e = vec2(q.x, q.y / APL);
    float r = length(e), a = atan(e.y, e.x);
    vec2 dh = p - H; float rh = length(dh), ah = atan(dh.y, dh.x);
    float arriba = dot(dh, vec2(sin(INCL), -cos(INCL))) / max(rh, 1.);
    vec2 dl = p - L; float rl = length(dl), al = atan(dl.y, dl.x);

    float sombra = max(smoothstep(125., 119., rh), smoothstep(104., 97., rl) * smoothstep(380., 420., p.y));

    // El cielo se curva cerca del agujero (lente gravitatoria)
    float lente = 1. - (150.*150.) / max(rh*rh, 150.*60.);
    vec2 sc = css + (dh*(lente - 1.)) / esc;
    vec3 fondo = cielo(sc, tam) * otros.x;
    fondo += pixeles(css, tam) * otros.y * smoothstep(190., 330., min(rh, r));
    vec3 col = fondo * (1. - sombra);

    // Disco: la mitad de atrás se esconde tras la sombra; la de adelante pasa por encima
    float delante = smoothstep(-.04, .14, sin(a));
    float ve = max(delante, smoothstep(119., 140., rh));
    vec3 d;
    for (int j = 0; j < 3; j++) d[j] = disco(r + (float(j) - 1.)*3.6, a) * ve;     // leve separación de color
    if (mundo > 0) d *= mix(.07, 1., smoothstep(128., 235., r));
    float n = n2(vec2(r/21., 9.5)), n3 = n2(vec2(r/8.5, 27.5));
    float izq = smoothstep(.35, -.75, cos(a));
    vec3 calido = mix(vec3(1.,.36,.07), vec3(1.,.76,.26), smoothstep(.3,.7,n));
    calido = mix(calido, vec3(.9,.16,.55), smoothstep(.62,.8,n3));
    vec3 frio = mix(vec3(.18,.36,1.), vec3(.42,.86,.92), smoothstep(.3,.7,n));
    frio = mix(frio, vec3(1.,.55,.2), smoothstep(.58,.78,n3));
    vec3 tono = mix(frio, calido, izq);
    float calor = clamp(campana((r - 165.)/105.)*(1. - .6*izq) + campana((a - .42)/.6)*campana((r - 235.)/105.), 0., 1.);
    calor *= .55 + .45*smoothstep(.2,.7,n3);
    vec3 cDisco = mix(tono*1.18, vec3(1.,.97,.93), calor) * d * fuerza.x;

    // El planeta sólido ocupa el lugar de la sombra; el disco de adelante pasa por encima
    if (mundo > 0) {
      float cuerpo = smoothstep(123.2, 121.4, rh);
      if (cuerpo > 0.) col = mix(col, planeta(dh), cuerpo);
      sombra = cuerpo;
    }
    // Arco de arriba
    vec3 ar;
    for (int j = 0; j < 3; j++) ar[j] = arco(rh + (float(j) - 1.)*2.2, ah, arriba);
    float x = clamp((rh - 123.)/80., 0., 1.);
    vec3 iris = .55 + .45*cos(TAU*(vec3(0.,.33,.67) + n2(vec2(rh/9., 41.5))*1.3));
    vec3 cArco = ar * mix(vec3(1.,.97,.95), iris*1.15, smoothstep(.3, .95, x)) * fuerza.y;
    cArco += vec3(.12,.28,1.) * campana((rh - 123.)/2.6) * smoothstep(-.2,.5,arriba) * .85 * fuerza.y;

    // Media luna de abajo
    float vivo = .45 + 1.1*hebra(rl + 800., al, 4.5, 1.8, 2.4, tiempo.z);
    float filo = campana((rl - 102.)/2.8) + .28*campana((rl - 108.)/8.);
    float bajo = smoothstep(398., 455., p.y);
    vec3 cLuna = mix(vec3(1.,.46,.12), vec3(.2,.5,1.), smoothstep(99., 107., rl)) * filo * vivo * bajo * fuerza.z * .95;

    if (mundo > 0) { cArco *= .07; cLuna *= 0.; }   // con planeta, la luz doblada queda como atmósfera
    // Destellos que dan la vuelta (delante en el disco, detrás en el arco)
    float com = 0., comA = 0.;
    for (int i = 0; i < 5; i++) {
      float m = float(i), r0 = 165. + m*66., fase = tiempo.w*(1.55 - m*.2) + m*2.4;
      com  += cometa(r,  a,  r0,        14. + m*5., fase);
      comA += cometa(rh, ah, 133. + m*12., 7.,      fase);
    }
    cDisco += (cDisco*1.5 + vec3(.05,.045,.07)*smoothstep(.02,.3,d.g)) * com * fuerza.w * (.9 + ener);
    cArco  += cArco * comA * fuerza.w * (1.1 + ener);

    float tapa = clamp(d.g*1.15, 0., .93) * delante;
    vec3 luz = cDisco + (cArco + cLuna*(1. - smoothstep(.05,.45,d.g))) * (1. - tapa);
    // Resplandor alrededor
    luz += (vec3(.075,.06,.085)*campana((r - 215.)/190.) * ve + vec3(.09,.085,.11)*campana((rh - 152.)/48.)*smoothstep(-.4,.4,arriba))
           * (1. - sombra) * (1. + .18*sin(reloj*1.1) + 1.6*ener) * fuerza.x * (mundo > 0 ? .4 : 1.);
    luz *= 1. + .45*ener;

    col = col*(1. - tapa) + (1. - exp(-luz*1.75));

    if (mundo == 2) {                                   // toda la escena en tinta: planos de blanco, negro y trama de puntos
      float gris = dot(col, vec3(.3,.58,.12));
      vec2 t = rot(.7854)*css/4.2; float punto = length(fract(t) - .5);
      float tinta = smoothstep(.2, .88, gris);
      float trama = 1. - smoothstep(-.09, .09, punto - sqrt(tinta)*.72);
      float plano = mix(trama, 1., smoothstep(.68, .8, gris)) * step(.045, tinta);
      col = vec3(plano)*vec3(.96,.95,.92);
      col *= 1. - smoothstep(134., 131., rh)*smoothstep(121.6, 123., rh)*(1. - smoothstep(.12, .3, d.g)*delante);   // contorno
    }
    // Viñeta, líneas de pantalla y grano fino
    vec2 v = (css - tam*vec2(.5,.52)) / tam;
    col *= 1. - .55*smoothstep(.28, .75, length(v));
    col *= 1. - .09*otros.y*step(2., mod(css.y, 3.));
    col += (hash(frag + fract(reloj)*91.) - .5) / 110.;
    sale = vec4(col, 1.);
  }`;

  const MUNDOS = ["agujero", "brasas", "vineta", "oro", "particulas"];
  const COLORES = ["255,255,255", "255,236,205", "255,176,80", "255,92,150", "96,150,255", "110,235,240"];

  function crear(caja, op) {
    op = op || {};
    const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const piezas = JSON.parse(JSON.stringify(PIEZAS));
    const lienzo = document.createElement("canvas"), polvo = document.createElement("canvas");
    for (const c of [lienzo, polvo]) {
      c.setAttribute("aria-hidden", "true");
      Object.assign(c.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block", pointerEvents: "none" });
    }
    if (getComputedStyle(caja).position === "static") caja.style.position = "relative";
    caja.append(lienzo, polvo);

    const gl = op.sinWebGL ? null : lienzo.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    const p2 = polvo.getContext("2d");
    let U = null, vivo = true, visible = true, cuadro = 0, antes = 0, reloj = 7, ener = 0;
    const T = [7, 7, 7, 7];                     // reloj propio de disco, arco, luna y cometas
    let giro = 7, mundo = Math.max(0, MUNDOS.indexOf(op.mundo));
    let W = 1, H = 1, dpr = 1, escala = 1, ox = 0, oy = 0;
    const cam = [0, 0], meta = [0, 0];
    let puntero = 0;

    if (gl) {
      const sh = (tipo, codigo) => {
        const s = gl.createShader(tipo); gl.shaderSource(s, codigo); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        return s;
      };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (gl.getProgramParameter(pr, gl.LINK_STATUS)) {
        gl.useProgram(pr);
        U = {}; for (const n of ["res", "cam", "vista", "tiempo", "fuerza", "otros", "reloj", "ener", "giro", "brilloPlaneta", "mundo"]) U[n] = gl.getUniformLocation(pr, n);
        const datos = new Uint8Array(256 * 256 * 4);
        let semilla = 1977;                                   // siempre el mismo cielo
        for (let i = 0; i < datos.length; i++) { semilla = (Math.imul(semilla, 1664525) + 1013904223) >>> 0; datos[i] = semilla >>> 24; }
        gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, datos);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
    }
    // Sin WebGL (aceleración por hardware apagada) se dibuja con Canvas 2D: agujero2d.js
    let plano = null;
    if (!U && window.AgujeroPlano) {
      const otro = lienzo.cloneNode();           // el lienzo que falló en WebGL ya no sirve para 2D
      lienzo.replaceWith(otro);
      plano = AgujeroPlano(caja, otro);
    }
    let ultimoPlano = 0;
    // El agujero negro (mundo 0) usa el dibujo con el estilo de la referencia: agujero-estilo.js
    const dibujos = {};                         // 0: franjas de luz · 4: partículas (agujero-particulas.js)
    let estilo = null, capa = null, fondo = null, nube = null;
    function usarEstilo() {
      if (mundo === 4 && window.AgujeroParticulas) {
        nube = nube || AgujeroParticulas.crear({ caja, superficie: op.superficie || caja.parentElement, ligero: !U });
        for (const c of caja.children) c.style.display = c === nube.lienzo || c === nube.fijo ? "block" : "none";
        return true;
      }
      const fabrica = mundo === 0 ? window.AgujeroEstilo : null, si = !!fabrica;
      if (si) {
        estilo = dibujos[mundo] || (dibujos[mundo] = fabrica.crear());
        if (!capa) {
          fondo = lienzo.cloneNode(); capa = lienzo.cloneNode();
          caja.insertBefore(fondo, polvo); caja.insertBefore(capa, polvo);
        }
      }
      for (const c of caja.children) c.style.display = (!nube || (c !== nube.lienzo && c !== nube.fijo)) && (c === fondo || c === capa) === si ? "block" : "none";
      return si;
    }
    // Cielo casi negro, como en la referencia: pocas estrellas y quietas
    function pintaFondo() {
      const g = fondo.getContext("2d"); let n = 1977;
      const az = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
      g.clearRect(0, 0, fondo.width, fondo.height);
      if (op.sinCielo) return;                    // la página pone el fondo (cielo.js)
      g.fillStyle = "#000"; g.fillRect(0, 0, fondo.width, fondo.height);
      const total = Math.round(W * H / 2600), a = piezas.cielo.brillo;
      for (let i = 0; i < total; i++) {
        const m = Math.pow(az(), 5), t = az(), s = (.5 + 1.5 * m) * (fondo.width / W);
        g.fillStyle = "rgba(" + (t < .4 ? "175,200,255" : t < .75 ? "255,255,255" : "255,205,160") + "," + Math.min(1, (.08 + .75 * m) * a).toFixed(3) + ")";
        g.fillRect(az() * fondo.width, az() * fondo.height, s, s);
      }
      for (let i = 0; i < 6; i++) {
        const x = Math.round(az() * fondo.width), y = Math.round(az() * fondo.height), u = Math.round(2.5 * fondo.width / W);
        g.fillStyle = "rgba(" + (i % 2 ? "115,215,255" : "255,130,97") + "," + Math.min(1, .38 * piezas.arcade.brillo) + ")";
        g.fillRect(x - u * 2, y, u * 5, u); g.fillRect(x, y - u * 2, u, u * 5);
      }
    }
    function pintaEstilo() {
      if (mundo === 4 && nube) { nube.cuadro({ escala, ox, oy, cam, t: T[0], reloj, brillo: piezas.disco.brillo, ener }); return; }
      const d = U ? dpr : Math.min(dpr, 1);        // sin tarjeta gráfica: menos píxeles, más fluidez
      if (capa.width !== Math.round(W * d) || capa.height !== lienzo.height || fondo.dataset.luz !== piezas.cielo.brillo + "/" + piezas.arcade.brillo) {
        for (const c of [fondo, capa]) { c.width = Math.round(W * d); c.height = Math.round(H * d); }
        fondo.dataset.luz = piezas.cielo.brillo + "/" + piezas.arcade.brillo; pintaFondo();
      }
      const g = capa.getContext("2d"), k = d / escala;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, capa.width, capa.height);
      g.setTransform(k, 0, 0, k, (-ox + cam[0] * 12) * k, (-oy + cam[1] * 10) * k);
      estilo.pinta(g, { T, reloj, piezas, ener });
    }

    // Polvo en órbita
    const entre = (a, b) => a + Math.random() * (b - a);
    const motas = Array.from({ length: innerWidth < 700 ? 230 : 460 }, () => {
      const r = 190 + Math.pow(Math.random(), 1.5) * 410;
      return { r, a: entre(0, 6.283), h: entre(-1, 1) * (r - 175) * .045, w: .85 * Math.pow(260 / r, 1.5) * entre(.9, 1.1),
        g: entre(.5, 1.7), b: entre(.12, .7), c: COLORES[(Math.random() * COLORES.length) | 0] };
    });
    const ci = Math.cos(INCL), si = Math.sin(INCL);
    const punto = (m, a) => {
      const x = Math.cos(a) * m.r, y = Math.sin(a) * m.r * APL - m.h;
      const prof = Math.max(-1, Math.min(1, y / 95));
      return [CENTRO[0] + x * ci - y * si + cam[0] * (6 + 24 * prof), CENTRO[1] + x * si + y * ci + cam[1] * (6 + 24 * prof)];
    };
    function dibujaPolvo(dt) {
      p2.setTransform(1, 0, 0, 1, 0, 0); p2.clearRect(0, 0, polvo.width, polvo.height);
      const fuerte = piezas.polvo.brillo; if (fuerte <= 0) return;
      const k = dpr / escala;
      p2.setTransform(k, 0, 0, k, -ox * k, -oy * k);
      p2.globalCompositeOperation = "lighter"; p2.lineCap = "round";
      const hx = HUECO[0] + cam[0] * 6, hy = HUECO[1] + cam[1] * 6;
      for (const m of motas) {
        m.a = (m.a + m.w * dt * (1 + ener) * piezas.polvo.velocidad) % 6.283185;
        const frente = Math.sin(m.a);                        // >0 delante, <0 detrás del agujero
        const a = punto(m, m.a);
        if (frente < 0 && Math.hypot(a[0] - hx, a[1] - hy) < RHUECO + 4) continue;
        const b = punto(m, m.a - m.w * .13);
        const al = Math.min(1, m.b * (.55 + .45 * frente) * fuerte);
        p2.strokeStyle = "rgba(" + (mundo === 2 ? COLORES[0] : m.c) + "," + al.toFixed(3) + ")";
        p2.lineWidth = m.g * (1 + .55 * frente);
        p2.beginPath(); p2.moveTo(b[0], b[1]); p2.lineTo(a[0], a[1]); p2.stroke();
      }
    }

    function medir() {
      const r = caja.getBoundingClientRect(); if (!r.width || !r.height) return;
      dpr = Math.min(devicePixelRatio || 1, 1.5); W = r.width; H = r.height;
      for (const c of [lienzo, polvo]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      if (fondo) fondo.dataset.luz = "";
      const e = op.encuadre ? op.encuadre(W, H) : null;   // { escala, ox, oy }: px de imagen por px de pantalla y origen
      escala = e ? e.escala : Math.max(1110 / W, 540 / H);
      ox = e ? e.ox : 622 - W * escala / 2; oy = e ? e.oy : 345 - H * escala / 2;
      if (plano) plano.medir(W, H, escala, ox, oy, dpr);
      pedir();
    }

    function pinta(ahora) {
      cuadro = 0; if (!vivo) return;
      if (plano && ahora - ultimoPlano < (mundo === 4 ? 22 : 30)) { pedir(); return; }   // unos 30 cuadros por segundo bastan sin tarjeta gráfica
      ultimoPlano = ahora;
      const dt = Math.min(.05, antes ? (ahora - antes) / 1000 : .016); antes = ahora;
      const nivel = Math.max(0, Math.min(1, op.energia ? +op.energia() || 0 : 0));
      ener += (nivel - ener) * Math.min(1, dt * 12);
      if (!quieto) {
        reloj += dt; giro += dt * piezas.planeta.velocidad * (1 + ener);
        ["disco", "arco", "luna", "cometas"].forEach((n, i) => { T[i] += dt * piezas[n].velocidad * (1 + ener * .6); });
      }
      const libre = ahora - puntero > 2500, vaiven = piezas.camara.brillo;
      const mx = quieto ? 0 : (libre ? Math.sin(reloj * .23) * .75 : meta[0]) * vaiven;
      const my = quieto ? 0 : (libre ? Math.sin(reloj * .31 + 1) * .6 : meta[1]) * vaiven;
      const s = Math.min(1, dt * 2.5);
      cam[0] += (mx - cam[0]) * s; cam[1] += (my - cam[1]) * s;
      const conEstilo = usarEstilo();
      if (conEstilo) pintaEstilo();
      else if (U) {
        gl.viewport(0, 0, lienzo.width, lienzo.height);
        gl.uniform2f(U.res, lienzo.width, lienzo.height);
        gl.uniform2f(U.cam, cam[0], cam[1]);
        gl.uniform3f(U.vista, escala / dpr, ox, oy);
        gl.uniform4f(U.tiempo, T[0], T[1], T[2], T[3]);
        gl.uniform4f(U.fuerza, piezas.disco.brillo, piezas.arco.brillo, piezas.luna.brillo, piezas.cometas.brillo);
        gl.uniform3f(U.otros, piezas.cielo.brillo, piezas.arcade.brillo, dpr);
        gl.uniform1f(U.reloj, reloj); gl.uniform1f(U.ener, ener);
        gl.uniform1f(U.giro, giro); gl.uniform1f(U.brilloPlaneta, piezas.planeta.brillo); gl.uniform1i(U.mundo, mundo);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (plano && !conEstilo) plano.pinta({ T, giro, reloj, mundo, piezas, cam, ener });
      if (!conEstilo) dibujaPolvo(quieto ? 0 : dt);
      if (!quieto) pedir();
    }
    function pedir() { if (vivo && visible && !document.hidden && !cuadro) cuadro = requestAnimationFrame(pinta); }

    const mueve = ev => {
      meta[0] = (ev.clientX / innerWidth - .5) * 2; meta[1] = (ev.clientY / innerHeight - .5) * 2; puntero = performance.now();
    };
    const despierta = () => { antes = 0; pedir(); };
    addEventListener("pointermove", mueve, { passive: true });
    document.addEventListener("visibilitychange", despierta);
    const ro = new ResizeObserver(medir); ro.observe(caja);
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; despierta(); }); io.observe(caja);
    medir();

    return {
      opaco: !!(U || plano || window.AgujeroEstilo || window.AgujeroParticulas),                               // true: dibuja también su propio cielo
      piezas,
      mundos: MUNDOS,
      cambiarMundo(nombre) { mundo = Math.max(0, MUNDOS.indexOf(nombre)); pedir(); },
      ajustar(cambios) { for (const n in cambios) if (piezas[n]) Object.assign(piezas[n], cambios[n]); pedir(); },
      medir,
      destruir() {
        vivo = false; cancelAnimationFrame(cuadro); ro.disconnect(); io.disconnect();
        removeEventListener("pointermove", mueve); document.removeEventListener("visibilitychange", despierta);
        if (gl) { const x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); }
        caja.replaceChildren();
      }
    };
  }

  window.Agujero = { crear };
})();
