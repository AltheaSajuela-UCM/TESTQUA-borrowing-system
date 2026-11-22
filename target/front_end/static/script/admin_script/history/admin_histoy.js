// Admin > History: wired to backend/1_admin/history.php (business events: requests, cancellations, returns,
// item / user / category changes, cases) and backend/api/notifications.php (bell). Page markup is unchanged.
// Put this file at: target/front_end/static/script/admin_script/history/admin_histoy.js
const BASE = '../../../../backend/';
const SIDEBAR_STORAGE_KEY = 'webventory_sidebar_open';

async function api(path, opts) {
    opts = opts || {};
    const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
    if (opts.body !== undefined) {
        init.headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(BASE + path, init);
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
}

function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Event types the backend records (Login / logout live in the Audit Trail, not here)
const HISTORY_TYPES = ['Borrow Request', 'Cancellation Request', 'Item Update', 'Return', 'User', 'Category', 'Accountability'];

let historyData = [];
let notifications = [];
let currentNotifTab = 'all';
let filterTimer = null;

// ---------------------------------------------------------------- sidebar + dropdowns
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

function toggleProfileDropdown() {
    closeAllDropdowns();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

function toggleNotificationDropdown() {
    closeAllDropdowns();
    document.getElementById('notification-dropdown').classList.toggle('show');
    loadNotifications();
}

function closeAllDropdowns() {
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('notification-dropdown').classList.remove('show');
}

window.onclick = function (event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// ---------------------------------------------------------------- notifications
async function loadNotifications() {
    try {
        const data = await api('api/notifications.php?filter=' + currentNotifTab);
        notifications = data.notifications || [];
        renderNotifications(data.unread_count);
    } catch (err) {
        notifications = [];
        renderNotifications(0);
    }
}

function renderNotifications(unreadCount) {
    const container = document.getElementById('notif-list-container');
    container.innerHTML = '';

    const dot = document.getElementById('notif-dot');
    if (dot && unreadCount !== undefined) dot.style.display = unreadCount > 0 ? '' : 'none';

    if (notifications.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">No notifications</div>`;
        return;
    }

    notifications.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-card ${notif.alert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div>${esc(notif.message)}</div>
            ${notif.is_read
                ? '<span style="font-size: 10px; color: #94a3b8;">Read</span>'
                : `<button class="mark-read-btn" onclick="markAsRead(${Number(notif.id)})">Mark as read</button>`}
        `;
        container.appendChild(card);
    });
}

function switchNotifTab(tabName) {
    const order = ['all', 'unread', 'alerts'];
    const buttons = document.querySelectorAll('.notif-tabs .tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (buttons[order.indexOf(tabName)]) buttons[order.indexOf(tabName)].classList.add('active');
    currentNotifTab = tabName;
    loadNotifications();
}

async function markAsRead(id) {
    try {
        await api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } });
    } catch (err) { /* ignore */ }
    loadNotifications();
}

// ---------------------------------------------------------------- history table
// The date box takes dd/mm/yyyy (or yyyy-mm-dd). Anything else is ignored until it is a full date.
function parseDate(txt) {
    txt = (txt || '').trim();
    const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt;
    return '';
}

async function loadHistory() {
    const p = new URLSearchParams();
    const type = document.getElementById('type-filter').value;
    const date = parseDate(document.getElementById('date-filter').value);
    const q = document.getElementById('search-filter').value.trim();
    if (type && type !== 'All') p.set('type', type);
    if (date) p.set('date', date);
    if (q) p.set('q', q);

    try {
        const data = await api('1_admin/history.php?' + p.toString());
        historyData = data.history || [];
    } catch (err) {
        historyData = [];
        document.getElementById('table-body').innerHTML =
            `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">${esc(err.message)}</td></tr>`;
        return;
    }
    renderTable(historyData);
}

function actionClassFor(action) {
    const a = (action || '').toLowerCase();
    if (/overdue|reject|declin|delet|missing|damaged/.test(a)) return 'action-overdue';
    if (/accept|releas|return|resolv|creat|add|activat/.test(a)) return 'action-accepted';
    return 'action-submitted';
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No records found</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        if (row.details) tr.title = row.details;          // hover for the full detail line
        tr.innerHTML = `
            <td>${esc(row.date_time) || '—'}</td>
            <td><span class="badge borrow-request">${esc(row.type) || '—'}</span></td>
            <td>${esc(row.student) || '—'}</td>
            <td>${esc(row.item) || '—'}</td>
            <td><span class="${actionClassFor(row.action)}">${esc(row.action) || '—'}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Called by the filter boxes (oninput / onchange). Waits for a pause in typing before asking the server.
function applyFilters() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(loadHistory, 300);
}

// ---------------------------------------------------------------- initial load
window.onload = () => {
    // The type dropdown listed a stray "Date & Time" entry and missed most real types; the date box
    // shipped with a made-up date that hid every row.
    const typeSelect = document.getElementById('type-filter');
    typeSelect.innerHTML = '<option value="All">All</option>' +
        HISTORY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');

    const dateBox = document.getElementById('date-filter');
    dateBox.value = '';
    dateBox.placeholder = 'dd/mm/yyyy';

    loadHistory();
    loadNotifications();
};