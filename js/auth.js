var Auth = (function() {
    var SESSION_KEY = 'aklatbayon_session';

    function login(username, password) {
        var users = Store.getAll('users');
        var user = users.find(function(u) {
            return u.username === username && u.password === password && u.status === 'active';
        });
        if (!user) return { success: false, message: 'Invalid credentials or inactive account.' };
        var role = Store.getById('roles', user.role_id);
        var sessionData = {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            role_name: role ? role.name : 'User',
            faculty_subtype: user.faculty_subtype,
            rfid_id: user.rfid_id,
            student_id: user.student_id || null
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        Store.logActivity('LOGIN', 'auth', user.name);
        return { success: true, user: sessionData };
    }

    function loginByRfid(rfid) {
        var users = Store.getAll('users');
        var user = users.find(function(u) {
            return u.rfid_id === rfid && u.status === 'active';
        });
        if (!user) return { success: false, message: 'RFID not recognized.' };
        var role = Store.getById('roles', user.role_id);
        var sessionData = {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role_id: user.role_id,
            role_name: role ? role.name : 'User',
            faculty_subtype: user.faculty_subtype,
            rfid_id: user.rfid_id,
            student_id: user.student_id || null
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        Store.logActivity('RFID_LOGIN', 'auth', user.name);
        return { success: true, user: sessionData };
    }

    function logout() {
        var user = getCurrentUser();
        if (user) Store.logActivity('LOGOUT', 'auth', user.name);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    }

    function getCurrentUser() {
        var data = sessionStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    }

    function isLoggedIn() {
        return getCurrentUser() !== null;
    }

    function requireAuth() {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    function getUserPermissions() {
        var user = getCurrentUser();
        if (!user) return [];
        var rolePerms = Store.getAll('role_permissions');
        var permIds = rolePerms[user.role_id] || [];
        if (user.role_name === 'System Administrator') {
            return Store.getAll('permissions').map(function(p) { return p.name; });
        }
        var allPerms = Store.getAll('permissions');
        return allPerms.filter(function(p) {
            return permIds.indexOf(p.id) !== -1;
        }).map(function(p) { return p.name; });
    }

    function hasPermission(permName) {
        var user = getCurrentUser();
        if (!user) return false;
        if (user.role_name === 'System Administrator') return true;
        return getUserPermissions().indexOf(permName) !== -1;
    }

    function hasAnyPermission(perms) {
        for (var i = 0; i < perms.length; i++) {
            if (hasPermission(perms[i])) return true;
        }
        return false;
    }

    return {
        login: login,
        loginByRfid: loginByRfid,
        logout: logout,
        getCurrentUser: getCurrentUser,
        isLoggedIn: isLoggedIn,
        requireAuth: requireAuth,
        getUserPermissions: getUserPermissions,
        hasPermission: hasPermission,
        hasAnyPermission: hasAnyPermission
    };
})();
