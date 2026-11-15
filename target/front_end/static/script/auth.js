// Shared by every portal page (admin / working scholar / student).
// Pages live in  target/front_end/templates/<role>/  so these paths are relative to that folder.
(function () {
    var API_BASE   = '../../../../backend/api';
    var LOGIN_PAGE = '../../login_page/index.html';

    // ---------------------------------------------------------------- page guard
    // Only runs on portal pages (templates/<role>/...). Asks the server who is logged in:
    //   not logged in -> login page,  wrong role -> that role's own dashboard.
    // The page stays hidden until the server answers, so nothing flashes on screen.
    var match = window.location.pathname.match(/\/templates\/([^\/]+)\//);
    var pageRole = match ? match[1] : null;

    function reveal() { document.documentElement.style.visibility = ''; }

    async function guardPage() {
        if (!pageRole) return;
        document.documentElement.style.visibility = 'hidden';
        try {
            var res = await fetch(API_BASE + '/profile.php', { credentials: 'same-origin' });
            if (res.status === 401) {
                window.location.replace(LOGIN_PAGE);
                return;
            }
            if (res.ok) {
                var me = await res.json();
                if (me.role && me.role !== pageRole) {
                    window.location.replace('../' + me.role + '/' + me.role + '_dashboard.html');
                    return;
                }
            }
        } catch (err) {
            // Server unreachable: show the page, its own scripts will report the problem.
        }
        reveal();
    }

    guardPage();
    // Back/forward cache: re-check when a page is restored (e.g. Back after logout).
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) guardPage();
    });

    // ---------------------------------------------------------------- logout
    // Does this element look like a logout button or link?
    function isLogout(el) {
        var label = (el.textContent || '').trim();
        return /logout/i.test(el.className || '') ||
               /logout/i.test(el.id || '') ||
               (label.length < 25 && /logout$/i.test(label));
    }

    async function doLogout() {
        try {
            await fetch(API_BASE + '/logout.php', {
                method: 'POST',
                credentials: 'same-origin'
            });
        } catch (err) {
            // even if the server can't be reached, still leave the page
        }
        window.location.replace(LOGIN_PAGE);
    }

    // Capture phase, so this runs before any href="#" or old link on the element.
    document.addEventListener('click', function (e) {
        var el = e.target.closest('a, button');
        if (el && isLogout(el)) {
            e.preventDefault();
            e.stopPropagation();
            doLogout();
        }
    }, true);
})();
