// ═══════════════════════════════════════════════════════════
//  config.js  —  PocketBase client
//  ► Only edit this file when the server URL changes
//  Requires: PocketBase JS SDK loaded globally
// ═══════════════════════════════════════════════════════════
const POCKETBASE_URL = 'http://127.0.0.1:8090';
const db = new PocketBase(POCKETBASE_URL);

// Keep the user logged in across page refreshes automatically
db.authStore.onChange(() => {}, true);