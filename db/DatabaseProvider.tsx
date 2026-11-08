import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import type { ReactNode } from 'react';

import { initDatabase, readDatabaseSummary } from './schema';

const DATABASE_NAME = 'sennin.db';

async function onInit(db: SQLiteDatabase): Promise<void> {
  await initDatabase(db);
  const summary = await readDatabaseSummary(db);
  console.log(
    `[db] ready: schema v${summary.schemaVersion}, tables: ${summary.tables.join(', ')}, ` +
      `items: ${summary.itemCount}`,
  );
}

/**
 * Opens the database and creates the tables before the app renders. Wrap the
 * app in this once, in app/_layout.tsx.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={onInit}>
      {children}
    </SQLiteProvider>
  );
}

/** The open database, for hooks to pass to the queries in db/. */
export function useDatabase(): SQLiteDatabase {
  return useSQLiteContext();
}
