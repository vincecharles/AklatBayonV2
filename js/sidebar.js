const Sidebar = (() => {
    const getCurrentPage = () => {
        const path = window.location.pathname;
        return (path === '/' || path === '') ? '/index.html' : path;
    };

    const render = () => {
        const user = Auth.getCurrentUser();
        if (!user) return;
        const page = getCurrentPage();
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        nav.className = 'hidden lg:flex fixed top-16 left-0 w-72 h-[calc(100vh-4rem)] flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto z-30';

        let html = '<div class="p-4 space-y-1">';

        // General
        html += sectionLabel('General');
        html += navLink('/pages/general/dashboard.html', 'dashboard', 'Dashboard', page);

        // User Management (Users & Students only)
        if (Auth.hasAnyPermission(['can_manage_users', 'can_manage_students'])) {
            html += sectionLabel('Management');
            const userPages = ['/pages/management/users/users.html', '/pages/management/users/students.html'];
            html += dropdownToggle('manage_accounts', 'User Management', userPages, page);
            html += `<div class="${submenuClass(userPages, page)}">`;
            if (Auth.hasPermission('can_manage_users')) html += subNavLink('/pages/management/users/users.html', 'person', 'Users', page);
            if (Auth.hasPermission('can_manage_students')) html += subNavLink('/pages/management/users/students.html', 'school', 'Students', page);
            html += '</div></div>';
        }

        // Role Management (separate)
        if (Auth.hasPermission('can_manage_roles')) {
            if (!Auth.hasAnyPermission(['can_manage_users', 'can_manage_students'])) html += sectionLabel('Management');
            html += navLink('/pages/management/users/roles.html', 'admin_panel_settings', 'Role Management', page);
        }

        // Book Management
        const catalogPages = ['/pages/management/catalog/books.html', '/pages/management/catalog/authors.html', '/pages/management/catalog/publishers.html', '/pages/management/catalog/categories.html', '/pages/management/catalog/loc-search.html', '/pages/management/catalog/lcc-browser.html'];
        html += dropdownToggle('menu_book', 'Book Management', catalogPages, page);
        html += `<div class="${submenuClass(catalogPages, page)}">`;
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
            const circPages = ['/pages/operations/circulation.html', '/pages/operations/reservations.html'];
            html += dropdownToggle('swap_horiz', 'Circulation', circPages, page);
            html += `<div class="${submenuClass(circPages, page)}">`;
            html += subNavLink('/pages/operations/circulation.html', 'swap_horiz', 'Transactions', page);
            if (Auth.hasPermission('can_reserve_books')) html += subNavLink('/pages/operations/reservations.html', 'bookmark', 'Reservations', page);
            html += '</div></div>';
        }

        // Finance
        if (Auth.hasPermission('can_manage_fines') || Auth.hasPermission('can_view_own_fines')) {
            if (!Auth.hasAnyPermission(['can_issue_books', 'can_return_books', 'can_reserve_books', 'can_renew_books'])) html += sectionLabel('Operations');
            const financePages = ['/pages/operations/fines.html', '/pages/operations/my-fines.html'];
            html += dropdownToggle('payments', 'Finance', financePages, page);
            html += `<div class="${submenuClass(financePages, page)}">`;
            if (Auth.hasPermission('can_manage_fines')) html += subNavLink('/pages/operations/fines.html', 'receipt_long', 'Fine Management', page);
            if (Auth.hasPermission('can_view_own_fines')) {
                let myFineCount = 0;
                const currentUser = Auth.getCurrentUser();
                if (currentUser?.student_id) {
                    const allFines = Store.getAll('fines');
                    myFineCount = allFines.filter(f => f.student_id === currentUser.student_id && f.status === 'pending').length;
                }
                const badge = myFineCount > 0 ? ` <span class="ml-auto bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">${myFineCount}</span>` : '';
                html += subNavLink('/pages/operations/my-fines.html', 'request_quote', `My Fines${badge}`, page);
            }
            html += '</div></div>';
        }

        // Inventory
        if (Auth.hasPermission('can_view_inventory')) {
            html += sectionLabel('Inventory');
            html += navLink('/pages/admin/inventory.html', 'inventory_2', 'Inventory', page);
        }

        // Administration
        if (Auth.hasAnyPermission(['can_view_reports', 'can_view_attendance'])) {
            html += sectionLabel('Administration');
            const adminPages = ['/pages/admin/reports.html', '/pages/admin/attendance.html'];
            html += dropdownToggle('bar_chart', 'Reports & Data', adminPages, page);
            html += `<div class="${submenuClass(adminPages, page)}">`;
            if (Auth.hasPermission('can_view_reports')) html += subNavLink('/pages/admin/reports.html', 'description', 'Reports', page);
            if (Auth.hasPermission('can_view_attendance')) html += subNavLink('/pages/admin/attendance.html', 'assignment_ind', 'Attendance', page);
            html += '</div></div>';
        }

        // System
        if (Auth.hasAnyPermission(['can_manage_settings', 'can_manage_backups', 'can_view_audit_logs'])) {
            html += sectionLabel('System');
            const sysPages = ['/pages/admin/settings.html', '/pages/admin/audit-logs.html'];
            html += dropdownToggle('settings', 'System Settings', sysPages, page);
            html += `<div class="${submenuClass(sysPages, page)}">`;
            if (Auth.hasPermission('can_manage_settings')) html += subNavLink('/pages/admin/settings.html', 'tune', 'Settings', page);
            if (Auth.hasPermission('can_view_audit_logs')) html += subNavLink('/pages/admin/audit-logs.html', 'checklist', 'Audit Logs', page);
            html += '</div></div>';
        }

        html += '</div>';
        nav.innerHTML = html;
        bindDropdowns();
    };

    const sectionLabel = (text) =>
        `<p class="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">${text}</p>`;

    const navLink = (href, icon, label, currentPage) => {
        const isActive = currentPage === href;
        const cls = isActive
            ? 'flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary text-white font-medium text-sm'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-sm transition-colors';
        return `<a href="${href}" class="${cls}"><span class="material-symbols-outlined text-xl">${icon}</span><span>${label}</span></a>`;
    };

    const subNavLink = (href, icon, label, currentPage) => {
        const isActive = currentPage === href;
        const cls = isActive
            ? 'flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-semibold'
            : 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors';
        return `<a href="${href}" class="${cls}"><span class="material-symbols-outlined text-lg">${icon}</span><span>${label}</span></a>`;
    };

    const dropdownToggle = (icon, label, pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        const cls = isOpen
            ? 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-primary text-white font-medium text-sm'
            : 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm transition-colors';
        return `<div class="nav-dropdown"><button type="button" class="${cls}" data-target="menu_${icon}" aria-expanded="${isOpen}"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-xl">${icon}</span><span>${label}</span></div><span class="material-symbols-outlined text-sm menu-arrow transition-transform${isOpen ? ' rotate-180' : ''}">expand_more</span></button>`;
    };

    const submenuClass = (pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        return `${isOpen ? '' : 'hidden '}ml-5 mt-1 space-y-0.5 border-l border-slate-200 dark:border-slate-700 pl-3`;
    };

    const isActiveGroup = (pages, currentPage) => pages.includes(currentPage);

    const bindDropdowns = () => {
        document.querySelectorAll('.menu-toggle').forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const submenu = this.nextElementSibling;
                if (!submenu) return;
                const arrow = this.querySelector('.menu-arrow');
                const isHidden = submenu.classList.contains('hidden');

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
    };

    return { render };
})();
