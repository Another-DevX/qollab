/**
 * Núcleo matemático de corrección de errores cuánticos (Módulo 1).
 *
 * Este barrel expone toda la lógica de estados, operadores de Pauli, rotaciones
 * y generación de retos. Es independiente de React y del render, de modo que
 * los componentes solo consumen resultados ya calculados.
 */

export * from "./complex";
export * from "./matrix";
export * from "./pauli";
export * from "./state";
export * from "./rotations";
export * from "./challenge";
export * from "./format";
