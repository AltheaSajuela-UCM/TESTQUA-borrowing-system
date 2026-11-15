// Shared fetch helper for the Working Scholar and Admin pages that are still being wired.
// Include BEFORE the page script:   <script src="../../static/script/api.js"></script>
//   const data = await Webventory.api('2_working_scholar/borrowing.php?status=pending');
//   await Webventory.api('2_working_scholar/borrowing.php', { method: 'POST', body: { action: 'approve', transaction_id: 5, expected_return_date: '2026-11-20T10:00' } });
// Paths are relative to /backend/. Redirects to the login page when the session is gone.
(function () {
    var BASE = '../../../../backend/';
    var LOGIN = '../../login_page/index.html';

    async function api(path, opts) {
        opts = opts || {};
        var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
        if (opts.body !== undefined) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(opts.body);
        }
        var res = await fetch(BASE + path, init);
        if (res.status === 401) { window.location.replace(LOGIN); throw new Error('auth'); }
        var data = {};
        try { data = await res.json(); } catch (e) { /* export or non-JSON response */ }
        if (!res.ok) throw new Error(data.error || data.message || ('Request failed (' + res.status + ')'));
        return data;
    }

    // Opens a CSV/PDF export in the same tab (the browser downloads it)
    function download(path) { window.location.href = BASE + path; }

    window.Webventory = { api: api, download: download, esc: function (v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    } };
})();
