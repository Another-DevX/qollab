/**
 * Pequeñas fábricas de controles accesibles (HTML nativo: teclado y lectores de
 * pantalla funcionan sin trabajo extra). Las etiquetas usan claves i18n.
 */
import { t } from '../i18n/index.js';
let uid = 0;
const nextId = (p) => `${p}-${++uid}`;
export function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class')
            e.className = v;
        else
            e.setAttribute(k, v);
    }
    for (const c of children)
        e.append(c);
    return e;
}
/** Texto traducible */
export function i18nText(key, tag = 'span', cls = '') {
    const e = el(tag, cls ? { class: cls } : {});
    e.dataset.i18n = key;
    e.textContent = t(key);
    return e;
}
/**
 * Deslizador con etiqueta y lectura del valor.
 * `format` produce el texto mostrado y también aria-valuetext.
 */
export function slider(opts) {
    const id = nextId('sl');
    const input = el('input', { type: 'range', id, min: String(opts.min), max: String(opts.max), step: String(opts.step) });
    input.value = String(opts.value);
    const out = el('output', { for: id, class: 'slider-value' });
    const label = el('label', { for: id, class: 'control-label' }, [i18nText(opts.label)]);
    const sync = (v) => {
        out.textContent = opts.format(v);
        input.setAttribute('aria-valuetext', opts.format(v));
    };
    input.addEventListener('input', () => {
        const v = Number(input.value);
        sync(v);
        opts.onInput(v);
    });
    sync(opts.value);
    const root = el('div', { class: 'slider' }, [el('div', { class: 'slider-head' }, [label, out]), input]);
    return {
        root,
        input,
        setValue(v) {
            if (document.activeElement !== input)
                input.value = String(v);
            sync(v);
        },
    };
}
/**
 * Grupo de botones de opción (radio) con aspecto de botones grandes.
 * Las flechas del teclado cambian la opción (comportamiento nativo).
 */
export function radioGroup(opts) {
    const fs = el('fieldset', { class: `radio-group ${opts.cls ?? ''}` });
    fs.append(i18nText(opts.legend, 'legend'));
    const wrap = el('div', { class: 'radio-options' });
    const inputs = new Map();
    for (const o of opts.options) {
        const id = nextId(opts.name);
        const input = el('input', { type: 'radio', name: opts.name, id, value: o.value });
        input.checked = o.value === opts.value;
        input.disabled = !!o.disabled;
        input.addEventListener('change', () => input.checked && opts.onChange(o.value));
        const isKey = o.label.includes('.');
        const text = isKey ? i18nText(o.label) : el('span', {}, [o.label]);
        // html: marcado fijo (p. ej. subíndices); el texto plano queda como etiqueta accesible
        if (o.html) {
            text.innerHTML = o.html;
            text.setAttribute('aria-label', o.label);
        }
        const label = el('label', { for: id, class: 'radio-pill' }, [text]);
        if (o.hint) {
            label.dataset.i18nTitle = o.hint;
            label.title = t(o.hint);
        }
        inputs.set(o.value, input);
        wrap.append(el('div', { class: 'radio-item' }, [input, label]));
    }
    fs.append(wrap);
    return {
        root: fs,
        inputs,
        setValue(v) {
            const i = inputs.get(v);
            if (i)
                i.checked = true;
        },
    };
}
export function button(label, onClick, cls = '') {
    const b = el('button', { type: 'button', class: `btn ${cls}` });
    b.append(i18nText(label));
    b.addEventListener('click', onClick);
    return b;
}
export function checkbox(label, checked, onChange, swatch) {
    const id = nextId('cb');
    const input = el('input', { type: 'checkbox', id });
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const children = [];
    if (swatch)
        children.push(el('span', { class: 'swatch', style: swatch, 'aria-hidden': 'true' }));
    children.push(i18nText(label));
    return el('div', { class: 'checkbox' }, [input, el('label', { for: id }, children)]);
}
