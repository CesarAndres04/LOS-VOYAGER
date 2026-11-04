# Los Voyagers — EPK

Kit de prensa interactivo de Los Voyagers, banda de rock de Lima.
Sitio estático: `index.html` en la raíz, sin compilación. Vercel lo publica tal cual.

- `fotos/` fotos de la banda
- `fondos/` cielo, planetas y los videos de las capas (tormenta, lava, red eléctrica,
  muro de luces, Andrómeda, agujero negro, nebulosa), cada uno con su poster
- `assets/audio/` fragmento de Vuelvo que suena en el vinilo
- `js/galaxia.js` galaxia WebGL (shader portado de react-bits, MIT)

La fuente vive en el proyecto principal, en `web/epk/`; este repo recibe una versión
limpia (sin vistas previas internas) generada con `web/publicar_epk.py`.
