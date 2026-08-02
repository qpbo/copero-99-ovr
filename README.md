# Copero 99 OVR

Script de Tampermonkey con cheats configurables para el [Simulador de Carrera de Copero](https://copero.com.ar/juegos/simulador-carrera).

Incluye OVR 99, progresión rápida, anti-lesiones, modo joven eterno, auto-decisión de eventos y mucho más. Todo configurable desde un panel flotante en el juego.

## 🎯 Funcionalidades

### Modos predefinidos

| Modo | Descripción |
|------|-------------|
| 🏆 **Modo Dios** | OVR 99 desde el inicio, nunca lesionas, stats infladas |
| 📈 **Realista +99** | Arranca con OVR bajo pero sube rápido temporada a temporada |
| ⚽ **Goleador** | Stats infladas para que el OVR suba por cálculo natural |
| 💀 **Inmortal** | Nunca te lesionás, stats infladas, OVR sube rápido |
| 👶 **Joven Eterno** | Edad congelada en 16, OVR 99, stats infladas, sin retiro |
| ⚙️ **Personalizado** | Configurá cada opción a tu gusto |

### Opciones individuales

- **OVR siempre en 99**: fuerza el overall a 99 constantemente
- **Subida gradual por temporada**: el OVR sube +X puntos por temporada (más realista)
- **Inflar stats (goles/asist)**: multiplica las estadísticas para que el OVR suba naturalmente
- **Prevenir lesiones**: cancela cualquier lesión activa
- **Prevenir retiro**: bloquea el evento de retiro
- **Edad congelada**: mantiene la edad en 16 para siempre
- **Auto-decidir eventos**: elige automáticamente la mejor opción en cada decisión
- **Forzar outcomes positivos**: sesga las decisiones hacia resultados favorables

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
2. **Aparecerá un panel flotante** en la esquina superior derecha con los controles
3. Elige un modo predefinido o configura las opciones a tu gusto
4. Inicia una nueva carrera
5. El panel se puede arrastrar y cerrar (vuelve a aparecer con el botón 🏆)

## 🔍 Comprobar que funciona

1. Abre DevTools (`F12` o `Cmd+Opt+I`)
2. Ve a la pestaña **Consola**
3. Deberías ver: `[99] v2.0 cargado. Config: ...`
4. El panel flotante debe aparecer en la esquina superior derecha

## 🛠️ ¿Cómo funciona técnicamente?

El Simulador de Carrera de Copero es una SPA de React + Vite. El estado de la carrera (incluyendo el `player.overall`, `player.age`, `totals.*`) vive en el cierre del componente `CareerSimulatorPage`, no en `localStorage` ni en `window`.

El bundle del juego (`CareerSimulatorPage-EiQXNFBI.js`) tiene un clamp duro `Math.max(40, Math.min(99, ...))` en 4 puntos críticos que limitan el OVR a un máximo de 99. Parchear el bundle desde la consola es muy difícil porque el módulo se carga mediante `import()` nativo de ES modules, que no pasa por `window.fetch`.

**Este script evita todo eso** yendo directamente al Fiber de React:

1. Busca el elemento `<div data-career-phase="...">` que renderiza la carrera
2. Encuentra el Fiber de React asociado (mediante `__reactFiber$xxx`)
3. Recorre los hooks `useState` buscando el que contiene `player.overall`
4. Modifica el estado directamente: `player.overall`, `player.age`, `totals.*`, etc.
5. Vuelve a aplicarlo cada 500 ms porque React reemplaza el estado en cada renderizado

Además, el script:

- Construye un panel UI flotante inyectando HTML y CSS al DOM
- Persiste la configuración del usuario en `localStorage` (compatible con `GM_setValue`)
- Detecta eventos automáticamente y elige la mejor opción según heurística

## 📁 Estructura del repositorio

```
copero-99-ovr/
├── README.md                  # Este archivo
├── LICENSE                    # Licencia MIT
├── src/
│   └── copero-99-ovr.user.js  # El script para Tampermonkey
└── .gitignore
```

## 🎮 Capturas de pantalla

### Panel flotante

```
┌─────────────────────────────────┐
│ 🏆 Copero 99 OVR              ✕ │
├─────────────────────────────────┤
│ Modo predefinido:              │
│ [Modo Dios              ▼]    │
│                                  │
│ Opciones:                        │
│ ☑ OVR siempre en 99            │
│ ☐ Subida gradual por temporada │
│ ☑ Inflar stats (goles/asist)   │
│ ☑ Prevenir lesiones            │
│ ☑ Prevenir retiro              │
│ ☐ Edad congelada               │
│ ☑ Auto-decidir eventos         │
│ ☑ Forzar outcomes positivos    │
└─────────────────────────────────┘
```

## ⚠️ Aviso

Este script es **solo para uso educativo y de investigación**. El autor no se hace responsable del uso que se le dé. Jugar con trampas puede arruinarte la experiencia del juego si eso es lo que buscas.

## 🤝 Contribuciones

¡Son bienvenidas! Si encuentras errores o quieres proponer mejoras:

1. Haz un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/mi-mejora`)
3. Haz commit de tus cambios (`git commit -m 'Añado funcionalidad X'`)
4. Sube la rama (`git push origin feature/mi-mejora`)
5. Abre un Pull Request

## 📝 Licencia

MIT — consulta [`LICENSE`](./LICENSE) para más detalles.