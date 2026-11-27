/** The page for an address that leads nowhere, or a project the person is not in. */
export function NotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-heading-1">Page not found</h1>
      <p className="text-body text-ink-muted">This page does not exist.</p>
    </div>
  );
}
