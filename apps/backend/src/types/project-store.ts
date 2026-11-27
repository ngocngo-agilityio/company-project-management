import type { MembershipRole } from "@board/shared";

/** A project row as the list needs it. */
export interface StoredProject {
  id: string;
  name: string;
  archivedAt: Date | null;
  createdAt: Date;
}

/** One member shown as an avatar on a project card. */
export interface ProjectMemberPreview {
  id: string;
  name: string;
  avatarUrl: string | null;
}

/** A project row with what the list shows: counts and the first few members. */
export interface StoredProjectSummary extends StoredProject {
  /** Boards that are not archived. */
  boardCount: number;
  memberCount: number;
  /** Owners first, then by name, at most `PROJECT_MEMBER_PREVIEW_MAX`. */
  members: ProjectMemberPreview[];
}

/** A project the person belongs to, with their membership role there. */
export interface StoredProjectWithRole extends StoredProjectSummary {
  role: MembershipRole;
}

/** What `createProject` wrote: the project, its first board with lists, and the Owner membership. */
export interface CreatedProject {
  project: StoredProject;
  board: {
    id: string;
    name: string;
    lists: { id: string; name: string; position: number; isFinished: boolean }[];
  };
  ownerId: string;
}

/** The database operations the project routes need. Tests use an in-memory version; the server uses Prisma. */
export interface ProjectStore {
  /**
   * One transaction: creates the project, its first board (with the default lists) and the Owner membership.
   * Returns null, having written nothing, when `ownerId` is not an active (not deactivated) person.
   */
  createProject(input: { name: string; ownerId: string }): Promise<CreatedProject | null>;
  /** Every project (for the Super Admin). */
  listAll(): Promise<StoredProjectSummary[]>;
  /**
   * Sets or clears `archivedAt`. `unchanged` means the project is already in that state (archive of an
   * archived project, restore of an active one); `not_found` means no such project. Nothing is written then.
   */
  setArchived(id: string, archived: boolean): Promise<"ok" | "not_found" | "unchanged">;
  /** The projects the person is a member of. */
  listForUser(userId: string): Promise<StoredProjectWithRole[]>;
}
