const collator = new Intl.Collator("en", { sensitivity: "base" });

/** Name order for lists. Fixed locale, so the order does not depend on the machine. */
export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}
