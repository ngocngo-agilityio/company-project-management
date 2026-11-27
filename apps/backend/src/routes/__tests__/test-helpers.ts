import { randomUUID } from "node:crypto";
import { SESSION_COOKIE_NAME } from "@board/shared";
import { buildApp } from "../../app.js";
import type { GoogleAuth } from "../../services/google.js";
import type {
  AuthStore,
  CreatedProject,
  PeopleStore,
  ProjectStore,
  StoredProject,
  StoredProjectWithRole,
  StoredUser,
} from "../../types/index.js";

export const WEB = "https://web.example.com";
const NOW = new Date("2026-11-27T08:00:00.000Z");

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
    hasActiveMembership: unused,
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
    async listAll() {
      return [...projects];
    },
    async listForUser(userId): Promise<StoredProjectWithRole[]> {
      return memberships
        .filter((m) => m.userId === userId)
        .map((m) => ({ ...projects.find((p) => p.id === m.projectId)!, role: m.role }));
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
  const app = buildApp({
    webOrigin: WEB,
    auth: {
      store,
      projects: projectData.store,
      people: makePeopleStore(users),
      google: noGoogle,
      crossSite: true,
      now: () => NOW,
    },
  });
  async function cookieFor(user: StoredUser) {
    const { id } = await store.createSession(user.id, NOW);
    return `${SESSION_COOKIE_NAME}=${id}`;
  }
  return { app, sessions, cookieFor, ...projectData };
}
