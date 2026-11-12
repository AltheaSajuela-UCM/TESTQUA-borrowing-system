// Shared by every portal page (admin / working scholar / student).
// Pages live in  target/front_end/templates/<role>/  so these paths are relative to that folder.
(function () {
    var API_BASE   = '../../../../backend/api';
    var LOGIN_PAGE = '../../login_page/index.html';

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