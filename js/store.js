/**
 * Store — hybrid data layer.
 *
 * On production (Netlify) it calls the serverless API and caches results
 * in-memory so existing synchronous reads (Store.getAll, Store.getById)
 * continue to work after the initial load.
 *
 * During local dev (file:// or localhost without Netlify functions) it
 * falls back to localStorage so pages still render.
 *
 * Write operations (create / update / remove) call the API first, then
 * update the in-memory cache. They return Promises (which the existing
 * code already uses).
 */
var Store = (function () {
    // ── Detect environment ──────────────────────────────────────
    var _useApi = (typeof Api !== 'undefined');  // api.js must be loaded BEFORE store.js

    // ── In-memory cache (mirrors what localStorage used to hold) ─
    var _cache = {};

    // ── localStorage helpers (fallback / offline) ───────────────
    function _key(name) { return 'aklatbayon_' + name; }

    function _lsGet(collection) {
        var data = localStorage.getItem(_key(collection));
        return data ? JSON.parse(data) : [];
    }

    function _lsSet(collection, items) {
        localStorage.setItem(_key(collection), JSON.stringify(items));
    }

    // ── Profanity filter (client-side, runs before API call) ────
    var _blocklist = [
        'fuck','shit','bitch','ass','asshole','bastard','damn','dick','cunt',
        'piss','cock','whore','slut','fag','faggot','nigger','nigga','retard',
        'motherfucker','bullshit','jackass','douche','douchebag','crap',
        'wtf','stfu','lmfao','pussy','bollocks','wanker','twat','prick',
        'gago','gaga','tanga','bobo','boba','tangina','putangina','puta',
        'putang','tarantado','tarantada','ulol','ungas','leche','lechugas',
        'hayop','hinayupak','punyeta','pesteng','kupal','bwisit','siraulo',
        'pakyu','pakshet','pakshit','kingina','kinginamo','inamo','inamu',
        'tang ina','pota','potangina','gunggong','hampas lupa','salot',
        'lintik','hudas','demonyo','engot','pokpok','malandi','bastos'
    ];
    var _blockPatterns = _blocklist.map(function (w) {
        var escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('(?:^|\\s|[^a-z])' + escaped + '(?:$|\\s|[^a-z])', 'i');
    });

    function _checkProfanity(obj) {
        var fields = Object.keys(obj);
        for (var i = 0; i < fields.length; i++) {
            var val = obj[fields[i]];
            if (typeof val !== 'string') continue;
            if (['id', 'created_at', 'updated_at', 'password', 'rfid_id', 'status', 'email'].indexOf(fields[i]) !== -1) continue;
            for (var j = 0; j < _blockPatterns.length; j++) {
                if (_blockPatterns[j].test(val)) {
                    return { found: true, word: _blocklist[j], field: fields[i] };
                }
            }
        }
        return { found: false };
    }

    // ── Cache helpers ───────────────────────────────────────────
    function _getCached(collection) {
        if (_cache[collection]) return _cache[collection];
        // Fall back to localStorage if cache not yet loaded
        _cache[collection] = _lsGet(collection);
        return _cache[collection];
    }

    function _setCached(collection, items) {
        _cache[collection] = items;
        // Also persist to localStorage as offline backup
        _lsSet(collection, items);
    }

    // ── Preload cache from API ─────────────────────────────────
    // Call Store.preload() on page init to hydrate the cache.
    // Returns a Promise that resolves when all collections are loaded.
    var _preloaded = false;
    var _preloadPromise = null;
    var _collections = [
        'roles', 'permissions', 'role_permissions', 'users', 'students',
        'authors', 'publishers', 'categories', 'books', 'transactions',
        'fines', 'reservations', 'attendance', 'audit_logs', 'settings', 'lcc_classes'
    ];

    function preload(collections) {
        if (_preloadPromise) return _preloadPromise;
        var cols = collections || _collections;
        if (!_useApi) {
            // No API — load everything from localStorage into cache
            cols.forEach(function (c) { _cache[c] = _lsGet(c); });
            _preloaded = true;
            _preloadPromise = Promise.resolve();
            return _preloadPromise;
        }
        _preloadPromise = Promise.all(cols.map(function (c) {
            return Api.getAll(c).then(function (data) {
                // role_permissions: API returns rows [{role_id, permission_id}]
                // but frontend expects { r1: ['p1','p2'], r2: [...] }
                if (c === 'role_permissions' && Array.isArray(data) && data.length && data[0].role_id) {
                    var map = {};
                    data.forEach(function (row) {
                        if (!map[row.role_id]) map[row.role_id] = [];
                        map[row.role_id].push(row.permission_id);
                    });
                    _cache[c] = map;
                    _lsSet(c, map);
                } else {
                    _cache[c] = data;
                    _lsSet(c, data); // offline backup
                }
            }).catch(function () {
                // API unavailable — use localStorage cache
                _cache[c] = _lsGet(c);
            });
        })).then(function () {
            _preloaded = true;
        });
        return _preloadPromise;
    }

    // ── Public CRUD (same interface as before) ──────────────────

    function getAll(collection) {
        return _getCached(collection);
    }

    function getById(collection, id) {
        return _getCached(collection).find(function (item) { return item.id === id; }) || null;
    }

    function create(collection, item) {
        var check = _checkProfanity(item);
        if (check.found) {
            return Promise.reject({ message: 'Inappropriate language detected in "' + check.field + '". Please remove offensive words and try again.' });
        }

        if (_useApi) {
            return Api.create(collection, item).then(function (resp) {
                var created = resp.data;
                var items = _getCached(collection);
                items.push(created);
                _setCached(collection, items);
                logActivity('CREATE', collection, created.name || created.title || created.id);
                return { data: created };
            });
        }

        // Fallback: localStorage
        var items = _getCached(collection);
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        item.created_at = new Date().toISOString();
        item.updated_at = item.created_at;
        items.push(item);
        _setCached(collection, items);
        logActivity('CREATE', collection, item.name || item.title || item.id);
        return Promise.resolve({ data: item });
    }

    function update(collection, id, updates) {
        var check = _checkProfanity(updates);
        if (check.found) {
            return Promise.reject({ message: 'Inappropriate language detected in "' + check.field + '". Please remove offensive words and try again.' });
        }

        if (_useApi) {
            return Api.update(collection, id, updates).then(function (resp) {
                var updated = resp.data;
                var items = _getCached(collection);
                var idx = items.findIndex(function (i) { return i.id === id; });
                if (idx !== -1) items[idx] = updated;
                _setCached(collection, items);
                logActivity('UPDATE', collection, updated.name || updated.title || id);
                return { data: updated };
            });
        }

        // Fallback: localStorage
        var items = _getCached(collection);
        var idx = items.findIndex(function (i) { return i.id === id; });
        if (idx === -1) return Promise.reject({ message: 'Not found' });
        Object.assign(items[idx], updates, { updated_at: new Date().toISOString() });
        _setCached(collection, items);
        logActivity('UPDATE', collection, items[idx].name || items[idx].title || id);
        return Promise.resolve({ data: items[idx] });
    }

    function remove(collection, id) {
        if (_useApi) {
            return Api.remove(collection, id).then(function () {
                var items = _getCached(collection);
                var item = items.find(function (i) { return i.id === id; });
                _setCached(collection, items.filter(function (i) { return i.id !== id; }));
                if (item) logActivity('DELETE', collection, item.name || item.title || id);
                return { data: { success: true } };
            });
        }

        var items = _getCached(collection);
        var item = items.find(function (i) { return i.id === id; });
        _setCached(collection, items.filter(function (i) { return i.id !== id; }));
        if (item) logActivity('DELETE', collection, item.name || item.title || id);
        return Promise.resolve({ data: { success: true } });
    }

    function search(collection, field, value) {
        return _getCached(collection).filter(function (item) {
            return item[field] && item[field].toString().toLowerCase().indexOf(value.toLowerCase()) !== -1;
        });
    }

    function count(collection) {
        return _getCached(collection).length;
    }

    // ── Helper functions ──────────────────────────────────────
    function getSetting(key) {
        var s = _getCached('settings').find(function (item) { return item.key === key; });
        return s ? s.value : null;
    }

    function getStudentFinesTotal(studentId) {
        return _getCached('fines').filter(function (f) {
            return f.student_id === studentId && f.status === 'pending';
        }).reduce(function (sum, f) { return sum + (parseFloat(f.amount) || 0); }, 0);
    }

    function getReservationQueue(bookId) {
        return _getCached('reservations').filter(function (r) {
            return r.book_id === bookId && (r.status === 'active' || r.status === 'available');
        }).sort(function (a, b) {
            return new Date(a.created_at) - new Date(b.created_at);
        });
    }

    function getActiveReservationCount(studentId) {
        return _getCached('reservations').filter(function (r) {
            return r.student_id === studentId && (r.status === 'active' || r.status === 'available');
        }).length;
    }

    function getBorrowerRoleKey(studentId) {
        var users = _getCached('users');
        var user = users.find(function (u) { return u.student_id === studentId; });
        if (!user) return 'student';
        var role = getById('roles', user.role_id);
        if (!role) return 'student';
        var name = role.name.toLowerCase();
        if (name.indexOf('head librarian') !== -1) return 'head_librarian';
        if (name.indexOf('librarian staff') !== -1) return 'librarian_staff';
        if (name.indexOf('student assistant') !== -1) return 'student_assistant';
        if (name.indexOf('faculty') !== -1) {
            var sub = (user.faculty_subtype || 'Teaching').toLowerCase();
            if (sub.indexOf('non') !== -1) return 'faculty_nonteaching';
            if (sub.indexOf('chair') !== -1 || sub.indexOf('head') !== -1) return 'faculty_deptchair';
            return 'faculty_teaching';
        }
        if (name.indexOf('student') !== -1) return 'student';
        return 'student';
    }

    function processOverdueFines() {
        var txns = _getCached('transactions');
        var finesArr = _getCached('fines');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var newFinesCount = 0;

        txns.forEach(function (t) {
            if (t.status !== 'borrowed') return;
            var due = new Date(t.date_due);
            due.setHours(0, 0, 0, 0);
            if (due >= today) return;

            var existingFine = finesArr.find(function (f) { return f.transaction_id === t.id && f.status === 'pending'; });
            if (existingFine) return;

            var daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24));
            var roleKey = getBorrowerRoleKey(t.student_id);
            var finePerDay = parseFloat(getSetting('borrow_' + roleKey + '_fine_per_day')) || parseFloat(getSetting('fine_per_day')) || 5;
            var amount = daysOverdue * finePerDay;

            if (amount > 0) {
                var newFine = {
                    student_id: t.student_id,
                    transaction_id: t.id,
                    amount: amount,
                    reason: 'Overdue: ' + daysOverdue + ' day(s) late',
                    status: 'pending'
                };
                // Fire-and-forget create (updates cache & API)
                create('fines', newFine);
                newFinesCount++;
            }
        });
        return newFinesCount;
    }

    function expireReservations() {
        var reservations = _getCached('reservations');
        var now = new Date();
        var expiredCount = 0;
        reservations.forEach(function (r) {
            if (r.status === 'available' && r.expires_at && new Date(r.expires_at) < now) {
                r.status = 'expired';
                r.updated_at = now.toISOString();
                update('reservations', r.id, { status: 'expired' });
                expiredCount++;
            }
        });
        return expiredCount;
    }

    // ── Audit log ─────────────────────────────────────────────
    function logActivity(action, entity, detail) {
        var user = JSON.parse(sessionStorage.getItem('aklatbayon_session') || '{}');
        var entry = {
            user: user.name || 'System',
            action: action,
            entity: entity,
            details: detail
        };

        if (_useApi) {
            Api.create('audit_logs', entry).catch(function () { /* silent */ });
        }

        // Also keep in local cache (capped at 200)
        var logs = _getCached('audit_logs');
        entry.id = Date.now().toString(36);
        entry.created_at = new Date().toISOString();
        logs.unshift(entry);
        if (logs.length > 200) logs = logs.slice(0, 200);
        _cache['audit_logs'] = logs;
    }

    // ── Seed (localStorage fallback only) ─────────────────────
    function isSeeded() {
        return localStorage.getItem('aklatbayon_seeded') === 'true';
    }

    function seed() {
        // On API mode, seed is done via POST /api/seed — skip localStorage seed
        if (_useApi) return;
        if (isSeeded()) return;

        function seedIfEmpty(collection, data) {
            var raw = localStorage.getItem(_key(collection));
            if (!raw) {
                _lsSet(collection, data);
                _cache[collection] = data;
            }
        }

        var rolesData = [
            { id: 'r1', name: 'System Administrator', description: 'IT staff — manages system configuration, user accounts, and backups' },
            { id: 'r2', name: 'Head Librarian', description: 'Licensed professional librarian — oversees all library operations, cataloging, reports, and collection development' },
            { id: 'r3', name: 'Librarian Staff', description: 'Library assistant / circulation clerk — handles front-desk operations under Head Librarian supervision' },
            { id: 'r4', name: 'Faculty', description: 'Teaching and non-teaching university staff (subtypes: Teaching, Non-Teaching, Department Chair, Department Head)' },
            { id: 'r5', name: 'Student', description: 'Currently enrolled FEATI students with valid ID' },
            { id: 'r6', name: 'Student Assistant', description: 'Working student assigned to the library under scholarship program' },
            { id: 'r7', name: 'Guest', description: 'Walk-in researchers, alumni, inter-library visitors — catalog browsing only' }
        ];
        seedIfEmpty('roles', rolesData);

        var permissionsData = [
            { id: 'p1', name: 'can_manage_users', label: 'Manage Users', group: 'Users', description: 'Create, edit, deactivate user accounts' },
            { id: 'p2', name: 'can_manage_roles', label: 'Manage Roles', group: 'Users', description: 'Manage roles and permission assignments' },
            { id: 'p3', name: 'can_manage_students', label: 'Manage Students', group: 'Students', description: 'Create, edit, delete student records' },
            { id: 'p4', name: 'can_add_books', label: 'Add Books', group: 'Catalog', description: 'Add new books to the catalog' },
            { id: 'p5', name: 'can_edit_books', label: 'Edit Books', group: 'Catalog', description: 'Edit existing book records' },
            { id: 'p6', name: 'can_delete_books', label: 'Delete Books', group: 'Catalog', description: 'Remove books from the catalog' },
            { id: 'p7', name: 'can_add_categories', label: 'Manage Catalog Entities', group: 'Catalog', description: 'Manage authors, publishers, and categories' },
            { id: 'p15', name: 'can_browse_catalog', label: 'Browse Catalog', group: 'Catalog', description: 'Search and view the book catalog (OPAC)' },
            { id: 'p8', name: 'can_issue_books', label: 'Issue Books', group: 'Circulation', description: 'Check out books to borrowers' },
            { id: 'p9', name: 'can_return_books', label: 'Return Books', group: 'Circulation', description: 'Process book returns' },
            { id: 'p20', name: 'can_reserve_books', label: 'Reserve Books', group: 'Circulation', description: 'Place reservations on books' },
            { id: 'p21', name: 'can_renew_books', label: 'Renew Books', group: 'Circulation', description: 'Renew own borrowed books' },
            { id: 'p10', name: 'can_manage_fines', label: 'Manage Fines', group: 'Finance', description: 'Collect, waive, or manage fines' },
            { id: 'p11', name: 'can_view_reports', label: 'View Reports', group: 'Reports', description: 'View circulation and library reports' },
            { id: 'p16', name: 'can_view_inventory', label: 'View Inventory', group: 'Reports', description: 'View and manage inventory data' },
            { id: 'p17', name: 'can_view_attendance', label: 'View Attendance', group: 'Reports', description: 'View RFID attendance reports' },
            { id: 'p12', name: 'can_manage_settings', label: 'Manage Settings', group: 'System', description: 'Modify system settings and configuration' },
            { id: 'p13', name: 'can_manage_backups', label: 'Manage Backups', group: 'System', description: 'Create and restore data backups' },
            { id: 'p14', name: 'can_view_audit_logs', label: 'View Audit Logs', group: 'System', description: 'View the system audit trail' },
            { id: 'p18', name: 'can_view_dashboard', label: 'View Dashboard', group: 'General', description: 'Access the dashboard overview page' },
            { id: 'p19', name: 'can_view_own_profile', label: 'View Own Profile', group: 'General', description: 'View own user profile and loan history' },
            { id: 'p22', name: 'can_recommend_books', label: 'Recommend Books', group: 'Catalog', description: 'Recommend books for acquisition' },
            { id: 'p23', name: 'can_view_own_fines', label: 'View Own Fines', group: 'Finance', description: 'View fines assigned to own account' }
        ];
        seedIfEmpty('permissions', permissionsData);

        var rolePerms = {
            'r1': ['p1','p2','p12','p13','p14','p15','p18','p19'],
            'r2': ['p3','p4','p5','p6','p7','p8','p9','p10','p11','p14','p15','p16','p17','p18','p19','p20','p21','p22'],
            'r3': ['p5','p8','p9','p10','p15','p16','p18','p19','p20','p21'],
            'r4': ['p15','p19','p20','p21','p22','p23'],
            'r5': ['p15','p19','p23'],
            'r6': ['p3','p8','p9','p10','p15','p18','p19','p20','p21','p23'],
            'r7': ['p15']
        };
        seedIfEmpty('role_permissions', rolePerms);

        seedIfEmpty('users', [
            { id: 'u1', name: 'Admin User', username: 'admin', password: 'admin123', email: 'admin@feati.edu.ph', role_id: 'r1', faculty_subtype: null, rfid_id: 'RFID-ADMIN-001', student_id: null, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('students', [
            { id: 's1', student_id: '2024-0001', name: 'Carlo Mendoza', email: 'carlo@aklatbayon.edu', grade_level: 'College', section: 'BSIT-3A', contact: '09171234567', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 's2', student_id: '2024-0002', name: 'Sofia Torres', email: 'sofia@aklatbayon.edu', grade_level: 'College', section: 'BSCS-2B', contact: '09181234567', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 's3', student_id: '2024-0003', name: 'Miguel Bautista', email: 'miguel@aklatbayon.edu', grade_level: 'College', section: 'BSIT-1A', contact: '09191234567', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('categories', [
            { id: 'c1', name: 'Fiction', description: 'Fictional literature', parent_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c2', name: 'Non-Fiction', description: 'Non-fictional works', parent_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c3', name: 'Science', description: 'Science books', parent_id: 'c2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c4', name: 'Technology', description: 'Information technology', parent_id: 'c2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c5', name: 'Literature', description: 'Classic literature', parent_id: 'c1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('authors', [
            { id: 'a1', name: 'Jose Rizal', bio: 'Philippine national hero and author', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'a2', name: 'Nick Joaquin', bio: 'National Artist for Literature', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'a3', name: 'Robert C. Martin', bio: 'Software engineering author', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('publishers', [
            { id: 'pub1', name: 'Anvil Publishing', address: 'Quezon City, PH', contact: '(02) 8477-4752', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'pub2', name: 'Pearson Education', address: 'New York, USA', contact: '+1-800-848-9500', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'pub3', name: 'OReilly Media', address: 'Sebastopol, CA', contact: '+1-707-827-7000', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('books', [
            { id: 'b1', title: 'Noli Me Tangere', isbn: '978-971-27-2800-0', author_id: 'a1', publisher_id: 'pub1', category_id: 'c5', call_number: 'PQ8896.R5', copies: 5, available: 4, year: 1887, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b2', title: 'El Filibusterismo', isbn: '978-971-27-2801-7', author_id: 'a1', publisher_id: 'pub1', category_id: 'c5', call_number: 'PQ8896.R5', copies: 3, available: 3, year: 1891, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b3', title: 'Clean Code', isbn: '978-0-13-235088-4', author_id: 'a3', publisher_id: 'pub2', category_id: 'c4', call_number: 'QA76.76.D47', copies: 2, available: 1, year: 2008, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b4', title: 'The Woman Who Had Two Navels', isbn: '978-0-14-303035-0', author_id: 'a2', publisher_id: 'pub1', category_id: 'c5', call_number: 'PR9550.9.J6', copies: 2, available: 2, year: 1961, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b5', title: 'Clean Architecture', isbn: '978-0-13-449416-6', author_id: 'a3', publisher_id: 'pub3', category_id: 'c4', call_number: 'QA76.754', copies: 4, available: 3, year: 2017, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('transactions', [
            { id: 't1', student_id: 's1', book_id: 'b1', type: 'borrow', date_issued: '2026-02-20', date_due: '2026-03-06', date_returned: null, status: 'borrowed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't2', student_id: 's2', book_id: 'b3', type: 'borrow', date_issued: '2026-02-15', date_due: '2026-03-01', date_returned: '2026-02-25', status: 'returned', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('fines', [
            { id: 'f1', student_id: 's1', transaction_id: 't1', amount: 50, reason: 'Overdue return', status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ]);

        seedIfEmpty('settings', [
            { id: 'set1', key: 'library_name', value: 'FEATI University Library', label: 'Library Name' },
            { id: 'set2', key: 'fine_per_day', value: '5', label: 'Default Fine Per Day (₱)' },
            { id: 'set10', key: 'borrow_head_librarian_max_books', value: '15', label: 'Head Librarian — Max Books' },
            { id: 'set11', key: 'borrow_head_librarian_loan_days', value: '60', label: 'Head Librarian — Loan Days' },
            { id: 'set12', key: 'borrow_head_librarian_max_renewals', value: '3', label: 'Head Librarian — Max Renewals' },
            { id: 'set13', key: 'borrow_head_librarian_fine_per_day', value: '2', label: 'Head Librarian — Fine/Day (₱)' },
            { id: 'set20', key: 'borrow_librarian_staff_max_books', value: '10', label: 'Librarian Staff — Max Books' },
            { id: 'set21', key: 'borrow_librarian_staff_loan_days', value: '30', label: 'Librarian Staff — Loan Days' },
            { id: 'set22', key: 'borrow_librarian_staff_max_renewals', value: '2', label: 'Librarian Staff — Max Renewals' },
            { id: 'set23', key: 'borrow_librarian_staff_fine_per_day', value: '3', label: 'Librarian Staff — Fine/Day (₱)' },
            { id: 'set30', key: 'borrow_faculty_teaching_max_books', value: '10', label: 'Faculty (Teaching) — Max Books' },
            { id: 'set31', key: 'borrow_faculty_teaching_loan_days', value: '30', label: 'Faculty (Teaching) — Loan Days' },
            { id: 'set32', key: 'borrow_faculty_teaching_max_renewals', value: '2', label: 'Faculty (Teaching) — Max Renewals' },
            { id: 'set33', key: 'borrow_faculty_teaching_fine_per_day', value: '5', label: 'Faculty (Teaching) — Fine/Day (₱)' },
            { id: 'set40', key: 'borrow_faculty_nonteaching_max_books', value: '5', label: 'Faculty (Non-Teaching) — Max Books' },
            { id: 'set41', key: 'borrow_faculty_nonteaching_loan_days', value: '14', label: 'Faculty (Non-Teaching) — Loan Days' },
            { id: 'set42', key: 'borrow_faculty_nonteaching_max_renewals', value: '1', label: 'Faculty (Non-Teaching) — Max Renewals' },
            { id: 'set43', key: 'borrow_faculty_nonteaching_fine_per_day', value: '5', label: 'Faculty (Non-Teaching) — Fine/Day (₱)' },
            { id: 'set50', key: 'borrow_faculty_deptchair_max_books', value: '10', label: 'Dept Chair/Head — Max Books' },
            { id: 'set51', key: 'borrow_faculty_deptchair_loan_days', value: '30', label: 'Dept Chair/Head — Loan Days' },
            { id: 'set52', key: 'borrow_faculty_deptchair_max_renewals', value: '2', label: 'Dept Chair/Head — Max Renewals' },
            { id: 'set53', key: 'borrow_faculty_deptchair_fine_per_day', value: '5', label: 'Dept Chair/Head — Fine/Day (₱)' },
            { id: 'set60', key: 'borrow_student_max_books', value: '3', label: 'Student — Max Books' },
            { id: 'set61', key: 'borrow_student_loan_days', value: '7', label: 'Student — Loan Days' },
            { id: 'set62', key: 'borrow_student_max_renewals', value: '1', label: 'Student — Max Renewals' },
            { id: 'set63', key: 'borrow_student_fine_per_day', value: '5', label: 'Student — Fine/Day (₱)' },
            { id: 'set70', key: 'borrow_student_assistant_max_books', value: '3', label: 'Student Assistant — Max Books' },
            { id: 'set71', key: 'borrow_student_assistant_loan_days', value: '7', label: 'Student Assistant — Loan Days' },
            { id: 'set72', key: 'borrow_student_assistant_max_renewals', value: '1', label: 'Student Assistant — Max Renewals' },
            { id: 'set73', key: 'borrow_student_assistant_fine_per_day', value: '5', label: 'Student Assistant — Fine/Day (₱)' },
            { id: 'set80', key: 'reservation_max_student', value: '2', label: 'Student — Max Active Reservations' },
            { id: 'set81', key: 'reservation_max_faculty', value: '5', label: 'Faculty — Max Active Reservations' },
            { id: 'set82', key: 'reservation_expiry_hours', value: '48', label: 'Reservation Claim Window (hours)' },
            { id: 'set83', key: 'fine_block_threshold', value: '100', label: 'Fine Block Threshold (₱) — Blocks borrowing/renewal' }
        ]);

        seedIfEmpty('reservations', []);
        seedIfEmpty('audit_logs', [
            { id: 'log1', user: 'System', action: 'SEED', entity: 'system', details: 'Initial data seeded', created_at: new Date().toISOString() }
        ]);

        var lccClassesData = [
            { id: 'lcc-a', letter: 'A', name: 'General Works', icon: 'fa-globe', subclasses: ['AC - Collections', 'AE - Encyclopedias', 'AG - Dictionaries', 'AI - Indexes'] },
            { id: 'lcc-b', letter: 'B', name: 'Philosophy & Religion', icon: 'fa-brain', subclasses: ['BC - Logic', 'BD - Speculative Philosophy', 'BF - Psychology', 'BL - Religions', 'BV - Practical Theology'] },
            { id: 'lcc-c', letter: 'C', name: 'Auxiliary Sciences of History', icon: 'fa-landmark', subclasses: ['CB - History of Civilization', 'CC - Archaeology', 'CD - Diplomatics', 'CS - Genealogy'] },
            { id: 'lcc-d', letter: 'D', name: 'World History', icon: 'fa-earth-americas', subclasses: ['DA - Great Britain', 'DB - Austria', 'DC - France', 'DD - Germany', 'DS - Asia'] },
            { id: 'lcc-e', letter: 'E', name: 'American History', icon: 'fa-flag-usa', subclasses: ['E11 - America (General)', 'E151 - United States (General)'] },
            { id: 'lcc-f', letter: 'F', name: 'Local American History', icon: 'fa-map-location-dot', subclasses: ['F1 - New England', 'F106 - Middle Atlantic', 'F206 - South Atlantic'] },
            { id: 'lcc-g', letter: 'G', name: 'Geography & Maps', icon: 'fa-map', subclasses: ['GA - Mathematical Geography', 'GB - Physical Geography', 'GC - Oceanography', 'GN - Anthropology'] },
            { id: 'lcc-h', letter: 'H', name: 'Social Sciences', icon: 'fa-users', subclasses: ['HA - Statistics', 'HB - Economic Theory', 'HC - Economic History', 'HD - Industries', 'HM - Sociology'] },
            { id: 'lcc-j', letter: 'J', name: 'Political Science', icon: 'fa-balance-scale', subclasses: ['JA - Political Science (General)', 'JC - Political Theory', 'JF - Constitutional History', 'JK - US Politics'] },
            { id: 'lcc-k', letter: 'K', name: 'Law', icon: 'fa-gavel', subclasses: ['KD - UK Law', 'KF - US Law', 'KJ-KKZ - European Law'] },
            { id: 'lcc-l', letter: 'L', name: 'Education', icon: 'fa-graduation-cap', subclasses: ['LA - History of Education', 'LB - Theory of Education', 'LC - Special Education', 'LD - US Schools'] },
            { id: 'lcc-m', letter: 'M', name: 'Music', icon: 'fa-music', subclasses: ['ML - Literature on Music', 'MT - Instruction & Study'] },
            { id: 'lcc-n', letter: 'N', name: 'Fine Arts', icon: 'fa-palette', subclasses: ['NA - Architecture', 'NB - Sculpture', 'NC - Drawing', 'ND - Painting', 'NK - Decorative Arts'] },
            { id: 'lcc-p', letter: 'P', name: 'Language & Literature', icon: 'fa-book-open', subclasses: ['PA - Classical Languages', 'PB - Modern European', 'PC - Romance Languages', 'PE - English', 'PQ - French/Italian/Spanish Lit', 'PR - English Literature', 'PS - American Literature'] },
            { id: 'lcc-q', letter: 'Q', name: 'Science', icon: 'fa-flask', subclasses: ['QA - Mathematics', 'QB - Astronomy', 'QC - Physics', 'QD - Chemistry', 'QE - Geology', 'QH - Natural History', 'QK - Botany', 'QL - Zoology', 'QR - Microbiology'] },
            { id: 'lcc-r', letter: 'R', name: 'Medicine', icon: 'fa-stethoscope', subclasses: ['RA - Public Health', 'RB - Pathology', 'RC - Internal Medicine', 'RD - Surgery', 'RE - Ophthalmology'] },
            { id: 'lcc-s', letter: 'S', name: 'Agriculture', icon: 'fa-seedling', subclasses: ['SB - Plant Culture', 'SD - Forestry', 'SF - Animal Culture', 'SH - Aquaculture'] },
            { id: 'lcc-t', letter: 'T', name: 'Technology', icon: 'fa-microchip', subclasses: ['TA - Engineering (General)', 'TC - Hydraulic Engineering', 'TD - Environmental Technology', 'TK - Electrical Engineering', 'TL - Motor Vehicles', 'TN - Mining'] },
            { id: 'lcc-u', letter: 'U', name: 'Military Science', icon: 'fa-shield-halved', subclasses: ['UA - Armies', 'UB - Military Administration', 'UC - Maintenance & Transportation', 'UD - Infantry'] },
            { id: 'lcc-v', letter: 'V', name: 'Naval Science', icon: 'fa-anchor', subclasses: ['VA - Navies', 'VB - Naval Administration', 'VC - Naval Maintenance', 'VK - Navigation'] },
            { id: 'lcc-z', letter: 'Z', name: 'Bibliography & Library Science', icon: 'fa-bookmark', subclasses: ['ZA - Information Resources', 'Z4 - Books (General)', 'Z657 - Library Science', 'Z695 - Cataloging'] }
        ];
        seedIfEmpty('lcc_classes', lccClassesData);

        localStorage.setItem('aklatbayon_seeded', 'true');
    }

    return {
        getAll: getAll,
        getById: getById,
        create: create,
        update: update,
        remove: remove,
        search: search,
        count: count,
        seed: seed,
        preload: preload,
        logActivity: logActivity,
        getSetting: getSetting,
        getStudentFinesTotal: getStudentFinesTotal,
        getReservationQueue: getReservationQueue,
        getActiveReservationCount: getActiveReservationCount,
        getBorrowerRoleKey: getBorrowerRoleKey,
        processOverdueFines: processOverdueFines,
        expireReservations: expireReservations
    };
})();

// Auto-seed localStorage fallback (when API is unavailable)
Store.seed();
