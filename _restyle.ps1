# Bulk Astral Theme Restyler
# Applies dark Astral theme classes to all remaining HTML pages

$pages = @(
    "pages\operations\circulation.html",
    "pages\management\users\users.html",
    "pages\management\users\students.html",
    "pages\management\users\roles.html",
    "pages\management\catalog\authors.html",
    "pages\management\catalog\publishers.html",
    "pages\management\catalog\categories.html",
    "pages\management\catalog\loc-search.html",
    "pages\management\catalog\lcc-browser.html",
    "pages\operations\reservations.html",
    "pages\operations\borrower-profile.html",
    "pages\operations\fines.html",
    "pages\operations\my-fines.html",
    "pages\admin\reports.html",
    "pages\admin\settings.html",
    "pages\admin\attendance.html",
    "pages\admin\audit-logs.html",
    "pages\admin\inventory.html",
    "pages\auth\welcome.html"
)

foreach ($page in $pages) {
    $path = Join-Path $PSScriptRoot $page
    if (-not (Test-Path $path)) { Write-Host "SKIP: $page not found"; continue }
    
    $content = Get-Content $path -Raw -Encoding UTF8
    $original = $content

    # 1. Add dark class to html tag
    $content = $content -replace '<html lang="en">', '<html lang="en" class="dark">'
    $content = $content -replace '<html lang=.en.>\s*\r?\n', "<html lang=`"en`" class=`"dark`">`n"

    # 2. Remove theme-init.js
    $content = $content -replace '<script src="/js/theme-init.js"></script>\s*\r?\n?', ''
    $content = $content -replace '<script src=.*/js/theme-init.js.></script>\s*\r?\n?', ''

    # 3. Replace body class
    $content = $content -replace 'class="bg-bg-light dark:bg-bg-dark font-sans text-slate-900 dark:text-slate-100 min-h-screen antialiased"', 'class="font-sans min-h-screen antialiased" style="background:#111125;color:#e2e0fc"'
    $content = $content -replace 'class="bg-bg-light dark:bg-bg-dark font-sans min-h-screen antialiased"', 'class="font-sans min-h-screen antialiased" style="background:#111125;color:#e2e0fc"'

    # 4. Replace layout div
    $content = $content -replace '<div class="flex min-h-screen">', '<div class="astral-layout">'

    # 5. Replace main class
    $content = $content -replace '<main class="lg:ml-72 mt-16 flex-1 p-6 md:p-8">', '<main class="astral-main pb-12">'

    # 6. Replace card classes (bg-white dark:bg-slate-900 pattern)
    $content = $content -replace 'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm', 'astral-card'
    $content = $content -replace 'bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800', 'astral-card'
    $content = $content -replace 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm', 'astral-card'
    $content = $content -replace 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700', 'astral-card'

    # 7. Replace table header bg
    $content = $content -replace 'bg-slate-50 dark:bg-slate-800/50', 'bg-[#1a1a2e]'
    $content = $content -replace 'bg-slate-50 dark:bg-slate-800/60', 'bg-[#1a1a2e]'

    # 8. Replace border colors
    $content = $content -replace 'border-slate-200 dark:border-slate-800', 'border-[#3a3a52]'
    $content = $content -replace 'border-slate-200 dark:border-slate-700', 'border-[#3a3a52]'
    $content = $content -replace 'border-slate-100 dark:border-slate-800', 'border-[#3a3a52]/50'
    $content = $content -replace 'border-slate-300 dark:border-slate-600', 'border-[#3a3a52]'
    $content = $content -replace 'divide-slate-200 dark:divide-slate-800', 'divide-[#3a3a52]/50'
    $content = $content -replace 'divide-slate-200 dark:divide-slate-700', 'divide-[#3a3a52]/50'
    $content = $content -replace 'divide-slate-100 dark:divide-slate-800', 'divide-[#3a3a52]/50'

    # 9. Replace text colors
    $content = $content -replace 'text-slate-600 dark:text-slate-300', 'text-[#9b99b8]'
    $content = $content -replace 'text-slate-600 dark:text-slate-400', 'text-[#9b99b8]'
    $content = $content -replace 'text-slate-500 dark:text-slate-400', 'text-[#9b99b8]'
    $content = $content -replace 'text-slate-500 dark:text-slate-300', 'text-[#9b99b8]'
    $content = $content -replace 'text-slate-700 dark:text-slate-300', 'text-[#e2e0fc]'
    $content = $content -replace 'text-slate-700 dark:text-slate-200', 'text-[#e2e0fc]'
    $content = $content -replace 'text-slate-900 dark:text-slate-100', 'text-[#e2e0fc]'
    $content = $content -replace 'text-slate-800 dark:text-slate-200', 'text-[#e2e0fc]'
    $content = $content -replace 'text-slate-400 dark:text-slate-500', 'text-[#9b99b8]'

    # 10. Replace input classes
    $content = $content -replace 'bg-white dark:bg-slate-800', 'bg-[#1e1e32]'
    $content = $content -replace 'bg-white dark:bg-slate-700', 'bg-[#1e1e32]'
    $content = $content -replace 'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary', 'focus:outline-none focus:border-[#ffb599] focus:ring-1 focus:ring-[#ffb599]/30'
    $content = $content -replace 'focus:outline-none focus:border-primary focus:ring-\[3px\] focus:ring-primary/\[0\.12\]', 'focus:outline-none focus:border-[#ffb599] focus:ring-1 focus:ring-[#ffb599]/30'

    # 11. Replace primary color references  
    $content = $content -replace 'text-primary(?![-/])', 'text-[#ffb599]'
    $content = $content -replace 'bg-primary(?![-/])', 'bg-[#ffb599]'
    $content = $content -replace 'border-primary(?![-/])', 'border-[#ffb599]'

    # 12. Replace hover backgrounds
    $content = $content -replace 'hover:bg-slate-100 dark:hover:bg-slate-800', 'hover:bg-[#ffb599]/5'
    $content = $content -replace 'hover:bg-slate-50 dark:hover:bg-slate-800/50', 'hover:bg-[#ffb599]/5'
    $content = $content -replace 'hover:bg-slate-50 dark:hover:bg-slate-800/40', 'hover:bg-[#ffb599]/5'
    $content = $content -replace 'hover:bg-slate-200 dark:hover:bg-slate-700', 'hover:bg-[#3a3a52]'

    # 13. Replace modal classes
    $content = $content -replace 'bg-white dark:bg-slate-900 rounded-2xl w-\[95%\] max-w-\[640px\] max-h-\[90vh\] overflow-y-auto shadow-2xl animate-modal-in', 'astral-modal" style="max-width:640px'
    $content = $content -replace 'bg-white dark:bg-slate-900 rounded-2xl shadow-2xl animate-modal-in w-full max-w-lg mx-4', 'astral-modal w-full max-w-lg mx-4'
    $content = $content -replace 'bg-white dark:bg-slate-900 rounded-2xl w-\[95%\] max-w-\[520px\] max-h-\[90vh\] overflow-y-auto shadow-2xl animate-modal-in', 'astral-modal" style="max-width:520px'
    $content = $content -replace 'bg-white dark:bg-slate-900 rounded-2xl w-\[95%\] max-w-\[420px\] shadow-2xl animate-modal-in', 'astral-modal" style="max-width:420px'

    # 14. Replace badge colors
    $content = $content -replace 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', 'astral-badge-active" style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.3)'
    $content = $content -replace 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', 'astral-badge-available" style="background:rgba(74,222,128,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.3)'
    $content = $content -replace 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', '" style="background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3)'
    $content = $content -replace 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', '" style="background:rgba(248,113,113,0.15);color:#f87171;border:1px solid rgba(248,113,113,0.3)'
    $content = $content -replace 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', '" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)'
    $content = $content -replace 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', '" style="background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3)'
    $content = $content -replace 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400', '" style="background:rgba(96,165,250,0.15);color:#60a5fa;border:1px solid rgba(96,165,250,0.3)'

    # 15. Replace primary button
    $content = $content -replace 'bg-\[#ffb599\] text-white hover:bg-primary-800', 'bg-[#ffb599] text-[#370e00] hover:shadow-[0_4px_20px_rgba(255,181,153,0.3)]'
    $content = $content -replace 'bg-\[#ffb599\] text-white hover:bg-primary-600', 'bg-[#ffb599] text-[#370e00] hover:shadow-[0_4px_20px_rgba(255,181,153,0.3)]'
    $content = $content -replace 'bg-\[#ffb599\] text-white hover:bg-\[#ffb599\]-800', 'bg-[#ffb599] text-[#370e00] hover:shadow-[0_4px_20px_rgba(255,181,153,0.3)]'

    # 16. Replace accent colors for buttons
    $content = $content -replace "confirmButtonColor: '#e94560'", "confirmButtonColor: '#e17141', background: '#1e1e32', color: '#e2e0fc'"
    $content = $content -replace "confirmButtonColor: '#3211d4'", "confirmButtonColor: '#e17141', background: '#1e1e32', color: '#e2e0fc'"

    # 17. Replace bg-primary/10
    $content = $content -replace 'bg-primary/10 text-\[#ffb599\]', 'bg-[#ffb599]/10 text-[#ffb599]'

    # 18. Replace code/mono backgrounds
    $content = $content -replace 'bg-slate-100 dark:bg-slate-800', 'bg-[#333348]'

    # 19. Replace font-semibold text-slate-500 (table headers left behind)
    $content = $content -replace 'font-semibold text-slate-500', 'font-semibold text-[#9b99b8]'
    $content = $content -replace 'font-bold uppercase tracking-wider text-slate-500', 'font-bold uppercase tracking-wider text-[#9b99b8]'

    # 20. Replace close button styling
    $content = $content -replace 'rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700', 'rounded-lg bg-[#333348] hover:bg-[#3a3a52]'

    # 21. Replace remaining hover patterns
    $content = $content -replace 'hover:bg-\[#ffb599\]/10', 'hover:bg-[#ffb599]/10'
    $content = $content -replace 'hover:bg-red-50 dark:hover:bg-red-900/20', 'hover:bg-[#f87171]/10'

    # 22. Replace remaining standalone colors
    $content = $content -replace 'text-slate-400(?![\s/])', 'text-[#9b99b8]'
    $content = $content -replace 'text-slate-500(?![\s/])', 'text-[#9b99b8]'

    # 23. Fix tab styling for circulation
    $content = $content -replace "const tabActiveClasses = 'border-primary text-primary'", "const tabActiveClasses = 'border-[#ffb599] text-[#ffb599]'"
    $content = $content -replace "const tabInactiveClasses = 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'", "const tabInactiveClasses = 'border-transparent text-[#9b99b8] hover:text-[#e2e0fc]'"

    # 24. Replace emerald button to primary gradient
    $content = $content -replace 'bg-emerald-600 hover:bg-emerald-700 text-white', "bg-gradient-to-r from-[#ffb599] to-[#e17141] text-[#370e00] hover:shadow-[0_4px_20px_rgba(255,181,153,0.3)]"
    $content = $content -replace 'bg-emerald-600 text-white hover:bg-emerald-700', "bg-gradient-to-r from-[#ffb599] to-[#e17141] text-[#370e00] hover:shadow-[0_4px_20px_rgba(255,181,153,0.3)]"

    # 25. Fix tailwind config to remove old colors
    $content = $content -replace "colors:\s*\{[^}]*primary[^}]*\}", "/* colors removed - using astral CSS */"

    if ($content -ne $original) {
        # Ensure UTF8 without BOM
        [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
        Write-Host "DONE: $page"
    } else {
        Write-Host "UNCHANGED: $page"
    }
}

Write-Host "`nAll pages restyled!"
