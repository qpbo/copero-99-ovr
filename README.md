# Copero 99 OVR

Script de Tampermonkey con cheats configurables para el [Simulador de Carrera de Copero](https://copero.com.ar/juegos/simulador-carrera).

Dos modos simples: **Modo Dios** (OVR 99 siempre) y **Modo Normal+** (suma goles y asist cada temporada). Todo configurable desde un panel flotante en el juego.

## 🎯 Funcionalidades

### Modos predefinidos

| Modo | Descripción |
|------|-------------|
| 🏆 **Modo Dios** | OVR siempre en 99, sin lesiones |
| 📈 **Modo Normal+** | Sube X puntos de OVR cada temporada (parte de 50) |
| ⚙️ **Personalizado** | Configurá cada opción a tu gusto |

### Opciones individuales

- **OVR siempre en 99**: fuerza el overall a 99 constantemente
- **Subir OVR por temporada**: sube el OVR una cantidad fija cada temporada (ej: +5 por temporada, llegando a 99 en 10 temporadas)
- **OVR inicial**: el OVR mínimo desde el que empieza la subida gradual (default 50)
- **Sube por temp**: cuántos puntos suma por temporada (default 5)
- **Prevenir lesiones**: cancela cualquier lesión activa

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

El Simulador de Carrera de Copero es una SPA de React + Vite. El estado de la carrera (incluyendo el `player.overall` y `totals.*`) vive en el cierre del componente `CareerSimulatorPage`, no en `localStorage` ni en `window`.

El bundle del juego tiene un clamp duro `Math.max(40, Math.min(99, ...))` en 4 puntos críticos que limitan el OVR a un máximo de 99. Parchear el bundle desde la consola es muy difícil porque el módulo se carga mediante `import()` nativo de ES modules.

**Importante**: en este juego, el OVR **NO se calcula por goles ni por estadísticas**. Se calcula por las decisiones que tomás durante la carrera (eventos, lesiones, fichajes, etc.). Los goles son solo stats decorativas del resumen.

**Este script evita todo eso** yendo directamente al Fiber de React:

1. Busca el elemento `<div data-career-phase="...">` que renderiza la carrera
2. Encuentra el Fiber de React asociado (mediante `__reactFiber$xxx`)
3. Recorre los hooks `useState` buscando el que contiene `player.overall`
4. Modifica el estado directamente: `player.overall`, etc.
5. Vuelve a aplicarlo cada 500 ms porque React reemplaza el estado en cada renderizado

### Modo Dios vs Modo Normal+

- **Modo Dios**: `player.overall = 99` siempre, sin importar la temporada ni las decisiones
- **Modo Normal+**: `player.overall = min(99, OVR_inicial + temporadas * puntos_por_temp)`. Ejemplo: con OVR inicial 50 y +5/temp, llegás a 99 en 10 temporadas.

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
│ [Modo Dios              ▼]    │
│                                  │
│ Opciones:                        │
│ ☑ OVR siempre en 99            │
│ ☐ Sumar goles/asist por temp   │
│   Goles/temp: [10]              │
│   Asist/temp: [5]               │
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