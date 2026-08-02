// ==UserScript==
// @name         Copero 99 OVR
// @namespace    copero-99-ovr
// @version      2.0.0
// @description  Cheats configurables para el Simulador de Carrera de Copero: OVR 99, progresión rápida, anti-lesiones, modo joven eterno, etc.
// @author       contribuidores de copero-99-ovr
// @match        https://copero.com.ar/juegos/simulador-carrera*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ========================================================================
    // CONFIGURACIÓN
    // ========================================================================

    const DEFAULT_CONFIG = {
        // Modos rápidos
        preset: 'god', // 'god' | 'realistic' | 'goalscorer' | 'immortal' | 'eternal_youth' | 'custom'

        // Opciones individuales
        forceOVR99: true,
        gradualOVR: false,           // Si está activo, sube +X por temporada en vez de estar en 99
        ovrPerSeason: 8,             // Cuánto sube por temporada cuando gradualOVR está activo
        startingOVR: 50,             // OVR inicial cuando gradualOVR está activo
        inflateStats: true,          // Inflar stats (goles, asist) para que el OVR suba naturalmente
        statsMultiplier: 5,          // Multiplicador de stats
        preventInjuries: true,       // Cancelar lesiones
        preventRetirement: true,     // Cancelar retiro
        freezeAge: false,            // Mantener edad en 16
        autoDecide: true,            // Auto-elegir la mejor opción en eventos
        alwaysPositive: true,        // Forzar outcomes positivos
        marketFree: false,           // Todos los clubes te quieren
    };

    let config = { ...DEFAULT_CONFIG };

    // Cargar configuración guardada (compatible con y sin GM_)
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
            description: 'OVR 99 desde el inicio, nunca lesionas, stats infladas',
            config: { ...DEFAULT_CONFIG, preset: 'god' }
        },
        realistic: {
            name: 'Realista +99',
            description: 'Arranca con OVR bajo pero sube rápido temporada a temporada',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'realistic',
                forceOVR99: false,
                gradualOVR: true,
                ovrPerSeason: 8,
                startingOVR: 50,
                inflateStats: true,
                statsMultiplier: 3,
                preventInjuries: true,
                preventRetirement: true,
                autoDecide: true,
                alwaysPositive: true,
            }
        },
        goalscorer: {
            name: 'Goleador',
            description: 'Stats (goles, asist) infladas para que el OVR suba por cálculo natural',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'goalscorer',
                forceOVR99: false,
                inflateStats: true,
                statsMultiplier: 8,
                preventInjuries: true,
                preventRetirement: true,
                autoDecide: true,
                alwaysPositive: true,
            }
        },
        immortal: {
            name: 'Inmortal',
            description: 'Nunca te lesionás, stats infladas, OVR sube rápido',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'immortal',
                forceOVR99: true,
                inflateStats: true,
                statsMultiplier: 4,
                preventInjuries: true,
                preventRetirement: true,
                autoDecide: true,
                alwaysPositive: true,
            }
        },
        eternal_youth: {
            name: 'Joven Eterno',
            description: 'Edad congelada en 16, OVR 99, stats infladas, sin retiro',
            config: {
                ...DEFAULT_CONFIG,
                preset: 'eternal_youth',
                forceOVR99: true,
                inflateStats: true,
                statsMultiplier: 5,
                preventInjuries: true,
                preventRetirement: true,
                freezeAge: true,
                autoDecide: true,
                alwaysPositive: true,
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
     * Devuelve el estado si lo encuentra, o null.
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

    /**
     * Busca el state con un currentEvent (para auto-decisión).
     */
    function findEventState(fiber) {
        if (!fiber) return null;
        let current = fiber;
        let depth = 0;
        while (current && depth < 30) {
            if (current.memoizedState) {
                let hook = current.memoizedState;
                while (hook) {
                    if (hook.memoizedState && typeof hook.memoizedState === 'object') {
                        const state = hook.memoizedState;
                        if (state.currentEvent && state.currentEvent.options) {
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

    /**
     * Encuentra todos los hooks useState del fiber (para encontrar el setState).
     */
    function findAllStates(fiber) {
        if (!fiber) return [];
        const states = [];
        let current = fiber;
        let depth = 0;
        while (current && depth < 30) {
            if (current.memoizedState) {
                let hook = current.memoizedState;
                while (hook) {
                    if (hook.memoizedState && typeof hook.memoizedState === 'object') {
                        states.push({
                            state: hook.memoizedState,
                            queue: hook.queue,
                            dispatch: hook.queue?.dispatch,
                        });
                    }
                    hook = hook.next;
                }
            }
            current = current.return;
            depth++;
        }
        return states;
    }

    /**
     * Encuentra el setState (dispatch) del career.
     */
    function findCareerDispatch(fiber) {
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
                            return hook.queue?.dispatch || null;
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

        // 1) OVR: forzado a 99 o progresión gradual
        if (config.forceOVR99) {
            if (player.overall !== 99) {
                player.overall = 99;
            }
        } else if (config.gradualOVR) {
            // Subir temporada a temporada
            if (currentSeason > lastSeasonIndex) {
                lastSeasonIndex = currentSeason;
            }
            const targetOVR = Math.min(99, config.startingOVR + (currentSeason * config.ovrPerSeason));
            if (player.overall < targetOVR) {
                player.overall = targetOVR;
            } else if (player.overall > 99) {
                player.overall = 99;
            }
        }

        // 2) Stats infladas
        if (config.inflateStats && totals) {
            const mult = config.statsMultiplier;
            if (totals.appearances !== undefined && totals.appearances > 0) {
                totals.appearances = Math.floor(totals.appearances * mult);
                totals.goals = Math.floor((totals.goals || 0) * mult);
                totals.assists = Math.floor((totals.assists || 0) * mult);
                if (totals.cleanSheets !== undefined) totals.cleanSheets = Math.floor(totals.cleanSheets * mult);
            }
        }

        // 3) Edad congelada
        if (config.freezeAge && player.age !== 16) {
            player.age = 16;
        }

        // 4) Anti-lesión: eliminar injuries del log o current state
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
    // AUTO-DECISIÓN
    // ========================================================================

    function autoDecide(state) {
        if (!config.autoDecide) return false;
        if (!state.currentEvent || !state.currentEvent.options) return false;

        const options = state.currentEvent.options;
        if (options.length === 0) return false;

        // Buscar la mejor opción según heurística:
        // - Preferir outcomes positivos
        // - Preferir opciones que suban overall
        // - Evitar opciones con lesiones
        let bestOption = options[0];
        let bestScore = -Infinity;

        for (const opt of options) {
            let score = 0;
            const label = (opt.label || '').toLowerCase();

            // Bonus por outcome positivo
            if (opt.positiveOutcome) score += 100;
            if (opt.negativeOutcome) score -= 100;

            // Bonus si menciona mejora de overall
            if (label.includes('mejora') || label.includes('entrena')) score += 50;
            if (label.includes('descansa') || label.includes('familia')) score += 20;
            if (label.includes('lesión') || label.includes('lesion') || label.includes('cirugía')) score -= 200;
            if (label.includes('retir')) score -= 1000;

            // Preferir primera opción si todo es igual
            score += options.indexOf(opt);

            if (score > bestScore) {
                bestScore = score;
                bestOption = opt;
            }
        }

        // Disparar el click en la mejor opción
        const dispatch = findCareerDispatch(findReactFiber(document.querySelector('[data-career-phase]')));
        if (dispatch && bestOption.id) {
            console.log('[99] auto-decidiendo:', bestOption.label);
            // Buscar el botón y hacer click
            setTimeout(() => {
                const buttons = document.querySelectorAll('[data-career-phase] button');
                for (const btn of buttons) {
                    if (btn.textContent.includes(bestOption.label)) {
                        btn.click();
                        break;
                    }
                }
            }, 100);
            return true;
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
                <option value="realistic">Realista +99</option>
                <option value="goalscorer">Goleador</option>
                <option value="immortal">Inmortal</option>
                <option value="eternal_youth">Joven Eterno</option>
                <option value="custom">Personalizado</option>
            </select>
            <div class="section-title">Opciones</div>
            <label class="option"><input type="checkbox" data-key="forceOVR99"> OVR siempre en 99</label>
            <label class="option"><input type="checkbox" data-key="gradualOVR"> Subida gradual por temporada</label>
            <label class="option"><input type="checkbox" data-key="inflateStats"> Inflar stats (goles/asist)</label>
            <label class="option"><input type="checkbox" data-key="preventInjuries"> Prevenir lesiones</label>
            <label class="option"><input type="checkbox" data-key="preventRetirement"> Prevenir retiro</label>
            <label class="option"><input type="checkbox" data-key="freezeAge"> Edad congelada</label>
            <label class="option"><input type="checkbox" data-key="autoDecide"> Auto-decidir eventos</label>
            <label class="option"><input type="checkbox" data-key="alwaysPositive"> Forzar outcomes positivos</label>
            <div class="footer">v2.0.0 — arrastrar para mover</div>
        `;

        document.body.appendChild(menu);
        menuElement = menu;

        // Botón flotante para reabrir el menú
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

        // Botón cerrar
        menu.querySelector('.close-btn').addEventListener('click', () => {
            menu.style.display = 'none';
            toggle.style.display = 'block';
        });

        // Drag para mover
        makeDraggable(menu);

        // Eventos
        menu.querySelector('#copero99-preset').addEventListener('change', (e) => {
            applyPreset(e.target.value);
        });

        menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                config[key] = e.target.checked;
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
    }

    // ========================================================================
    // LOOP PRINCIPAL
    // ========================================================================

    function mainLoop() {
        // Aplicar patch del state
        if (applyPatch()) {
            // Auto-decidir si hay un evento
            const containers = document.querySelectorAll('[data-career-phase]');
            for (const container of containers) {
                const fiber = findReactFiber(container);
                if (!fiber) continue;
                const eventState = findEventState(fiber);
                if (eventState) {
                    autoDecide(eventState);
                }
            }
        }
    }

    // ========================================================================
    // INICIALIZACIÓN
    // ========================================================================

    loadConfig();
    createMenu();

    console.log('[99] v2.0 cargado. Config:', config);

    // Esperar a que el career esté disponible y empezar el loop
    let attempts = 0;
    const initInterval = setInterval(() => {
        attempts++;
        if (applyPatch() || attempts > 30) {
            clearInterval(initInterval);
            // Loop principal cada 500ms
            setInterval(mainLoop, 500);
        }
    }, 500);

})();