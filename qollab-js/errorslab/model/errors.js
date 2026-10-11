/**
 * Errores SISTEMÁTICOS y COHERENTES (unitarios) en una compuerta de un qubit.
 *
 * - Sistemático: el error es determinista, idéntico en cada aplicación (no hay azar).
 * - Coherente/puro: la compuerta con error sigue siendo unitaria, así que el estado
 *   sigue siendo puro y |r| = 1: el vector nunca entra al interior de la esfera.
 *   (Un error estocástico/incoherente, en cambio, mezclaría estados y acortaría r.)
 *
 * Dos modelos de error, para un eje de error e (por ahora sólo e = x̂, "Error X"):
 *
 *  a) 'after'   — error tras la compuerta:   U_err = R_e(ε) · U_ideal
 *                 Primero ocurre la rotación ideal y luego una rotación extra R_e(ε).
 *
 *  b) 'control' — error en el control (Hamiltoniano):
 *                 U_err(t) = exp(−i t (α n·σ + ε e·σ)/2),  t ∈ [0, 1]
 *                 Como (α n + ε e)·σ = |v| (v̂·σ) con v = α n + ε e, esto es
 *                 una rotación de ángulo |v| alrededor del eje desviado v̂.
 *                 La trayectoria es un arco alrededor de un eje inclinado.
 */
import { gateRotation } from './gates.js';
import { axisAngleFromSU2, rodrigues, su2 } from './rotation.js';
import { X_HAT, Y_HAT, Z_HAT, add, dot, norm, scale } from './vec3.js';
export const ERROR_AXES = { X: X_HAT, Y: Y_HAT, Z: Z_HAT };
/** Duración relativa de la "patada" de error en el modelo 'after'. */
export const AFTER_KICK_DURATION = 0.5;
export function buildApplication(p) {
    const ideal = gateRotation(p.gate, p.gateTheta);
    const e = ERROR_AXES[p.errorAxis];
    const uIdeal = su2(ideal.axis, ideal.angle);
    const idealSeg = { ...ideal, t0: 0, t1: 1 };
    if (p.errorModel === 'after') {
        const kick = { axis: e, angle: p.epsilon };
        const uErr = su2(e, p.epsilon).mul(uIdeal);
        const duration = 1 + AFTER_KICK_DURATION;
        return {
            duration,
            idealSegments: [idealSeg],
            errSegments: [idealSeg, { ...kick, t0: 1, t1: duration }],
            stepMarks: [1, duration],
            ideal,
            effective: alignWith(axisAngleFromSU2(uErr), ideal.axis),
            uIdeal,
            uErr,
        };
    }
    // Modelo 'control': v = α n + ε e  →  rotación de ángulo |v| alrededor de v/|v|
    const effective = controlEffectiveRotation(ideal, e, p.epsilon);
    return {
        duration: 1,
        idealSegments: [idealSeg],
        errSegments: [{ ...effective, t0: 0, t1: 1 }],
        stepMarks: [0.25, 0.5, 0.75, 1],
        ideal,
        effective,
        uIdeal,
        uErr: su2(effective.axis, effective.angle),
    };
}
/**
 * La rotación (n, α) es la misma que (−n, 2π − α). Para que el eje efectivo se
 * compare fácilmente con el ideal, elegimos el representante que apunta hacia el
 * mismo hemisferio que el eje ideal (p. ej. X con error: x̂ y π + ε, no −x̂ y π − ε).
 */
function alignWith(r, ref) {
    if (r.angle === 0 || dot(r.axis, ref) >= 0)
        return r;
    return { axis: scale(r.axis, -1), angle: 2 * Math.PI - r.angle };
}
/** Eje y ángulo efectivos del modelo de error en el Hamiltoniano (fórmula cerrada). */
export function controlEffectiveRotation(ideal, e, epsilon) {
    const v = add(scale(ideal.axis, ideal.angle), scale(e, epsilon));
    const len = norm(v);
    if (len < 1e-12)
        return { axis: ideal.axis, angle: 0 };
    return { axis: scale(v, 1 / len), angle: len };
}
/** Estado tras recorrer los tramos hasta el instante t (Rodrigues tramo a tramo). */
export function evolve(r0, segments, t) {
    let r = r0;
    for (const s of segments) {
        if (t <= s.t0)
            break;
        const f = Math.min(1, (t - s.t0) / (s.t1 - s.t0));
        r = rodrigues(r, s.axis, f * s.angle);
    }
    return r;
}
/** Puntos de la trayectoria entre t = 0 y t = tEnd (incluidos ambos extremos). */
export function sampleTrajectory(r0, segments, tEnd, perUnit = 90) {
    const n = Math.max(2, Math.ceil(tEnd * perUnit));
    const pts = [];
    for (let i = 0; i <= n; i++)
        pts.push(evolve(r0, segments, (tEnd * i) / n));
    return pts;
}
