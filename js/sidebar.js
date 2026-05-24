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

        nav.className = 'astral-sidebar';
        let html = '';

        // ── GENERAL ───────────────────────────────────────────
        html += sectionLabel('General');
        html += navLink('/pages/general/dashboard.html', 'grid_view', 'Dashboard', page);

        // ── MANAGEMENT ────────────────────────────────────────
        if (Auth.hasAnyPermission(['can_manage_users', 'can_manage_students'])) {
            html += sectionLabel('Management');
            const userPages = ['/pages/management/users/users.html', '/pages/management/users/students.html', '/pages/management/users/faculty-profile.html'];
            html += dropdownToggle('people', 'User Management', userPages, page);
            html += `<div class="${submenuClass(userPages, page)}">`;
            if (Auth.hasPermission('can_manage_students')) html += subNavLink('/pages/management/users/students.html', 'school', 'Students', page);
            if (Auth.hasPermission('can_manage_users')) html += subNavLink('/pages/management/users/users.html', 'badge', 'Employees', page);
            html += '</div></div>';
        }

        // ── INVENTORY ─────────────────────────────────────────
        html += sectionLabel('Inventory');
        html += navLink('/pages/management/catalog/books.html', 'inventory', 'Book Masterfile', page);

        const bookMgmtPages = ['/pages/management/catalog/authors.html', '/pages/management/catalog/publishers.html', '/pages/management/catalog/categories.html', '/pages/management/catalog/loc-search.html', '/pages/management/catalog/lcc-browser.html', '/pages/management/catalog/ai-search.html'];
        html += dropdownToggle('edit_note', 'Book Management', bookMgmtPages, page);
        html += `<div class="${submenuClass(bookMgmtPages, page)}">`;
        if (Auth.hasPermission('can_add_categories')) {
            html += subNavLink('/pages/management/catalog/authors.html', 'edit', 'Authors', page);
            html += subNavLink('/pages/management/catalog/publishers.html', 'apartment', 'Publishers', page);
            html += subNavLink('/pages/management/catalog/categories.html', 'sell', 'Categories', page);
        }
        if (Auth.hasPermission('can_browse_catalog')) {
            html += subNavLink('/pages/management/catalog/loc-search.html', 'account_balance', 'LOC Search', page);
            html += subNavLink('/pages/management/catalog/lcc-browser.html', 'account_tree', 'LCC Browser', page);
        }
        html += subNavLink('/pages/management/catalog/ai-search.html', 'auto_awesome', 'AI Search', page);
        html += '</div></div>';

        if (Auth.hasAnyPermission(['can_view_inventory', 'can_manage_incoming'])) {
            html += navLink('/pages/admin/inventory.html?tab=incoming', 'south_west', 'Incoming Books', page, ['/pages/admin/inventory.html']);
        }
        if (Auth.hasAnyPermission(['can_view_inventory', 'can_manage_outgoing'])) {
            html += navLink('/pages/admin/inventory.html?tab=outgoing', 'north_east', 'Outgoing Books', page, ['/pages/admin/inventory.html']);
        }

        // ── OPERATIONS ────────────────────────────────────────
        if (Auth.hasAnyPermission(['can_issue_books', 'can_return_books', 'can_reserve_books', 'can_renew_books'])) {
            html += sectionLabel('Operations');
            const reservations = Store.getAll('reservations');
            const pendingCount = reservations.filter(r => r.status === 'active' || r.status === 'available').length;
            html += navLinkWithBadge('/pages/operations/reservations.html', 'handshake', 'Borrowing Requests', page, pendingCount, 'purple');
            html += navLink('/pages/operations/circulation.html', 'assignment_return', 'Returns', page);
            html += navLink('/pages/operations/reading-history.html', 'history', 'Borrowing History', page);

            const txns = Store.getAll('transactions');
            const overdueCount = txns.filter(t => t.status === 'borrowed' && new Date(t.date_due) < new Date()).length;
            html += navLinkWithBadge('/pages/operations/circulation.html?filter=overdue', 'error_outline', 'Overdue Books', page, overdueCount, 'red');
            if (Auth.hasAnyPermission(['can_manage_fines', 'can_view_reports']))
                html += navLink('/pages/operations/fines.html', 'payments', 'Fines Management', page);
            if (!Auth.hasAnyPermission(['can_manage_users', 'can_manage_students']))
                html += navLink('/pages/operations/my-fines.html', 'receipt_long', 'My Fines', page);
            if (Auth.hasPermission('can_view_audit_logs'))
                html += navLink('/pages/admin/attendance.html', 'how_to_reg', 'Attendance Logs', page);
        }

        // ── SYSTEMS ADMIN ─────────────────────────────────────
        if (Auth.hasAnyPermission(['can_view_reports', 'can_manage_roles', 'can_manage_settings', 'can_view_audit_logs'])) {
            html += sectionLabel('Systems Admin');
            if (Auth.hasPermission('can_view_reports')) html += navLink('/pages/admin/reports.html', 'analytics', 'Reports', page);
            if (Auth.hasPermission('can_manage_roles')) html += navLink('/pages/management/users/roles.html', 'admin_panel_settings', 'Role Management', page);
            if (Auth.hasPermission('can_manage_settings')) html += navLink('/pages/admin/settings.html', 'policy', 'Borrowing Policies', page);
            if (Auth.hasPermission('can_view_audit_logs')) html += navLink('/pages/admin/audit-logs.html', 'receipt_long', 'Audit Logs', page);

            if (Auth.hasPermission('can_manage_settings')) {
                const setupPages = ['/pages/admin/settings.html', '/pages/management/users/faculty-profile.html'];
                html += dropdownToggle('settings', 'System Setup', setupPages, page);
                html += `<div class="${submenuClass(setupPages, page)}">`;
                html += subNavLink('/pages/management/users/faculty-profile.html', 'account_tree', 'Academic Structure', page);
                html += subNavLink('/pages/management/users/users.html', 'business_center', 'Employee Structure', page);
                html += subNavLink('/pages/admin/settings.html', 'tune', 'System Configuration', page);
                html += '</div></div>';
            }
            if (Auth.hasPermission('can_view_audit_logs'))
                html += navLink('/pages/admin/api-docs.html', 'api', 'API Documentation', page);
            if (Auth.hasPermission('can_manage_settings'))
                html += navLink('/pages/admin/library-harvest.html', 'hub', 'Library Harvest', page);
        }

        nav.innerHTML = `
            <div class="sidebar-nav-items" style="flex:1; overflow-y:auto;">${html}</div>
            <div class="mt-auto space-y-3 pt-4 px-3 pb-4 border-t" style="border-color:var(--ab-outline)">
                <button onclick="Auth.logout()" class="flex items-center justify-center gap-2 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                    <span class="material-symbols-outlined text-lg">logout</span>
                    <span>Sign Out</span>
                </button>
                <div class="p-4 rounded-xl border" style="background:var(--ab-primary-container);border-color:var(--ab-outline-dim)">
                    <p class="text-xs font-semibold mb-1" style="color:var(--ab-primary)">AklatBayon System</p>
                    <p class="text-[10px] leading-tight" style="color:var(--ab-on-surface-dim)">Session Active<br>${user.role_name}</p>
                </div>
            </div>`;
        bindDropdowns();
    };

    const sectionLabel = (text) =>
        `<p class="sidebar-section-label">${text}</p>`;

    const navLink = (href, icon, label, currentPage, additionalMatches = []) => {
        const isActive = currentPage === href || additionalMatches.some(m => currentPage.startsWith(m));
        return `<a href="${href}" class="sidebar-link${isActive ? ' active' : ''}"><span class="material-symbols-outlined sidebar-link-icon"${isActive ? ' style="font-variation-settings:\'FILL\' 1"' : ''}>${icon}</span><span>${label}</span></a>`;
    };

    const navLinkWithBadge = (href, icon, label, currentPage, count, color) => {
        const isActive = currentPage === href;
        const isOverdue = color === 'red';
        const badge = count > 0 ? `<span class="sidebar-badge${isOverdue ? ' sidebar-badge-red' : ''}">${count}</span>` : '';
        return `<a href="${href}" class="sidebar-link${isActive ? ' active' : ''}${isOverdue && count > 0 ? ' sidebar-link-red' : ''}"><span class="material-symbols-outlined sidebar-link-icon"${isActive ? ' style="font-variation-settings:\'FILL\' 1"' : ''}>${icon}</span><span class="flex-1">${label}</span>${badge}</a>`;
    };

    const subNavLink = (href, icon, label, currentPage) => {
        const isActive = currentPage === href;
        return `<a href="${href}" class="sidebar-sublink${isActive ? ' active' : ''}"><span class="material-symbols-outlined sidebar-sublink-icon">${icon}</span><span>${label}</span></a>`;
    };

    const dropdownToggle = (icon, label, pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        return `<div class="nav-dropdown"><button type="button" class="sidebar-link menu-toggle${isOpen ? ' active' : ''}" aria-expanded="${isOpen}"><span class="material-symbols-outlined sidebar-link-icon"${isOpen ? ' style="font-variation-settings:\'FILL\' 1"' : ''}>${icon}</span><span class="flex-1">${label}</span><span class="material-symbols-outlined sidebar-arrow${isOpen ? ' rotate-180' : ''}">expand_more</span></button>`;
    };

    const submenuClass = (pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        return `sidebar-submenu${isOpen ? '' : ' hidden'}`;
    };

    const isActiveGroup = (pages, currentPage) => pages.includes(currentPage);

    const bindDropdowns = () => {
        document.querySelectorAll('.menu-toggle').forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const submenu = this.nextElementSibling;
                if (!submenu) return;
                const arrow = this.querySelector('.sidebar-arrow');
                const isHidden = submenu.classList.contains('hidden');
                if (isHidden) { submenu.classList.remove('hidden'); arrow?.classList.add('rotate-180'); this.setAttribute('aria-expanded', 'true'); }
                else { submenu.classList.add('hidden'); arrow?.classList.remove('rotate-180'); this.setAttribute('aria-expanded', 'false'); }
            });
        });
    };

    return { render };
})();
