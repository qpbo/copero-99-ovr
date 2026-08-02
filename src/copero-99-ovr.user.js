// ==UserScript==
// @name         Copero 99 OVR
// @namespace    copero-99-ovr
// @version      1.0.0
// @description  Fuerza el OVR del jugador a 99 en el Simulador de Carrera de Copero
// @author       copero-99-ovr contributors
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
     * React guarda referencias internas con prefijo __reactFiber$.
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
     * Recorre los useState hooks del fiber buscando el state del career.
     * El career state tiene la forma: { phase, player: { overall, ... }, ... }
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

                    // Caso 1: el state ES el career (tiene player con overall)
                    if (state.player && typeof state.player === 'object' && 'overall' in state.player) {
                        console.log('[99] encontre career state en hook #' + hookIndex);
                        console.log('[99] player.overall antes:', state.player.overall);
                        state.player.overall = 99;
                        console.log('[99] player.overall ahora:', state.player.overall);
                        return state;
                    }

                    // Caso 2: el state contiene player en otra posicion (defensivo)
                    if (state.state && state.state.player) {
                        console.log('[99] encontre state.state.player');
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
     * Aplica el patch al state de React del career.
     * Retorna true si encontro y modifico el player.
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

    // Intentar aplicar el patch cada 500ms.
    // El state de React se reemplaza en cada render, asi que hay que
    // re-aplicar constantemente para que el clamp del reducer no baje el OVR.
    let attempts = 0;
    let patched = false;

    const interval = setInterval(function () {
        attempts++;
        if (applyPatch()) {
            if (!patched) {
                console.log('[99] PATCH aplicado en intento #' + attempts);
                patched = true;
            }
            // Re-aplicar constantemente para mantener el OVR en 99
            applyPatch();
        } else if (attempts > 20) {
            console.log('[99] no encontre contenedor [data-career-phase] despues de 20 intentos.');
            console.log('[99] Asegurate de estar en la pantalla del career simulator.');
            clearInterval(interval);
        }
    }, 500);
})();
