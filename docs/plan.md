# Plan

Condensed from the Company Board Spec. When this file and the sources disagree, the sources win: tell the user and update this file.

## Sources

| Page                                                                     | What it holds                                                          |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| [Spec](https://claude.ai/artifact/Lb4ZUJpjoWyE49tfm4dfMR)                | The full specification this file condenses                             |
| [Plan](https://claude.ai/artifact/2pCZ1oWoADoh5ggAgJFj5X)                | Features, rules, permissions table, risks                              |
| [Roadmap](https://claude.ai/artifact/BK5t3NttzTCNnLpbRn2XeV)             | Four sprints and every requirement with its test                       |
| [Technical Stack](https://claude.ai/artifact/HxR9o25LPiEY2WKcAxfhCV)     | Architecture, monorepo, hosting, security                              |
| [System Design](https://claude.ai/artifact/QJwARPSBjU8pdppsMZSpS9)       | Data model, flows, API (proposed, nothing built yet)                   |
| [Delivery Plan](https://claude.ai/artifact/AsyNyT5YLTN8USdKB3id9q)       | 26 stories, 71 tasks, day-by-day timeline                              |
| [Clickable prototype](https://claude.ai/artifact/3Jwy6yzFC21zbyhafR3m3j) | Sample data with the screens and rules of M1 to M4                     |
| [Design canvas](https://claude.ai/artifact/4RdpWWAP1kveEi7S5zBYHG)       | Every screen, phone layouts, special states, dark theme, design tokens |

## Problem and goal

- Work for a project is spread over chats and files; nobody sees who does what, by when, how far.
- Each project gets one board; every piece of work is a card grouped by stage (list).
- Teams use it for real work after M4 (about 4 weeks). One developer working with Claude Code, free plans (USD 0).
- Web app for phone, tablet and computer. Sign in with Google; no invitation, no entry. English only.
- No email service: invitations are copied links, notifications live inside the app.

## Roles

Three roles, set per project (`membership.role`), plus a system flag (`user.is_super_admin`). Super Admin counts as Owner in every project.

| Role          | In short                                                                       |
| ------------- | ------------------------------------------------------------------------------ |
| Super Admin   | Sees everything. Creates projects, picks Owners, invites Super Admins.         |
| Project Owner | Runs one project: invites people, manages members, boards and lists. Min. one. |
| Member        | Creates, edits, moves and archives cards, comments. Cannot reshape boards.     |
| Observer      | Read only. The UI shows no edit controls and the server refuses every change.  |

Full table with permission keys: [permissions.md](permissions.md).

## Scope

In scope (M1 to M4): Google sign-in and invitation gate, projects and roles, invite by copied link, Members and People screens, boards, lists, cards, card dialog, labels, checklist, move, comments, mentions, history, in-app bell, 5-second refresh, search and filters, My cards, archive and delete, system log, phone/tablet/computer layouts, handover.

Out of scope: any email, file attachments and project overview (Later), calendar view, automatic rules, board templates, instant updates, guests, error tracking, database backups, a company domain.

## Milestones and requirements

M1 week 1, M2 week 2, M3 week 3, M4 week 4. Each sprint ends with a demo: M1 Projects screen, M2 an invitation and a card, M3 a working team board, M4 daily use.

| Feature                     | Milestone | Requirement ids                                 |
| --------------------------- | --------- | ----------------------------------------------- |
| Sign in with Google         | M1        | AUTH-1, AUTH-2, AUTH-3, AUTH-4                  |
| Projects and roles          | M1-M2     | PROJ-1 to PROJ-5, PERM-1                        |
| Invite people with a link   | M2        | INV-1, INV-2, INV-3, MEMB-1, MEMB-2             |
| Boards and lists            | M2        | BOARD-1, BOARD-2                                |
| Cards and their details     | M2-M3     | CARD-1 to CARD-5                                |
| Moving cards                | M3        | MOVE-1 (drag), MOVE-2 (Move to... on touch)     |
| Comments, mentions, history | M3        | COMM-1, COMM-2, COMM-3                          |
| In-app notifications        | M3        | NOTIF-1 (assigned, mentioned, added to project) |
| Fresh data (polling)        | M3        | LIVE-1                                          |
| Search and filter           | M3        | SRCH-1, SRCH-2                                  |
| My cards                    | M4        | MINE-1                                          |
| Archive and delete          | M4        | ARCH-1 to ARCH-4                                |
| Phone, tablet, computer     | M1-M4     | UI-1 to UI-4                                    |
| Platform and delivery       | M1-M4     | OPS-1 to OPS-7                                  |

## Rules that shape the code

- **Invitations:** Pending, Accepted, Expired or Revoked. Expire after 14 days; resend starts 14 more. Accepted when the person signs in with Google using that email (the link holds no secret). Existing accounts are added at once.
- **Sign-in gate:** only the first Super Admin (email from env), people with a valid Pending invitation, and members of at least one project. A person with no project and no invitation is Inactive.
- **Projects:** several Owners allowed; the last Owner cannot leave or be removed. A removed person is taken off their cards; history keeps their name.
- **Lists:** a new board starts with To do, In progress, Done. Done is marked Finished by default. A card in a Finished list is never overdue.
- **Cards:** title required, max 200 chars; description plain text; assignees only from the project; one due date in the company time zone; priority Low/Medium/High (default Medium); labels from a fixed set of colours, named by the Owner; checklist steps. No estimates, sub-cards or card links.
- **Order:** decimal `position`; a card dropped between 1 and 2 gets 1.5; a move changes one row.
- **Freshness:** the board polls about every 5 seconds; changes appear within 10 seconds; last save wins.
- **Archive and delete:** archive is a mark, not a delete. Delete for good only works on archived items, asks for the name of a list, board or project, removes everything inside and is written to the system log. Never archive the only Finished list; a project keeps one active board; an archived project is read-only.
- **History:** entries cannot be edited or deleted.

## Decisions

- One Render web service serves the web app and the API (same address, same-origin cookie, no CORS).
- Supabase hosts PostgreSQL only. No Supabase Auth, Realtime or Data API.
- Everything runs on free plans (demo level). Upgrade before real use.
- Own Google sign-in; Supabase Auth is the fallback if Google refuses the Render address.
- Polling, not live push. Notifications only in the app, for three events.
- Storybook, CLAUDE.md and five skills from Day 1.

## Edge cases to keep in mind

- Uninvited Google account: no session, page says "You have not been invited".
- Mistyped invitation email: stays Pending until it expires or is revoked.
- Last Owner leaves, or only Super Admin deactivated: refused.
- Observer tries a change: no controls in the UI, the server refuses.
- Free Render service idle: first visit takes about a minute.

## Open questions

Region for Render and Supabase (Singapore if both offer it), whether Google accepts the Render address (try Day 3), first Super Admin email, company time zone, when to upgrade the free plans, error tracking after the demo.

## Later (V2, no dates)

File attachments (25 MB per file), project overview (numbers only), calendar view, automatic rules, board templates, instant updates, a company domain.
