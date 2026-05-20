const App = (() => {
    const THEME_KEY = 'aklatbayon_theme';

    const applyStoredTheme = () => {
        const saved = localStorage.getItem(THEME_KEY) || 'light';
        if (saved === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        const icon = document.getElementById('theme-toggle-icon');
        if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    };

    const init = () => {
        applyStoredTheme();
        renderHeader();
        Sidebar.render();
    };

    const renderHeader = () => {
        const user = Auth.getCurrentUser();
        if (!user) return;
        const header = document.getElementById('top-header');
        if (!header) return;

        header.className = 'astral-header';
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const pageTitle = document.title.split(' - ')[0] || 'Dashboard';
        const isDark = document.documentElement.classList.contains('dark');

        header.innerHTML = `
            <div class="flex items-center gap-4">
                <button id="mobile-menu-btn" class="sidebar-toggle-btn" aria-label="Toggle menu" style="display:none">
                    <span class="material-symbols-outlined text-xl">menu</span>
                </button>
                <div class="header-brand">
                    <img src="/images/logo.png" alt="" class="header-logo">
                    <span class="header-app-name">AklatBayon</span>
                </div>
                <span class="header-page-title">${pageTitle}</span>
            </div>
            <div class="flex items-center gap-2">
                <div class="header-search" id="header-search-trigger">
                    <span class="material-symbols-outlined header-search-icon">search</span>
                    <span class="header-search-text">Search records...</span>
                    <kbd class="header-search-kbd">⌘K</kbd>
                </div>
                <button class="header-icon-btn" title="Notifications" id="header-notif-btn">
                    <span class="material-symbols-outlined">notifications</span>
                    <span class="header-notif-dot" id="notif-dot" style="display:none"></span>
                </button>
                <button class="header-icon-btn" title="Toggle theme" id="theme-toggle-btn">
                    <span class="material-symbols-outlined" id="theme-toggle-icon">${isDark ? 'light_mode' : 'dark_mode'}</span>
                </button>
                <div class="header-divider"></div>
                <div class="header-user">
                    <div class="header-user-info">
                        <span class="header-user-name">${user.name}</span>
                        <span class="header-user-role">${user.role_name}</span>
                    </div>
                    <div class="header-avatar">${initials}</div>
                </div>
            </div>`;

        // Notification dot
        const txns = Store.getAll('transactions');
        const overdue = txns.filter(t => t.status === 'borrowed' && new Date(t.date_due) < new Date()).length;
        if (document.getElementById('notif-dot') && overdue > 0) document.getElementById('notif-dot').style.display = '';

        // Theme toggle
        document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);

        // Search modal trigger
        document.getElementById('header-search-trigger')?.addEventListener('click', openSearchModal);
        document.addEventListener('keydown', e => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearchModal(); }
            if (e.key === 'Escape') closeSearchModal();
        });

        setupMobileSidebar();
    };

    // ── Algolia-style Search Modal ───────────────────────────────
    const openSearchModal = () => {
        let modal = document.getElementById('search-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'search-modal';
            modal.className = 'search-modal-overlay';
            modal.innerHTML = `
                <div class="search-modal-container">
                    <div class="search-modal-header">
                        <span class="material-symbols-outlined search-modal-icon">search</span>
                        <input type="text" id="search-modal-input" class="search-modal-input" placeholder="Search books, students, transactions..." autofocus>
                        <kbd class="search-modal-esc">ESC</kbd>
                    </div>
                    <div class="search-modal-body" id="search-modal-results">
                        <div class="search-modal-empty">
                            <span class="material-symbols-outlined" style="font-size:48px;color:var(--ab-on-surface-faint)">manage_search</span>
                            <p class="search-empty-title">Search AklatBayon</p>
                            <p class="search-empty-sub">Search across books, students, users, and transactions</p>
                        </div>
                    </div>
                    <div class="search-modal-footer">
                        <div class="search-footer-hints">
                            <span><kbd>↵</kbd> to select</span>
                            <span><kbd>↑↓</kbd> to navigate</span>
                            <span><kbd>esc</kbd> to close</span>
                        </div>
                        <span class="search-footer-brand">Powered by AklatBayon</span>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            modal.addEventListener('click', e => { if (e.target === modal) closeSearchModal(); });

            const input = modal.querySelector('#search-modal-input');
            input.addEventListener('input', () => performSearch(input.value));
        }
        modal.classList.add('active');
        setTimeout(() => modal.querySelector('#search-modal-input')?.focus(), 100);
    };

    const closeSearchModal = () => {
        const modal = document.getElementById('search-modal');
        if (modal) modal.classList.remove('active');
    };

    const performSearch = (query) => {
        const results = document.getElementById('search-modal-results');
        if (!results) return;
        const q = query.trim().toLowerCase();
        if (!q) {
            results.innerHTML = `<div class="search-modal-empty"><span class="material-symbols-outlined" style="font-size:48px;color:var(--ab-on-surface-faint)">manage_search</span><p class="search-empty-title">Search AklatBayon</p><p class="search-empty-sub">Search across books, students, users, and transactions</p></div>`;
            return;
        }

        let html = '';
        // Books
        const books = Store.getAll('books').filter(b => b.title.toLowerCase().includes(q) || (b.isbn && b.isbn.toLowerCase().includes(q)));
        if (books.length) {
            html += `<div class="search-section-label">Books</div>`;
            books.slice(0, 5).forEach(b => {
                html += `<a href="/pages/management/catalog/books.html" class="search-result-item">
                    <div class="search-result-icon" style="background:rgba(124,58,237,0.1);color:#7c3aed"><span class="material-symbols-outlined">auto_stories</span></div>
                    <div class="search-result-text"><span class="search-result-title">${highlight(b.title, q)}</span><span class="search-result-sub">${b.isbn || 'No ISBN'} · ${b.available}/${b.copies} available</span></div>
                    <span class="material-symbols-outlined search-result-arrow">arrow_forward</span></a>`;
            });
        }
        // Students
        const students = Store.getAll('students').filter(s => s.name.toLowerCase().includes(q) || (s.student_id && s.student_id.toLowerCase().includes(q)));
        if (students.length) {
            html += `<div class="search-section-label">Students</div>`;
            students.slice(0, 5).forEach(s => {
                html += `<a href="/pages/management/users/students.html" class="search-result-item">
                    <div class="search-result-icon" style="background:rgba(59,130,246,0.1);color:#3b82f6"><span class="material-symbols-outlined">school</span></div>
                    <div class="search-result-text"><span class="search-result-title">${highlight(s.name, q)}</span><span class="search-result-sub">${s.student_id || ''} · ${s.program || ''}</span></div>
                    <span class="material-symbols-outlined search-result-arrow">arrow_forward</span></a>`;
            });
        }
        // Users
        const users = Store.getAll('users').filter(u => u.name.toLowerCase().includes(q) || (u.username && u.username.toLowerCase().includes(q)));
        if (users.length) {
            html += `<div class="search-section-label">Users</div>`;
            users.slice(0, 3).forEach(u => {
                html += `<a href="/pages/management/users/users.html" class="search-result-item">
                    <div class="search-result-icon" style="background:rgba(16,185,129,0.1);color:#10b981"><span class="material-symbols-outlined">person</span></div>
                    <div class="search-result-text"><span class="search-result-title">${highlight(u.name, q)}</span><span class="search-result-sub">${u.username} · ${App.getRoleName(u.role_id)}</span></div>
                    <span class="material-symbols-outlined search-result-arrow">arrow_forward</span></a>`;
            });
        }

        if (!html) html = `<div class="search-modal-empty"><span class="material-symbols-outlined" style="font-size:40px;color:var(--ab-on-surface-faint)">search_off</span><p class="search-empty-title">No results for "${q}"</p><p class="search-empty-sub">Try a different search term</p></div>`;
        results.innerHTML = html;
    };

    const highlight = (text, query) => {
        const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(re, '<mark class="search-highlight">$1</mark>');
    };

    // ── Mobile Sidebar ────────────────────────────────────────
    const setupMobileSidebar = () => {
        const btn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar-nav');
        if (!btn || !sidebar) return;
        const mql = window.matchMedia('(max-width: 1024px)');
        const updateBtn = () => { btn.style.display = mql.matches ? 'flex' : 'none'; };
        updateBtn();
        mql.addEventListener('change', updateBtn);

        let overlay = document.getElementById('sidebar-mobile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-mobile-overlay';
            overlay.className = 'sidebar-mobile-overlay';
            document.body.appendChild(overlay);
        }
        const toggle = () => { sidebar.classList.toggle('sidebar-open'); overlay.classList.toggle('active'); };
        btn.addEventListener('click', toggle);
        overlay.addEventListener('click', toggle);
    };

    const showAlert = (type, message) => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const styles = {
            success: 'background:var(--ab-success-light);color:var(--ab-success);border:1px solid rgba(16,185,129,0.3)',
            danger:  'background:var(--ab-error-light);color:var(--ab-error);border:1px solid rgba(239,68,68,0.3)',
            info:    'background:var(--ab-info-light);color:var(--ab-info);border:1px solid rgba(59,130,246,0.3)'
        };
        const icons = { success: 'check_circle', danger: 'error', info: 'info' };
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4 animate-fade-in';
        div.style.cssText = styles[type] || styles.info;
        div.innerHTML = `<span class="material-symbols-outlined text-lg">${icons[type] || 'info'}</span> ${message}`;
        container.prepend(div);
        setTimeout(() => div.remove(), 4000);
    };

    const swalTheme = () => {
        const isDark = document.documentElement.classList.contains('dark');
        return { background: isDark ? '#1e1e32' : '#ffffff', color: isDark ? '#e2e0fc' : '#1e293b' };
    };

    const confirmDelete = (itemName) => Swal.fire({
        title: 'Are you sure?', text: `Delete "${itemName}"? This cannot be undone.`, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#7c3aed', cancelButtonColor: '#e2e8f0',
        confirmButtonText: 'Yes, delete it!', ...swalTheme()
    });

    const formatDate = (isoStr) => {
        if (!isoStr) return '\u2014';
        const d = new Date(isoStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };

    const formatDateTime = (isoStr) => {
        if (!isoStr) return '\u2014';
        const d = new Date(isoStr);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        let h = d.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
    };

    const openModal = (id) => { const m = document.getElementById(id); if (m) m.classList.add('active'); };
    const closeModal = (id) => { const m = document.getElementById(id); if (m) m.classList.remove('active'); };
    const bindModalCloses = () => {
        document.querySelectorAll('.modal-close').forEach(btn => { btn.addEventListener('click', function() { this.closest('.modal-overlay').classList.remove('active'); }); });
        document.querySelectorAll('.modal-overlay').forEach(o => { o.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); }); });
    };

    const getRoleName = (roleId) => { const r = Store.getById('roles', roleId); return r ? r.name : 'Unknown'; };
    const getAuthorName = (authorId) => { const a = Store.getById('authors', authorId); return a ? a.name : 'Unknown'; };
    const getPublisherName = (pubId) => { const p = Store.getById('publishers', pubId); return p ? p.name : 'Unknown'; };
    const getCategoryName = (catId) => { const c = Store.getById('categories', catId); return c ? c.name : 'Unknown'; };
    const getStudentName = (studentId) => { const s = Store.getById('students', studentId); return s ? s.name : 'Unknown'; };
    const getBookTitle = (bookId) => { const b = Store.getById('books', bookId); return b ? b.title : 'Unknown'; };

    return {
        init, showAlert, confirmDelete, swalTheme, formatDate, formatDateTime, toggleTheme,
        openModal, closeModal, bindModalCloses,
        getRoleName, getAuthorName, getPublisherName, getCategoryName, getStudentName, getBookTitle
    };
})();

window.addEventListener('unhandledrejection', (e) => { e.preventDefault(); });
window.onerror = (msg, src, line, col, err) => {
    if (err === '' || msg === 'Script error.' || msg === 'Uncaught ') return true;
    if (typeof msg === 'string' && msg.includes('Uncaught ')) return true;
    return false;
};
