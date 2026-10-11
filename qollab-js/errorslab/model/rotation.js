/**
 * Rotaciones de un qubit por dos caminos independientes:
 *
 *  (1) Fórmula de Rodrigues sobre el vector de Bloch r ∈ ℝ³.
 *  (2) Matriz SU(2)  R_n(α) = exp(−i α n·σ / 2) = cos(α/2) I − i sin(α/2) (n·σ)
 *      aplicada al espinor, convirtiendo después a vector de Bloch.
 *
 * Ambos describen lo mismo: la matriz SU(2) R_n(α) actúa sobre la esfera de Bloch
 * como una rotación (regla de la mano derecha) de ángulo α alrededor del eje n.
 * Los tests verifican que coinciden.
 */
import { Complex } from './complex.js';
import { Mat2 } from './mat2.js';
import { add, cross, dot, norm, normalize, scale } from './vec3.js';
/**
 * Rodrigues: rota v un ángulo a alrededor del eje unitario n.
 *   v' = v cos a + (n × v) sin a + n (n·v)(1 − cos a)
 */
export function rodrigues(v, n, a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return add(add(scale(v, c), scale(cross(n, v), s)), scale(n, dot(n, v) * (1 - c)));
}
/** R_n(α) = cos(α/2) I − i sin(α/2)(nx σx + ny σy + nz σz) */
export function su2(n, alpha) {
    const c = Math.cos(alpha / 2);
    const s = Math.sin(alpha / 2);
    const [nx, ny, nz] = n;
    // −i s (n·σ) = −i s [[nz, nx − i ny], [nx + i ny, −nz]]
    return new Mat2(new Complex(c, -s * nz), new Complex(-s * ny, -s * nx), new Complex(s * ny, -s * nx), new Complex(c, s * nz));
}
/**
 * Generador n·σ escrito con matrices de Pauli genéricas (sin la fórmula cerrada).
 * Se usa con Mat2.expm para verificar el modelo de error en el Hamiltoniano.
 */
export function pauliDot(v) {
    return Mat2.pauliX()
        .scale(v[0])
        .add(Mat2.pauliY().scale(v[1]))
        .add(Mat2.pauliZ().scale(v[2]));
}
/**
 * Extrae eje y ángulo de una matriz U ∈ SU(2) (o U(2) con fase global).
 * Escribimos U = e^{iγ}(a0 I − i a·σ) con a0 = cos(α/2), a = sin(α/2) n.
 * Primero se elimina la fase global dividiendo por √det(U).
 * Devuelve la rotación equivalente en la esfera con α ∈ [0, π] y eje unitario
 * (eje arbitrario ẑ si α ≈ 0).
 */
export function axisAngleFromSU2(u) {
    // Quitar la fase global: det(U) = e^{2iγ}
    const det = u.a.mul(u.d).sub(u.b.mul(u.c));
    const halfPhase = Math.atan2(det.im, det.re) / 2;
    const v = u.scale(Complex.fromPolar(1, -halfPhase));
    const a0 = (v.a.re + v.d.re) / 2;
    const ax = -(v.b.im + v.c.im) / 2;
    const ay = (v.c.re - v.b.re) / 2;
    const az = (v.d.im - v.a.im) / 2;
    let vec = [ax, ay, az];
    const s = norm(vec);
    // α = 2·atan2(|a|, a0) ∈ [0, 2π]
    let angle = 2 * Math.atan2(s, a0);
    if (angle > Math.PI) {
        // Misma rotación en SO(3): ángulo 2π − α alrededor de −n (más fácil de leer)
        angle = 2 * Math.PI - angle;
        vec = scale(vec, -1);
    }
    if (s < 1e-12)
        return { axis: [0, 0, 1], angle: 0 };
    return { axis: normalize(vec), angle };
}
