import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { useId, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "../../lib/cn";
import { fieldStyles } from "../../lib/field-styles";
import { Avatar } from "../Avatar/Avatar";

export type PersonOption = {
  id: string;
  name: string;
  /** Searchable, and shown after the name when two people share the same name. */
  email?: string;
  avatarUrl?: string | null;
  /** 1..6, usually the person's number. Defaults to a hash of the name. */
  colorIndex?: number;
};

export type PersonPickerProps = Omit<ComponentProps<"button">, "value" | "onChange" | "children" | "type"> & {
  /** Who can be picked. The caller decides (for example only active people). */
  people: readonly PersonOption[];
  /** Id of the picked person, or "" for nobody. */
  value: string;
  onValueChange: (personId: string) => void;
  /** Shown on the button while nobody is picked. */
  placeholder?: string;
  /** Placeholder and accessible name of the search box. */
  searchLabel?: string;
  /** Shown when the search matches nobody. */
  emptyText?: string;
  /** Marks the field as having an error (border and aria-invalid). Show the message as text next to it. */
  invalid?: boolean;
};

function labelOf(person: PersonOption, people: readonly PersonOption[]): string {
  const sameName = people.filter((other) => other.name === person.name).length > 1;
  return sameName && person.email ? `${person.name} (${person.email})` : person.name;
}

function matches(person: PersonOption, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return person.name.toLowerCase().includes(needle) || (person.email ?? "").toLowerCase().includes(needle);
}

function PersonRow({ person, label }: { person: PersonOption; label: string }) {
  return (
    <>
      {/* The name is already in the text next to it, so the avatar is decoration here. */}
      <span aria-hidden="true" className="flex shrink-0">
        <Avatar name={person.name} src={person.avatarUrl ?? undefined} colorIndex={person.colorIndex} size={22} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </>
  );
}

/**
 * Picks one person: a button that opens a list with avatars and a search box. Pure props: it never fetches.
 * Arrow keys move through the list, Enter picks, Esc closes. Name it with a <label htmlFor> or aria-label.
 */
export function PersonPicker({
  people,
  value,
  onValueChange,
  placeholder = "Choose a person",
  searchLabel = "Search people",
  emptyText = "No one found",
  invalid = false,
  disabled,
  className,
  onKeyDown,
  ...props
}: PersonPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const picked = people.find((person) => person.id === value);
  const shown = useMemo(() => people.filter((person) => matches(person, query)), [people, query]);
  const activeIndex = Math.min(active, Math.max(shown.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${index}`;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(
        Math.max(
          people.findIndex((person) => person.id === value),
          0,
        ),
      );
    }
  }

  function move(index: number) {
    const clamped = Math.min(Math.max(index, 0), shown.length - 1);
    setActive(clamped);
    listRef.current?.children[clamped]?.scrollIntoView?.({ block: "nearest" });
  }

  function choose(person: PersonOption) {
    onValueChange(person.id);
    setOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") move(activeIndex + 1);
    else if (event.key === "ArrowUp") move(activeIndex - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(shown.length - 1);
    else if (event.key === "Enter") {
      const person = shown[activeIndex];
      if (person) choose(person);
    } else return;
    event.preventDefault();
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.key === "ArrowDown" && !open) {
              event.preventDefault();
              handleOpenChange(true);
            }
          }}
          className={cn(
            "flex min-h-(--control-h) w-full items-center gap-2 px-2.5 text-left",
            fieldStyles(invalid),
            className,
          )}
          {...props}
        >
          {picked ? (
            <PersonRow person={picked} label={labelOf(picked, people)} />
          ) : (
            <span className="min-w-0 flex-1 truncate text-ink-muted">{placeholder}</span>
          )}
          <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} className="shrink-0 text-ink-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          aria-label={props["aria-label"] ?? placeholder}
          sideOffset={4}
          className="z-(--z-modal) w-(--radix-popover-trigger-width) min-w-56 overflow-hidden rounded-10 border border-line bg-surface text-ink shadow-lg"
        >
          {/* Padding keeps the focus ring of the search box inside the popover, which clips its children. */}
          <div className="relative border-b border-line p-2">
            <Search
              aria-hidden="true"
              size={16}
              strokeWidth={1.8}
              className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-muted"
            />
            <input
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={shown.length ? optionId(activeIndex) : undefined}
              aria-autocomplete="list"
              aria-label={searchLabel}
              placeholder={searchLabel}
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={handleSearchKeyDown}
              className={cn("min-h-(--control-h) w-full pr-2.5 pl-8", fieldStyles())}
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={searchLabel}
            className="max-h-60 overflow-y-auto p-1"
          >
            {shown.map((person, index) => (
              <li
                key={person.id}
                id={optionId(index)}
                role="option"
                aria-selected={person.id === value}
                onClick={() => choose(person)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2 rounded-7 px-2 text-body min-[900px]:min-h-9",
                  index === activeIndex && "bg-surface-2",
                )}
              >
                <PersonRow person={person} label={labelOf(person, people)} />
                {person.id === value ? (
                  <Check aria-hidden="true" size={16} strokeWidth={2} className="shrink-0 text-accent" />
                ) : null}
              </li>
            ))}
          </ul>
          {shown.length === 0 ? <p className="px-3 py-3 text-body-small text-ink-muted">{emptyText}</p> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
