/** A person as the People list shows them. Has no Google account id on purpose. */
export interface StoredPerson {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  deactivatedAt: Date | null;
}

/** The database operations the people route needs. Tests use an in-memory version; the server uses Prisma. */
export interface PeopleStore {
  /** Everyone, or only people who are not deactivated. */
  listPeople(input: { activeOnly: boolean }): Promise<StoredPerson[]>;
}
