# Copero 99 OVR

Script de Tampermonkey que fuerza el OVR (overall) del jugador a 99 en el [Simulador de Carrera de Copero](https://copero.com.ar/juegos/simulador-carrera).

Funciona modificando el estado de React del componente en tiempo de ejecución, sin necesidad de parchear el bundle ni instalar nada más aparte de Tampermonkey.

## 🎯 ¿Qué hace?

- **Establece el OVR del jugador a 99** de forma constante
- Se **vuelve a aplicar automáticamente** después de cada decisión (lesiones, eventos, fichajes, etc.)
- **No rompe** otras mecánicas del juego (las lesiones, el envejecimiento y la progresión siguen funcionando, pero el OVR queda fijado en 99)
- Es **indetectable** porque modifica el estado en memoria desde el cliente

## 📋 Requisitos

- Navegador basado en Chrome (Chrome, Edge, Brave, Arc, etc.) o Firefox
- [Tampermonkey](https://www.tampermonkey.net/) instalado

## 🚀 Instalación

### 1. Instala Tampermonkey

- **Chrome / Edge / Brave**: ve a la [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) e instala la extensión
- **Firefox**: ve a [addons.mozilla.org](https://addons.mozilla.org/es-ES/firefox/addon/tampermonkey/) e instala la extensión

### 2. Instala el script

1. Haz clic en el icono de Tampermonkey (arriba a la derecha en tu navegador)
2. Haz clic en **"Crear nuevo script"** (Create a new script)
3. Borra todo el contenido por defecto
4. Pega el contenido de [`src/copero-99-ovr.user.js`](./src/copero-99-ovr.user.js)
5. **Archivo → Guardar** (o `Ctrl+S` / `Cmd+S`)
6. Asegúrate de que el script indica **"Enabled"** en la parte superior del editor

### 3. Juega

1. Ve a `https://copero.com.ar/juegos/simulador-carrera`
2. Inicia una nueva carrera
3. Elige tu identidad y empieza a jugar
4. Tu OVR estará en 99 (y se quedará en 99 incluso después de lesiones o malas decisiones)

## 🔍 Comprobar que funciona

1. Abre DevTools (`F12` o `Cmd+Opt+I`)
2. Ve a la pestaña **Consola**
3. Deberías ver algo como:
   ```
   [99] RE-REAL-FINAL cargado
   [99] PATCH aplicado en intento #3
   ```
4. Si tu OVR empieza en 99, todo está funcionando 🎉

## 🛠️ ¿Cómo funciona técnicamente?

El Simulador de Carrera de Copero es una SPA de React + Vite. El estado de la carrera (incluyendo el `player.overall`) vive en el cierre del componente `CareerSimulatorPage`, no en `localStorage` ni en `window`.

El bundle del juego (`CareerSimulatorPage-EiQXNFBI.js`) tiene un clamp duro `Math.max(40, Math.min(99, ...))` en 4 puntos críticos que limitan el OVR a un máximo de 99. Parchear el bundle desde la consola es muy difícil porque el módulo se carga mediante `import()` nativo de ES modules, que no pasa por `window.fetch`.

**Este script evita todo eso** yendo directamente al Fiber de React:

1. Busca el elemento `<div data-career-phase="...">` que renderiza la carrera
2. Encuentra el Fiber de React asociado (mediante `__reactFiber$xxx`)
3. Recorre los hooks `useState` buscando el que contiene `player.overall`
4. Establece `player.overall = 99` directamente en el `memoizedState`
5. Vuelve a aplicarlo cada 500 ms porque React reemplaza el estado en cada renderizado

Este enfoque es **mucho más fiable** que parchear el bundle porque toca el estado real de React.

## 📁 Estructura del repositorio

```
copero-99-ovr/
├── README.md                  # Este archivo
├── LICENSE                    # Licencia MIT
├── src/
│   └── copero-99-ovr.user.js  # El script para Tampermonkey
└── .gitignore
```

## ⚠️ Aviso

Este script es **solo para uso educativo y de investigación**. El autor no se hace responsable del uso que se le dé. Jugar con el OVR modificado puede arruinarte la experiencia del juego si eso es lo que buscas.

## 🤝 Contribuciones

¡Son bienvenidas! Si encuentras errores o quieres proponer mejoras:

1. Haz un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/mi-mejora`)
3. Haz commit de tus cambios (`git commit -m 'Añado funcionalidad X'`)
4. Sube la rama (`git push origin feature/mi-mejora`)
5. Abre un Pull Request

## 📝 Licencia

MIT — consulta [`LICENSE`](./LICENSE) para más detalles.
