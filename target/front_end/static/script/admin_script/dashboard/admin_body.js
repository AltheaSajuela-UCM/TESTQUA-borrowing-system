// Admin dashboard: fills the stat cards, category distribution, top borrowed and trend from
// backend/api/dashboard.php (real numbers for the logged-in admin). The page markup is unchanged.
(function () {
    var API = '../../../../backend/api/dashboard.php';

    function setStat(label, value) {
        var cards = document.querySelectorAll('.stat-card');
        for (var i = 0; i < cards.length; i++) {
            var l = cards[i].querySelector('.stat-label');
            if (l && l.textContent.trim().toUpperCase() === label) {
                cards[i].querySelector('.stat-value').textContent = value;
                return;
            }
        }
    }

    // Welcome banner: today's date and the logged-in admin's first name (both were typed into the HTML)
    function setBanner(d) {
        var p = document.querySelector('.welcome-text p');
        if (p) {
            p.textContent = new Date().toLocaleDateString('en-US',
                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
        var name = d.user && d.user.full_name ? String(d.user.full_name).trim().split(/\s+/)[0] : '';
        var h = document.querySelector('.welcome-text h2');
        if (h && name) h.textContent = 'Welcome, ' + name + '!';
    }

    function render(d) {
        setBanner(d);
        var s = d.stats || {};
        setStat('TOTAL USERS', s.total_users);
        setStat('TOTAL ITEMS', s.total_items);
        setStat('ACTIVE TRANSACTIONS', s.active_transactions);
        setStat('OVERDUE', s.overdue);
        setStat('ACCOUNTABILITY CASES', s.accountability_cases);

        // Category distribution bars (matched by the category name in each header)
        (d.category_distribution || []).forEach(function (c) {
            document.querySelectorAll('.progress-group').forEach(function (g) {
                var spans = g.querySelectorAll('.progress-header span');
                if (spans.length > 1 && spans[0].textContent.trim() === c.name) {
                    spans[1].textContent = c.percent + '%';
                    var fill = g.querySelector('.progress-fill');
                    if (fill) fill.style.width = c.percent + '%';
                }
            });
        });

        // Top borrowed (top 3)
        var rows = document.querySelectorAll('.top-list li');
        (d.top_borrowed || []).forEach(function (t, i) {
            if (!rows[i]) return;
            var spans = rows[i].querySelectorAll('span');
            spans[0].textContent = t.name;
            spans[1].textContent = t.borrows;
        });

        // Borrowing trend: show the monthly count under each month label
        var months = document.querySelectorAll('.chart-months span');
        (d.trend || []).forEach(function (m, i) {
            if (!months[i]) return;
            months[i].textContent = '';
            months[i].appendChild(document.createTextNode(m.month));
            months[i].appendChild(document.createElement('br'));
            var b = document.createElement('strong');
            b.textContent = m.count;
            months[i].appendChild(b);
        });
    }

    async function load() {
        try {
            var res = await fetch(API, { credentials: 'same-origin' });
            if (!res.ok) return;                    // auth.js already redirects when the session is gone
            render(await res.json());
        } catch (err) { /* server unreachable: leave the zeros */ }
    }
    load();
    setInterval(load, 30000);                       // keep the numbers fresh

    // Hover-to-open for #menuBtn and #leftEdgeHover on #sideMenu
    document.addEventListener('DOMContentLoaded', function () {
        var menuBtn = document.getElementById('menuBtn');
        var leftEdgeHover = document.getElementById('leftEdgeHover');
        var sideMenu = document.getElementById('sideMenu');
        var menuOverlay = document.getElementById('menuOverlay');
        var closeTimer = null;

        if (!sideMenu) return;

        function openMenu() {
            clearTimeout(closeTimer);
            sideMenu.classList.add('active');
            if (menuOverlay) menuOverlay.classList.add('active');
        }

        function closeMenu() {
            sideMenu.classList.remove('active');
            if (menuOverlay) menuOverlay.classList.remove('active');
        }

        function scheduleClose() {
            clearTimeout(closeTimer);
            closeTimer = setTimeout(function () {
                var hoveringMenu = menuBtn && menuBtn.matches(':hover');
                var hoveringEdge = leftEdgeHover && leftEdgeHover.matches(':hover');
                var hoveringDrawer = sideMenu.matches(':hover');
                if (!hoveringMenu && !hoveringEdge && !hoveringDrawer) {
                    closeMenu();
                }
            }, 150);
        }

        if (menuBtn) {
            menuBtn.addEventListener('mouseenter', openMenu);
            menuBtn.addEventListener('mouseleave', scheduleClose);
        }

        if (leftEdgeHover) {
            leftEdgeHover.addEventListener('mouseenter', openMenu);
            leftEdgeHover.addEventListener('mouseleave', scheduleClose);
        }

        sideMenu.addEventListener('mouseenter', function () {
            clearTimeout(closeTimer);
        });
        sideMenu.addEventListener('mouseleave', scheduleClose);
    });
})();