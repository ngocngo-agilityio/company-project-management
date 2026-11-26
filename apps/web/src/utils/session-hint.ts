import { SESSION_HINT_STORAGE_KEY } from "../constants";

/** True when the last `/me` answer in this browser was a signed-in person. Only a hint: the API decides. */
export function readSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_STORAGE_KEY) === "1";
  } catch {
    return false; // storage blocked: behave as if there is no hint
  }
}

export function writeSessionHint(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(SESSION_HINT_STORAGE_KEY, "1");
    else localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
  } catch {
    // storage blocked: the hint is optional
  }
}
