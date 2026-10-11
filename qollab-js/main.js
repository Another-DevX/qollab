/*!
 * Qollab · Interactive Quantum Error Correction — entry point.
 *
 * A single, dependency-free (except three.js, provided by the runtime) vanilla
 * HTML + JS page. `index.html` holds the shell; this file loads every module in
 * order and finally starts the hash router in `app.js`.
 *
 * Order matters: each file attaches its API to `window`, and `app.js` reads all
 * of those registries when it builds the route table.
 */

/* --- Shared drawing + math + UI ------------------------------------------- */
import './bloch.js';
import './m1math.js';
import './ui.js';
import './circuit-run.js'; // shared "run on the backend" card (UI only)
import './circuits.js';    // Python <-> JS circuit runner (must be a static import)

/* --- Module 2 · From Repetition to Shor Code ------------------------------ */
import './quantum.js';
import './shor.js';
import './noise.js';
import './detective.js';
import './quizbase.js';
import './quiz.js';

/* --- Module 4 · Iceberg Code [[4,2,2]] ------------------------------------ */
import './iceberg.js';
import './icebergquiz.js';

/* --- Module 3 · The Surface Code (pure physics, no DOM) ------------------- */
import './surface.js';
import './decoder.js';
import './game.js';
import './mock.js';
import './surfacequiz.js';

/* --- Pages ---------------------------------------------------------------- */
import './home.js';
import './module1.js';
import './module2.js';
import './module3.js';
import './module4.js';

/* --- Lab · Systematic gate errors (three.js Bloch sphere) ----------------- */
import './errorslab/entry.js';

/* --- Router, header and theme (must be last) ------------------------------ */
import './app.js';
