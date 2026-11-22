// ==========================================
// Backend helpers (student portal)
// ==========================================
const STUDENT_API = '../../../../backend/3_student/';
const LOGIN_PAGE = '../../login_page/index.html';
const SIDEBAR_STORAGE_KEY = 'webventory_sidebar_open';

function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
function txCode(id) { return 'TXN-' + String(id).padStart(5, '0'); }
function dateOnly(s) { return s ? String(s).slice(0, 10) : ''; }
function prettyTime(s) {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? String(s) : d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
}

// Calls a backend/3_student endpoint. Sends the user to login if the session is gone.
async function studentApi(file, options) {
    const res = await fetch(STUDENT_API + file, Object.assign({ credentials: 'same-origin' }, options || {}));
    if (res.status === 401 || res.status === 403) {
        window.location.replace(LOGIN_PAGE);
        throw new Error('auth');
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON response */ }
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
}

// Notifications are built from transactions, so "read" is remembered in this browser.
function loadReadIds(owner) {
    try { return JSON.parse(localStorage.getItem('webventory_read_notifs_' + owner) || '[]'); }
    catch (e) { return []; }
}
function saveReadId(owner, id) {
    try {
        const ids = loadReadIds(owner);
        if (!ids.includes(id)) { ids.push(id); localStorage.setItem('webventory_read_notifs_' + owner, JSON.stringify(ids)); }
    } catch (e) { /* storage unavailable */ }
}

let notifications = [];
let notifOwner = '';
let currentFilter = 'all';

// Toggle Sidebar Navigation Drawer
function setSidebarOpen(isOpen) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show', isOpen);
    if (overlay) overlay.classList.toggle('show', isOpen);
    try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'true' : 'false');
    } catch (e) { /* storage unavailable */ }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const willOpen = sidebar ? !sidebar.classList.contains('show') : true;
    setSidebarOpen(willOpen);
}

// Keep sidebar open across page navigation when user clicks a sidebar link
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
                } catch (err) { /* storage unavailable */ }
            });
        });
    }

    try {
        if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true') {
            setSidebarOpen(true);
        }
    } catch (err) { /* storage unavailable */ }
});

// Toggle Profile Dropdown
function toggleProfileDropdown() {
    closeAllDropdowns();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

// Toggle Notification Dropdown in Header
function toggleNotificationDropdown() {
    closeAllDropdowns();
    document.getElementById('notification-dropdown').classList.toggle('show');
    renderHeaderNotifications('all');
}

// Close All Dropdowns
function closeAllDropdowns() {
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('notification-dropdown').classList.remove('show');
}

// Render Header Dropdown Notifications
function renderHeaderNotifications(filter) {
    const container = document.getElementById('header-notif-list-container');
    container.innerHTML = '';

    let filtered = notifications;
    if (filter === 'unread') {
        filtered = notifications.filter(n => n.type === 'unread');
    } else if (filter === 'alerts') {
        filtered = notifications.filter(n => n.isAlert);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">No notifications</div>`;
        return;
    }

    filtered.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-card-dropdown ${notif.isAlert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div>${notif.message}</div>
            <button class="mark-read-btn" onclick="markAsRead(${notif.id})">Mark as read</button>
        `;
        container.appendChild(card);
    });
}

// Switch Header Notification Tab
function switchHeaderNotifTab(tabName) {
    event.target.parentElement.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderHeaderNotifications(tabName);
}

// Switch Page Body Notification Tab
function switchPageTab(tabName, evt) {
    currentFilter = tabName;
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    evt.target.classList.add('active');
    renderPageNotifications();
}

// Render Main Page Notifications Body
function renderPageNotifications() {
    const container = document.getElementById('notifications-container');
    container.innerHTML = '';

    let filtered = notifications;
    if (currentFilter === 'unread') {
        filtered = notifications.filter(n => n.type === 'unread');
    } else if (currentFilter === 'alerts') {
        filtered = notifications.filter(n => n.isAlert);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 48px; font-size: 13px;">No notifications found</div>`;
        return;
    }

    filtered.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-card-body ${notif.isAlert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div class="notif-content-left">
                <span class="notif-icon">${notif.icon || '🔔'}</span>
                <div class="notif-text-group">
                    <div class="notif-message">${notif.message}</div>
                    <div class="notif-time">${notif.time}</div>
                </div>
            </div>
            <button class="btn-mark-read" onclick="markAsRead(${notif.id})">Mark read</button>
        `;
        container.appendChild(card);
    });
}

// Mark notification as read
function markAsRead(id) {
    saveReadId(notifOwner, id);
    notifications = notifications.filter(n => n.id !== id);
    if (notifications.length === 0) {
        document.getElementById('notif-dot').style.display = 'none';
    }
    renderHeaderNotifications('all');
    renderPageNotifications();
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Load real notifications on page load
async function loadNotifs() {
    try {
        const data = await studentApi('notifications.php');
        notifOwner = data.owner;
        const read = loadReadIds(notifOwner);
        notifications = (data.notifications || [])
            .filter(n => !read.includes(n.id))
            .map(n => ({
                id: n.id,
                message: esc(n.message),
                time: esc(prettyTime(n.time)),
                icon: esc(n.icon || '🔔'),
                type: 'unread',
                isAlert: !!n.alert
            }));
        document.getElementById('notif-dot').style.display = notifications.length ? '' : 'none';
    } catch (err) { /* keep the empty list */ }
}

window.onload = async () => {
    renderPageNotifications();
    await loadNotifs();
    renderPageNotifications();
};
