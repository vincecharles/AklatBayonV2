const Auth = (() => {
    const SESSION_KEY = 'aklatbayon_session';

    const login = (username, password) => {
        const users = Store.getAll('users');
        const user = users.find(u => u.username === username && u.password === password && u.status === 'active');
        if (!user) return { success: false, message: 'Invalid credentials or inactive account.' };
        const role = Store.getById('roles', user.role_id);
        const sessionData = {
            id: user.id, name: user.name, username: user.username, email: user.email,
            role_id: user.role_id, role_name: role ? role.name : 'User',
            faculty_subtype: user.faculty_subtype, rfid_id: user.rfid_id,
            student_id: user.student_id || null
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        Store.logActivity('LOGIN', 'auth', user.name);
        return { success: true, user: sessionData };
    };

    const loginByRfid = (rfid) => {
        const users = Store.getAll('users');
        const user = users.find(u => u.rfid_id === rfid && u.status === 'active');
        if (!user) return { success: false, message: 'RFID not recognized.' };
        const role = Store.getById('roles', user.role_id);
        const sessionData = {
            id: user.id, name: user.name, username: user.username, email: user.email,
            role_id: user.role_id, role_name: role ? role.name : 'User',
            faculty_subtype: user.faculty_subtype, rfid_id: user.rfid_id,
            student_id: user.student_id || null
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        Store.logActivity('RFID_LOGIN', 'auth', user.name);
        return { success: true, user: sessionData };
    };

    const logout = () => {
        const user = getCurrentUser();
        if (user) Store.logActivity('LOGOUT', 'auth', user.name);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = '/index.html';
    };

    const getCurrentUser = () => {
        const data = sessionStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    };

    const isLoggedIn = () => getCurrentUser() !== null;

    const requireAuth = () => {
        if (!isLoggedIn()) {
            window.location.href = '/pages/auth/login.html';
            return false;
        }
        return true;
    };

    const getUserPermissions = () => {
        const user = getCurrentUser();
        if (!user) return [];
        const rolePerms = Store.getAll('role_permissions');
        const permIds = rolePerms[user.role_id] || [];
        if (user.role_name === 'System Administrator') {
            return Store.getAll('permissions').map(p => p.name);
        }
        return Store.getAll('permissions')
            .filter(p => permIds.includes(p.id))
            .map(p => p.name);
    };

    const hasPermission = (permName) => {
        const user = getCurrentUser();
        if (!user) return false;
        if (user.role_name === 'System Administrator') return true;
        return getUserPermissions().includes(permName);
    };

    const hasAnyPermission = (perms) => perms.some(p => hasPermission(p));

    return {
        login, loginByRfid, logout, getCurrentUser, isLoggedIn,
        requireAuth, getUserPermissions, hasPermission, hasAnyPermission
    };
})();
