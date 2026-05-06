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

        // ── Logo / Brand ──────────────────────────────────────
        html += `<div class="px-5 pt-6 pb-4 flex items-center gap-3">
            <img src="/images/logo.png" alt="AklatBayon" class="w-9 h-9 object-contain drop-shadow-md">
            <div>
                <div class="text-base font-bold text-white tracking-tight">AklatBayon</div>
                <div class="text-[10px] text-purple-300/50 font-medium uppercase tracking-widest">Library System</div>
            </div>
        </div>`;

        // ── User Info ─────────────────────────────────────────
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        html += `<div class="px-5 py-4 mx-3 mb-2 rounded-xl bg-white/5 border border-white/5">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-purple-400 to-violet-600 shadow-md shadow-purple-500/20">${initials}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-white truncate">${user.name}</div>
                    <div class="text-[10px] text-purple-300/50 uppercase tracking-wider">${user.role_name}${user.faculty_subtype ? ' · ' + user.faculty_subtype : ''}</div>
                </div>
            </div>
        </div>`;

        html += '<div class="px-3 space-y-0.5 flex-1 overflow-y-auto">';

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

        // ── INVENTORY (Books Only) ────────────────────────────
        html += sectionLabel('Inventory');
        const catalogPages = ['/pages/management/catalog/books.html', '/pages/management/catalog/authors.html', '/pages/management/catalog/publishers.html', '/pages/management/catalog/categories.html', '/pages/management/catalog/loc-search.html', '/pages/management/catalog/lcc-browser.html', '/pages/management/catalog/ai-search.html'];
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
        if (Auth.hasAnyPermission(['can_view_inventory'])) {
            html += navLink('/pages/admin/inventory.html', 'assessment', 'Stock / Circulation Report', page);
        }

        // ── OPERATIONS ────────────────────────────────────────
        if (Auth.hasAnyPermission(['can_issue_books', 'can_return_books', 'can_reserve_books', 'can_renew_books'])) {
            html += sectionLabel('Operations');

            // Borrowing Requests with badge
            const reservations = Store.getAll('reservations');
            const pendingCount = reservations.filter(r => r.status === 'active' || r.status === 'available').length;
            html += navLinkWithBadge('/pages/operations/reservations.html', 'handshake', 'Borrowing Requests', page, pendingCount, 'purple');

            html += navLink('/pages/operations/circulation.html', 'assignment_return', 'Returns', page);
            html += navLink('/pages/operations/reading-history.html', 'history', 'Borrowing History', page);

            // Overdue with alert badge
            const txns = Store.getAll('transactions');
            const overdueCount = txns.filter(t => t.status === 'borrowed' && new Date(t.date_due) < new Date()).length;
            html += navLinkWithBadge('/pages/operations/circulation.html?filter=overdue', 'error_outline', 'Overdue Books', page, overdueCount, 'red');
        }

        // ── Finance (under Operations) ────────────────────────
        if (Auth.hasPermission('can_manage_fines') || Auth.hasPermission('can_view_own_fines')) {
            if (!Auth.hasAnyPermission(['can_issue_books', 'can_return_books', 'can_reserve_books', 'can_renew_books'])) {
                html += sectionLabel('Operations');
            }
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
                const badge = myFineCount > 0 ? ` <span class="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400">${myFineCount}</span>` : '';
                html += subNavLink('/pages/operations/my-fines.html', 'request_quote', `My Fines${badge}`, page);
            }
            html += '</div></div>';
        }

        // ── SYSTEMS ADMIN ─────────────────────────────────────
        if (Auth.hasAnyPermission(['can_view_reports', 'can_view_attendance', 'can_manage_roles', 'can_manage_settings', 'can_manage_backups', 'can_view_audit_logs'])) {
            html += sectionLabel('Systems Admin');

            if (Auth.hasPermission('can_view_reports')) {
                html += navLink('/pages/admin/reports.html', 'analytics', 'Reports', page);
            }
            if (Auth.hasPermission('can_manage_roles')) {
                html += navLink('/pages/management/users/roles.html', 'admin_panel_settings', 'Role Management', page);
            }
            // Borrowing Policies (links to settings)
            if (Auth.hasPermission('can_manage_settings')) {
                html += navLink('/pages/admin/settings.html', 'policy', 'Borrowing Policies', page);
            }
            if (Auth.hasPermission('can_view_audit_logs')) {
                html += navLink('/pages/admin/audit-logs.html', 'receipt_long', 'Audit Logs', page);
            }

            // System Setup dropdown
            if (Auth.hasPermission('can_manage_settings')) {
                const setupPages = ['/pages/admin/settings.html', '/pages/management/users/faculty-profile.html'];
                html += dropdownToggle('settings', 'System Setup', setupPages, page);
                html += `<div class="${submenuClass(setupPages, page)}">`;
                html += subNavLink('/pages/management/users/faculty-profile.html', 'account_tree', 'Academic Structure', page);
                html += subNavLink('/pages/management/users/users.html', 'business_center', 'Employee Structure', page);
                html += subNavLink('/pages/admin/settings.html', 'tune', 'System Configuration', page);
                html += '</div></div>';
            }
        }

        html += '</div>';

        // ── Bottom Section ────────────────────────────────────
        html += `<div class="mt-auto border-t border-white/5 px-3 pt-3 pb-2 space-y-1">
            <a href="/pages/management/catalog/catalog.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/80 text-sm font-medium transition-all">
                <span class="material-symbols-outlined text-lg">search</span><span>Browse Catalog</span>
            </a>
            <button onclick="Auth.logout()" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 text-sm font-medium transition-all">
                <span class="material-symbols-outlined text-lg">logout</span><span>Sign Out</span>
            </button>
        </div>`;

        // ── System Status Card ────────────────────────────────
        html += `<div class="mx-3 mb-4 mt-2 px-4 py-3.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-400/10">
            <div class="flex items-center gap-2 mb-2.5">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]"></span>
                <span class="text-[11px] font-semibold text-white/70 uppercase tracking-wider">System Status</span>
            </div>
            <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-white/40">Academic Year</span>
                    <span class="text-[11px] text-white/70 font-semibold">25/26</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-white/40">Server status</span>
                    <span class="text-[11px] text-emerald-400 font-semibold">Operational</span>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-[11px] text-white/40">Last backup</span>
                    <span class="text-[11px] text-white/70 font-semibold">2h ago</span>
                </div>
            </div>
        </div>`;

        nav.innerHTML = html;
        bindDropdowns();
    };

    const sectionLabel = (text) =>
        `<p class="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-white/25">${text}</p>`;

    const navLink = (href, icon, label, currentPage, additionalMatches = []) => {
        const isActive = currentPage === href || additionalMatches.some(m => currentPage.startsWith(m));
        const cls = isActive
            ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-500/20 border-l-[3px] border-purple-400'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-all';
        return `<a href="${href}" class="${cls}"><span class="material-symbols-outlined text-xl" style="${isActive ? 'font-variation-settings: \'FILL\' 1;' : ''}">${icon}</span><span>${label}</span></a>`;
    };

    const navLinkWithBadge = (href, icon, label, currentPage, count, color) => {
        const isActive = currentPage === href;
        const cls = isActive
            ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-500/20 border-l-[3px] border-purple-400'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-all';
        const badgeColor = color === 'red'
            ? 'bg-red-500 text-white'
            : 'bg-purple-500 text-white';
        const badge = count > 0
            ? `<span class="ml-auto text-[10px] min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full font-bold ${badgeColor}">${count}</span>`
            : '';
        return `<a href="${href}" class="${cls}"><span class="material-symbols-outlined text-xl" style="${isActive ? 'font-variation-settings: \'FILL\' 1;' : ''}">${icon}</span><span class="flex-1">${label}</span>${badge}</a>`;
    };

    const subNavLink = (href, icon, label, currentPage) => {
        const isActive = currentPage === href;
        const cls = isActive
            ? 'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-purple-500/15'
            : 'flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/40 hover:bg-white/5 hover:text-white/70 transition-all';
        return `<a href="${href}" class="${cls}"><span class="material-symbols-outlined text-lg">${icon}</span><span>${label}</span></a>`;
    };

    const dropdownToggle = (icon, label, pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        const cls = isOpen
            ? 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-500/20 border-l-[3px] border-purple-400'
            : 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-all';
        return `<div class="nav-dropdown"><button type="button" class="${cls}" data-target="menu_${icon}" aria-expanded="${isOpen}"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-xl" style="${isOpen ? 'font-variation-settings: \'FILL\' 1;' : ''}">${icon}</span><span>${label}</span></div><span class="material-symbols-outlined text-sm menu-arrow transition-transform${isOpen ? ' rotate-180' : ''}" style="font-size:16px">expand_more</span></button>`;
    };

    const submenuClass = (pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        return `${isOpen ? '' : 'hidden '}ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3`;
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
