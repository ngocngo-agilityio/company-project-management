import { randomUUID } from "node:crypto";
import { PROJECT_MEMBER_PREVIEW_MAX, SESSION_COOKIE_NAME } from "@board/shared";
import { buildApp } from "../../app.js";
import type { GoogleAuth } from "../../services/google.js";
import type {
  AuthStore,
  CreatedProject,
  InvitationStore,
  PeopleStore,
  ProjectStore,
  StoredInvitation,
  StoredProject,
  StoredProjectSummary,
  StoredProjectWithRole,
  StoredUser,
} from "../../types/index.js";

export const WEB = "https://web.example.com";
export const NOW = new Date("2026-11-27T08:00:00.000Z");

export function makeUser(over: Partial<StoredUser> = {}): StoredUser {
  return {
    id: randomUUID(),
    email: `${randomUUID()}@example.com`,
    name: "Person",
    avatarUrl: null,
    googleId: null,
    isSuperAdmin: false,
    deactivatedAt: null,
    ...over,
  };
}

/** AuthStore that only knows sessions; sign-in itself is not used by these tests. */
function makeAuthStore(users: StoredUser[]) {
  const sessions = new Map<string, { id: string; userId: string }>();
  const unused = async (): Promise<never> => {
    throw new Error("not used in this test");
  };
  const store: AuthStore = {
    findUser: unused,
    updateProfile: unused,
    hasPendingInvitation: unused,
    admit: unused,
    async createSession(userId) {
      const id = randomUUID();
      sessions.set(id, { id, userId });
      return { id };
    },
    async findSession(id) {
      const row = sessions.get(id);
      if (!row) return null;
      return {
        id,
        expiresAt: new Date(NOW.getTime() + 60_000),
        lastUsedAt: NOW,
        user: users.find((u) => u.id === row.userId)!,
      };
    },
    async touchSession() {},
    async deleteSession(id) {
      sessions.delete(id);
    },
  };
  return { store, sessions };
}

/** In-memory ProjectStore. `failWith` makes createProject throw, like a database error mid-transaction. */
export function makeProjectStore(users: StoredUser[], opts: { failWith?: Error } = {}) {
  const projects: StoredProject[] = [];
  const memberships: { projectId: string; userId: string; role: "OWNER" | "MEMBER" | "OBSERVER" }[] = [];
  const created: CreatedProject[] = [];
  const roleOrder = { OWNER: 0, MEMBER: 1, OBSERVER: 2 } as const;
  /** Counts and the avatar preview, worked out from the memberships like the database would. */
  const withStats = (project: StoredProject): StoredProjectSummary => {
    const members = memberships
      .filter((m) => m.projectId === project.id)
      .map((m) => ({ role: m.role, user: users.find((u) => u.id === m.userId)! }))
      .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.user.name.localeCompare(b.user.name));
    return {
      ...project,
      boardCount: created.filter((c) => c.project.id === project.id).length || 1,
      memberCount: members.length,
      members: members.slice(0, PROJECT_MEMBER_PREVIEW_MAX).map(({ user }) => ({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      })),
    };
  };
  const store: ProjectStore = {
    async createProject({ name, ownerId }) {
      if (opts.failWith) throw opts.failWith;
      const owner = users.find((u) => u.id === ownerId && !u.deactivatedAt);
      if (!owner) return null;
      const project = { id: randomUUID(), name, archivedAt: null, createdAt: NOW };
      projects.push(project);
      memberships.push({ projectId: project.id, userId: owner.id, role: "OWNER" });
      const result: CreatedProject = {
        project,
        ownerId: owner.id,
        board: {
          id: randomUUID(),
          name: "Main board",
          lists: [
            { id: randomUUID(), name: "To do", position: 1, isFinished: false },
            { id: randomUUID(), name: "In progress", position: 2, isFinished: false },
            { id: randomUUID(), name: "Done", position: 3, isFinished: true },
          ],
        },
      };
      created.push(result);
      return result;
    },
    async setArchived(id, archived) {
      const project = projects.find((p) => p.id === id);
      if (!project) return "not_found";
      if ((project.archivedAt !== null) === archived) return "unchanged";
      project.archivedAt = archived ? NOW : null;
      return "ok";
    },
    async listAll() {
      return projects.map(withStats);
    },
    async listForUser(userId): Promise<StoredProjectWithRole[]> {
      return memberships
        .filter((m) => m.userId === userId)
        .map((m) => ({ ...withStats(projects.find((p) => p.id === m.projectId)!), role: m.role }));
    },
  };
  return { store, projects, memberships, created };
}

/** Returns the full user rows, Google id included, so a route that spreads a row would leak it in tests. */
export function makePeopleStore(users: StoredUser[]): PeopleStore {
  return {
    async listPeople({ activeOnly }) {
      return users.filter((u) => !activeOnly || !u.deactivatedAt);
    },
  };
}

/**
 * In-memory InvitationStore with the same rules as the database one: an active person is refused, a
 * Pending account invitation (even past its date) blocks a new one, a deactivated person is reactivated.
 */
export function makeInvitationStore(users: StoredUser[]) {
  const rows: StoredInvitation[] = [];
  const store: InvitationStore = {
    async list() {
      return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async createAccountInvitation({ email, invitedById, now, expiresAt }) {
      const person = users.find((u) => u.email === email);
      if (person && !person.deactivatedAt) return { result: "active_user" };
      const inviter = users.find((u) => u.id === invitedById)!;
      const base = {
        id: randomUUID(),
        email,
        project: null,
        role: null,
        invitedBy: { id: inviter.id, name: inviter.name },
      };
      if (person) {
        person.deactivatedAt = null;
        rows
          .filter((r) => r.email === email && !r.project && r.status === "PENDING")
          .forEach((r) => (r.status = "ACCEPTED"));
        const invitation: StoredInvitation = { ...base, status: "ACCEPTED", createdAt: now, expiresAt };
        rows.push(invitation);
        return { result: "reactivated", invitation };
      }
      if (rows.some((r) => r.email === email && !r.project && r.status === "PENDING")) {
        return { result: "pending_exists" };
      }
      const invitation: StoredInvitation = { ...base, status: "PENDING", createdAt: now, expiresAt };
      rows.push(invitation);
      return { result: "created", invitation };
    },
    async resend({ id, expiresAt }) {
      const row = rows.find((r) => r.id === id);
      if (!row) return { result: "not_found" };
      if (row.status !== "PENDING" && row.status !== "EXPIRED") return { result: "not_resendable" };
      row.status = "PENDING";
      row.expiresAt = expiresAt;
      return { result: "ok", invitation: row };
    },
  };
  return { store, rows };
}

const noGoogle: GoogleAuth = {
  async register() {},
  async fetchProfile() {
    throw new Error("not used in this test");
  },
};

/** An app with project and people routes, and a `cookieFor(user)` that signs a person in. */
export function setupApp(users: StoredUser[], opts: { failWith?: Error } = {}) {
  const { store, sessions } = makeAuthStore(users);
  const projectData = makeProjectStore(users, opts);
  const invitationData = makeInvitationStore(users);
  const app = buildApp({
    webOrigin: WEB,
    auth: {
      store,
      projects: projectData.store,
      people: makePeopleStore(users),
      invitations: invitationData.store,
      google: noGoogle,
      crossSite: true,
      now: () => NOW,
    },
  });
  async function cookieFor(user: StoredUser) {
    const { id } = await store.createSession(user.id, NOW);
    return `${SESSION_COOKIE_NAME}=${id}`;
  }
  return { app, sessions, cookieFor, invitationRows: invitationData.rows, ...projectData };
}
