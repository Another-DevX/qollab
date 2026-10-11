export const X_HAT = [1, 0, 0];
export const Y_HAT = [0, 1, 0];
export const Z_HAT = [0, 0, 1];
export const add = (u, v) => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
export const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
export const scale = (u, s) => [u[0] * s, u[1] * s, u[2] * s];
export const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
export const cross = (u, v) => [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
];
export const norm = (u) => Math.hypot(u[0], u[1], u[2]);
export const normalize = (u) => {
    const n = norm(u);
    return n === 0 ? [0, 0, 1] : scale(u, 1 / n);
};
export const distance = (u, v) => norm(sub(u, v));
/** Ángulo entre dos vectores (rad), robusto frente a errores de redondeo. */
export const angleBetween = (u, v) => {
    const c = dot(u, v) / (norm(u) * norm(v));
    return Math.acos(Math.min(1, Math.max(-1, c)));
};
