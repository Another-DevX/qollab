# Qollab · Interactive Quantum Error Correction

Una función interactiva, de una sola página, para aprender **corrección de errores
cuánticos (QEC)** de principio a fin: desde el error de un solo cúbit hasta el
código de superficie y el umbral. Todo corre **en el navegador**, con **HTML, CSS
y JavaScript vanilla**; el único apoyo externo es **three.js** (que Qollab ya
incluye en el runtime) para la esfera de Bloch 3D del laboratorio.

## Qué contiene

| Sección | Tema | Qué se explora |
|---|---|---|
| **Módulo 1** | *Understanding Quantum Errors* | Errores de Pauli, la esfera de Bloch, la base de Pauli y un reto para identificar el error. |
| **Módulo 2** | *From Repetition to Shor Code* | Códigos de repetición, corrección de bit y de fase, el código de Shor, decodificadores y ruido. |
| **Módulo 3** | *The Surface Code* | La grilla 2D, estabilizadores como celdas, síndromes como extremos de cuerdas, decodificación por *matching*, el cúbit lógico, la distancia y el umbral (con laboratorio de distancia y un **quiz final de 7 preguntas**). |
| **Módulo 4** | *Iceberg Code `[[4,2,2]]`* | Detección sin corrección: el espacio de código, por qué la ubicación queda oculta, la postselección y los errores lógicos indetectables. |
| **Lab** | *Errores sistemáticos en compuertas de un qubit* | Simulación tipo PhET: cómo un error **coherente y sistemático** desvía el vector de Bloch y cómo **se acumula** al repetir la compuerta. |

El **Lab** conserva su interfaz bilingüe (español / inglés) y su doble vista
sincronizada: la *pantalla de computador* (controles, lecturas, gráfica de
fidelidad) y la *esfera de Bloch 3D* (three.js), con vectores ideal y con error,
trayectorias y ejes de rotación.

## Cómo está construido

- **Sin paso de compilación, sin dependencias.** Cada archivo es un *script* que
  se registra en `window`; un único `main.js` los carga en orden y arranca el
  *hash router*.
- **Un solo proyecto Qollab.** `index.html` (estructura) + `main.css` (todos los
  estilos) + `main.js` (entrada). El runtime elige el modo JS porque hay
  `index.html` y `main.js` en la raíz.
- **Física separada del dibujo.** La matemática es pura y sin DOM
  (`surface.js`, `decoder.js`, `game.js`, `mock.js`, `iceberg.js`, y el modelo del
  lab en `errorslab/model/`). Las vistas sólo dibujan lo que esa matemática
  calcula.
- **Estilos con espacio de nombres.** Los estilos del Módulo 3 (`.m3`) y del Lab
  (`.elab`) están *scoped* para no filtrarse a los Módulos 1, 2 y 4.

## Rutas (hash router)

- Home: `#/`
- Módulo 1: `#/module-1` → `#/module-1/pauli-errors`, `…/pauli-basis`, `…/challenge`, `…/conclusion`
- Módulo 2: `#/module-2` → `#/module-2/repetition-code`, `…/syndrome`, `…/phase-flip`, `…/shor-code`, `…/shor-decoder`, `…/break-code`, `…/noise-lab`
- Módulo 3: `#/module-3` → `…/grid`, `…/stabilizers`, `…/strings`, `…/decoder`, `…/logical`, `…/threshold`, `…/lab`, `…/conclusion`
- Módulo 4: `#/module-4` → `…/four-physical-two-logical`, `…/detecting-errors`, `…/why-not-correct`, `…/postselection`, `…/break-the-code`
- Lab: `#/lab/systematic-errors`

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Estructura de la página (sin `<script>` ni `<style>`). |
| `main.css` | Todos los estilos: sistema de diseño de la plataforma + bloques scoped del Módulo 3 y del Lab. |
| `main.js` | Punto de entrada: carga cada módulo en orden y arranca el router. |
| `app.js` | Hash router, cabecera y tema (claro / oscuro). |
| `bloch.js`, `m1math.js`, `ui.js` | Esfera de Bloch en Canvas 2D, matemática del Módulo 1, y constructores HTML compartidos. |
| `home.js`, `module1.js`, `module2.js`, `module4.js` | Páginas de la plataforma. |
| `quantum.js`, `shor.js`, `noise.js`, `detective.js`, `quizbase.js`, `quiz.js`, `iceberg.js`, `icebergquiz.js` | Matemática y cuestionarios de los Módulos 2 y 4. |
| `surface.js`, `decoder.js`, `game.js`, `mock.js` | Física del Módulo 3: código de superficie (marco de Pauli), decodificador MWPM, juego "sé el decodificador" y modelo ilustrativo del laboratorio de distancia. |
| `module3.js` | Páginas del Módulo 3 (DOM, SVG de la grilla, eventos). |
| `errorslab/` | Laboratorio de errores sistemáticos: `entry.js` (montaje) + `model/`, `ui/`, `views/` (three.js) + `i18n/`. |
| `circuits.js` | Puente JS ↔ Python: `runModel(id, opts)` ejecuta un circuito de `quantum/*.py` en el backend. Expone `window.QollabCircuits`. |
| `circuit-run.js` | Tarjeta compartida *Run on the backend*: botón + histograma de *counts*; importa `circuits.js` de forma perezosa y se desactiva fuera de Qollab. Expone `window.CircuitRun`. |
| `quantum/*.py` | Circuitos Qiskit reales (`repetition`, `shor`, `surface`, `iceberg`) + `common.py`. |

## Honestidad sobre la simulación

- **Las animaciones son clásicas, pero los circuitos se pueden ejecutar de verdad.**
  Dentro de Qollab, los botones *Run on the backend* (en la lección de repetición y
  en el laboratorio de ruido) envían el circuito exacto de `quantum/*.py` a un
  backend y usan los *counts* devueltos para leer el síndrome. Fuera de Qollab esos
  botones quedan desactivados.
- **El resto de las simulaciones son clásicas, en el navegador.** El Módulo 3 usa
  un **modelo de marco de Pauli**: exacto para errores y correcciones de Pauli,
  pero no un simulador cuántico universal. Supone ruido de *capacidad de código*
  (los errores sólo afectan a los cúbits de datos y los síndromes se miden
  perfectamente); su umbral de *bit-flip* ronda el 10%.
- El **laboratorio de distancia** del Módulo 3 es un **modelo ilustrativo**
  (`p_L ≈ A·(p/p_th)^((d+1)/2)`, `p_th = 10%`), no un decodificador; así lo dice
  la propia página, que enlaza a la lección 06, donde sí corre el decodificador
  real.
- El **Lab** modela errores **sistemáticos y coherentes** (unitarios): el estado
  permanece puro, `|r| = 1`. No es ruido estocástico/incoherente.

## Créditos

Contenido educativo de Qollab. El laboratorio de errores sistemáticos está
*inspirado en las simulaciones PhET (University of Colorado Boulder)*. La esfera
de Bloch 3D usa **three.js** (incluido por el runtime de Qollab).
