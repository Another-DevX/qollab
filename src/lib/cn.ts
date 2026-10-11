/** Concatenador de clases condicional ligero (evita dependencias extra). */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
