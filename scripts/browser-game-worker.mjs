import initSqlJs from 'sql.js';
import migrations from 'operators:migrations';
import { createBrowserGame } from './browser-database.mjs';

const openStore = new Promise((resolve, reject) => {
 const request = indexedDB.open('operators-campaigns', 1);
 request.onupgradeneeded = () => request.result.createObjectStore('saves');
 request.onsuccess = () => resolve(request.result);
 request.onerror = () => reject(request.error);
 request.onblocked = () => reject(new Error('Feche outras abas do jogo e tente novamente.'));
});
async function load() {
 const store = await openStore;
 return new Promise((resolve, reject) => {
  const tx = store.transaction('saves', 'readonly');
  const request = tx.objectStore('saves').get('campaigns');
  tx.oncomplete = () => resolve(request.result);
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
 });
}
async function save(data, revision) {
 const store = await openStore;
 return new Promise((resolve, reject) => {
  const tx = store.transaction('saves', 'readwrite');
  const objectStore = tx.objectStore('saves');
  const request = objectStore.get('campaigns');
  let conflict = false;
  request.onsuccess = () => {
   if ((request.result?.revision ?? 0) !== revision) { conflict = true; tx.abort(); return; }
   objectStore.put({ data, revision: revision + 1 }, 'campaigns');
  };
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(Object.assign(new Error(conflict ? 'A partida mudou em outra aba. Atualize e tente novamente.' : 'Não foi possível salvar neste navegador. Verifique o espaço disponível e as permissões de armazenamento.'), { status: conflict ? 409 : 507 }));
 });
}
const ready = initSqlJs({ locateFile: () => '/sql-wasm.wasm' }).then(SQL => createBrowserGame({ SQL, migrations, load, save }));
let queue = Promise.resolve();
self.onmessage = ({ data: { id, request } }) => {
 queue = queue.then(async () => {
  try { self.postMessage({ id, response: await (await ready)(request) }); }
  catch (error) { self.postMessage({ id, response: { status: error.status ?? 503, headers: [['content-type', 'application/json']], body: JSON.stringify({ code: 'BROWSER_STORAGE', message: error.message || 'Não foi possível abrir o salvamento deste navegador.' }) } }); }
 });
};
