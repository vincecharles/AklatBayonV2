const App = (() => {
    const THEME_KEY = 'aklatbayon_theme';
    const LEGACY_THEME_KEY = 'aklatbayon_dark_mode';

    const applyStoredTheme = () => {
        // Force dark mode for Astral theme
        document.documentElement.classList.add('dark');
        localStorage.setItem(THEME_KEY, 'dark');
    };

    const init = () => {
        applyStoredTheme();
        renderHeader();
        Sidebar.render();
        renderStatusBar();
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
                <img src="/images/logo.png" alt="AklatBayon" class="w-8 h-8 object-contain">
                <span class="text-lg font-bold tracking-tight text-[#ffb599]">AklatBayon</span>
            </div>
            <div class="flex items-center gap-4">
                <button class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[rgba(255,181,153,0.08)] transition-colors text-[#9b99b8] hover:text-[#ffb599] relative" title="Notifications">
                    <span class="material-symbols-outlined text-xl">notifications</span>
                </button>
                <button class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[rgba(255,181,153,0.08)] transition-colors text-[#9b99b8] hover:text-[#ffb599]" title="Settings">
                    <span class="material-symbols-outlined text-xl">settings</span>
                </button>
                <div class="h-8 w-px bg-[#3a3a52]"></div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <div class="text-sm font-semibold text-[#e2e0fc]">${user.name}</div>
                        <div class="text-[10px] text-[#9b99b8] uppercase tracking-wider">${user.role_name}</div>
                    </div>
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[#e17141]">${initials}</div>
                </div>
            </div>`;
    };

    const renderStatusBar = () => {
        // Add status bar if not already present
        if (document.getElementById('astral-status-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'astral-status-bar';
        bar.className = 'astral-status-bar';
        bar.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="status-dot"></span>
                <span>System Online</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">shield</span>
                <span>Firewall Active</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">speed</span>
                <span>2.4 TB/s</span>
            </div>`;
        document.body.appendChild(bar);
    };

    const showAlert = (type, message) => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const styles = {
            success: 'background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.3)',
            danger: 'background:rgba(248,113,113,0.1);color:#f87171;border:1px solid rgba(248,113,113,0.3)',
            info: 'background:rgba(96,165,250,0.1);color:#60a5fa;border:1px solid rgba(96,165,250,0.3)'
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
        confirmButtonColor: '#e17141',
        cancelButtonColor: '#3a3a52',
        confirmButtonText: 'Yes, delete it!',
        background: '#1e1e32',
        color: '#e2e0fc'
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
