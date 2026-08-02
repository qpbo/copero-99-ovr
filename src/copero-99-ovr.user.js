// ==UserScript==
// @name         Copero 99 OVR
// @namespace    copero-99-ovr
// @version      1.0.0
// @description  Fuerza el OVR del jugador a 99 en el Simulador de Carrera de Copero
// @author       contribuidores de copero-99-ovr
// @match        https://copero.com.ar/juegos/simulador-carrera*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    console.log('[99] RE-REAL-FINAL cargado');

    /**
     * Encuentra el Fiber de React asociado a un elemento del DOM.
     * React guarda referencias internas con el prefijo __reactFiber$.
     */
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
     * Recorre los hooks useState del fiber buscando el estado de la carrera.
     * El estado de la carrera tiene la forma: { phase, player: { overall, ... }, ... }
     */
    function patchState(fiber, depth) {
        depth = depth || 0;
        if (!fiber || depth > 30) return null;

        if (fiber.memoizedState) {
            let hook = fiber.memoizedState;
            let hookIndex = 0;
            while (hook) {
                if (hook.memoizedState && typeof hook.memoizedState === 'object') {
                    const state = hook.memoizedState;

                    // Caso 1: el estado ES la carrera (tiene un player con overall)
                    if (state.player && typeof state.player === 'object' && 'overall' in state.player) {
                        console.log('[99] encontré el estado de la carrera en el hook #' + hookIndex);
                        console.log('[99] player.overall antes:', state.player.overall);
                        state.player.overall = 99;
                        console.log('[99] player.overall ahora:', state.player.overall);
                        return state;
                    }

                    // Caso 2: el estado contiene el player en otra posición (defensivo)
                    if (state.state && state.state.player) {
                        console.log('[99] encontré state.state.player');
                        state.state.player.overall = 99;
                        return state.state;
                    }
                }
                hook = hook.next;
                hookIndex++;
            }
        }

        if (fiber.return) {
            return patchState(fiber.return, depth + 1);
        }
        return null;
    }

    /**
     * Aplica el parche al estado de React de la carrera.
     * Devuelve true si encontró y modificó el player.
     */
    function applyPatch() {
        const containers = document.querySelectorAll('[data-career-phase]');
        if (containers.length === 0) {
            return false;
        }

        for (const container of containers) {
            const fiber = findReactFiber(container);
            if (!fiber) continue;

            const patched = patchState(fiber);
            if (patched) {
                return true;
            }
        }
        return false;
    }

    // Intentar aplicar el parche cada 500 ms.
    // El estado de React se reemplaza en cada renderizado, así que hay que
    // volver a aplicarlo constantemente para que el clamp del reducer no baje el OVR.
    let attempts = 0;
    let patched = false;

    const interval = setInterval(function () {
        attempts++;
        if (applyPatch()) {
            if (!patched) {
                console.log('[99] PARCHE aplicado en el intento #' + attempts);
                patched = true;
            }
            // Volver a aplicar constantemente para mantener el OVR en 99
            applyPatch();
        } else if (attempts > 20) {
            console.log('[99] no encontré el contenedor [data-career-phase] después de 20 intentos.');
            console.log('[99] Asegúrate de estar en la pantalla del simulador de carrera.');
            clearInterval(interval);
        }
    }, 500);
})();
