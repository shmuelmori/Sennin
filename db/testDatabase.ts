// Test only. expo-sqlite's native module doesn't run in Jest, so the db/ tests
// run the same SQL on Node's built-in SQLite (node:sqlite, Node 22.13+), behind
// the few SQLiteDatabase methods that db/ uses. Never import this from app code.

import type { SQLiteDatabase } from 'expo-sqlite';

type Param = string | number | null;

type NodeStatement = {
  run(...params: Param[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  all(...params: Param[]): Record<string, unknown>[];
  get(...params: Param[]): Record<string, unknown> | undefined;
};

type NodeDatabase = {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
};

// A require with a local type, so the app's tsconfig doesn't need Node's types.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => NodeDatabase;
};

// expo-sqlite takes the params as one array or as separate arguments.
function toParams(args: unknown[]): Param[] {
  const list: unknown[] = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  return list.map((value) => {
    if (value === null || typeof value === 'string' || typeof value === 'number') {
      return value;
    }
    throw new Error(`testDatabase can't bind ${typeof value}; pass a string, number or null`);
  });
}

class TestDatabase {
  constructor(private readonly db: NodeDatabase) {}

  async execAsync(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async runAsync(sql: string, ...args: unknown[]) {
    const result = this.db.prepare(sql).run(...toParams(args));
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    return this.db
      .prepare(sql)
      .all(...toParams(args))
      .map((row) => ({ ...row }) as T);
  }

  async getFirstAsync<T>(sql: string, ...args: unknown[]): Promise<T | null> {
    const row = this.db.prepare(sql).get(...toParams(args));
    return row === undefined ? null : ({ ...row } as T);
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async closeAsync(): Promise<void> {
    this.db.close();
  }
}

/** A fresh, empty in-memory database. Call closeAsync() when the test ends. */
export function openTestDatabase(): SQLiteDatabase {
  return new TestDatabase(new DatabaseSync(':memory:')) as unknown as SQLiteDatabase;
}
