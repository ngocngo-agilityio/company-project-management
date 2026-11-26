# Roles and permissions

From the [Spec](https://claude.ai/artifact/Lb4ZUJpjoWyE49tfm4dfMR) and the [Plan](https://claude.ai/artifact/2pCZ1oWoADoh5ggAgJFj5X) permissions table. Every route and screen must match it. Task S1-PERM-01 implements it as one module in `@board/shared`: a function that answers "may this role do this action".

## Roles

- Three roles per project, stored on `membership.role` (Owner, Member, Observer), unique per project and user. Super Admin is not a `membership.role` value.
- Super Admin is a system flag, `user.is_super_admin`. It counts as Owner in every project.
- A project always keeps at least one Owner. The system always keeps at least one active Super Admin.

## Permission keys

Keys are `resource:action`, implemented in `packages/shared/src/constants/permissions.ts` (`PERMISSIONS`) and read with `can(role, action)`. `board:view` and `cards:mine` are two separate keys. `can` answers at role level only: "is the person in this project" (404), "is this their own comment" and the 409, last-Owner and last-Super-Admin rules are checked by the route or service. Callers pass `SUPER_ADMIN` when `user.is_super_admin` is set, otherwise the membership role.

| Key                                                                           | Super Admin | Owner | Member | Observer |
| ----------------------------------------------------------------------------- | :---------: | :---: | :----: | :------: |
| `people:view` (People screen)                                                 |      ✓      |   -   |   -    |    -     |
| `person:deactivate`                                                           |      ✓      |   -   |   -    |    -     |
| `superadmin:invite`                                                           |      ✓      |   -   |   -    |    -     |
| `project:create` (and choose its Owner)                                       |      ✓      |   -   |   -    |    -     |
| `project:update` (rename)                                                     |      ✓      |   -   |   -    |    -     |
| `project:archive`                                                             |      ✓      |   -   |   -    |    -     |
| `project:view`                                                                |     all     |  own  |  own   |   own    |
| `member:manage` (invite, remove, change role)                                 |      ✓      |   ✓   |   -    |    -     |
| `member:leave` (remove yourself; the last Owner is refused)                   |      ✓      |   ✓   |   ✓    |    ✓     |
| `board:create`                                                                |      ✓      |   ✓   |   -    |    -     |
| `list:manage` (add, rename, reorder, archive lists and boards, mark Finished) |      ✓      |   ✓   |   -    |    -     |
| `label:manage` (name labels)                                                  |      ✓      |   ✓   |   -    |    -     |
| `card:write` (create, edit, move)                                             |      ✓      |   ✓   |   ✓    |    -     |
| `card:archive`                                                                |      ✓      |   ✓   |   ✓    |    -     |
| `comment:write`                                                               |      ✓      |   ✓   |   ✓    |    -     |
| `comment:edit-own` (edit and delete own)                                      |      ✓      |   ✓   |   ✓    |    -     |
| `comment:delete-any`                                                          |      ✓      |   ✓   |   -    |    -     |
| `board:view`, `cards:mine`                                                    |      ✓      |   ✓   |   ✓    |    ✓     |
| `card:delete-archived` (delete for good)                                      |      ✓      |   ✓   |   -    |    -     |
| `structure:delete-archived` (list, board, project)                            |      ✓      |   -   |   -    |    -     |
| `systemlog:view`                                                              |      ✓      |   -   |   -    |    -     |

`label:manage` and `systemlog:view` come from the API list and ARCH-4, not from the spec table rows. Notifications are always the signed-in person's own.

## Rules

- A route declares the permission it needs and checks it on the server. Hiding a control in the UI is never the check.
- Not signed in: 401. Signed in but the role refuses: 403. A resource in a project the person does not belong to: 404, so its existence is not revealed.
- An archived project is read-only for everyone, except that a Super Admin may restore it (`project:archive`) or delete it for good (`structure:delete-archived`). Any other write to it is refused with 409.
- Observers see no edit controls and the server refuses every write.
- When a permission is missing from this table, add it here and tell the user before coding.
