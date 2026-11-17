// Shared by the wired Working Scholar pages (header, sidebar, notifications).
// Load order in the HTML:  api.js  ->  auth.js  ->  common.js  ->  the page's own script.

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show');
    if (overlay) overlay.classList.toggle('show');
}

function toggleProfileDropdown() {
    closeAllDropdowns();
    const d = document.getElementById('profile-dropdown');
    if (d) d.classList.toggle('show');
}

function toggleNotificationDropdown() {
    closeAllDropdowns();
    const d = document.getElementById('notification-dropdown');
    if (d) {
        d.classList.toggle('show');
        renderNotifications(currentNotifTab);
    }
}

function closeAllDropdowns() {
    const p = document.getElementById('profile-dropdown');
    const n = document.getElementById('notification-dropdown');
    if (p) p.classList.remove('show');
    if (n) n.classList.remove('show');
}

async function loadNotifications() {
    try {
        const d = await WS.api('api/notifications.php?filter=all');
        notifications = (d.notifications || []).map(n => ({
            id: n.id, text: n.message, isAlert: n.alert, isRead: n.is_read
        }));
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = d.unread_count > 0 ? 'block' : 'none';
        const menu = document.getElementById('notification-dropdown');
        if (menu && menu.classList.contains('show')) renderNotifications(currentNotifTab);
    } catch (err) { /* logged out or server unreachable */ }
}

function renderNotifications(filter) {
    currentNotifTab = filter;
    const container = document.getElementById('notif-list-container');
    if (!container) return;
    container.innerHTML = '';

    let list = notifications;
    if (filter === 'unread') list = notifications.filter(n => !n.isRead);
    else if (filter === 'alerts') list = notifications.filter(n => n.isAlert);

    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:12px;">No notifications</div>';
        return;
    }
    list.forEach(n => {
        const card = document.createElement('div');
        card.className = 'notif-card ' + (n.isAlert ? 'alert-card' : '');
        card.style.opacity = n.isRead ? '0.6' : '1';
        card.innerHTML = '<div>' + esc(n.text) + '</div>' +
            (n.isRead ? '' : '<button class="mark-read-btn" onclick="markAsRead(' + n.id + ')">Mark as read</button>');
        container.appendChild(card);
    });
}

function switchNotifTab(tabName, evt) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    const e = evt || window.event;   // the HTML buttons call switchNotifTab('all') without passing the event
    if (e && e.target) e.target.classList.add('active');
    renderNotifications(tabName);
}

async function markAsRead(id) {
    try { await WS.api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } }); }
    catch (err) { /* the reload below shows the real state */ }
    await loadNotifications();
    renderNotifications(currentNotifTab);
}

// 'YYYY-MM-DD HH:MM:SS' from the server -> 'YYYY-MM-DD HH:MM'
function fmtDate(v) { return v ? String(v).slice(0, 16) : '—'; }

window.onclick = function (event) {
    if (!event.target.closest('.dropdown-container')) closeAllDropdowns();
};

document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
    setInterval(loadNotifications, 30000);
});