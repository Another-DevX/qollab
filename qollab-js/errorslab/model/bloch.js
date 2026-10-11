/**
 * Conversión entre espinor y vector de Bloch para estados PUROS.
 *
 *   |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
 *   r   = (sinθ cosφ, sinθ sinφ, cosθ),   |r| = 1
 */
import { Complex } from './complex.js';
import { dot } from './vec3.js';
export function spinorFromAngles(theta, phi) {
    return [new Complex(Math.cos(theta / 2), 0), Complex.fromPolar(Math.sin(theta / 2), phi)];
}
export function blochFromAngles(theta, phi) {
    return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
}
/** Ángulos (θ, φ) de un vector de Bloch unitario. */
export function anglesFromBloch(r) {
    const theta = Math.acos(Math.min(1, Math.max(-1, r[2])));
    let phi = Math.atan2(r[1], r[0]);
    if (phi < 0)
        phi += 2 * Math.PI;
    return { theta, phi };
}
/**
 * r = (⟨σx⟩, ⟨σy⟩, ⟨σz⟩) con |ψ⟩ = a|0⟩ + b|1⟩:
 *   x = 2 Re(a* b),  y = 2 Im(a* b),  z = |a|² − |b|²
 * (independiente de la fase global).
 */
export function blochFromSpinor([a, b]) {
    const ab = a.conj().mul(b);
    const n = a.abs2() + b.abs2();
    return [(2 * ab.re) / n, (2 * ab.im) / n, (a.abs2() - b.abs2()) / n];
}
export function spinorFromBloch(r) {
    const { theta, phi } = anglesFromBloch(r);
    return spinorFromAngles(theta, phi);
}
/** Fidelidad entre estados puros a partir de los vectores de Bloch: F = (1 + r1·r2)/2 */
export function fidelityBloch(r1, r2) {
    return (1 + dot(r1, r2)) / 2;
}
/** Fidelidad entre estados puros a partir de los espinores: F = |⟨ψ1|ψ2⟩|² */
export function fidelitySpinor([a1, b1], [a2, b2]) {
    return a1.conj().mul(a2).add(b1.conj().mul(b2)).abs2();
}
