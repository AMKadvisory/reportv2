// ═══════════════════════════════════════════════════════════
//  config.js  —  PocketBase client
//  ► Only edit this file when the server URL changes
//  Requires: PocketBase JS SDK loaded globally
// ═══════════════════════════════════════════════════════════
const POCKETBASE_URL = 'http://127.0.0.1:8090';
const db = (typeof _db !== 'undefined') ? _db : new PocketBase(POCKETBASE_URL);
