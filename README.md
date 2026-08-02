# Copero 99 OVR

Tampermonkey script que fuerza el OVR (overall) del jugador a 99 en el [Simulador de Carrera de Copero](https://copero.com.ar/juegos/simulador-carrera).

Funciona modificando el state de React del componente en runtime, sin necesidad de patchear el bundle ni instalar nada más que Tampermonkey.

## 🎯 ¿Qué hace?

- **Setea el OVR del jugador a 99** de forma constante
- Se **re-aplica automáticamente** después de cada decisión (lesiones, eventos, transferencias, etc.)
- **No rompe** otras mecánicas del juego (lesiones, ageing, progresión siguen funcionando, pero el OVR queda topeado en 99)
- Es **indetectable** porque modifica el state en memoria desde el cliente

## 📋 Requisitos

- Navegador basado en Chrome (Chrome, Edge, Brave, Arc, etc.) o Firefox
- [Tampermonkey](https://www.tampermonkey.net/) instalado

## 🚀 Instalación

### 1. Instalá Tampermonkey

- **Chrome / Edge / Brave**: andá a la [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) e instalá la extensión
- **Firefox**: andá a [addons.mozilla.org](https://addons.mozilla.org/es-ES/firefox/addon/tampermonkey/) e instalá la extensión

### 2. Instalá el script

1. Click en el ícono de Tampermonkey (arriba a la derecha en tu navegador)
2. Click en **"Crear nuevo script"** (Create a new script)
3. Borrá todo el contenido por defecto
4. Pegá el contenido de [`src/copero-99-ovr.user.js`](./src/copero-99-ovr.user.js)
5. **File → Save** (o `Ctrl+S` / `Cmd+S`)
6. Asegurate que el script diga **"Enabled"** arriba del editor

### 3. Jugá

1. Andá a `https://copero.com.ar/juegos/simulador-carrera`
2. Iniciá una nueva carrera
3. Elegí tu identidad y empezá a jugar
4. Tu OVR estará en 99 (y se quedará en 99 incluso después de lesiones o malas decisiones)

## 🔍 Verificar que funciona

1. Abrí DevTools (`F12` o `Cmd+Opt+I`)
2. Andá a la pestaña **Console**
3. Deberías ver algo como:
   ```
   [99] RE-REAL-FINAL cargado
   [99] PATCH aplicado en intento #3
   ```
4. Si tu OVR arranca en 99, todo está funcionando 🎉

## 🛠️ ¿Cómo funciona técnicamente?

El Simulador de Carrera de Copero es una SPA de React + Vite. El state del career (incluyendo el `player.overall`) vive en el closure del componente `CareerSimulatorPage`, no en `localStorage` ni en `window`.

El bundle del juego (`CareerSimulatorPage-EiQXNFBI.js`) tiene un clamp duro `Math.max(40, Math.min(99, ...))` en 4 lugares críticos que limitan el OVR a un máximo de 99. Parchear el bundle desde la consola es muy difícil porque el módulo se carga vía `import()` nativo de ES modules, que no pasa por `window.fetch`.

**Este script bypasea todo eso** yendo directo al Fiber de React:

1. Busca el elemento `<div data-career-phase="...">` que renderiza el career
2. Encuentra el Fiber de React asociado (vía `__reactFiber$xxx`)
3. Recorre los `useState` hooks buscando el que contiene `player.overall`
4. Setea `player.overall = 99` directamente en el `memoizedState`
5. Re-aplica cada 500ms porque React reemplaza el state en cada render

Este approach es **mucho más confiable** que patchear el bundle porque toca el state real de React.

## 📁 Estructura del repo

```
copero-99-ovr/
├── README.md                  # Este archivo
├── LICENSE                    # Licencia MIT
├── src/
│   └── copero-99-ovr.user.js  # El script para Tampermonkey
└── .gitignore
```

## ⚠️ Disclaimer

Este script es **solo para uso educativo y de investigación**. El autor no se hace responsable del uso que se le dé. Jugar con el OVR modificado puede arruinarte la experiencia del juego si eso es lo que buscás.

## 🤝 Contribuciones

¡Son bienvenidas! Si encontrás bugs o querés proponer mejoras:

1. Hacé fork del repo
2. Creá una branch para tu feature (`git checkout -b feature/mi-mejora`)
3. Commiteá tus cambios (`git commit -m 'Agrego feature X'`)
4. Pusheá (`git push origin feature/mi-mejora`)
5. Abrí un Pull Request

## 📝 Licencia

MIT — ver [`LICENSE`](./LICENSE) para detalles.
