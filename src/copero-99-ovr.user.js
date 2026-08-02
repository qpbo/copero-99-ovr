// ==UserScript==
// @name         Copero 99 OVR
// @namespace    copero-99-ovr
// @version      2.0.0
// @description  Cheats configurables para el Simulador de Carrera de Copero: OVR 99 y stats realistas
// @author       contribuidores de copero-99-ovr
// @match        https://copero.com.ar/juegos/simulador-carrera*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ========================================================================
    // CONFIGURACIÓN
    // ========================================================================

    const DEFAULT_CONFIG = {
        preset: 'god', // 'god' | 'normal' | 'custom'

        // Opciones individuales
        forceOVR99: true,           // Modo Dios: OVR siempre en 99
        inflateStats: false,        // Modo Normal: inflar goles y asist
        goalsPerSeason: 10,         // Goles "extra" por temporada (sumar a los reales)
        assistsPerSeason: 5,        // Asistencias "extra" por temporada
        preventInjuries: true,      // Cancelar lesiones
    };

    let config = { ...DEFAULT_CONFIG };

    function loadConfig() {
        try {
            if (typeof GM_getValue === 'function') {
                const saved = GM_getValue('copero99_config');
                if (saved) config = { ...DEFAULT_CONFIG, ...saved };
            } else {
                const saved = localStorage.getItem('copero99_config');
                if (saved) config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('[99] error cargando config:', e);
        }
    }

    function saveConfig() {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue('copero99_config', config);
            } else {
                localStorage.setItem('copero99_config', JSON.stringify(config));
            }
        } catch (e) {
            console.warn('[99] error guardando config:', e);
        }
    }

    // ========================================================================
    // PRESETS
    // ========================================================================

    const PRESETS = {
        god: {
            name: 'Modo Dios',
            description: 'OVR siempre en 99, sin lesiones',
            config: { ...DEFAULT_CONFIG, preset: 'god' }
        },
        normal: {
            name: 'Modo Normal +',
            description: 'Arranca con stats bajas y suma goles/asist cada temporada',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'normal',
                forceOVR99: false,
                inflateStats: true,
                goalsPerSeason: 10,
                assistsPerSeason: 5,
                preventInjuries: true,
            }
        },
        custom: {
            name: 'Personalizado',
            description: 'Configurá cada opción a tu gusto',
            config: { ...DEFAULT_CONFIG, preset: 'custom' }
        }
    };

    function applyPreset(presetName) {
        const preset = PRESETS[presetName];
        if (preset) {
            config = { ...preset.config };
            saveConfig();
            updateMenuUI();
        }
    }

    // ========================================================================
    // UTILIDADES REACT
    // ========================================================================

    function findReactFiber(dom) {
        const keys = Object.keys(dom);
        for (const key of keys) {
            if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
                return dom[key];
            }
        }
        return null;
    }

    /**
     * Busca el estado del career recorriendo los hooks useState del fiber.
     */
    function findCareerState(fiber) {
        if (!fiber) return null;
        let current = fiber;
        let depth = 0;
        while (current && depth < 30) {
            if (current.memoizedState) {
                let hook = current.memoizedState;
                while (hook) {
                    if (hook.memoizedState && typeof hook.memoizedState === 'object') {
                        const state = hook.memoizedState;
                        if (state.player && typeof state.player === 'object' && 'overall' in state.player) {
                            return state;
                        }
                    }
                    hook = hook.next;
                }
            }
            current = current.return;
            depth++;
        }
        return null;
    }

    // ========================================================================
    // LÓGICA DEL PARCHE
    // ========================================================================

    let lastSeasonIndex = -1;

    function patchCareerState(state) {
        if (!state || !state.player) return;

        const player = state.player;
        const totals = state.totals || {};
        const currentSeason = state.seasons?.length || 0;

        // 1) OVR forzado a 99 (solo Modo Dios)
        if (config.forceOVR99 && player.overall !== 99) {
            player.overall = 99;
        }

        // 2) Stats infladas: solo cuando entramos a una nueva temporada
        // Sumar N goles y M asist por temporada, sin multiplicar las existentes
        if (config.inflateStats && totals && currentSeason > lastSeasonIndex) {
            lastSeasonIndex = currentSeason;
            if (currentSeason > 0) {
                // Sumamos a los totales acumulados
                totals.goals = (totals.goals || 0) + config.goalsPerSeason;
                totals.assists = (totals.assists || 0) + config.assistsPerSeason;
                console.log('[99] temporada #' + currentSeason + ': +' + config.goalsPerSeason + ' goles, +' + config.assistsPerSeason + ' asist');
            }
        }

        // 3) Anti-lesión
        if (config.preventInjuries && player.injuryType) {
            delete player.injuryType;
            if (player.suspensionSeasonsRemaining) {
                player.suspensionSeasonsRemaining = 0;
            }
        }
    }

    function applyPatch() {
        const containers = document.querySelectorAll('[data-career-phase]');
        if (containers.length === 0) return false;

        for (const container of containers) {
            const fiber = findReactFiber(container);
            if (!fiber) continue;

            const state = findCareerState(fiber);
            if (state) {
                patchCareerState(state);
                return true;
            }
        }
        return false;
    }

    // ========================================================================
    // UI FLOTANTE
    // ========================================================================

    let menuElement = null;

    function createMenu() {
        if (menuElement) return;

        const style = document.createElement('style');
        style.textContent = `
            #copero99-menu {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                background: rgba(20, 20, 30, 0.95);
                color: #fff;
                padding: 16px;
                border-radius: 12px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 13px;
                min-width: 280px;
                max-width: 340px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            #copero99-menu h3 {
                margin: 0 0 12px 0;
                font-size: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            #copero99-menu .close-btn {
                cursor: pointer;
                opacity: 0.7;
                font-size: 18px;
                line-height: 1;
            }
            #copero99-menu .close-btn:hover { opacity: 1; }
            #copero99-menu .preset-select {
                width: 100%;
                padding: 6px;
                margin-bottom: 12px;
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                font-size: 12px;
            }
            #copero99-menu .option {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 0;
                cursor: pointer;
                user-select: none;
            }
            #copero99-menu .option:hover { color: #4ade80; }
            #copero99-menu .option input { margin: 0; cursor: pointer; }
            #copero99-menu .section-title {
                margin: 10px 0 6px 0;
                font-size: 11px;
                text-transform: uppercase;
                opacity: 0.6;
                letter-spacing: 0.5px;
            }
            #copero99-menu .number-input {
                width: 50px;
                padding: 3px;
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                font-size: 12px;
                margin-left: auto;
            }
            #copero99-menu .footer {
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 11px;
                opacity: 0.5;
            }
            #copero99-toggle {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999998;
                background: rgba(20, 20, 30, 0.9);
                color: #fff;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 18px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            #copero99-toggle:hover { background: rgba(40, 40, 60, 0.95); }
        `;
        document.head.appendChild(style);

        const menu = document.createElement('div');
        menu.id = 'copero99-menu';
        menu.innerHTML = `
            <h3>
                <span>🏆 Copero 99 OVR</span>
                <span class="close-btn">✕</span>
            </h3>
            <div class="section-title">Modo predefinido</div>
            <select class="preset-select" id="copero99-preset">
                <option value="god">Modo Dios</option>
                <option value="normal">Modo Normal +</option>
                <option value="custom">Personalizado</option>
            </select>
            <div class="section-title">Opciones</div>
            <label class="option">
                <input type="checkbox" data-key="forceOVR99"> OVR siempre en 99
            </label>
            <label class="option">
                <input type="checkbox" data-key="inflateStats"> Sumar goles/asist por temporada
            </label>
            <label class="option" style="padding-left: 24px;">
                <span style="opacity: 0.7;">Goles/temp:</span>
                <input type="number" class="number-input" data-key="goalsPerSeason" min="0" max="50">
            </label>
            <label class="option" style="padding-left: 24px;">
                <span style="opacity: 0.7;">Asist/temp:</span>
                <input type="number" class="number-input" data-key="assistsPerSeason" min="0" max="50">
            </label>
            <label class="option">
                <input type="checkbox" data-key="preventInjuries"> Prevenir lesiones
            </label>
            <div class="footer">v2.0.0 — arrastrar para mover</div>
        `;

        document.body.appendChild(menu);
        menuElement = menu;

        // Botón flotante para reabrir
        const toggle = document.createElement('button');
        toggle.id = 'copero99-toggle';
        toggle.textContent = '🏆';
        toggle.title = 'Copero 99 OVR';
        toggle.style.display = 'none';
        document.body.appendChild(toggle);
        toggle.addEventListener('click', () => {
            menu.style.display = 'block';
            toggle.style.display = 'none';
        });

        // Cerrar
        menu.querySelector('.close-btn').addEventListener('click', () => {
            menu.style.display = 'none';
            toggle.style.display = 'block';
        });

        // Drag
        makeDraggable(menu);

        // Preset
        menu.querySelector('#copero99-preset').addEventListener('change', (e) => {
            applyPreset(e.target.value);
        });

        // Checkboxes
        menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                config[key] = e.target.checked;
                config.preset = 'custom';
                saveConfig();
                updateMenuUI();
            });
        });

        // Number inputs
        menu.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                config[key] = parseInt(e.target.value) || 0;
                config.preset = 'custom';
                saveConfig();
                updateMenuUI();
            });
        });

        updateMenuUI();
    }

    function makeDraggable(el) {
        const handle = el.querySelector('h3');
        let offsetX, offsetY, isDragging = false;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - el.offsetLeft;
            offsetY = e.clientY - el.offsetTop;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            el.style.left = (e.clientX - offsetX) + 'px';
            el.style.top = (e.clientY - offsetY) + 'px';
            el.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.userSelect = '';
        });
    }

    function updateMenuUI() {
        if (!menuElement) return;
        menuElement.querySelector('#copero99-preset').value = config.preset;
        menuElement.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = !!config[cb.dataset.key];
        });
        menuElement.querySelectorAll('input[type="number"]').forEach(input => {
            input.value = config[input.dataset.key] || 0;
        });
    }

    // ========================================================================
    // LOOP PRINCIPAL
    // ========================================================================

    function mainLoop() {
        applyPatch();
    }

    // ========================================================================
    // INICIALIZACIÓN
    // ========================================================================

    loadConfig();
    createMenu();

    console.log('[99] v2.0 cargado. Preset:', config.preset);

    // Loop principal cada 500ms
    let attempts = 0;
    const initInterval = setInterval(() => {
        attempts++;
        if (applyPatch() || attempts > 30) {
            clearInterval(initInterval);
            setInterval(mainLoop, 500);
        }
    }, 500);

})();