// Working Scholar dashboard: real metrics, pending-requests table and overdue alerts
// from backend/api/dashboard.php. Loaded after working_scholar_all_in_one.js.
(function () {
    var API = '../../../../backend/api/dashboard.php';

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function setMetric(label, value) {
        document.querySelectorAll('.metric-card').forEach(function (card) {
            var l = card.querySelector('.metric-label');
            if (l && l.textContent.trim().toUpperCase() === label) card.querySelector('.metric-value').textContent = value;
        });
    }

    function render(d) {
        var s = d.summary || {};
        setMetric('PENDING REQUESTS', s.pending_requests);
        setMetric('BORROWED ITEMS', s.borrowed_items);
        setMetric('OVERDUE', s.overdue);
        setMetric('AVAILABLE ITEMS', s.available_items);

        var banner = document.querySelector('.welcome-banner');
        if (banner && d.user) {
            var h = banner.querySelector('h2'), p = banner.querySelector('p');
            if (h) h.textContent = 'Welcome, ' + String(d.user.full_name).split(' ')[0] + '!';
            if (p) p.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        }

        var tbody = document.getElementById('pending-requests');
        if (tbody) {
            var list = d.pending || [];
            tbody.innerHTML = list.length ? list.map(function (r) {
                return '<tr><td>' + esc(r.student) + '<br><small>' + esc(r.id_number) + '</small></td>' +
                       '<td>' + esc(r.item) + '</td><td>Pending</td>' +
                       '<td><a class="btn-primary" style="text-decoration:none" href="working_scholar_pending_requests.html">Process</a></td></tr>';
            }).join('') : '<tr><td colspan="4" style="text-align:center;color:#777;">No pending requests found.</td></tr>';
        }

        var alerts = document.querySelector('.alerts-list');
        if (alerts) {
            var over = d.overdue_alerts || [];
            alerts.innerHTML = over.length ? over.map(function (r) {
                return '<div class="alert-item"><div><strong>' + esc(r.item) + ' - ' + esc(r.student) + '</strong>' +
                       '<p class="alert-sub">' + esc(r.days_overdue) + ' day(s) overdue. Due ' + esc(String(r.expected_return_date).slice(0, 16)) + '</p></div></div>';
            }).join('') : '<div class="alert-item"><div><strong>-</strong><p class="alert-sub">No active overdue alerts</p></div></div>';
        }
    }

    async function load() {
        try {
            var res = await fetch(API, { credentials: 'same-origin' });
            if (!res.ok) return;
            render(await res.json());
        } catch (err) { /* server unreachable */ }
    }
    load();
    setInterval(load, 15000);   // near real-time without a page refresh
})();
