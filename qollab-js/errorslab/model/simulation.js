/**
 * Modelo único compartido por las dos vistas (patrón observador).
 *
 * El modelo guarda los parámetros y el número k de aplicaciones completadas.
 * Los estados tras cada aplicación se RECALCULAN a partir del estado inicial
 * cuando cambian ε o el modelo de error: así, al mover el deslizador de ε se ve en
 * vivo cómo cambia el resultado de las k aplicaciones ya hechas.
 * Cambiar la compuerta o el estado inicial reinicia k a 0.
 *
 * El tiempo de animación se avanza con tick(dt), que llama main.ts desde
 * requestAnimationFrame (así el modelo se puede probar sin navegador).
 */
import { blochFromAngles, blochFromSpinor, fidelityBloch, spinorFromAngles } from './bloch.js';
import { buildApplication, evolve, sampleTrajectory } from './errors.js';
import { distance } from './vec3.js';
/** (θ, φ) de los estados de la base de cada eje. */
export const PRESETS = {
    zero: { theta: 0, phi: 0 },
    one: { theta: Math.PI, phi: 0 },
    plus: { theta: Math.PI / 2, phi: 0 },
    minus: { theta: Math.PI / 2, phi: Math.PI },
    plusI: { theta: Math.PI / 2, phi: Math.PI / 2 },
    minusI: { theta: Math.PI / 2, phi: (3 * Math.PI) / 2 },
};
export const MAX_APPLICATIONS = 40;
export const MAX_N = 20;
/** Segundos por unidad de "tiempo de compuerta" a velocidad 1×. */
export const SECONDS_PER_UNIT = 1.6;
export class SimModel {
    constructor() {
        // ---- parámetros ----
        this.params = { gate: 'X', gateTheta: Math.PI / 2, errorAxis: 'X', epsilon: 0.2, errorModel: 'after' };
        this.preset = 'zero';
        this.customTheta = Math.PI / 3;
        this.customPhi = Math.PI / 4;
        this.n = 8;
        this.speed = 1;
        this.display = { trajectories: true, rotationAxes: true, errorVector: true };
        // ---- estado derivado ----
        /** Aplicaciones completadas */
        this.k = 0;
        /** idealStates[j], errStates[j]: vectores tras j aplicaciones (j = 0..k) */
        this.idealStates = [];
        this.errStates = [];
        /** Lo mismo, calculado por el camino de matrices SU(2) sobre espinores. */
        this.idealSpinors = [];
        this.errSpinors = [];
        this.anim = null;
        this.completedIdealTraj = [];
        this.completedErrTraj = [];
        this.listeners = new Set();
        this.rebuild(true);
    }
    // ================= observador =================
    subscribe(fn) {
        this.listeners.add(fn);
        fn(this);
        return () => this.listeners.delete(fn);
    }
    emit() {
        for (const fn of this.listeners)
            fn(this);
    }
    // ================= setters =================
    setGate(g) {
        this.params = { ...this.params, gate: g };
        this.rebuild(true);
    }
    setGateTheta(theta) {
        this.params = { ...this.params, gateTheta: theta };
        this.rebuild(true);
    }
    setEpsilon(eps) {
        this.params = { ...this.params, epsilon: eps };
        this.rebuild(false);
    }
    setErrorAxis(a) {
        this.params = { ...this.params, errorAxis: a };
        this.rebuild(false);
    }
    setErrorModel(m) {
        this.params = { ...this.params, errorModel: m };
        this.rebuild(false);
    }
    setPreset(p) {
        this.preset = p;
        this.rebuild(true);
    }
    setCustom(theta, phi) {
        this.customTheta = theta;
        this.customPhi = phi;
        this.preset = 'custom';
        this.rebuild(true);
    }
    setN(n) {
        this.n = Math.max(1, Math.min(MAX_N, Math.round(n)));
        this.emit();
    }
    setSpeed(s) {
        this.speed = s;
        this.emit();
    }
    setDisplay(opt) {
        this.display = { ...this.display, ...opt };
        this.emit();
    }
    // ================= acciones =================
    /** Anima una aplicación completa (o termina la que está en pausa). */
    apply() {
        if (this.anim) {
            this.anim.stopAt = this.app.duration;
            this.anim.paused = false;
        }
        else {
            if (this.k >= MAX_APPLICATIONS)
                return;
            this.anim = { t: 0, stopAt: this.app.duration, targetK: this.k + 1, paused: false };
        }
        this.emit();
    }
    /** Avanza hasta la siguiente marca de paso (fases de la compuerta). */
    step() {
        if (!this.anim) {
            if (this.k >= MAX_APPLICATIONS)
                return;
            this.anim = { t: 0, stopAt: 0, targetK: this.k + 1, paused: true };
        }
        const next = this.app.stepMarks.find((m) => m > this.anim.t + 1e-9) ?? this.app.duration;
        this.anim.stopAt = next;
        this.anim.paused = false;
        this.emit();
    }
    /** Reinicia y aplica la compuerta N veces seguidas (con el error en cada una). */
    applyN() {
        this.k = 0;
        this.rebuild(false, true);
        this.anim = { t: 0, stopAt: this.app.duration, targetK: this.n, paused: false };
        this.emit();
    }
    reset() {
        this.k = 0;
        this.rebuild(true);
    }
    /** Avanza la animación dt segundos. Devuelve true si algo cambió. */
    tick(dt) {
        const a = this.anim;
        if (!a || a.paused)
            return false;
        a.t += (dt * this.speed) / SECONDS_PER_UNIT;
        if (a.t >= a.stopAt) {
            a.t = a.stopAt;
            if (a.t >= this.app.duration - 1e-12) {
                this.completeApplication();
                if (this.k < a.targetK && this.k < MAX_APPLICATIONS) {
                    a.t = 0;
                    a.stopAt = this.app.duration;
                }
                else {
                    this.anim = null;
                }
            }
            else {
                a.paused = true;
            }
        }
        this.emit();
        return true;
    }
    // ================= lecturas =================
    get isAnimating() {
        return this.anim !== null && !this.anim.paused;
    }
    get initialState() {
        return this.preset === 'custom' ? { theta: this.customTheta, phi: this.customPhi } : PRESETS[this.preset];
    }
    /** Vector ideal en este instante (incluye la animación en curso). */
    get idealNow() {
        const r = this.idealStates[this.k];
        return this.anim ? evolve(r, this.app.idealSegments, this.anim.t) : r;
    }
    get errNow() {
        const r = this.errStates[this.k];
        return this.anim ? evolve(r, this.app.errSegments, this.anim.t) : r;
    }
    get fidelityNow() {
        return fidelityBloch(this.idealNow, this.errNow);
    }
    /** F tras cada aplicación completada: j = 0..k */
    get fidelityHistory() {
        return this.idealStates.map((r, j) => fidelityBloch(r, this.errStates[j]));
    }
    /**
     * Máxima diferencia entre el camino de Rodrigues y el de matrices SU(2)
     * (debería ser ~1e-15: sirve como verificación visible en la interfaz).
     */
    get pathDiscrepancy() {
        let d = 0;
        for (let j = 0; j <= this.k; j++) {
            d = Math.max(d, distance(this.idealStates[j], blochFromSpinor(this.idealSpinors[j])));
            d = Math.max(d, distance(this.errStates[j], blochFromSpinor(this.errSpinors[j])));
        }
        return d;
    }
    /** Trayectorias acumuladas (aplicaciones completadas + la que está en curso). */
    trajectories() {
        const ideal = this.completedIdealTraj.flat();
        const err = this.completedErrTraj.flat();
        if (this.anim && this.anim.t > 0) {
            ideal.push(...sampleTrajectory(this.idealStates[this.k], this.app.idealSegments, this.anim.t));
            err.push(...sampleTrajectory(this.errStates[this.k], this.app.errSegments, this.anim.t));
        }
        return { ideal, err };
    }
    // ================= interno =================
    completeApplication() {
        const ri = this.idealStates[this.k];
        const re = this.errStates[this.k];
        this.completedIdealTraj.push(sampleTrajectory(ri, this.app.idealSegments, this.app.duration));
        this.completedErrTraj.push(sampleTrajectory(re, this.app.errSegments, this.app.duration));
        this.idealStates.push(evolve(ri, this.app.idealSegments, this.app.duration));
        this.errStates.push(evolve(re, this.app.errSegments, this.app.duration));
        this.idealSpinors.push(this.app.uIdeal.apply(this.idealSpinors[this.k]));
        this.errSpinors.push(this.app.uErr.apply(this.errSpinors[this.k]));
        this.k++;
    }
    /**
     * Recalcula la aplicación y los estados tras k aplicaciones.
     * @param resetK  si es true, vuelve a k = 0
     */
    rebuild(resetK, silent = false) {
        if (resetK)
            this.k = 0;
        this.anim = null;
        this.app = buildApplication(this.params);
        const { theta, phi } = this.initialState;
        const targetK = this.k;
        this.k = 0;
        this.idealStates = [blochFromAngles(theta, phi)];
        this.errStates = [blochFromAngles(theta, phi)];
        this.idealSpinors = [spinorFromAngles(theta, phi)];
        this.errSpinors = [spinorFromAngles(theta, phi)];
        this.completedIdealTraj = [];
        this.completedErrTraj = [];
        while (this.k < targetK)
            this.completeApplication();
        if (!silent)
            this.emit();
    }
}
