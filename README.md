# Copero 99 OVR

Script de Tampermonkey con cheats configurables para el [Simulador de Carrera de Copero](https://copero.com.ar/juegos/simulador-carrera).

Desarrollado por **Carliyo**. Dos modos simples: **Modo Dios** (OVR 99 siempre) y **Modo Realista** (el OVR sube hasta un pico y luego baja con la edad). Todo configurable desde un panel flotante en el juego.

## 🎯 Funcionalidades

### Modos predefinidos

| Modo | Descripción |
|------|-------------|
| 🏆 **Modo Dios** | OVR siempre en 99, sin lesiones, sin importar la edad |
| 📈 **Modo Realista** | El OVR sube gradualmente hasta el pico y luego baja con la edad |
| ⚙️ **Personalizado** | Configurá cada opción a tu gusto |

### Opciones individuales

- **OVR siempre en 99**: fuerza el overall a 99 constantemente (Modo Dios)
- **OVR basado en edad**: el OVR varía según la edad del jugador, simulando una carrera real
  - **Pico OVR**: el OVR máximo al que llega en su mejor momento (por defecto 99)
  - **Edad pico**: la edad en la que alcanza el pico (por defecto 28)
  - **Sube/año**: cuántos puntos sube por año desde los 16 hasta el pico (por defecto 4)
  - **Baja desde**: edad a partir de la cual empieza el declive (por defecto 31)
  - **Baja/año**: cuántos puntos pierde por año después del declive (por defecto 2)
- **Prevenir lesiones**: cancela cualquier lesión activa y reduce las sanciones a 0

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

## 🛠️ ¿Cómo funciona técnicamente?

El Simulador de Carrera de Copero es una SPA de React + Vite. El estado de la carrera (incluyendo el `player.overall`) vive en el cierre del componente, no en `localStorage` ni en `window`.

El bundle del juego tiene un clamp duro `Math.max(40, Math.min(99, ...))` que limita el OVR. Parchear el bundle desde la consola es muy difícil porque el módulo se carga mediante `import()` nativo de ES modules.

**Importante**: en este juego, el OVR **NO se calcula por goles ni por estadísticas**. Se calcula por las decisiones que tomás durante la carrera (eventos, lesiones, fichajes, etc.).

**Este script evita todo eso** yendo directamente al Fiber de React:

1. Busca el elemento `<div data-career-phase="...">` que renderiza la carrera
2. Encuentra el Fiber de React asociado (mediante `__reactFiber$xxx`)
3. Recorre los hooks `useState` buscando el que contiene `player.overall`
4. Modifica el estado directamente: `player.overall`, etc.
5. Vuelve a aplicarlo cada 500 ms porque React reemplaza el estado en cada renderizado

### Modo Dios vs Modo Realista

- **Modo Dios**: `player.overall = 99` siempre, sin importar la temporada ni las decisiones
- **Modo Realista**: el OVR se calcula según la edad con la fórmula:
  - Antes del pico: sube gradualmente desde 50 hasta el OVR del pico
  - En el pico: OVR máximo
  - Después del declive: baja `declinePerYear` puntos por año, sin bajar de 40

## 📁 Estructura del repositorio

```
copero-99-ovr/
├── README.md                  # Este archivo
├── LICENSE                    # Licencia MIT
├── src/
│   └── copero-99-ovr.user.js  # El script para Tampermonkey
└── .gitignore
```

## 🎮 Captura del panel

```
┌─────────────────────────────────┐
│ 🏆 Copero 99 OVR              ✕ │
├─────────────────────────────────┤
│ Modo predefinido:              │
│ [Realista                ▼]    │
│                                  │
│ Opciones:                        │
│ ☐ OVR siempre en 99            │
│ ☑ OVR basado en edad           │
│   Pico OVR: [99]                │
│   Edad pico: [28]               │
│   Sube/año: [4]                 │
│   Baja desde: [31]              │
│   Baja/año: [2]                 │
│ ☑ Prevenir lesiones            │
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

---

Desarrollado por **Carliyo**.