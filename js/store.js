var Store = (function() {
    function _key(name) { return 'aklatbayon_' + name; }

    function getAll(collection) {
        var data = localStorage.getItem(_key(collection));
        return data ? JSON.parse(data) : [];
    }

    function setAll(collection, items) {
        localStorage.setItem(_key(collection), JSON.stringify(items));
    }

    function getById(collection, id) {
        return getAll(collection).find(function(item) { return item.id === id; }) || null;
    }

    function create(collection, item) {
        var items = getAll(collection);
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        item.created_at = new Date().toISOString();
        item.updated_at = item.created_at;
        items.push(item);
        setAll(collection, items);
        logActivity('CREATE', collection, item.name || item.title || item.id);
        return Promise.resolve({ data: item });
    }

    function update(collection, id, updates) {
        var items = getAll(collection);
        var idx = items.findIndex(function(i) { return i.id === id; });
        if (idx === -1) return Promise.reject({ message: 'Not found' });
        Object.assign(items[idx], updates, { updated_at: new Date().toISOString() });
        setAll(collection, items);
        logActivity('UPDATE', collection, items[idx].name || items[idx].title || id);
        return Promise.resolve({ data: items[idx] });
    }

    function remove(collection, id) {
        var items = getAll(collection);
        var item = items.find(function(i) { return i.id === id; });
        items = items.filter(function(i) { return i.id !== id; });
        setAll(collection, items);
        if (item) logActivity('DELETE', collection, item.name || item.title || id);
        return Promise.resolve({ data: { success: true } });
    }

    function search(collection, field, value) {
        return getAll(collection).filter(function(item) {
            return item[field] && item[field].toString().toLowerCase().indexOf(value.toLowerCase()) !== -1;
        });
    }

    function count(collection) {
        return getAll(collection).length;
    }

    function logActivity(action, entity, detail) {
        var logs = getAll('audit_logs');
        var user = JSON.parse(sessionStorage.getItem('aklatbayon_session') || '{}');
        logs.unshift({
            id: Date.now().toString(36),
            user: user.name || 'System',
            action: action,
            entity: entity,
            details: detail,
            created_at: new Date().toISOString()
        });
        if (logs.length > 200) logs = logs.slice(0, 200);
        setAll('audit_logs', logs);
    }

    function isSeeded() {
        return localStorage.getItem('aklatbayon_seeded') === 'true';
    }

    function seed() {
        if (isSeeded()) return;

        var roles = [
            { id: 'r1', name: 'System Administrator', description: 'Full system access' },
            { id: 'r2', name: 'Librarian', description: 'Library operations management' },
            { id: 'r3', name: 'Faculty', description: 'Teaching and non-teaching staff' },
            { id: 'r4', name: 'Student', description: 'Enrolled students' },
            { id: 'r5', name: 'Student Assistant', description: 'Student library helpers' },
            { id: 'r6', name: 'Guest', description: 'Public catalog browsing only' }
        ];
        setAll('roles', roles);

        var permissions = [
            { id: 'p1', name: 'can_manage_users', label: 'Manage Users', group: 'Users', description: 'Create, edit, delete users' },
            { id: 'p2', name: 'can_manage_roles', label: 'Manage Roles', group: 'Users', description: 'Manage roles and permissions' },
            { id: 'p3', name: 'can_manage_students', label: 'Manage Students', group: 'Students', description: 'Create, edit, delete students' },
            { id: 'p4', name: 'can_add_books', label: 'Add Books', group: 'Books', description: 'Add new books to catalog' },
            { id: 'p5', name: 'can_edit_books', label: 'Edit Books', group: 'Books', description: 'Edit existing books' },
            { id: 'p6', name: 'can_delete_books', label: 'Delete Books', group: 'Books', description: 'Remove books from catalog' },
            { id: 'p7', name: 'can_add_categories', label: 'Manage Catalog', group: 'Catalog', description: 'Manage authors, publishers, categories' },
            { id: 'p8', name: 'can_issue_books', label: 'Issue Books', group: 'Circulation', description: 'Issue books to borrowers' },
            { id: 'p9', name: 'can_return_books', label: 'Return Books', group: 'Circulation', description: 'Process book returns' },
            { id: 'p10', name: 'can_manage_fines', label: 'Manage Fines', group: 'Finance', description: 'Collect or waive fines' },
            { id: 'p11', name: 'can_view_reports', label: 'View Reports', group: 'Reports', description: 'View system reports' },
            { id: 'p12', name: 'can_manage_settings', label: 'Manage Settings', group: 'System', description: 'Modify system settings' },
            { id: 'p13', name: 'can_manage_backups', label: 'Manage Backups', group: 'System', description: 'Create and restore backups' },
            { id: 'p14', name: 'can_view_audit_logs', label: 'View Audit Logs', group: 'System', description: 'View audit trail' },
            { id: 'p15', name: 'can_browse_catalog', label: 'Browse Catalog', group: 'Books', description: 'View the book catalog' },
            { id: 'p16', name: 'can_view_inventory', label: 'View Inventory', group: 'Reports', description: 'View inventory data' }
        ];
        setAll('permissions', permissions);

        var allPermIds = permissions.map(function(p) { return p.id; });
        var rolePerms = {
            'r1': allPermIds,
            'r2': ['p3','p4','p5','p6','p7','p8','p9','p10','p11','p15','p16'],
            'r3': ['p15'],
            'r4': ['p15'],
            'r5': ['p3','p8','p9','p15'],
            'r6': ['p15']
        };
        setAll('role_permissions', rolePerms);

        var users = [
            { id: 'u1', name: 'Admin User', username: 'admin', password: 'admin123', email: 'admin@aklatbayon.edu', role_id: 'r1', faculty_subtype: null, rfid_id: 'RFID-ADMIN-001', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'u2', name: 'Maria Santos', username: 'librarian', password: 'lib123', email: 'maria@aklatbayon.edu', role_id: 'r2', faculty_subtype: null, rfid_id: 'RFID-LIB-001', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'u3', name: 'Prof. Juan Cruz', username: 'faculty1', password: 'fac123', email: 'juan@aklatbayon.edu', role_id: 'r3', faculty_subtype: 'Teaching', rfid_id: '1980-0315', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'u4', name: 'Ana Reyes', username: 'faculty2', password: 'fac123', email: 'ana@aklatbayon.edu', role_id: 'r3', faculty_subtype: 'Non-Teaching', rfid_id: '1985-0722', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'u5', name: 'Dr. Pedro Lim', username: 'deptchair', password: 'chair123', email: 'pedro@aklatbayon.edu', role_id: 'r3', faculty_subtype: 'Department Chair', rfid_id: '1975-1105', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'u6', name: 'Dr. Elena Ramos', username: 'depthead', password: 'head123', email: 'elena@aklatbayon.edu', role_id: 'r3', faculty_subtype: 'Department Head', rfid_id: '1978-0418', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'u7', name: 'Carlo Mendoza', username: 'student1', password: 'stud123', email: 'carlo@aklatbayon.edu', role_id: 'r4', faculty_subtype: null, rfid_id: '2024-0001', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'u8', name: 'Pia Garcia', username: 'assistant1', password: 'asst123', email: 'pia@aklatbayon.edu', role_id: 'r5', faculty_subtype: null, rfid_id: '2024-0002', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('users', users);

        var students = [
            { id: 's1', student_id: '2024-0001', name: 'Carlo Mendoza', email: 'carlo@aklatbayon.edu', grade_level: 'College', section: 'BSIT-3A', contact: '09171234567', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 's2', student_id: '2024-0002', name: 'Sofia Torres', email: 'sofia@aklatbayon.edu', grade_level: 'College', section: 'BSCS-2B', contact: '09181234567', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 's3', student_id: '2024-0003', name: 'Miguel Bautista', email: 'miguel@aklatbayon.edu', grade_level: 'College', section: 'BSIT-1A', contact: '09191234567', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('students', students);

        var categories = [
            { id: 'c1', name: 'Fiction', description: 'Fictional literature', parent_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c2', name: 'Non-Fiction', description: 'Non-fictional works', parent_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c3', name: 'Science', description: 'Science books', parent_id: 'c2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c4', name: 'Technology', description: 'Information technology', parent_id: 'c2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'c5', name: 'Literature', description: 'Classic literature', parent_id: 'c1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('categories', categories);

        var authors = [
            { id: 'a1', name: 'Jose Rizal', bio: 'Philippine national hero and author', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'a2', name: 'Nick Joaquin', bio: 'National Artist for Literature', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'a3', name: 'Robert C. Martin', bio: 'Software engineering author', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('authors', authors);

        var publishers = [
            { id: 'pub1', name: 'Anvil Publishing', address: 'Quezon City, PH', contact: '(02) 8477-4752', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'pub2', name: 'Pearson Education', address: 'New York, USA', contact: '+1-800-848-9500', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'pub3', name: 'OReilly Media', address: 'Sebastopol, CA', contact: '+1-707-827-7000', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('publishers', publishers);

        var books = [
            { id: 'b1', title: 'Noli Me Tangere', isbn: '978-971-27-2800-0', author_id: 'a1', publisher_id: 'pub1', category_id: 'c5', call_number: 'PQ8896.R5', copies: 5, available: 4, year: 1887, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b2', title: 'El Filibusterismo', isbn: '978-971-27-2801-7', author_id: 'a1', publisher_id: 'pub1', category_id: 'c5', call_number: 'PQ8896.R5', copies: 3, available: 3, year: 1891, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b3', title: 'Clean Code', isbn: '978-0-13-235088-4', author_id: 'a3', publisher_id: 'pub2', category_id: 'c4', call_number: 'QA76.76.D47', copies: 2, available: 1, year: 2008, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b4', title: 'The Woman Who Had Two Navels', isbn: '978-0-14-303035-0', author_id: 'a2', publisher_id: 'pub1', category_id: 'c5', call_number: 'PR9550.9.J6', copies: 2, available: 2, year: 1961, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 'b5', title: 'Clean Architecture', isbn: '978-0-13-449416-6', author_id: 'a3', publisher_id: 'pub3', category_id: 'c4', call_number: 'QA76.754', copies: 4, available: 3, year: 2017, status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('books', books);

        var transactions = [
            { id: 't1', student_id: 's1', book_id: 'b1', type: 'borrow', date_issued: '2026-02-20', date_due: '2026-03-06', date_returned: null, status: 'borrowed', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 't2', student_id: 's2', book_id: 'b3', type: 'borrow', date_issued: '2026-02-15', date_due: '2026-03-01', date_returned: '2026-02-25', status: 'returned', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('transactions', transactions);

        var fines = [
            { id: 'f1', student_id: 's1', transaction_id: 't1', amount: 50, reason: 'Overdue return', status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        setAll('fines', fines);

        var settings = [
            { id: 'set1', key: 'library_name', value: 'FEATI University Library', label: 'Library Name' },
            { id: 'set2', key: 'max_borrow_days', value: '14', label: 'Max Borrow Days' },
            { id: 'set3', key: 'fine_per_day', value: '5', label: 'Fine Per Day (₱)' },
            { id: 'set4', key: 'max_books_per_student', value: '3', label: 'Max Books Per Student' }
        ];
        setAll('settings', settings);

        setAll('audit_logs', [
            { id: 'log1', user: 'System', action: 'SEED', entity: 'system', details: 'Initial data seeded', created_at: new Date().toISOString() }
        ]);

        var lccClasses = [
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
        setAll('lcc_classes', lccClasses);

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
        logActivity: logActivity
    };
})();

Store.seed();
