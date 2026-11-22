// Admin > Audit Trail: wired to backend/1_admin/audit_trail.php (list + search / date / action filters,
// CSV export done by the server) and backend/api/notifications.php (bell). Page markup is unchanged.
// Put this file at: target/front_end/static/script/admin_script/audit_trail/admin_audit_trail_all_in_one.js
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

let auditData = [];
let notifications = [];
let currentNotifTab = 'all';
let actionOptionsBuilt = false;
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

// ---------------------------------------------------------------- audit table
// The date box takes dd/mm/yyyy (or yyyy-mm-dd). Anything else is ignored until it is a full date.
function parseDate(txt) {
    txt = (txt || '').trim();
    const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt;
    return '';
}

function filterParams() {
    const p = new URLSearchParams();
    const q = document.getElementById('search-filter').value.trim();
    const date = parseDate(document.getElementById('date-filter').value);
    const action = document.getElementById('action-filter').value;
    if (q) p.set('q', q);
    if (date) p.set('date', date);
    if (action && action !== 'All Actions') p.set('action', action);
    return p;
}

async function loadAudit() {
    try {
        const data = await api('1_admin/audit_trail.php?' + filterParams().toString());
        auditData = data.audit || [];
    } catch (err) {
        auditData = [];
        document.getElementById('table-body').innerHTML =
            `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">${esc(err.message)}</td></tr>`;
        return;
    }
    if (!actionOptionsBuilt) buildActionOptions();
    renderTable(auditData);
}

// The dropdown used to list three made-up actions; build it from what the log really contains.
function buildActionOptions() {
    const select = document.getElementById('action-filter');
    const actions = [...new Set(auditData.map(r => r.action).filter(Boolean))].sort();
    select.innerHTML = '<option value="All Actions">All Actions</option>' +
        actions.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
    actionOptionsBuilt = true;
}

function roleBadge(role) {
    const r = (role || '').toLowerCase();
    if (r === 'admin') return '<span class="badge admin">Admin</span>';
    if (r === 'working_scholar') return '<span class="badge ws">WS</span>';
    if (r === 'student') return '<span class="badge student">Student</span>';
    return '<span class="badge student">System</span>';
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No records found</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${esc(row.date_time) || '—'}</td>
            <td><strong>${esc(row.user) || '—'}</strong></td>
            <td>${roleBadge(row.role)}</td>
            <td>${esc(row.action) || '—'}</td>
            <td>${esc(row.entity) || '—'}</td>
            <td>${esc(row.reference) || '—'}</td>
            <td>${esc(row.details) || '—'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Called by the filter boxes (oninput / onchange). Waits for a pause in typing before asking the server.
function applyFilters() {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(loadAudit, 300);
}

// The server builds the CSV from the same filters, so the file matches what you filtered.
function exportTableToCSV() {
    const p = filterParams();
    p.set('format', 'csv');
    p.set('limit', '2000');
    window.location.href = BASE + '1_admin/audit_trail.php?' + p.toString();
}

// ---------------------------------------------------------------- initial load
window.onload = () => {
    const dateBox = document.getElementById('date-filter');
    dateBox.value = '';                         // the page shipped with a made-up date that hid every row
    dateBox.placeholder = 'dd/mm/yyyy';
    loadAudit();
    loadNotifications();
};