/**
 * Panel izquierdo: un monitor de computador (CSS) cuya pantalla contiene los
 * controles de la compuerta, del error y del estado inicial, las acciones y las
 * lecturas en vivo. Se suscribe al modelo y sólo actualiza textos/valores
 * (nunca reconstruye los controles, para no perder el foco del teclado).
 */
import { t } from '../i18n/index.js';
import { GATE_IDS, isParametric } from '../model/gates.js';
import { MAX_APPLICATIONS, MAX_N } from '../model/simulation.js';
import { angleBetween } from '../model/vec3.js';
import { button, el, i18nText, radioGroup, slider } from '../ui/controls.js';
import { formatAngle, formatNum, formatVec } from '../ui/format.js';
import { FidelityChart } from './fidelityChart.js';
const PI = Math.PI;
export class ComputerView {
    constructor(model) {
        this.model = model;
        this.readouts = new Map();
        this.chart = new FidelityChart();
        this.sync = [];
        const m = model;
        const screen = el('div', { class: 'screen-content' });
        // ---------- compuerta ----------
        const gates = radioGroup({
            legend: 'computer.gate',
            name: 'gate',
            cls: 'gate-group',
            options: GATE_IDS.map((g) => isParametric(g) ? { value: g, label: `${g}(θ)`, html: `R<sub>${g[1]}</sub>(θ)` } : { value: g, label: g }),
            value: m.params.gate,
            onChange: (g) => m.setGate(g),
        });
        const theta = slider({
            label: 'computer.theta',
            min: -PI,
            max: PI,
            step: 0.01,
            value: m.params.gateTheta,
            format: formatAngle,
            onInput: (v) => m.setGateTheta(v),
        });
        this.thetaBox = theta.root;
        const gateFormula = el('p', { class: 'formula' });
        this.readouts.set('gateFormula', gateFormula);
        this.sync.push(() => {
            gates.setValue(m.params.gate);
            theta.setValue(m.params.gateTheta);
        });
        // ---------- error ----------
        const errSelectId = 'error-type';
        const errSelect = el('select', { id: errSelectId });
        const errOpts = [
            { v: 'X', k: 'computer.errorX', disabled: false },
            // Estructura lista: basta con quitar `disabled` para habilitar Y y Z.
            { v: 'Y', k: 'computer.errorY', disabled: true },
            { v: 'Z', k: 'computer.errorZ', disabled: true },
        ];
        for (const o of errOpts) {
            const opt = el('option', { value: o.v });
            opt.dataset.i18n = o.k;
            opt.textContent = t(o.k);
            opt.disabled = o.disabled;
            errSelect.append(opt);
        }
        errSelect.value = m.params.errorAxis;
        errSelect.addEventListener('change', () => m.setErrorAxis(errSelect.value));
        const errType = el('div', { class: 'select-row' }, [
            el('label', { for: errSelectId, class: 'control-label' }, [i18nText('computer.errorType')]),
            errSelect,
        ]);
        const eps = slider({
            label: 'computer.epsilon',
            min: -PI / 2,
            max: PI / 2,
            step: 0.01,
            value: m.params.epsilon,
            format: formatAngle,
            onInput: (v) => m.setEpsilon(v),
        });
        const models = radioGroup({
            legend: 'computer.errorModel',
            name: 'errmodel',
            cls: 'stacked',
            options: [
                { value: 'after', label: 'computer.modelAfter', hint: 'computer.modelAfterHint' },
                { value: 'control', label: 'computer.modelControl', hint: 'computer.modelControlHint' },
            ],
            value: m.params.errorModel,
            onChange: (v) => m.setErrorModel(v),
        });
        const modelHint = el('p', { class: 'hint' });
        this.sync.push(() => {
            eps.setValue(m.params.epsilon);
            models.setValue(m.params.errorModel);
            errSelect.value = m.params.errorAxis;
            modelHint.textContent = t(m.params.errorModel === 'after' ? 'computer.modelAfterHint' : 'computer.modelControlHint');
        });
        // ---------- estado inicial ----------
        const presets = radioGroup({
            legend: 'computer.initial',
            name: 'preset',
            cls: 'preset-group',
            options: [
                { value: 'zero', label: '|0⟩' },
                { value: 'one', label: '|1⟩' },
                { value: 'plus', label: '|+⟩' },
                { value: 'minus', label: '|−⟩' },
                { value: 'plusI', label: '|+i⟩' },
                { value: 'minusI', label: '|−i⟩' },
                { value: 'custom', label: 'computer.custom' },
            ],
            value: m.preset,
            onChange: (p) => m.setPreset(p),
        });
        const cTheta = slider({
            label: 'computer.customTheta',
            min: 0,
            max: PI,
            step: 0.01,
            value: m.customTheta,
            format: formatAngle,
            onInput: (v) => m.setCustom(v, m.customPhi),
        });
        const cPhi = slider({
            label: 'computer.customPhi',
            min: 0,
            max: 2 * PI,
            step: 0.01,
            value: m.customPhi,
            format: formatAngle,
            onInput: (v) => m.setCustom(m.customTheta, v),
        });
        this.customBox = el('div', { class: 'custom-box' }, [cTheta.root, cPhi.root]);
        this.sync.push(() => {
            presets.setValue(m.preset);
            cTheta.setValue(m.customTheta);
            cPhi.setValue(m.customPhi);
        });
        // ---------- acciones ----------
        this.applyBtn = button('computer.apply', () => m.apply(), 'btn-primary');
        this.stepBtn = button('computer.step', () => m.step());
        const applyNBtn = button('computer.applyN', () => m.applyN(), 'btn-accent');
        const resetBtn = button('computer.reset', () => m.reset(), 'btn-reset');
        const nSlider = slider({
            label: 'computer.nTimes',
            min: 1,
            max: MAX_N,
            step: 1,
            value: m.n,
            format: (v) => `N = ${v}`,
            onInput: (v) => m.setN(v),
        });
        const speed = slider({
            label: 'computer.speed',
            min: 0.25,
            max: 3,
            step: 0.25,
            value: m.speed,
            format: (v) => `${v}×`,
            onInput: (v) => m.setSpeed(v),
        });
        this.status = el('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
        this.sync.push(() => {
            nSlider.setValue(m.n);
            speed.setValue(m.speed);
        });
        // ---------- lecturas ----------
        const readoutRow = (id, key, cls = '') => {
            const v = el('dd', { class: cls });
            this.readouts.set(id, v);
            return [i18nText(key, 'dt'), v];
        };
        this.fidelityBar = el('div', { class: 'fbar-fill' });
        const dl = el('dl', { class: 'readouts' }, [
            ...readoutRow('ideal', 'computer.idealVector', 'c-ideal'),
            ...readoutRow('err', 'computer.errVector', 'c-err'),
            ...readoutRow('fid', 'computer.fidelity', 'big'),
            ...readoutRow('angle', 'computer.angle'),
            ...readoutRow('count', 'computer.applications'),
            ...readoutRow('eff', 'computer.effectiveAxis'),
            ...readoutRow('check', 'computer.check', 'mono'),
        ]);
        const fbar = el('div', { class: 'fbar', 'aria-hidden': 'true' }, [this.fidelityBar]);
        // ---------- montaje ----------
        const section = (title, ...children) => el('section', { class: 'screen-section' }, [i18nText(title, 'h3'), ...children]);
        screen.append(el('div', { class: 'screen-titlebar', 'aria-hidden': 'true' }, [
            el('span', { class: 'dot d1' }),
            el('span', { class: 'dot d2' }),
            el('span', { class: 'dot d3' }),
            el('span', { class: 'titlebar-text' }, ['qubit_gate.exe']),
        ]), el('div', { class: 'screen-grid' }, [
            el('div', { class: 'screen-col' }, [
                el('section', { class: 'screen-section' }, [gates.root, this.thetaBox, gateFormula]),
                el('section', { class: 'screen-section' }, [errType, eps.root, models.root, modelHint]),
                el('section', { class: 'screen-section' }, [presets.root, this.customBox]),
            ]),
            el('div', { class: 'screen-col' }, [
                section('computer.actions', el('div', { class: 'btn-row' }, [this.applyBtn, this.stepBtn]), el('div', { class: 'btn-row n-row' }, [nSlider.root, applyNBtn]), el('div', { class: 'btn-row' }, [resetBtn]), speed.root, this.status),
                section('computer.readouts', dl, fbar),
                section('computer.chartTitle', this.chart.root),
            ]),
        ]));
        // Monitor: marco, pantalla, cuello y base
        this.root = el('div', { class: 'monitor' }, [
            el('div', { class: 'monitor-bezel' }, [
                el('div', { class: 'monitor-screen' }, [screen]),
                el('div', { class: 'monitor-chin', 'aria-hidden': 'true' }, [el('span', { class: 'power-led' })]),
            ]),
            el('div', { class: 'monitor-neck', 'aria-hidden': 'true' }),
            el('div', { class: 'monitor-base', 'aria-hidden': 'true' }),
        ]);
        model.subscribe(() => this.update());
    }
    update() {
        const m = this.model;
        for (const s of this.sync)
            s();
        this.thetaBox.hidden = !isParametric(m.params.gate);
        this.customBox.hidden = m.preset !== 'custom';
        const { ideal, effective } = m.app;
        this.readouts.get('gateFormula').textContent = `U = R_n(α):  n = ${formatVec(ideal.axis, 3)},  α = ${formatAngle(ideal.angle)}`;
        const ri = m.idealNow;
        const re = m.errNow;
        const f = m.fidelityNow;
        this.readouts.get('ideal').textContent = formatVec(ri);
        this.readouts.get('err').textContent = formatVec(re);
        this.readouts.get('fid').textContent = formatNum(f, 4);
        this.readouts.get('angle').textContent = formatAngle(angleBetween(ri, re));
        this.readouts.get('count').textContent = String(m.k);
        this.readouts.get('eff').textContent = `${formatVec(effective.axis, 3)}, ${formatAngle(effective.angle)}`;
        this.readouts.get('check').textContent = m.pathDiscrepancy.toExponential(1);
        this.readouts.get('check').title = t('computer.checkHint');
        this.fidelityBar.style.width = `${(f * 100).toFixed(1)}%`;
        // estado de la animación
        let s = 'computer.status.idle';
        if (m.anim) {
            if (m.anim.paused)
                s = 'computer.status.paused';
            else if (m.params.errorModel === 'after')
                s = m.anim.t < 1 ? 'computer.status.phaseIdeal' : 'computer.status.phaseKick';
            else
                s = 'computer.status.running';
        }
        else if (m.k >= MAX_APPLICATIONS)
            s = 'computer.status.max';
        const text = t(s) + (m.anim && m.anim.targetK > 1 ? ` (${m.k + 1}/${m.anim.targetK})` : '');
        if (this.status.textContent !== text)
            this.status.textContent = text;
        const full = m.k >= MAX_APPLICATIONS && !m.anim;
        this.applyBtn.disabled = full;
        this.stepBtn.disabled = full;
        // gráfica: durante "Aplicar N" se fija el eje x en N
        this.chart.update(m.fidelityHistory, m.anim ? m.anim.targetK : Math.max(m.k, 1));
    }
}
