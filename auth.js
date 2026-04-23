// ═══════════════════════════════════════════════════════════
//  auth.js  —  Authentication helpers (PocketBase)
//  ► Edit this file for auth logic changes only
//  Requires: config.js
// ═══════════════════════════════════════════════════════════
const Auth = {

    // Returns the current auth record (user) or null
    getSession() {
        return db.authStore.isValid ? db.authStore.record : null;
    },

    // Fetch a profile record by its id
    async getProfile(userId) {
        return await db.collection('profiles').getOne(userId);
    },

    // Use for regular user pages (form, dashboard)
    async requireAuth(redirectTo = 'index.html') {
        // Try to refresh the token silently — keeps session alive
        if (db.authStore.isValid) {
            try { await db.collection('profiles').authRefresh(); } catch(e) {}
        }
        const user = this.getSession();
        if (!user) { window.location.href = redirectTo; return null; }
        return user;
    },

    // Use for admin-only pages
    async requireAdmin() {
        if (db.authStore.isValid) {
            try { await db.collection('profiles').authRefresh(); } catch(e) {}
        }
        const user = this.getSession();
        if (!user) { window.location.href = 'index.html'; return null; }

        // Fetch fresh profile to check role
        let profile;
        try {
            profile = await db.collection('profiles').getOne(user.id);
        } catch(e) {
            window.location.href = 'index.html';
            return null;
        }

        if (profile?.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return null;
        }

        return { session: user, profile };
    },

    // Login with email + password
    async login(email, password) {
        return await db.collection('profiles').authWithPassword(email, password);
    },

    // Register a new user
    async register(email, password, fullName) {
        const record = await db.collection('profiles').create({
            email,
            password,
            passwordConfirm: password,
            full_name: fullName,
            role: 'user'
        });
        // Auto login after register
        await db.collection('profiles').authWithPassword(email, password);
        return record;
    },

    async logout() {
        db.authStore.clear();
        window.location.href = 'index.html';
    }
};