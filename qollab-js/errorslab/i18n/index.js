const es = {
    'app.title': 'Errores sistemáticos en compuertas de un qubit',
    'app.subtitle': 'Simulación interactiva: compuertas como rotaciones en la esfera de Bloch',
    'app.langButton': 'English',
    'app.langAria': 'Cambiar idioma a inglés',
    'app.skip': 'Ir a la esfera de Bloch',
    'computer.title': 'Pantalla de computador',
    'computer.aria': 'Panel de control de la compuerta, dibujado como la pantalla de un computador',
    'computer.gate': 'Compuerta sugerida',
    'computer.theta': 'Ángulo θ de la compuerta',
    'computer.errorType': 'Tipo de error',
    'computer.errorX': 'Error X',
    'computer.errorY': 'Error Y (próximamente)',
    'computer.errorZ': 'Error Z (próximamente)',
    'computer.epsilon': 'Magnitud del error ε',
    'computer.errorModel': 'Modelo del error',
    'computer.modelAfter': 'Error tras la compuerta',
    'computer.modelAfterHint': 'U = Rₓ(ε)·U_ideal: primero la rotación ideal, luego una rotación extra.',
    'computer.modelControl': 'Error en el control (Hamiltoniano)',
    'computer.modelControlHint': 'U(t) = exp(−i t(α n·σ + ε σₓ)/2): toda la rotación ocurre alrededor de un eje desviado.',
    'computer.initial': 'Estado inicial',
    'computer.custom': 'Personalizado',
    'computer.customTheta': 'θ (polar)',
    'computer.customPhi': 'φ (azimut)',
    'computer.actions': 'Acciones',
    'computer.apply': 'Aplicar',
    'computer.step': 'Paso a paso',
    'computer.applyN': 'Aplicar N veces',
    'computer.nTimes': 'N',
    'computer.reset': 'Reiniciar',
    'computer.speed': 'Velocidad de la animación',
    'computer.readouts': 'Lecturas',
    'computer.idealVector': 'Vector ideal',
    'computer.errVector': 'Vector con error',
    'computer.fidelity': 'Fidelidad F',
    'computer.angle': 'Ángulo entre vectores',
    'computer.applications': 'Aplicaciones',
    'computer.effectiveAxis': 'Eje efectivo',
    'computer.check': 'Rodrigues vs SU(2)',
    'computer.checkHint': 'Diferencia máxima entre los dos métodos de cálculo',
    'computer.chartTitle': 'Fidelidad tras cada aplicación',
    'computer.chartAria': 'Gráfica de la fidelidad F frente al número de aplicaciones',
    'computer.chartX': 'aplicaciones',
    'computer.status.idle': 'Listo',
    'computer.status.running': 'Aplicando la compuerta…',
    'computer.status.paused': 'En pausa: pulsa «Paso a paso» o «Aplicar» para continuar',
    'computer.status.phaseIdeal': 'Fase 1: rotación ideal',
    'computer.status.phaseKick': 'Fase 2: rotación extra por el error',
    'computer.status.max': 'Máximo de aplicaciones alcanzado: reinicia',
    'bloch.title': 'Esfera de Bloch',
    'bloch.aria': 'Esfera de Bloch 3D. Arrastra o usa las flechas del teclado para girar la cámara.',
    'bloch.show': 'Mostrar',
    'bloch.trajectories': 'Trayectorias',
    'bloch.rotationAxes': 'Ejes de rotación',
    'bloch.errorVector': 'Vector con error',
    'bloch.resetView': 'Restablecer vista',
    'bloch.legend': 'Leyenda',
    'bloch.legendIdeal': 'Estado ideal',
    'bloch.legendErr': 'Estado con error',
    'bloch.legendIdealTraj': 'Trayectoria ideal',
    'bloch.legendErrTraj': 'Trayectoria con error (discontinua)',
    'bloch.legendIdealAxis': 'Eje de rotación ideal',
    'bloch.legendErrAxis': 'Eje efectivo con error',
    'bloch.hint': 'Arrastra para girar · rueda o pellizco para acercar · flechas del teclado',
    'bloch.describe': 'Vector ideal {ideal}. Vector con error {err}. Fidelidad {f}.',
    'footer.text': 'Inspirado en las simulaciones PhET (Universidad de Colorado Boulder). Los errores aquí son sistemáticos y coherentes: el estado siempre permanece en la superficie de la esfera.',
};
const en = {
    'app.title': 'Systematic errors in single-qubit gates',
    'app.subtitle': 'Interactive simulation: gates as rotations on the Bloch sphere',
    'app.langButton': 'Español',
    'app.langAria': 'Switch language to Spanish',
    'app.skip': 'Skip to the Bloch sphere',
    'computer.title': 'Computer screen',
    'computer.aria': 'Gate control panel, drawn as a computer screen',
    'computer.gate': 'Suggested gate',
    'computer.theta': 'Gate angle θ',
    'computer.errorType': 'Error type',
    'computer.errorX': 'X error',
    'computer.errorY': 'Y error (coming soon)',
    'computer.errorZ': 'Z error (coming soon)',
    'computer.epsilon': 'Error magnitude ε',
    'computer.errorModel': 'Error model',
    'computer.modelAfter': 'Error after the gate',
    'computer.modelAfterHint': 'U = Rₓ(ε)·U_ideal: first the ideal rotation, then an extra rotation.',
    'computer.modelControl': 'Control error (Hamiltonian)',
    'computer.modelControlHint': 'U(t) = exp(−i t(α n·σ + ε σₓ)/2): the whole rotation happens about a tilted axis.',
    'computer.initial': 'Initial state',
    'computer.custom': 'Custom',
    'computer.customTheta': 'θ (polar)',
    'computer.customPhi': 'φ (azimuth)',
    'computer.actions': 'Actions',
    'computer.apply': 'Apply',
    'computer.step': 'Step by step',
    'computer.applyN': 'Apply N times',
    'computer.nTimes': 'N',
    'computer.reset': 'Reset',
    'computer.speed': 'Animation speed',
    'computer.readouts': 'Readouts',
    'computer.idealVector': 'Ideal vector',
    'computer.errVector': 'Vector with error',
    'computer.fidelity': 'Fidelity F',
    'computer.angle': 'Angle between vectors',
    'computer.applications': 'Applications',
    'computer.effectiveAxis': 'Effective axis',
    'computer.check': 'Rodrigues vs SU(2)',
    'computer.checkHint': 'Largest difference between the two calculation methods',
    'computer.chartTitle': 'Fidelity after each application',
    'computer.chartAria': 'Chart of fidelity F versus number of applications',
    'computer.chartX': 'applications',
    'computer.status.idle': 'Ready',
    'computer.status.running': 'Applying the gate…',
    'computer.status.paused': 'Paused: press “Step by step” or “Apply” to continue',
    'computer.status.phaseIdeal': 'Phase 1: ideal rotation',
    'computer.status.phaseKick': 'Phase 2: extra rotation from the error',
    'computer.status.max': 'Maximum number of applications reached: reset',
    'bloch.title': 'Bloch sphere',
    'bloch.aria': '3D Bloch sphere. Drag or use the arrow keys to rotate the camera.',
    'bloch.show': 'Show',
    'bloch.trajectories': 'Trajectories',
    'bloch.rotationAxes': 'Rotation axes',
    'bloch.errorVector': 'Vector with error',
    'bloch.resetView': 'Reset view',
    'bloch.legend': 'Legend',
    'bloch.legendIdeal': 'Ideal state',
    'bloch.legendErr': 'State with error',
    'bloch.legendIdealTraj': 'Ideal trajectory',
    'bloch.legendErrTraj': 'Trajectory with error (dashed)',
    'bloch.legendIdealAxis': 'Ideal rotation axis',
    'bloch.legendErrAxis': 'Effective axis with error',
    'bloch.hint': 'Drag to rotate · wheel or pinch to zoom · keyboard arrows',
    'bloch.describe': 'Ideal vector {ideal}. Vector with error {err}. Fidelity {f}.',
    'footer.text': 'Inspired by the PhET simulations (University of Colorado Boulder). The errors here are systematic and coherent: the state always stays on the surface of the sphere.',
};
const dictionaries = { es, en };
let current = 'es';
const listeners = new Set();
export function t(key, vars) {
    let s = dictionaries[current][key];
    if (vars)
        for (const [k, v] of Object.entries(vars))
            s = s.replace(`{${k}}`, v);
    return s;
}
export const getLang = () => current;
export function setLang(l) {
    current = l;
    document.documentElement.lang = l;
    document.title = t('app.title');
    translateDom(document.body);
    for (const fn of listeners)
        fn(l);
}
export function onLangChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
export function translateDom(root) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
        el.title = t(el.dataset.i18nTitle);
    });
}
