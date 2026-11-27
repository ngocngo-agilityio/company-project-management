import type { Role } from "@board/shared";

/** Projects screen: what each role is called. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  OWNER: "Project Owner",
  MEMBER: "Member",
  OBSERVER: "Observer",
};

/** Projects screen: empty, error and list texts. */
export const PROJECTS_MESSAGES = {
  TITLE: "Projects",
  EMPTY_MEMBER: "You have not been added to a project yet",
  EMPTY_MEMBER_HINT: "Ask a Project Owner or the Super Admin to invite you.",
  EMPTY_ADMIN: "No projects yet",
  EMPTY_ADMIN_HINT: "Create the first project and choose who owns it.",
  LOAD_FAILED_TITLE: "We could not load your projects.",
  LOAD_FAILED_TEXT: "Check your connection and try again.",
  ARCHIVED: "Archived · read-only",
  ARCHIVED_SECTION: "Archived projects",
  ARCHIVED_COL_PROJECT: "Project",
  ARCHIVED_COL_STATE: "State",
  ARCHIVED_COL_ACTIONS: "Actions",
  ARCHIVED_EMPTY: "No archived projects.",
  OPEN_BOARD: "Open board",
  RESTORE: "Restore",
  RESTORE_FAILED_TITLE: "We could not restore the project.",
  RESTORE_FAILED_TEXT: "Check your connection and try again.",
  RETRY: "Try again",
  CREATE_BUTTON: "Create project",
  LIST_LABEL: "Your projects",
  STAT_OPEN_CARDS: "open cards",
  STAT_OVERDUE: "overdue",
  statBoards: (count: number) => (count === 1 ? "board" : "boards"),
  MEMBERS_LABEL: "Members",
  moreMembers: (count: number) => `${count} more ${count === 1 ? "member" : "members"}`,
} as const;

/** CreateProjectDialog: labels, hints and errors. */
export const CREATE_PROJECT_MESSAGES = {
  TITLE: "New project",
  NAME_LABEL: "Project name",
  NAME_PLACEHOLDER: "e.g. Q1 planning",
  OWNER_LABEL: "Owner",
  HINT: "A board with To do, In progress and Done is created automatically.",
  SUBMIT: "Create project",
  CANCEL: "Cancel",
  NAME_REQUIRED: "Enter a project name.",
  NAME_TOO_LONG: (max: number) => `Use ${max} characters or fewer.`,
  OWNER_REQUIRED: "Choose an owner.",
  PEOPLE_FAILED_TITLE: "We could not load the people list.",
  FAILED_INVALID: "The server did not accept this name or owner. Check them and try again.",
  FAILED_FORBIDDEN: "Only the Super Admin can create projects.",
  FAILED_OTHER: "We could not create the project. Check your connection and try again.",
} as const;

/** ArchiveProjectDialog: the confirm before a project becomes read-only. */
export const ARCHIVE_PROJECT_MESSAGES = {
  TRIGGER: "Archive project",
  title: (name: string) => `Archive "${name}"?`,
  TEXT: "The project becomes read-only for everyone and leaves the project list. Its board, lists and cards go with it. Only the Super Admin can see it.",
  CANCEL: "Cancel",
  SUBMIT: "Archive project",
  FAILED_CONFLICT: "This project is already archived. Close this window and the list will refresh.",
  FAILED_FORBIDDEN: "Only the Super Admin can archive projects.",
  FAILED_OTHER: "We could not archive the project. Check your connection and try again.",
} as const;

/** ProjectBoard: the temporary page behind "Open board" until the board screen exists. */
export const PROJECT_PAGE_MESSAGES = {
  COMING_SOON: "The board comes in a later sprint.",
  ARCHIVED_NOTE: "This project is archived and read-only.",
  BACK: "Back to projects",
} as const;
