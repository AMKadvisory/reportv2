// ═══════════════════════════════════════════════════════════
//  auth.js  —  Authentication helpers (PocketBase)
//  ► Edit this file for auth logic changes only
//  Requires: config.js
// ═══════════════════════════════════════════════════════════
const Auth = {

    // Returns the current logged-in user or null
    getSession() {
        return db.authStore.isValid ? db.authStore.record : null;
    },

    // Fetch a user record by id
    async getProfile(userId) {
        return await db.collection('users').getOne(userId);
    },

    // Use for regular user pages (form, dashboard)
    async requireAuth(redirectTo = 'index.html') {
        if (db.authStore.isValid) {
            try { await db.collection('users').authRefresh(); } catch(e) {}
        }
        const user = this.getSession();
        if (!user) { window.location.href = redirectTo; return null; }
        return user;
    },

    // Use for admin-only pages
    async requireAdmin() {
        if (db.authStore.isValid) {
            try { await db.collection('users').authRefresh(); } catch(e) {}
        }
        const user = this.getSession();
        if (!user) { window.location.href = 'index.html'; return null; }

        if (user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return null;
        }

        return { session: user, profile: user };
    },

    async logout() {
        db.authStore.clear();
        window.location.href = 'index.html';
    }
};
