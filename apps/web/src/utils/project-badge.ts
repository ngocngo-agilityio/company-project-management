/** Two capital letters for the project square: first letters of the first and last word. */
export function projectInitials(name: string): string {
  const words = [...name.trim().split(/\s+/)].filter(Boolean);
  const first = [...(words[0] ?? "?")][0] ?? "?";
  const last = words.length > 1 ? ([...(words[words.length - 1] ?? "")][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Stable 0..5 from the name, so a project keeps its colour. */
export function projectColorIndex(name: string): number {
  let sum = 0;
  for (const ch of name) sum += ch.codePointAt(0) ?? 0;
  return sum % 6;
}
