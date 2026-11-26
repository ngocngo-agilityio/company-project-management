import { RETURN_TO_STORAGE_KEY } from "../constants";

/** Only paths inside this app: one leading slash, never `//host` or a backslash trick. */
export function isInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

/** Remember the private page the person asked for, so sign-in can bring them back to it. */
export function saveReturnTo(path: string): void {
  if (!isInternalPath(path)) return;
  try {
    sessionStorage.setItem(RETURN_TO_STORAGE_KEY, path);
  } catch {
    // storage blocked: they land on the default page instead
  }
}

/** The remembered page, or null when there is none or it is not an internal path. Does not clear it. */
export function readReturnTo(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    return path !== null && isInternalPath(path) ? path : null;
  } catch {
    return null;
  }
}

/** Forget the remembered page. Called once the person is inside, so the next sign-in starts clean. */
export function clearReturnTo(): void {
  try {
    sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
  } catch {
    // nothing to clear
  }
}
