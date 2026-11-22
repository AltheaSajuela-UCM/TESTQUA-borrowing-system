// Admin > Accountability: wired to backend/1_admin/accountability.php (list, view, resolve, remind student)
// and backend/api/notifications.php (bell). Page markup is unchanged.
// Put this file at: target/front_end/static/script/admin_script/accountability/admin_accountabilty_all_in_one.js
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

let accountabilityCases = [];
let notifications = [];
let currentNotifTab = 'all';
let resolvingCaseId = null;

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

// ---------------------------------------------------------------- cases table
async function loadCases() {
    try {
        // status=all so resolved cases stay visible (the backend default is open cases only)
        const data = await api('1_admin/accountability.php?status=all');
        accountabilityCases = data.cases || [];
    } catch (err) {
        accountabilityCases = [];
        document.getElementById('table-body').innerHTML =
            `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">${esc(err.message)}</td></tr>`;
        return;
    }
    renderTable(accountabilityCases);
}

function typeBadge(type) {
    if (type === 'Lost') return '<span class="badge lost">Lost</span>';
    if (type === 'Damaged') return '<span class="badge" style="background:#ffedd5;color:#c2410c;">Damaged</span>';
    return `<span class="badge" style="background:#e0f2fe;color:#0369a1;">${esc(type)}</span>`;
}

function statusBadge(status) {
    if (status === 'Open') return '<span class="badge open">Open</span>';
    return `<span class="badge" style="background:#d1fae5;color:#047857;">${esc(status)}</span>`;
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No records found</td></tr>`;
        return;
    }

    data.forEach(row => {
        const id = Number(row.id);
        const isOpen = row.status === 'Open';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${esc(row.case_code) || '—'}</td>
            <td>${esc(row.student) || '—'}</td>
            <td>${esc(row.item) || '—'}</td>
            <td>${typeBadge(row.type)}</td>
            <td>${statusBadge(row.status)}</td>
            <td>${esc(row.created_at) || '—'}</td>
            <td style="text-align: right; padding-right: 24px;">
                <button class="btn-sm" onclick="openViewModal(${id})">View</button>
                ${isOpen ? `<button class="btn-sm" onclick="remindStudent(${id})" style="margin-left: 6px;">Remind</button>
                <button class="btn-primary-sm" onclick="openResolveModal(${id})" style="margin-left: 6px;">Resolve</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ---------------------------------------------------------------- modals
function findCase(id) {
    return accountabilityCases.find(c => Number(c.id) === Number(id));
}

function openViewModal(id) {
    const c = findCase(id);
    if (!c) return;

    document.getElementById('view-modal-title').innerText = `${c.case_code} Details`;
    document.getElementById('view-student').value = c.student + (c.student_id ? ` (${c.student_id})` : '');
    document.getElementById('view-item').value = c.item + (c.item_code ? ` (${c.item_code})` : '');
    document.getElementById('view-type').value = c.type;
    document.getElementById('view-status').value = c.status +
        (c.status !== 'Open' && c.resolved_at ? ` on ${c.resolved_at}` : '');

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('view-modal').classList.add('show');
}

function openResolveModal(id) {
    const c = findCase(id);
    if (!c) return;
    resolvingCaseId = Number(id);

    document.getElementById('resolve-modal-title').innerText = `Resolve Case ${c.case_code}`;
    document.getElementById('resolve-notes').value = '';
    document.getElementById('check-replacement').checked = false;

    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('resolve-modal').classList.add('show');
}

function closeModals() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('view-modal').classList.remove('show');
    document.getElementById('resolve-modal').classList.remove('show');
}

async function submitResolve() {
    if (resolvingCaseId === null) return;
    try {
        await api('1_admin/accountability.php', {
            method: 'POST',
            body: {
                action: 'resolve',
                case_id: resolvingCaseId,
                replacement_received: document.getElementById('check-replacement').checked,
                notes: document.getElementById('resolve-notes').value.trim()
            }
        });
        alert('Case resolved successfully!');
        closeModals();
        resolvingCaseId = null;
        await loadCases();
    } catch (err) {
        alert(err.message);
    }
}

async function remindStudent(id) {
    const c = findCase(id);
    if (!c || !confirm(`Send a reminder about ${c.case_code} to ${c.student}?`)) return;
    try {
        await api('1_admin/accountability.php', { method: 'POST', body: { action: 'remind', case_id: Number(id) } });
        alert('Reminder sent.');
    } catch (err) {
        alert(err.message);
    }
}

// ---------------------------------------------------------------- initial load
window.onload = () => {
    // "Clear student flag" has no switch of its own in the backend: the flag is lifted automatically once
    // the student has no open cases left. Show that instead of a checkbox that would do nothing.
    const flagBox = document.getElementById('check-clear-flag');
    if (flagBox && flagBox.parentElement) {
        flagBox.parentElement.style.display = 'none';
        const note = document.createElement('p');
        note.style.cssText = 'font-size:12px;color:#64748b;margin:6px 0 0;';
        note.textContent = "The student's flag is lifted automatically once their last open case is resolved.";
        flagBox.parentElement.after(note);
    }

    loadCases();
    loadNotifications();
};