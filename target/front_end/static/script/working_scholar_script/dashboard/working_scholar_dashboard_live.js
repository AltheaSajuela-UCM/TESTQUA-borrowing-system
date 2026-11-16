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
            if (l && l.textContent.trim().toUpperCase() === label) {
                card.querySelector('.metric-value').textContent = value != null ? value : '0';
            }
        });
    }

    function render(d) {
        var s = d.summary || {};
        setMetric('PENDING REQUESTS', s.pending_requests || 0);
        setMetric('BORROWED ITEMS', s.borrowed_items || 0);
        setMetric('OVERDUE', s.overdue || 0);
        setMetric('AVAILABLE ITEMS', s.available_items || 0);

        // User Profile & Welcome Banner Binding
        var bannerHeading = document.getElementById('welcome-user-heading');
        var bannerDate = document.getElementById('welcome-date-p');
        var profileNameLabel = document.getElementById('profile-name-label');
        var profileAvatar = document.getElementById('profile-avatar-initials');

        if (d.user && d.user.full_name) {
            var fullName = String(d.user.full_name).trim();
            var firstName = fullName.split(' ')[0];
            
            if (bannerHeading) bannerHeading.textContent = 'Welcome, ' + firstName + '!';
            if (bannerDate) bannerDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            if (profileNameLabel) profileNameLabel.textContent = fullName;
            if (profileAvatar) profileAvatar.textContent = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        } else {
            if (bannerHeading) bannerHeading.textContent = 'Welcome, NONE!';
            if (bannerDate) bannerDate.textContent = 'NONE';
            if (profileNameLabel) profileNameLabel.textContent = 'NONE';
            if (profileAvatar) profileAvatar.textContent = '—';
        }

        // Pending Requests Table
        var tbody = document.getElementById('pending-requests');
        if (tbody) {
            var list = d.pending || [];
            tbody.innerHTML = list.length ? list.map(function (r) {
                return '<tr><td>' + esc(r.student) + '<br><small>' + esc(r.id_number) + '</small></td>' +
                       '<td>' + esc(r.item) + '</td><td>Pending</td>' +
                       '<td><a class="btn-primary" style="text-decoration:none" href="working_scholar_pending_requests.html">Process</a></td></tr>';
            }).join('') : '<tr><td colspan="4" style="text-align:center;color:#777;">NONE</td></tr>';
        }

        // Notifications List Container
        var notifContainer = document.getElementById('notif-list-container');
        if (notifContainer) {
            var notifs = d.notifications || [];
            notifContainer.innerHTML = notifs.length ? notifs.map(function (n) {
                return '<div class="notif-card ' + (n.is_unread ? 'is-unread' : '') + '"><div>' + esc(n.text) + '</div></div>';
            }).join('') : '<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">NONE</div>';
        }

        // Overdue Alerts
        var alerts = document.querySelector('.alerts-list');
        if (alerts) {
            var over = d.overdue_alerts || [];
            alerts.innerHTML = over.length ? over.map(function (r) {
                return '<div class="alert-item"><div><strong>' + esc(r.item) + ' - ' + esc(r.student) + '</strong>' +
                       '<p class="alert-sub">' + esc(r.days_overdue) + ' day(s) overdue. Due ' + esc(String(r.expected_return_date).slice(0, 16)) + '</p></div></div>';
            }).join('') : '<div class="alert-item"><div><strong>NONE</strong><p class="alert-sub">No active overdue alerts</p></div></div>';
        }
    }

    async function load() {
        try {
            var res = await fetch(API, { credentials: 'same-origin' });
            if (!res.ok) return;
            render(await res.json());
        } catch (err) { 
            // Fallback state on fetch failure or empty database session
            render({ summary: { pending_requests: 0, borrowed_items: 0, overdue: 0, available_items: 0 }, user: null, pending: [], overdue_alerts: [], notifications: [] });
        }
    }
    load();
    setInterval(load, 15000);   // near real-time without a page refresh
})();