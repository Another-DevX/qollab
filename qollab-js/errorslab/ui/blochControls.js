import { button, checkbox, el, i18nText } from './controls.js';
export function buildBlochControls(model, onResetView) {
    const d = model.display;
    const toggles = el('fieldset', { class: 'toggles' }, [
        i18nText('bloch.show', 'legend'),
        checkbox('bloch.trajectories', d.trajectories, (v) => model.setDisplay({ trajectories: v })),
        checkbox('bloch.rotationAxes', d.rotationAxes, (v) => model.setDisplay({ rotationAxes: v })),
        checkbox('bloch.errorVector', d.errorVector, (v) => model.setDisplay({ errorVector: v })),
    ]);
    const item = (key, cls) => el('li', {}, [el('span', { class: `lg ${cls}`, 'aria-hidden': 'true' }), i18nText(key)]);
    const legend = el('section', { class: 'legend', 'aria-labelledby': 'legend-title' }, [
        Object.assign(i18nText('bloch.legend', 'h3'), { id: 'legend-title' }),
        el('ul', {}, [
            item('bloch.legendIdeal', 'lg-ideal-vec'),
            item('bloch.legendErr', 'lg-err-vec'),
            item('bloch.legendIdealTraj', 'lg-ideal-traj'),
            item('bloch.legendErrTraj', 'lg-err-traj'),
            item('bloch.legendIdealAxis', 'lg-ideal-axis'),
            item('bloch.legendErrAxis', 'lg-err-axis'),
        ]),
    ]);
    return el('div', { class: 'bloch-controls' }, [toggles, legend, button('bloch.resetView', onResetView, 'btn-small')]);
}
