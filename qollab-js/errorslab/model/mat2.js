import { Complex } from './complex.js';
/**
 * Matriz compleja 2×2, almacenada por filas:
 *   | a  b |
 *   | c  d |
 */
export class Mat2 {
    constructor(a, b, c, d) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    }
    static identity() {
        return new Mat2(Complex.ONE, Complex.ZERO, Complex.ZERO, Complex.ONE);
    }
    /** Matrices de Pauli σx, σy, σz */
    static pauliX() {
        return new Mat2(Complex.ZERO, Complex.ONE, Complex.ONE, Complex.ZERO);
    }
    static pauliY() {
        return new Mat2(Complex.ZERO, new Complex(0, -1), Complex.I, Complex.ZERO);
    }
    static pauliZ() {
        return new Mat2(Complex.ONE, Complex.ZERO, Complex.ZERO, new Complex(-1, 0));
    }
    add(m) {
        return new Mat2(this.a.add(m.a), this.b.add(m.b), this.c.add(m.c), this.d.add(m.d));
    }
    scale(s) {
        const k = typeof s === 'number' ? new Complex(s, 0) : s;
        return new Mat2(this.a.mul(k), this.b.mul(k), this.c.mul(k), this.d.mul(k));
    }
    /** Producto matricial this · m */
    mul(m) {
        return new Mat2(this.a.mul(m.a).add(this.b.mul(m.c)), this.a.mul(m.b).add(this.b.mul(m.d)), this.c.mul(m.a).add(this.d.mul(m.c)), this.c.mul(m.b).add(this.d.mul(m.d)));
    }
    dagger() {
        return new Mat2(this.a.conj(), this.c.conj(), this.b.conj(), this.d.conj());
    }
    apply([x, y]) {
        return [this.a.mul(x).add(this.b.mul(y)), this.c.mul(x).add(this.d.mul(y))];
    }
    /** Norma de Frobenius (para comparar matrices en los tests). */
    norm() {
        return Math.sqrt(this.a.abs2() + this.b.abs2() + this.c.abs2() + this.d.abs2());
    }
    /**
     * Exponencial matricial genérica e^M por "escalado y cuadrado" + serie de Taylor.
     * No usa la fórmula cerrada de SU(2) a propósito: sirve como verificación
     * independiente en los tests (modelo de error en el Hamiltoniano).
     */
    static expm(m) {
        // Escalar para que ‖M/2^s‖ < 0.5 y la serie converja rápido.
        const s = Math.max(0, Math.ceil(Math.log2(m.norm() / 0.5)));
        const ms = m.scale(1 / 2 ** s);
        let term = Mat2.identity();
        let sum = Mat2.identity();
        for (let k = 1; k <= 20; k++) {
            term = term.mul(ms).scale(1 / k);
            sum = sum.add(term);
        }
        for (let i = 0; i < s; i++)
            sum = sum.mul(sum);
        return sum;
    }
}
