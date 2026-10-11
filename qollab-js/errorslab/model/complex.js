/**
 * Número complejo inmutable mínimo (sin dependencias).
 * Se usa para representar amplitudes del espinor |ψ⟩ = a|0⟩ + b|1⟩
 * y las entradas de las matrices SU(2).
 */
export class Complex {
    constructor(re = 0, im = 0) {
        this.re = re;
        this.im = im;
    }
    /** r·e^{iφ} */
    static fromPolar(r, phi) {
        return new Complex(r * Math.cos(phi), r * Math.sin(phi));
    }
    add(o) {
        return new Complex(this.re + o.re, this.im + o.im);
    }
    sub(o) {
        return new Complex(this.re - o.re, this.im - o.im);
    }
    mul(o) {
        return new Complex(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re);
    }
    scale(s) {
        return new Complex(this.re * s, this.im * s);
    }
    conj() {
        return new Complex(this.re, -this.im);
    }
    /** |z|² */
    abs2() {
        return this.re * this.re + this.im * this.im;
    }
    abs() {
        return Math.hypot(this.re, this.im);
    }
}
Complex.ZERO = new Complex(0, 0);
Complex.ONE = new Complex(1, 0);
Complex.I = new Complex(0, 1);
