var Sidebar = (function() {
    function getCurrentPage() {
        var path = window.location.pathname;
        var file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return file;
    }

    function render() {
        var user = Auth.getCurrentUser();
        if (!user) return;
        var page = getCurrentPage();
        var nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        var html = '';

        html += '<div class="sidebar-brand"><img src="images/logo.png" alt="AklatBayon" style="width:36px;height:36px;object-fit:contain;margin-right:10px;border-radius:50%;background:rgba(255,255,255,0.1);padding:2px"><span style="font-weight:700;font-size:15px;color:#fff;letter-spacing:0.5px">AklatBayon</span></div>';

        html += navLink('dashboard.html', 'fa-tachometer-alt', 'Dashboard', page);

        if (Auth.hasAnyPermission(['can_manage_users', 'can_manage_roles'])) {
            html += '<div class="nav-dropdown">';
            html += dropdownToggle('fa-users-cog', 'User Manage', ['users.html','roles.html'], page);
            html += '<div class="nav-dropdown-items' + (isActiveGroup(['users.html','roles.html'], page) ? ' show' : '') + '">';
            if (Auth.hasPermission('can_manage_users')) {
                html += navLink('users.html', 'fa-user', 'Users', page);
            }
            if (Auth.hasPermission('can_manage_roles')) {
                html += navLink('roles.html', 'fa-user-shield', 'Roles', page);
            }
            html += '</div></div>';
        }

        if (Auth.hasPermission('can_manage_students')) {
            html += navLink('students.html', 'fa-user-graduate', 'Student Management', page);
        }

        html += '<div class="nav-dropdown">';
        html += dropdownToggle('fa-book', 'Catalog', ['books.html','authors.html','publishers.html','categories.html','loc-search.html','lcc-browser.html'], page);
        html += '<div class="nav-dropdown-items' + (isActiveGroup(['books.html','authors.html','publishers.html','categories.html','loc-search.html','lcc-browser.html'], page) ? ' show' : '') + '">';
        html += navLink('books.html', 'fa-book-open', 'Books', page);
        if (Auth.hasPermission('can_add_categories')) {
            html += navLink('authors.html', 'fa-pen-fancy', 'Authors', page);
            html += navLink('publishers.html', 'fa-building', 'Publishers', page);
            html += navLink('categories.html', 'fa-tags', 'Categories', page);
        }
        if (Auth.hasPermission('can_browse_catalog')) {
            html += navLink('loc-search.html', 'fa-landmark', 'LOC Search', page);
            html += navLink('lcc-browser.html', 'fa-sitemap', 'LCC Browser', page);
        }
        html += '</div></div>';

        if (Auth.hasAnyPermission(['can_issue_books', 'can_return_books'])) {
            html += '<div class="nav-dropdown">';
            html += dropdownToggle('fa-exchange-alt', 'Circulation', ['circulation.html'], page);
            html += '<div class="nav-dropdown-items' + (isActiveGroup(['circulation.html'], page) ? ' show' : '') + '">';
            html += navLink('circulation.html', 'fa-exchange-alt', 'Circulation', page);
            html += '</div></div>';
        }

        if (Auth.hasPermission('can_manage_fines')) {
            html += '<div class="nav-dropdown">';
            html += dropdownToggle('fa-money-bill-wave', 'Finance', ['fines.html'], page);
            html += '<div class="nav-dropdown-items' + (isActiveGroup(['fines.html'], page) ? ' show' : '') + '">';
            html += navLink('fines.html', 'fa-receipt', 'Fine Manage', page);
            html += '</div></div>';
        }

        if (Auth.hasAnyPermission(['can_view_reports', 'can_manage_settings', 'can_view_inventory'])) {
            html += '<div class="nav-dropdown">';
            html += dropdownToggle('fa-chart-bar', 'Administration', ['inventory.html','reports.html','attendance.html'], page);
            html += '<div class="nav-dropdown-items' + (isActiveGroup(['inventory.html','reports.html','attendance.html'], page) ? ' show' : '') + '">';
            if (Auth.hasPermission('can_view_inventory')) {
                html += navLink('inventory.html', 'fa-boxes-stacked', 'Inventory', page);
            }
            if (Auth.hasPermission('can_view_reports')) {
                html += navLink('reports.html', 'fa-file-alt', 'Reports', page);
                html += navLink('attendance.html', 'fa-clipboard-user', 'Attendance', page);
            }
            html += '</div></div>';
        }

        if (Auth.hasAnyPermission(['can_manage_settings', 'can_manage_backups', 'can_view_audit_logs'])) {
            html += '<div class="nav-dropdown">';
            html += dropdownToggle('fa-cog', 'System', ['settings.html','audit-logs.html'], page);
            html += '<div class="nav-dropdown-items' + (isActiveGroup(['settings.html','audit-logs.html'], page) ? ' show' : '') + '">';
            if (Auth.hasPermission('can_manage_settings')) {
                html += navLink('settings.html', 'fa-sliders-h', 'Settings', page);
            }
            if (Auth.hasPermission('can_view_audit_logs')) {
                html += navLink('audit-logs.html', 'fa-clipboard-list', 'Audit Logs', page);
            }
            html += '</div></div>';
        }

        nav.innerHTML = html;
        bindDropdowns();
    }

    function navLink(href, icon, label, currentPage) {
        var active = currentPage === href ? ' active' : '';
        return '<a href="' + href + '" class="nav-link' + active + '"><i class="fas ' + icon + '"></i> ' + label + '</a>';
    }

    function dropdownToggle(icon, label, pages, currentPage) {
        var open = isActiveGroup(pages, currentPage) ? ' open' : '';
        return '<a href="#" class="nav-link nav-dropdown-toggle' + open + '"><i class="fas ' + icon + '"></i> <span>' + label + '</span><i class="fas fa-chevron-down nav-chevron"></i></a>';
    }

    function isActiveGroup(pages, currentPage) {
        return pages.indexOf(currentPage) !== -1;
    }

    function bindDropdowns() {
        document.querySelectorAll('.nav-dropdown-toggle').forEach(function(toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                var items = this.nextElementSibling;
                if (items && items.classList.contains('nav-dropdown-items')) {
                    items.classList.toggle('show');
                    this.classList.toggle('open');
                }
            });
        });
    }

    return { render: render };
})();
