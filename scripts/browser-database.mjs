// The same domain API runs locally; only its database adapter changes.
import { handleApi } from '../worker/api.ts';

export function sqlJsD1(db) {
 function prepare(sql) {
  let values = [];
  const statement = {
   bind(...args) { values = args; return statement; },
   execute() {
    const query = db.prepare(sql);
    try {
     query.bind(values);
     const results = [];
     while (query.step()) results.push(query.getAsObject());
     return { results, meta: { changes: db.getRowsModified() } };
    } finally { query.free(); }
   },
   async first() { return statement.execute().results[0] ?? null; },
   async all() { return statement.execute(); },
   async run() { return statement.execute(); }
  };
  return statement;
 }
 return { prepare, async batch(statements) {
  db.run('BEGIN IMMEDIATE');
  try { const results = statements.map(s => s.execute()); db.run('COMMIT'); return results; }
  catch (error) { db.run('ROLLBACK'); throw error; }
 } };
}

export function migrateBrowserDatabase(db, migrations) {
 db.run('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS preview_migrations(name TEXT PRIMARY KEY)');
 for (const { name, sql } of migrations) {
  const tracked = db.exec('SELECT name FROM preview_migrations WHERE name=$name', { $name: name });
  if (tracked.length) continue;
  db.run('BEGIN IMMEDIATE');
  try {
   db.run(sql.replaceAll('--> statement-breakpoint', ''));
   db.run('INSERT INTO preview_migrations VALUES(?)', [name]);
   db.run('COMMIT');
  } catch (error) { db.run('ROLLBACK'); throw error; }
 }
}

export function createBrowserGame({ SQL, migrations, load, save }) {
 return async ({ url, method = 'GET', headers: inputHeaders, body }) => {
  const stored = await load();
  const db = stored?.data ? new SQL.Database(new Uint8Array(stored.data)) : new SQL.Database();
  try {
   migrateBrowserDatabase(db, migrations);
   const headers = new Headers(inputHeaders);
   headers.set('oai-authenticated-user-id', 'browser-player');
   const response = await handleApi(new Request(url, { method, headers, body }), { DB: sqlJsD1(db) });
   // A response is acknowledged only after its resulting state is durable.
   await save(db.export(), stored?.revision ?? 0);
   return { status: response.status, headers: [...response.headers], body: await response.text() };
  } finally { db.close(); }
 };
}
