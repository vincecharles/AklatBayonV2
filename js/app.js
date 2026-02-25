var App = (function() {
    var DARK_MODE_KEY = 'aklatbayon_dark_mode';

    function init() {
        initDarkMode();
        renderHeader();
        Sidebar.render();
    }

    function initDarkMode() {
        var pref = localStorage.getItem(DARK_MODE_KEY);
        if (pref === 'true') {
            document.body.classList.add('dark-mode');
        }
    }

    function toggleDarkMode() {
        var isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem(DARK_MODE_KEY, isDark ? 'true' : 'false');
        updateToggleIcon();
    }

    function updateToggleIcon() {
        var btn = document.getElementById('btn-dark-mode');
        if (!btn) return;
        var isDark = document.body.classList.contains('dark-mode');
        btn.innerHTML = '<i class="fas ' + (isDark ? 'fa-sun' : 'fa-moon') + '"></i>';
        btn.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }

    function renderHeader() {
        var user = Auth.getCurrentUser();
        if (!user) return;
        var header = document.getElementById('top-header');
        if (!header) return;
        var isDark = document.body.classList.contains('dark-mode');
        header.innerHTML =
            '<div class="logo"><img src="images/logo.png" alt="" style="width:28px;height:28px;object-fit:contain;margin-right:8px"><span>AklatBayon</span></div>' +
            '<div class="user-info">' +
                '<div class="text-end">' +
                    '<div class="user-name">' + user.name + '</div>' +
                    '<div class="user-role">' + user.role_name + (user.faculty_subtype ? ' (' + user.faculty_subtype + ')' : '') + '</div>' +
                '</div>' +
                '<button class="dark-mode-toggle" id="btn-dark-mode" title="' + (isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode') + '">' +
                    '<i class="fas ' + (isDark ? 'fa-sun' : 'fa-moon') + '"></i>' +
                '</button>' +
                '<button class="btn-logout" id="btn-logout"><i class="fas fa-sign-out-alt me-1"></i> Logout</button>' +
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
        var iconMap = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', info: 'fa-info-circle' };
        var div = document.createElement('div');
        div.className = 'alert alert-' + type;
        div.innerHTML = '<i class="fas ' + (iconMap[type] || 'fa-info-circle') + '"></i> ' + message;
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
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, delete it!'
        });
    }

    function formatDate(isoStr) {
        if (!isoStr) return '—';
        var d = new Date(isoStr);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function formatDateTime(isoStr) {
        if (!isoStr) return '—';
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
