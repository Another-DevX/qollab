# Qollab · Módulo 1 — Entendiendo los errores cuánticos

Plataforma educativa interactiva para el aprendizaje de la **corrección de
errores cuánticos (QEC)**. Este repositorio contiene el **Módulo 1**, centrado
en los errores de un solo cúbit sobre la esfera de Bloch.

Construido con **Next.js 16 (App Router) + TypeScript + TailwindCSS v4**,
**Three.js / React Three Fiber** para la esfera de Bloch y **Framer Motion**
para las animaciones.

## Secciones

1. **Errores de Pauli** (`/modulo/errores-pauli`) — estados puros sobre la
   esfera de Bloch, aplicación de X, Y, Z y comparación visual entre el estado
   original y el transformado.
2. **La base de Pauli** (`/modulo/base-pauli`) — por qué `{I, X, Y, Z}` es una
   base de todos los operadores de un cúbit, mediante rotaciones continuas y su
   descomposición en la base de Pauli.
3. **Reto interactivo** (`/modulo/reto-errores`) — juego de identificar el error
   secreto (I, X, Y o Z) comparando el estado inicial y el final.

## Rigor matemático

Toda la física vive en `src/lib/quantum/` (JavaScript puro, sin React):

- Números complejos y matrices 2×2.
- Estados de cúbit, vectores de Bloch y fases globales.
- Operadores de Pauli, rotaciones y descomposición en la base de Pauli.
- Generación de retos no degenerados.

Las animaciones **no** dibujan resultados a mano: interpolan el vector de Bloch
calculado a partir del operador cuántico real.

## Comandos

```bash
npm install
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run test       # tests unitarios (Vitest)
npm run typecheck  # comprobación de tipos
npm run lint       # ESLint
```

> Requiere Node.js ≥ 20.9 (probado con 22.17).

## Estructura

```
src/
  app/                     rutas (App Router) y estilos globales
  components/
    bloch/                 esfera de Bloch reutilizable (R3F)
    math/                  render de matrices y notación de Dirac
    ui/                    primitivas de interfaz
    experience/            secciones interactivas del módulo
  lib/
    quantum/               núcleo matemático + tests
```
