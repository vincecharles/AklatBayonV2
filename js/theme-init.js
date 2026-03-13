// Runs synchronously in <head> to prevent flash of wrong theme
(function() {
    var stored = localStorage.getItem('aklatbayon_theme');
    if (!stored) {
        // Migrate from old dark-mode boolean key
        var oldPref = localStorage.getItem('aklatbayon_dark_mode');
        if (oldPref === 'true') {
            stored = 'dark';
        } else {
            stored = 'light';
        }
        localStorage.setItem('aklatbayon_theme', stored);
    }
    if (stored === 'dark') {
        document.documentElement.classList.add('dark');
    }
})();
