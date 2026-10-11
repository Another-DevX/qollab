"""Qollab · Quantum error-correction circuit set.

One Python file per code. Each module exposes the same entry point::

    run(backend, shots=1024, error_qubit=None, error_pauli="X") -> dict

so the JavaScript side can call any of them the same way::

    import * as repetition from 'quantum.repetition';
    const out = (await repetition.run.callPromising(backend, 1000)).toJs();

Every ``run`` returns a plain, JSON-serialisable dict with the shape::

    {
      "model":   "repetition",
      "title":   "Bit-flip (repetition) code [[3,1,3]]",
      "qubits":  5,
      "shots":   1024,
      "counts":  {"11011": 998, ...},   # raw measurement, one char per classical bit
      "summary": { ... }                # model-specific interpretation
    }

Nothing here talks to the browser: these functions only build a circuit, submit
one job through the ``backend`` they are given, and return numbers. Physically
they run wherever Qollab sends the job (built-in simulator, noise model, or IonQ).
"""
