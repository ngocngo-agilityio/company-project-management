import { Button } from "@board/ui";
import { useEffect, useRef, useState } from "react";
import { PEOPLE_MESSAGES as MSG } from "../constants";

const FEEDBACK_MS = 2000;

/** Copies `text` to the clipboard and says so. `ariaLabel` names the person it is for when there are many buttons. */
export function CopyLinkButton({ text, label, ariaLabel }: { text: string; label: string; ariaLabel?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), FEEDBACK_MS);
  }

  return (
    <>
      <Button variant="secondary" size="sm" aria-label={ariaLabel} onClick={() => void copy()}>
        {state === "copied" ? MSG.COPIED : label}
      </Button>
      {/* A live region, so the result is announced without moving focus. */}
      <span role="status" className="sr-only">
        {state === "copied" ? MSG.COPIED : state === "failed" ? MSG.COPY_FAILED : ""}
      </span>
      {state === "failed" ? <span className="text-body-small text-danger">{MSG.COPY_FAILED}</span> : null}
    </>
  );
}
