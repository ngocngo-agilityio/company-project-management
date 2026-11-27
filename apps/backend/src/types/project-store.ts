import type { MembershipRole } from "@board/shared";

/** A project row as the list needs it. */
export interface StoredProject {
  id: string;
  name: string;
  archivedAt: Date | null;
  createdAt: Date;
}

/** A project the person belongs to, with their membership role there. */
export interface StoredProjectWithRole extends StoredProject {
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
  listAll(): Promise<StoredProject[]>;
  /** The projects the person is a member of. */
  listForUser(userId: string): Promise<StoredProjectWithRole[]>;
}
