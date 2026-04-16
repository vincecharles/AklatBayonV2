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

        // User info area
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const avatarColors = ['#e17141','#9b87c1','#4ade80','#60a5fa','#fbbf24'];
        const colorIdx = user.name.charCodeAt(0) % avatarColors.length;
        html += `<div class="px-5 py-5 border-b border-[#3a3a52]">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style="background:${avatarColors[colorIdx]}">${initials}</div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold text-[#e2e0fc] truncate">${user.name}</div>
                    <div class="text-[10px] font-medium text-[#9b99b8] uppercase tracking-widest">${user.role_name}${user.faculty_subtype ? ' · ' + user.faculty_subtype : ''}</div>
                </div>
            </div>
        </div>`;

        html += '<div class="p-3 space-y-0.5 flex-1">';

        // General
        html += sectionLabel('General');
        html += navLink('/pages/general/dashboard.html', 'dashboard', 'Dashboard', page);
        html += navLink('/pages/management/users/profile.html', 'person', 'My Profile', page);

        // User Management
        if (Auth.hasAnyPermission(['can_manage_users', 'can_manage_students'])) {
            html += sectionLabel('Management');
            const userPages = ['/pages/management/users/users.html', '/pages/management/users/students.html', '/pages/management/users/faculty-profile.html'];
            html += dropdownToggle('manage_accounts', 'User Management', userPages, page);
            html += `<div class="${submenuClass(userPages, page)}">`;
            if (Auth.hasPermission('can_manage_users')) html += subNavLink('/pages/management/users/users.html', 'person', 'Users', page);
            if (Auth.hasPermission('can_manage_students')) html += subNavLink('/pages/management/users/students.html', 'school', 'Students', page);
            html += subNavLink('/pages/management/users/faculty-profile.html', 'school', 'Faculty Portal', page);
            html += '</div></div>';
        }

        // Role Management
        if (Auth.hasPermission('can_manage_roles')) {
            if (!Auth.hasAnyPermission(['can_manage_users', 'can_manage_students'])) html += sectionLabel('Management');
            html += navLink('/pages/management/users/roles.html', 'admin_panel_settings', 'Role Management', page);
        }

        // Book Management
        const catalogPages = ['/pages/management/catalog/books.html', '/pages/management/catalog/authors.html', '/pages/management/catalog/publishers.html', '/pages/management/catalog/categories.html', '/pages/management/catalog/loc-search.html', '/pages/management/catalog/lcc-browser.html', '/pages/management/catalog/ai-search.html'];
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
        html += subNavLink('/pages/management/catalog/ai-search.html', 'auto_awesome', 'AI Search', page);
        html += '</div></div>';

        // Circulation
        if (Auth.hasAnyPermission(['can_issue_books', 'can_return_books', 'can_reserve_books', 'can_renew_books'])) {
            html += sectionLabel('Operations');
            const circPages = ['/pages/operations/circulation.html', '/pages/operations/reservations.html', '/pages/operations/reading-history.html'];
            html += dropdownToggle('swap_horiz', 'Circulation', circPages, page);
            html += `<div class="${submenuClass(circPages, page)}">`;
            html += subNavLink('/pages/operations/circulation.html', 'swap_horiz', 'Transactions', page);
            if (Auth.hasPermission('can_reserve_books')) html += subNavLink('/pages/operations/reservations.html', 'bookmark', 'Reservations', page);
            html += subNavLink('/pages/operations/reading-history.html', 'history', 'Reading History', page);
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
                const badge = myFineCount > 0 ? ` <span class="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:rgba(248,113,113,0.15);color:#f87171">${myFineCount}</span>` : '';
                html += subNavLink('/pages/operations/my-fines.html', 'request_quote', `My Fines${badge}`, page);
            }
            html += '</div></div>';
        }

        // Inventory
        if (Auth.hasAnyPermission(['can_view_inventory', 'can_manage_incoming', 'can_manage_outgoing'])) {
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

        // Bottom section
        html += `<div class="mt-auto border-t border-[#3a3a52] p-3 space-y-0.5">
            <a href="/pages/management/catalog/catalog.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-[#9b99b8] hover:bg-[rgba(255,181,153,0.05)] hover:text-[#ffb599] text-sm font-medium transition-colors">
                <span class="material-symbols-outlined text-lg">search</span><span>Browse Catalog</span>
            </a>
            <button onclick="Auth.logout()" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#9b99b8] hover:bg-[rgba(248,113,113,0.08)] hover:text-[#f87171] text-sm font-medium transition-colors">
                <span class="material-symbols-outlined text-lg">logout</span><span>Logout</span>
            </button>
        </div>`;

        nav.innerHTML = html;
        bindDropdowns();
    };

    const sectionLabel = (text) =>
        `<p class="px-3 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-[#9b99b8]">${text}</p>`;

    const navLink = (href, icon, label, currentPage) => {
        const isActive = currentPage === href;
        const cls = isActive
            ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#ffb599] bg-[rgba(225,113,65,0.12)] border-l-[3px] border-[#ffb599]'
            : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#9b99b8] hover:bg-[rgba(255,181,153,0.05)] hover:text-[#e2e0fc] transition-colors';
        return `<a href="${href}" class="${cls}"><span class="material-symbols-outlined text-xl">${icon}</span><span>${label}</span></a>`;
    };

    const subNavLink = (href, icon, label, currentPage) => {
        const isActive = currentPage === href;
        const cls = isActive
            ? 'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-[#ffb599] bg-[rgba(225,113,65,0.08)]'
            : 'flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#9b99b8] hover:bg-[rgba(255,181,153,0.05)] hover:text-[#e2e0fc] transition-colors';
        return `<a href="${href}" class="${cls}"><span class="material-symbols-outlined text-lg">${icon}</span><span>${label}</span></a>`;
    };

    const dropdownToggle = (icon, label, pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        const cls = isOpen
            ? 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#ffb599] bg-[rgba(225,113,65,0.12)] border-l-[3px] border-[#ffb599]'
            : 'menu-toggle w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-[#9b99b8] hover:bg-[rgba(255,181,153,0.05)] hover:text-[#e2e0fc] transition-colors';
        return `<div class="nav-dropdown"><button type="button" class="${cls}" data-target="menu_${icon}" aria-expanded="${isOpen}"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-xl">${icon}</span><span>${label}</span></div><span class="material-symbols-outlined text-sm menu-arrow transition-transform${isOpen ? ' rotate-180' : ''}">expand_more</span></button>`;
    };

    const submenuClass = (pages, currentPage) => {
        const isOpen = isActiveGroup(pages, currentPage);
        return `${isOpen ? '' : 'hidden '}ml-5 mt-1 space-y-0.5 border-l border-[#3a3a52] pl-3`;
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
