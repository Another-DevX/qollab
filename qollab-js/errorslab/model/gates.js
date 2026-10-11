import { X_HAT, Y_HAT, Z_HAT } from './vec3.js';
export const GATE_IDS = ['X', 'Y', 'Z', 'H', 'S', 'T', 'Rx', 'Ry', 'Rz'];
/** ¿La compuerta usa un ángulo θ elegido por el usuario? */
export const isParametric = (g) => g === 'Rx' || g === 'Ry' || g === 'Rz';
const H_AXIS = [Math.SQRT1_2, 0, Math.SQRT1_2];
/** Eje n y ángulo α de la compuerta ideal. `theta` sólo se usa en Rx, Ry, Rz. */
export function gateRotation(g, theta = 0) {
    switch (g) {
        case 'X':
            return { axis: X_HAT, angle: Math.PI };
        case 'Y':
            return { axis: Y_HAT, angle: Math.PI };
        case 'Z':
            return { axis: Z_HAT, angle: Math.PI };
        case 'H':
            return { axis: H_AXIS, angle: Math.PI };
        case 'S':
            return { axis: Z_HAT, angle: Math.PI / 2 };
        case 'T':
            return { axis: Z_HAT, angle: Math.PI / 4 };
        case 'Rx':
            return { axis: X_HAT, angle: theta };
        case 'Ry':
            return { axis: Y_HAT, angle: theta };
        case 'Rz':
            return { axis: Z_HAT, angle: theta };
    }
}
