/**
 * Mini gráfica SVG de F frente al número de aplicaciones (j = 0..k).
 * El eje y se ajusta automáticamente: [min(F) redondeado hacia abajo, 1].
 */
import { t } from '../i18n/index.js';
import { el } from '../ui/controls.js';
const NS = 'http://www.w3.org/2000/svg';
const W = 320;
const H = 150;
const PAD = { l: 54, r: 10, t: 10, b: 30 };
const svgEl = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs))
        e.setAttribute(k, String(v));
    return e;
};
export class FidelityChart {
    constructor() {
        this.svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img' });
        this.desc = el('p', { class: 'visually-hidden', 'aria-live': 'off' });
        this.root = el('div', { class: 'chart-wrap' }, [this.svg, this.desc]);
    }
    update(history, xMax) {
        const svg = this.svg;
        svg.replaceChildren();
        svg.setAttribute('aria-label', t('computer.chartAria'));
        const n = Math.max(xMax, history.length - 1, 1);
        const fMin = Math.min(...history);
        // límite inferior "bonito": 0.9, 0.8, ..., 0
        const yMin = fMin > 0.99 ? 0.98 : Math.max(0, Math.floor(fMin * 10 - 1e-9) / 10);
        const x = (j) => PAD.l + ((W - PAD.l - PAD.r) * j) / n;
        const y = (f) => PAD.t + ((H - PAD.t - PAD.b) * (1 - f)) / (1 - yMin);
        // rejilla y etiquetas del eje y
        const yTicks = [yMin, (yMin + 1) / 2, 1];
        for (const f of yTicks) {
            svg.append(svgEl('line', { x1: PAD.l, x2: W - PAD.r, y1: y(f), y2: y(f), class: 'chart-grid' }));
            const lbl = svgEl('text', { x: PAD.l - 6, y: y(f) + 4, class: 'chart-tick', 'text-anchor': 'end' });
            lbl.textContent = f.toFixed(yMin >= 0.9 ? 3 : 2);
            svg.append(lbl);
        }
        // eje x
        const xStep = n <= 10 ? 1 : n <= 20 ? 2 : 5;
        for (let j = 0; j <= n; j += xStep) {
            const lbl = svgEl('text', { x: x(j), y: H - PAD.b + 14, class: 'chart-tick', 'text-anchor': 'middle' });
            lbl.textContent = String(j);
            svg.append(lbl);
        }
        const xl = svgEl('text', { x: (PAD.l + W - PAD.r) / 2, y: H - 3, class: 'chart-axis-label', 'text-anchor': 'middle' });
        xl.textContent = t('computer.chartX');
        svg.append(xl);
        const yl = svgEl('text', { x: 10, y: PAD.t + (H - PAD.t - PAD.b) / 2, class: 'chart-axis-label', 'text-anchor': 'middle', transform: `rotate(-90 10 ${PAD.t + (H - PAD.t - PAD.b) / 2})` });
        yl.textContent = 'F';
        svg.append(yl);
        // serie
        const pts = history.map((f, j) => `${x(j)},${y(f)}`).join(' ');
        svg.append(svgEl('polyline', { points: pts, class: 'chart-line' }));
        history.forEach((f, j) => {
            const c = svgEl('circle', { cx: x(j), cy: y(f), r: 3.5, class: 'chart-dot' });
            const title = svgEl('title', {});
            title.textContent = `${j}: F = ${f.toFixed(4)}`;
            c.append(title);
            svg.append(c);
        });
        this.desc.textContent = history.map((f, j) => `${j}: ${f.toFixed(3)}`).join('; ');
    }
}
