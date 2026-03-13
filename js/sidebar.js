var Sidebar = (function() {
    function getCurrentPage() {
        var path = window.location.pathname;
        if (path === '/' || path === '') return '/index.html';
        return path;
    }

    function render() {
        var user = Auth.getCurrentUser();
        if (!user) return;
        var page = getCurrentPage();
        var nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        nav.className = 'hidden lg:flex fixed top-16 left-0 w-72 h-[calc(100vh-4rem)] flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto z-30';

        var html = '';
        html += '<div class="p-4 space-y-1">';

        // Brand
        html += '<div class="flex items-center gap-2.5 px-3 py-3 mb-2 border-b border-slate-200 dark:border-slate-800 pb-4">';
        html += '<img src="/images/logo.png" alt="AklatBayon" class="w-9 h-9 object-contain rounded-full bg-primary/10 p-0.5">';
        html += '<span class="font-bold text-[15px] text-primary tracking-tight">AklatBayon</span>';
        html += '</div>';

        // General section
        html += sectionLabel('General');
        html += navLink('/pages/general/dashboard.html', 'dashboard', 'Dashboard', page);

        // User Management
        if (Auth.hasAnyPermission(['can_manage_users', 'can_manage_roles', 'can_manage_students'])) {
            html += sectionLabel('Management');
            var userPages = ['/pages/management/users/users.html', '/pages/management/users/roles.html', '/pages/management/users/students.html'];
            html += dropdownToggle('manage_accounts', 'User Management', userPages, page);
            html += '<div class="' + submenuClass(userPages, page) + '">';
            if (Auth.hasPermission('can_manage_users')) {
                html += subNavLink('/pages/management/users/users.html', 'person', 'Users', page);
            }
            if (Auth.hasPermission('can_manage_roles')) {
                html += subNavLink('/pages/management/users/roles.html', 'admin_panel_settings', 'Roles', page);
            }
            if (Auth.hasPermission('can_manage_students')) {
                html += subNavLink('/pages/management/users/students.html', 'school', 'Students', page);
            }
            html += '</div></div>';
        }

        // Catalog
        var catalogPages = ['/pages/management/catalog/books.html', '/pages/management/catalog/authors.html', '/pages/management/catalog/publishers.html', '/pages/management/catalog/categories.html', '/pages/management/catalog/loc-search.html', '/pages/management/catalog/lcc-browser.html'];
        html += dropdownToggle('menu_book', 'Catalog', catalogPages, page);
        html += '<div class="' + submenuClass(catalogPages, page) + '">';
        html += subNavLink('/pages/management/catalog/books.html', 'auto_stories', 'Books', page);
        if (Auth.hasPermission('can_add_categories')) {
            html += subNavLink('/pages/management/catalog/authors.html', 'edit', 'Authors', page);
            html += subNavLink('/pages/management/catalog/publishers.html', 'apartment', 'Publishers', page);
            html += subNavLink('/pages/management/catalog/categories.html', 'sell', 'Categories', page);
        }
        if (Auth.hasPermission('can_browse_catalog')) {
            html += subNavLink('/pages/management/catalog/loc-search.html', 'account_balance', 'LOC Search', page);
            html += subNavLink('/pages/management/catalog/lcc-browser.html', 'account_tree', 'LCC Browser', page);
        }
        html += '</div></div>';

        // Circulation
        if (Auth.hasAnyPermission(['can_issue_books', 'can_return_books', 'can_reserve_books', 'can_renew_books'])) {
            html += sectionLabel('Operations');
            var circPages = ['/pages/operations/circulation.html', '/pages/operations/reservations.html'];
            html += dropdownToggle('swap_horiz', 'Circulation', circPages, page);
            html += '<div class="' + submenuClass(circPages, page) + '">';
            html += subNavLink('/pages/operations/circulation.html', 'swap_horiz', 'Transactions', page);
            if (Auth.hasPermission('can_reserve_books')) {
                html += subNavLink('/pages/operations/reservations.html', 'bookmark', 'Reservations', page);
            }
            html += '</div></div>';
        }

        // Finance
        if (Auth.hasPermission('can_manage_fines') || Auth.hasPermission('can_view_own_fines')) {
            var financePages = ['/pages/operations/fines.html', '/pages/operations/my-fines.html'];
            html += dropdownToggle('payments', 'Finance', financePages, page);
            html += '<div class="' + submenuClass(financePages, page) + '">';
            if (Auth.hasPermission('can_manage_fines')) {
                html += subNavLink('/pages/operations/fines.html', 'receipt_long', 'Fine Management', page);
            }
            if (Auth.hasPermission('can_view_own_fines')) {
                var myFineCount = 0;
                var currentUser = Auth.getCurrentUser();
                if (currentUser && currentUser.student_id) {
                    var allFines = Store.getAll('fines');
                    myFineCount = allFines.filter(function(f) { return f.student_id === currentUser.student_id && f.status === 'pending'; }).length;
                }
                var badge = myFineCount > 0 ? ' <span class="ml-auto bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">' + myFineCount + '</span>' : '';
                html += subNavLink('/pages/operations/my-fines.html', 'request_quote', 'My Fines' + badge, page);
            }
            html += '</div></div>';
        }

        // Administration
        if (Auth.hasAnyPermission(['can_view_reports', 'can_view_inventory', 'can_view_attendance'])) {
            html += sectionLabel('Administration');
            var adminPages = ['/pages/admin/inventory.html', '/pages/admin/reports.html', '/pages/admin/attendance.html'];
            html += dropdownToggle('bar_chart', 'Reports & Data', adminPages, page);
            html += '<div class="' + submenuClass(adminPages, page) + '">';
            if (Auth.hasPermission('can_view_inventory')) {
                html += subNavLink('/pages/admin/inventory.html', 'inventory_2', 'Inventory', page);
            }
            if (Auth.hasPermission('can_view_reports')) {
                html += subNavLink('/pages/admin/reports.html', 'description', 'Reports', page);
            }
            if (Auth.hasPermission('can_view_attendance')) {
                html += subNavLink('/pages/admin/attendance.html', 'assignment_ind', 'Attendance', page);
            }
            html += '</div></div>';
        }

        // System
        if (Auth.hasAnyPermission(['can_manage_settings', 'can_manage_backups', 'can_view_audit_logs'])) {
            html += sectionLabel('System');
            var sysPages = ['/pages/admin/settings.html', '/pages/admin/audit-logs.html'];
            html += dropdownToggle('settings', 'System Settings', sysPages, page);
            html += '<div class="' + submenuClass(sysPages, page) + '">';
            if (Auth.hasPermission('can_manage_settings')) {
                html += subNavLink('/pages/admin/settings.html', 'tune', 'Settings', page);
            }
            if (Auth.hasPermission('can_view_audit_logs')) {
                html += subNavLink('/pages/admin/audit-logs.html', 'checklist', 'Audit Logs', page);
            }
            html += '</div></div>';
        }

        html += '</div>';

        // Footer
        html += '<div class="mt-auto p-4 space-y-3">';
        html += '<div class="p-4 bg-primary/5 rounded-xl border border-primary/10">';
        html += '<p class="text-xs font-semibold text-primary mb-1">AY 2025-2026</p>';
        html += '<p class="text-[10px] text-slate-500 leading-tight">FEATI University Library<br>System Status: Operational</p>';
        html += '</div></div>';

        nav.innerHTML = html;
        bindDropdowns();
    }

    function sectionLabel(text) {
        return '<p class="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">' + text + '</p>';
    }

    function navLink(href, icon, label, currentPage) {
        var isActive = currentPage === href;
        var cls = isActive
            ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-white font-medium text-sm'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors';
        return '<a href="' + href + '" class="' + cls + '">' +
            '<span class="material-symbols-outlined text-xl">' + icon + '</span>' +
            '<span>' + label + '</span></a>';
    }

    function subNavLink(href, icon, label, currentPage) {
        var isActive = currentPage === href;
        var cls = isActive
            ? 'flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold'
            : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';
        return '<a href="' + href + '" class="' + cls + '">' +
            '<span class="material-symbols-outlined text-lg">' + icon + '</span>' +
            '<span>' + label + '</span></a>';
    }

    function dropdownToggle(icon, label, pages, currentPage) {
        var isOpen = isActiveGroup(pages, currentPage);
        var cls = isOpen
            ? 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-primary text-white font-medium text-sm'
            : 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm transition-colors';
        return '<div class="nav-dropdown">' +
            '<button type="button" class="' + cls + '" data-target="menu_' + icon + '" aria-expanded="' + isOpen + '">' +
                '<div class="flex items-center gap-3">' +
                    '<span class="material-symbols-outlined text-xl">' + icon + '</span>' +
                    '<span>' + label + '</span>' +
                '</div>' +
                '<span class="material-symbols-outlined text-sm menu-arrow transition-transform' + (isOpen ? ' rotate-180' : '') + '">expand_more</span>' +
            '</button>';
    }

    function submenuClass(pages, currentPage) {
        var isOpen = isActiveGroup(pages, currentPage);
        return (isOpen ? '' : 'hidden ') + 'ml-5 mt-1 space-y-0.5 border-l border-slate-200 dark:border-slate-700 pl-3';
    }

    function isActiveGroup(pages, currentPage) {
        return pages.indexOf(currentPage) !== -1;
    }

    function bindDropdowns() {
        document.querySelectorAll('.menu-toggle').forEach(function(toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                var submenu = this.nextElementSibling;
                if (!submenu) return;
                var arrow = this.querySelector('.menu-arrow');
                var isHidden = submenu.classList.contains('hidden');

                if (isHidden) {
                    submenu.classList.remove('hidden');
                    if (arrow) arrow.classList.add('rotate-180');
                    this.setAttribute('aria-expanded', 'true');
                } else {
                    submenu.classList.add('hidden');
                    if (arrow) arrow.classList.remove('rotate-180');
                    this.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }

    return { render: render };
})();
