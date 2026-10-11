/*!
 * Qollab · Quantum error-correction circuits — JavaScript runner.
 *
 * Thin bridge between the interface and the Python files in `quantum/`. Each
 * model is one Python module exposing
 *
 *     run(backend, shots, error_qubit, error_pauli) -> json string
 *
 * Qollab hands that function to JavaScript through `.callPromising`, and the
 * returned value is read with `.toString()` (a JSON string) and parsed here.
 * Returning JSON text avoids depending on how Pyodide converts a Python dict.
 *
 * `backend` is the pre-created backend Qollab injects into the entry point and
 * every JS file it imports (see the runtime docs).
 */
import * as noise from 'quantum.noise';
import * as repetition from 'quantum.repetition';
import * as shor from 'quantum.shor';
import * as surface from 'quantum.surface';
import * as iceberg from 'quantum.iceberg';

export const MODELS = [
  { id: 'repetition', label: 'Bit-flip code [[3,1,3]]', module: repetition, qubits: 5 },
  { id: 'shor', label: 'Shor code [[9,1,3]] (detection)', module: shor, qubits: 17 },
  { id: 'surface', label: 'Surface code d = 3 (Z-checks)', module: surface, qubits: 13 },
  { id: 'iceberg', label: 'Iceberg code [[4,2,2]] (detection)', module: iceberg, qubits: 6 },
];

export function getModel(id) {
  return MODELS.find((m) => m.id === id) || null;
}

/**
 * Run one model on the selected backend.
 *
 * One call = one job, so this respects the IonQ rule of a single job per run.
 *
 * @param {string} id           model id from MODELS
 * @param {object} [options]
 * @param {number} [options.shots=1024]
 * @param {number|null} [options.errorQubit=null]  inject a Pauli on this qubit
 * @param {string} [options.errorPauli='X']        'X' | 'Y' | 'Z'
 * @returns {Promise<object>} { model, title, qubits, shots, counts, summary }
 */
export async function runModel(id, { shots = 1024, errorQubit = null, errorPauli = 'X' } = {}) {
  const model = getModel(id);
  if (!model) throw new Error('Unknown model: ' + id);
  if (typeof backend === 'undefined') {
    throw new Error('No backend available: run this project inside Qollab.');
  }
  // One JSON string, not loose args: Pyodide wraps some JS values (JS null
  // arrives as JsNull, not Python None), so the JSON round-trip keeps the
  // Python side plain (dict/None/int).
  const params = JSON.stringify({ shots, errorQubit, errorPauli });
  const proxy = await model.module.run.callPromising(backend, params);
  let text;
  try {
    text = typeof proxy === 'string' ? proxy : proxy.toString();
  } finally {
    if (proxy && typeof proxy.destroy === 'function') proxy.destroy();
  }
  return JSON.parse(text);
}

/**
 * Run the circuit with in-circuit noise on a local Aer simulator.
 *
 * Used only when the selected backend is not Qollab's noisy one: we build the
 * exact circuit, attach a noise channel (x / z / depol at probability p) to
 * every gate, and return the ideal and noisy distributions.
 *
 * @param {object} options
 * @param {string} [options.channel='x']  'x' | 'z' | 'depol'
 * @param {number} [options.p=0]
 * @param {number} [options.shots=1024]
 * @returns {Promise<object>} { protected, channel, p, ideal, noisy, citations }
 */
export async function runNoisy({ model = 'shor', d = 3, channel = 'x', p = 0, shots = 2048, errorQubit = null, errorPauli = 'X' } = {}) {
  if (typeof backend === 'undefined') {
    throw new Error('No backend available: run this project inside Qollab.');
  }
  const params = JSON.stringify({ model, d, channel, p, shots, errorQubit, errorPauli });
  const proxy = await noise.run.callPromising(backend, params);
  let text;
  try {
    text = typeof proxy === 'string' ? proxy : proxy.toString();
  } finally {
    if (proxy && typeof proxy.destroy === 'function') proxy.destroy();
  }
  return JSON.parse(text);
}

/* Exposed so the shared UI card (circuit-run.js) can call it. */
window.QollabCircuits = { MODELS, getModel, runModel, runNoisy };
