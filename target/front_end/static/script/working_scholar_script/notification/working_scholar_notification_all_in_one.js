// Working Scholar Notifications: live data from backend/api/notifications.php.
// Requires ../../api.js (Webventory.api / Webventory.esc) to be loaded first.
let notificationsData = [];
let currentFilter = 'all';     // main list tabs
let headerFilter = 'all';      // header bell dropdown tabs
let headerData = [];

const esc = (v) => Webventory.esc(v);

// ------------------------------------------------------------ layout toggles
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show');
    if (overlay) overlay.classList.toggle('show');
}

function toggleProfileDropdown() {
    const n = document.getElementById('notification-dropdown');
    if (n) n.style.display = 'none';
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.classList.remove('show');
    if (!dropdown) return;
    const open = dropdown.style.display === 'block';
    dropdown.style.display = open ? 'none' : 'block';
    if (!open) loadHeader();
}

// ------------------------------------------------------------ helpers
function fmtTime(ts) {
    if (!ts) return '—';
    const d = new Date(String(ts).replace(' ', 'T'));
    return isNaN(d) ? ts : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function titleFor(n) {
    if (n.type === 'alert') return 'Alert';
    if (n.type === 'reminder') return 'Reminder';
    return 'Notification';
}

// ------------------------------------------------------------ main list
async function loadNotifications() {
    try {
        // Fetch everything once and filter client-side so tab switches are instant.
        const data = await Webventory.api('api/notifications.php?filter=all&limit=100');
        notificationsData = data.notifications || [];
        const unreadDot = document.getElementById('notif-dot');
        if (unreadDot) unreadDot.style.display = (data.unread_count || 0) > 0 ? 'block' : 'none';
    } catch (err) {
        if (err.message === 'auth') return;
        notificationsData = [];
    }
    renderNotifications(notificationsData);
}

function switchFilter(filterName, evt) {
    currentFilter = filterName;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    renderNotifications(notificationsData);
}

function renderNotifications(data) {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    let filtered = data;
    if (currentFilter === 'unread') filtered = data.filter(n => !n.is_read);
    else if (currentFilter === 'alerts') filtered = data.filter(n => n.alert);

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 48px; font-size: 13px;">NONE</div>';
        return;
    }

    container.innerHTML = filtered.map(n => `
        <div class="notif-item-card ${n.alert ? 'alert-item' : ''}">
            <div class="notif-content">
                <strong>${esc(titleFor(n))}</strong>
                <span>${esc(n.message)}</span>
                <span class="notif-timestamp">${esc(fmtTime(n.created_at))}</span>
            </div>
            ${n.is_read
                ? '<span style="font-size:11px; color:#64748b;">Read</span>'
                : `<button class="btn-sm-action" onclick="markAsRead(${n.id})">Mark as read</button>`}
        </div>`).join('');
}

async function markAsRead(id) {
    try {
        await Webventory.api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } });
    } catch (err) { /* reload below shows the real state */ }
    loadNotifications();
    loadHeader();
}

async function markAllAsRead() {
    try {
        await Webventory.api('api/notifications.php', { method: 'POST', body: { action: 'read_all' } });
    } catch (err) { /* reload below shows the real state */ }
    loadNotifications();
    loadHeader();
}

// ------------------------------------------------------------ header bell dropdown
async function loadHeader() {
    try {
        const data = await Webventory.api('api/notifications.php?filter=' + encodeURIComponent(headerFilter) + '&limit=15');
        headerData = data.notifications || [];
    } catch (err) {
        headerData = [];
    }
    renderHeader();
}

function switchNotifTab(tabName, evt) {
    headerFilter = tabName;
    document.querySelectorAll('#notification-dropdown .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = '#64748b';
    });
    if (evt && evt.target) { evt.target.classList.add('active'); evt.target.style.color = '#1e293b'; }
    loadHeader();
}

function renderHeader() {
    const c = document.getElementById('header-notif-list-container');
    if (!c) return;
    if (headerData.length === 0) {
        c.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">NONE</div>';
        return;
    }
    c.innerHTML = headerData.map(n => `
        <div class="notif-item-card ${n.alert ? 'alert-item' : ''}" style="padding:10px 12px; font-size:12px; ${n.is_read ? 'opacity:.6;' : ''}">
            <div class="notif-content"><span>${esc(n.message)}</span></div>
        </div>`).join('');
}

// ------------------------------------------------------------ profile
async function loadProfile() {
    try {
        const me = await Webventory.api('api/profile.php');
        const name = String(me.full_name || '').trim();
        const label = document.getElementById('profile-name-label');
        const avatar = document.getElementById('profile-avatar-initials');
        if (label) label.textContent = name || 'NONE';
        if (avatar) avatar.textContent = name ? name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '—';
    } catch (err) { /* cosmetic only */ }
}

window.onclick = function (event) {
    if (!event.target.closest('.dropdown-container')) {
        const p = document.getElementById('profile-dropdown');
        if (p) p.classList.remove('show');
        const n = document.getElementById('notification-dropdown');
        if (n) n.style.display = 'none';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadNotifications();
    setInterval(loadNotifications, 30000);
});
