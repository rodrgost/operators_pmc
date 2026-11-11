import { expect, it } from 'vitest';
import initSqlJs from 'sql.js';
import { readFileSync, readdirSync } from 'node:fs';
// @ts-expect-error Browser adapter is bundled as JavaScript.
import { createBrowserGame } from '../scripts/browser-database.mjs';

const migrations = readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort().map(name => ({ name, sql: readFileSync('drizzle/' + name, 'utf8') }));
async function browser() {
 const SQL = await initSqlJs();
 let snapshot: any;
 let rejectSave = false;
 const options = { SQL, migrations, load: async () => snapshot, save: async (data: Uint8Array, revision: number) => {
  if (rejectSave) throw new Error('Quota exceeded');
  expect(revision).toBe(snapshot?.revision ?? 0);
  snapshot = { data: data.slice(), revision: revision + 1 };
 } };
 let game = createBrowserGame(options);
 return {
  reopen() { game = createBrowserGame(options); },
  failSave(value: boolean) { rejectSave = value; },
  async call(path: string, body?: any) {
   const response = await game({ url: 'https://game.example/api/v1' + path, method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
   return { status: response.status, data: JSON.parse(response.body) };
  }
 };
}
it('browser save restores a campaign, planned actions and turns, isolated from another browser', async () => {
 const first = await browser();
 expect((await first.call('/session')).data.authenticated).toBe(true);
 const created = await first.call('/games', { requestId: 'browser-create', name: 'Browser PMC', seed: 'browser-save' });
 expect(created.status).toBe(201);
 const path = '/games/' + created.data.id;
 const staff = await first.call(path + '/personnel');
 expect(staff.status).toBe(200);
 const state = await first.call(path);
 const hire = await first.call(path + '/recruitment/hire', { requestId: 'hire', expectedVersion: state.data.stateVersion, candidateId: staff.data.candidates[0].id, weeks: 4 });
 expect(hire.status).toBe(201);
 const current = await first.call(path);
 const advanced = await first.call(path + '/advance', { requestId: 'turn', expectedVersion: current.data.stateVersion, turns: 1, stopOnImportant: false });
 expect(advanced.status).toBe(200);
 expect(advanced.data.status).not.toBe('failed');
 first.reopen();
 expect((await first.call(path)).data.currentTurn).toBe(1);
 expect((await first.call(path + '/personnel')).data.operators).toHaveLength(1);
 expect((await first.call('/games')).data).toHaveLength(1);
 const second = await browser();
 expect((await second.call('/games')).data).toHaveLength(0);
 expect((await second.call(path)).status).toBe(404);
});
it('failed persistence does not acknowledge or retain a campaign mutation', async () => {
 const b = await browser();
 await b.call('/games');
 b.failSave(true);
 await expect(b.call('/games', { requestId: 'unsaved', name: 'Unsaved PMC', seed: 'unsaved' })).rejects.toThrow('Quota exceeded');
 b.failSave(false);
 b.reopen();
 expect((await b.call('/games')).data).toHaveLength(0);
 const retry = await b.call('/games', { requestId: 'unsaved', name: 'Unsaved PMC', seed: 'unsaved' });
 expect(retry.status).toBe(201);
 expect((await b.call('/games')).data).toHaveLength(1);
});
