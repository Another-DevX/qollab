const fmt = (x, d) => {
    const s = x.toFixed(d);
    // evita "-0.000"
    return (/^-0\.?0*$/.test(s) ? s.slice(1) : s).replace('-', '−');
};
export const formatNum = (x, digits = 3) => fmt(x, digits);
export const formatVec = (r, digits = 3) => `(${r.map((c) => fmt(c, digits)).join(', ')})`;
export const toDeg = (rad) => (rad * 180) / Math.PI;
/** "0.79 rad (45.0°)" */
export const formatAngle = (rad) => `${fmt(rad, 2)} rad (${fmt(toDeg(rad), 1)}°)`;
