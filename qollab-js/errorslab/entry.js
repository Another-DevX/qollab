/**
 * Punto de entrada para Qollab: monta el laboratorio completo dentro de un
 * contenedor y devuelve una función de limpieza. El resto del código es el
 * mismo de `errores-qubit/src` (modelo + vistas), sin cambios de contenido.
 */
import { getLang, onLangChange, setLang, translateDom } from './i18n/index.js';
import { SimModel } from './model/simulation.js';
import { buildBlochControls } from './ui/blochControls.js';
import { BlochView } from './views/blochView.js';
import { ComputerView } from './views/computerView.js';
/* Marcado de la página (idéntico al index.html original, envuelto en .elab). */
const MARKUP = `
<a class="skip-link" href="#bloch-panel" data-i18n="app.skip">Ir a la esfera de Bloch</a>
<header class="app-header">
  <div class="brand" aria-hidden="true">
    <svg viewBox="0 0 40 40" width="40" height="40">
      <circle cx="20" cy="20" r="17" fill="#e0f2fe" stroke="#334155" stroke-width="2" />
      <ellipse cx="20" cy="20" rx="17" ry="6" fill="none" stroke="#94a3b8" stroke-width="1.2" />
      <line x1="20" y1="20" x2="29" y2="8" stroke="#17a34a" stroke-width="3" stroke-linecap="round" />
      <line x1="20" y1="20" x2="32" y2="14" stroke="#dc2626" stroke-width="3" stroke-linecap="round" />
    </svg>
  </div>
  <div class="titles">
    <h1 data-i18n="app.title">Errores sistemáticos en compuertas de un qubit</h1>
    <p data-i18n="app.subtitle">Simulación interactiva: compuertas como rotaciones en la esfera de Bloch</p>
  </div>
  <button id="lang-btn" class="btn btn-lang" type="button" data-i18n="app.langButton" data-i18n-aria="app.langAria">English</button>
</header>

<main class="panels">
  <section class="panel panel-computer" aria-labelledby="computer-title">
    <h2 id="computer-title" class="panel-title" data-i18n="computer.title">Pantalla de computador</h2>
    <div id="computer-panel"></div>
  </section>

  <section id="bloch-panel" class="panel panel-bloch" aria-labelledby="bloch-title" tabindex="-1">
    <h2 id="bloch-title" class="panel-title" data-i18n="bloch.title">Esfera de Bloch</h2>
    <div class="bloch-layout">
      <div class="bloch-stage">
        <div id="bloch-canvas"></div>
        <p class="bloch-hint" data-i18n="bloch.hint"></p>
      </div>
      <div id="bloch-side"></div>
    </div>
    <p id="bloch-live" class="visually-hidden" aria-live="polite"></p>
  </section>
</main>

<footer class="app-footer"><p data-i18n="footer.text"></p></footer>
`;
export function renderLab(root) {
    const host = document.createElement('div');
    host.className = 'elab';
    host.innerHTML = MARKUP;
    root.appendChild(host);
    const model = new SimModel();
    // Panel izquierdo: pantalla de computador
    const computer = new ComputerView(model);
    host.querySelector('#computer-panel').append(computer.root);
    // Panel derecho: esfera de Bloch
    const blochHost = host.querySelector('#bloch-canvas');
    const bloch = new BlochView(blochHost, model, host.querySelector('#bloch-live'));
    host.querySelector('#bloch-side').append(buildBlochControls(model, () => bloch.resetView()));
    // Idioma
    const langBtn = host.querySelector('#lang-btn');
    const onLangClick = () => setLang(getLang() === 'es' ? 'en' : 'es');
    langBtn.addEventListener('click', onLangClick);
    const offLang = onLangChange(() => {
        computer.update();
        bloch.refreshLanguage();
    });
    translateDom(host);
    // Bucle de animación: el modelo sólo avanza cuando hay una animación activa
    let running = true;
    let raf = 0;
    let last = performance.now();
    const frame = (now) => {
        if (!running)
            return;
        const dt = Math.min(0.25, (now - last) / 1000); // evita saltos si la pestaña estuvo oculta
        last = now;
        model.tick(dt);
        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
        running = false;
        cancelAnimationFrame(raf);
        offLang();
        langBtn.removeEventListener('click', onLangClick);
        bloch.dispose();
        host.remove();
    };
}
window.ErrorsLab = {
    routes: { '/lab/systematic-errors': 'lab' },
    render: { lab: renderLab },
};
