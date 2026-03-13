var App = (function() {
    var THEME_KEY = 'aklatbayon_theme';

    function init() {
        renderHeader();
        Sidebar.render();
    }

    function toggleDarkMode() {
        var html = document.documentElement;
        var isDark = html.classList.contains('dark');
        if (isDark) {
            html.classList.remove('dark');
            localStorage.setItem(THEME_KEY, 'light');
        } else {
            html.classList.add('dark');
            localStorage.setItem(THEME_KEY, 'dark');
        }
        updateToggleIcon();
    }

    function updateToggleIcon() {
        var btn = document.getElementById('btn-dark-mode');
        if (!btn) return;
        var isDark = document.documentElement.classList.contains('dark');
        btn.innerHTML = '<span class="material-symbols-outlined text-lg">' + (isDark ? 'light_mode' : 'dark_mode') + '</span>';
        btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }

    function renderHeader() {
        var user = Auth.getCurrentUser();
        if (!user) return;
        var header = document.getElementById('top-header');
        if (!header) return;
        var isDark = document.documentElement.classList.contains('dark');

        header.className = 'fixed top-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6';

        header.innerHTML =
            '<div class="flex items-center gap-3">' +
                '<img src="/images/logo.png" alt="AklatBayon" class="w-8 h-8 object-contain rounded-full bg-primary/10 p-0.5">' +
                '<span class="text-lg font-bold tracking-tight text-primary">AklatBayon</span>' +
            '</div>' +
            '<div class="flex items-center gap-4">' +
                '<div class="flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-700">' +
                    '<div class="text-right">' +
                        '<div class="text-sm font-semibold text-slate-900 dark:text-slate-100">' + user.name + '</div>' +
                        '<div class="text-[11px] text-slate-500 dark:text-slate-400">' + user.role_name + (user.faculty_subtype ? ' (' + user.faculty_subtype + ')' : '') + '</div>' +
                    '</div>' +
                '</div>' +
                '<button id="btn-dark-mode" title="' + (isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode') + '" class="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">' +
                    '<span class="material-symbols-outlined text-lg">' + (isDark ? 'light_mode' : 'dark_mode') + '</span>' +
                '</button>' +
                '<button id="btn-logout" class="inline-flex items-center gap-1.5 rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors">' +
                    '<span class="material-symbols-outlined text-base">logout</span> Logout' +
                '</button>' +
            '</div>';

        document.getElementById('btn-dark-mode').addEventListener('click', function() {
            toggleDarkMode();
        });
        document.getElementById('btn-logout').addEventListener('click', function() {
            Auth.logout();
        });
    }

    function showAlert(type, message) {
        var container = document.getElementById('alert-container');
        if (!container) return;
        var styles = {
            success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
            danger:  'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
            info:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
        };
        var icons = { success: 'check_circle', danger: 'error', info: 'info' };
        var div = document.createElement('div');
        div.className = 'flex items-center gap-2 px-4 py-3 rounded-lg border text-sm mb-4 animate-fade-in ' + (styles[type] || styles.info);
        div.innerHTML = '<span class="material-symbols-outlined text-lg">' + (icons[type] || 'info') + '</span> ' + message;
        container.prepend(div);
        setTimeout(function() { div.remove(); }, 4000);
    }

    function confirmDelete(itemName) {
        return Swal.fire({
            title: 'Are you sure?',
            text: 'Delete "' + itemName + '"? This cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e94560',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });
    }

    function formatDate(isoStr) {
        if (!isoStr) return '\u2014';
        var d = new Date(isoStr);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function formatDateTime(isoStr) {
        if (!isoStr) return '\u2014';
        var d = new Date(isoStr);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var h = d.getHours();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' + h + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ampm;
    }

    function openModal(id) {
        var modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    }

    function closeModal(id) {
        var modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }

    function bindModalCloses() {
        document.querySelectorAll('.modal-close').forEach(function(btn) {
            btn.addEventListener('click', function() {
                this.closest('.modal-overlay').classList.remove('active');
            });
        });
        document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) this.classList.remove('active');
            });
        });
    }

    function getRoleName(roleId) {
        var role = Store.getById('roles', roleId);
        return role ? role.name : 'Unknown';
    }

    function getAuthorName(authorId) {
        var author = Store.getById('authors', authorId);
        return author ? author.name : 'Unknown';
    }

    function getPublisherName(pubId) {
        var pub = Store.getById('publishers', pubId);
        return pub ? pub.name : 'Unknown';
    }

    function getCategoryName(catId) {
        var cat = Store.getById('categories', catId);
        return cat ? cat.name : 'Unknown';
    }

    function getStudentName(studentId) {
        var s = Store.getById('students', studentId);
        return s ? s.name : 'Unknown';
    }

    function getBookTitle(bookId) {
        var b = Store.getById('books', bookId);
        return b ? b.title : 'Unknown';
    }

    return {
        init: init,
        showAlert: showAlert,
        confirmDelete: confirmDelete,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        openModal: openModal,
        closeModal: closeModal,
        bindModalCloses: bindModalCloses,
        getRoleName: getRoleName,
        getAuthorName: getAuthorName,
        getPublisherName: getPublisherName,
        getCategoryName: getCategoryName,
        getStudentName: getStudentName,
        getBookTitle: getBookTitle
    };
})();
