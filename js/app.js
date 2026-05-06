const App = (() => {
    const THEME_KEY = 'aklatbayon_theme';

    const applyStoredTheme = () => {
        // BorrowBox style uses light theme
        document.documentElement.classList.remove('dark');
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

        header.innerHTML = `
            <div class="flex items-center gap-3">
                <button id="mobile-menu-btn" class="md-sidebar-toggle flex flex-col gap-[5px] p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Toggle menu" style="display:none">
                    <span style="display:block;width:20px;height:2px;background:#7c3aed;border-radius:2px;transition:all 0.3s"></span>
                    <span style="display:block;width:20px;height:2px;background:#7c3aed;border-radius:2px;transition:all 0.3s"></span>
                    <span style="display:block;width:20px;height:2px;background:#7c3aed;border-radius:2px;transition:all 0.3s"></span>
                </button>
                <div class="hidden lg:block">
                    <h2 class="text-sm font-bold text-gray-900" id="header-page-title"></h2>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="relative">
                    <button class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-purple-600 relative" title="Notifications" id="header-notif-btn">
                        <span class="material-symbols-outlined text-xl">notifications</span>
                        <span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" id="notif-dot" style="display:none"></span>
                    </button>
                </div>
                <button class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400 hover:text-purple-600" title="Search">
                    <span class="material-symbols-outlined text-xl">search</span>
                </button>
                <div class="h-8 w-px bg-gray-200 hidden sm:block"></div>
                <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl px-2 py-1.5 transition-colors">
                    <div class="text-right hidden sm:block">
                        <div class="text-sm font-semibold text-gray-900">${user.name}</div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider">${user.role_name}</div>
                    </div>
                    <div class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-purple-500 to-violet-600 shadow-md shadow-purple-500/20">${initials}</div>
                </div>
            </div>`;

        // Set page title from document title
        const pageTitle = document.getElementById('header-page-title');
        if (pageTitle) {
            const title = document.title.split(' - ')[0] || 'Dashboard';
            pageTitle.textContent = title;
        }

        // Show notification dot if there are pending items
        const txns = Store.getAll('transactions');
        const overdue = txns.filter(t => t.status === 'borrowed' && new Date(t.date_due) < new Date()).length;
        const notifDot = document.getElementById('notif-dot');
        if (notifDot && overdue > 0) notifDot.style.display = '';

        // Mobile sidebar toggle
        setupMobileSidebar();
    };

    const setupMobileSidebar = () => {
        const btn = document.getElementById('mobile-menu-btn');
        const sidebar = document.getElementById('sidebar-nav');
        if (!btn || !sidebar) return;

        // Show hamburger on mobile
        const mql = window.matchMedia('(max-width: 1024px)');
        const updateBtn = () => { btn.style.display = mql.matches ? 'flex' : 'none'; };
        updateBtn();
        mql.addEventListener('change', updateBtn);

        // Create overlay
        let overlay = document.getElementById('sidebar-mobile-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-mobile-overlay';
            overlay.className = 'sidebar-mobile-overlay';
            document.body.appendChild(overlay);
        }

        const toggle = () => {
            sidebar.classList.toggle('sidebar-open');
            overlay.classList.toggle('active');
        };

        btn.addEventListener('click', toggle);
        overlay.addEventListener('click', toggle);
    };

    const showAlert = (type, message) => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const styles = {
            success: 'background:#d1fae5;color:#059669;border:1px solid #a7f3d0',
            danger: 'background:#fee2e2;color:#dc2626;border:1px solid #fecaca',
            info: 'background:#dbeafe;color:#2563eb;border:1px solid #bfdbfe'
        };
        const icons = { success: 'check_circle', danger: 'error', info: 'info' };
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4 animate-fade-in';
        div.style.cssText = styles[type] || styles.info;
        div.innerHTML = `<span class="material-symbols-outlined text-lg">${icons[type] || 'info'}</span> ${message}`;
        container.prepend(div);
        setTimeout(() => div.remove(), 4000);
    };

    const confirmDelete = (itemName) => Swal.fire({
        title: 'Are you sure?',
        text: `Delete "${itemName}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#e2e8f0',
        confirmButtonText: 'Yes, delete it!',
        background: '#ffffff',
        color: '#1e293b'
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
        let h = d.getHours();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
    };

    const openModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    };

    const closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    };

    const bindModalCloses = () => {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal-overlay').classList.remove('active');
            });
        });
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) this.classList.remove('active');
            });
        });
    };

    const getRoleName = (roleId) => { const r = Store.getById('roles', roleId); return r ? r.name : 'Unknown'; };
    const getAuthorName = (authorId) => { const a = Store.getById('authors', authorId); return a ? a.name : 'Unknown'; };
    const getPublisherName = (pubId) => { const p = Store.getById('publishers', pubId); return p ? p.name : 'Unknown'; };
    const getCategoryName = (catId) => { const c = Store.getById('categories', catId); return c ? c.name : 'Unknown'; };
    const getStudentName = (studentId) => { const s = Store.getById('students', studentId); return s ? s.name : 'Unknown'; };
    const getBookTitle = (bookId) => { const b = Store.getById('books', bookId); return b ? b.title : 'Unknown'; };

    return {
        init, showAlert, confirmDelete, formatDate, formatDateTime,
        openModal, closeModal, bindModalCloses,
        getRoleName, getAuthorName, getPublisherName, getCategoryName, getStudentName, getBookTitle
    };
})();

// ── Global error suppression ──────────────────────────────────
// Suppress unhandled promise rejections from failed API calls
window.addEventListener('unhandledrejection', (e) => { e.preventDefault(); });
// Suppress empty throws used by auth guards (throw '')
window.onerror = (msg, src, line, col, err) => {
    if (err === '' || msg === 'Script error.' || msg === 'Uncaught ') return true;
    if (typeof msg === 'string' && msg.includes('Uncaught ')) return true;
    return false;
};
