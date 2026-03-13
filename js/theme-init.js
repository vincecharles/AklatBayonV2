// Runs synchronously in <head> to prevent flash of wrong theme
(() => {
    let stored = localStorage.getItem('aklatbayon_theme');
    if (!stored) {
        const oldPref = localStorage.getItem('aklatbayon_dark_mode');
        stored = oldPref === 'true' ? 'dark' : 'light';
        localStorage.setItem('aklatbayon_theme', stored);
    }
    if (stored === 'dark') document.documentElement.classList.add('dark');
})();
