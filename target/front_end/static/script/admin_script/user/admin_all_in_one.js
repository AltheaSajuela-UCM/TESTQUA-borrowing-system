// Admin > Manage Users: wired to backend/1_admin/users.php (list, activate / deactivate, clear flag, add WS)
// and backend/api/notifications.php (bell). Page markup is unchanged.
// Put this file at: target/front_end/static/script/admin_script/user/admin_all_in_one.js
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

let usersData = [];
let notificationsData = [];
let currentRole = 'students';        // 'students' | 'scholars'
let currentNotifTab = 'all';
let sideMenuCloseTimer = null;

const ROLE_FOR_TAB = { students: 'student', scholars: 'working_scholar' };

// ---------------------------------------------------------------- users
async function loadUsers() {
    try {
        const data = await api('1_admin/users.php?role=' + ROLE_FOR_TAB[currentRole]);
        usersData = data.users || [];
    } catch (err) {
        usersData = [];
        document.getElementById('userTableBody').innerHTML =
            `<tr><td colspan="6" class="empty-state">${esc(err.message)}</td></tr>`;
        return;
    }
    renderTable();
}

function badge(text, bg, fg) {
    return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:${bg};color:${fg};margin-right:4px;">${text}</span>`;
}

function btn(label, onclick, color) {
    return `<button onclick="${onclick}" style="margin-left:6px;padding:5px 12px;border:1px solid ${color};background:#fff;color:${color};border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">${label}</button>`;
}

function renderTable() {
    const tableBody = document.getElementById('userTableBody');
    const colId = document.getElementById('col-id');
    const colExtra = document.getElementById('col-extra');
    const addScholarBtn = document.getElementById('addScholarBtn');
    const isStudents = currentRole === 'students';

    colId.textContent = isStudents ? 'Student ID' : 'Scholar ID';
    colExtra.textContent = isStudents ? 'Academic Level' : 'Assigned Dept';

    // Show button only when viewing Working Scholars
    if (addScholarBtn) {
        addScholarBtn.style.display = isStudents ? 'none' : 'inline-flex';
    }

    if (usersData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${
            isStudents ? 'No students found in the system.' : 'No SAO Working Scholars found in the system.'}</td></tr>`;
        return;
    }

    tableBody.innerHTML = usersData.map(u => {
        const active = Number(u.is_active) === 1;
        const flagged = Number(u.is_flagged) === 1;
        const extra = isStudents
            ? [u.academic_level, u.program_year].filter(Boolean).join(' · ')
            : (u.program_year || u.academic_level || '');
        const status =
            (active ? badge('Active', '#dcfce7', '#166534') : badge('Inactive', '#e2e8f0', '#475569')) +
            (flagged ? badge('Flagged', '#fee2e2', '#991b1b') : '');
        return `<tr>
            <td>${esc(u.id_number)}</td>
            <td>${esc(u.full_name)}</td>
            <td>${esc(u.campus || '-')}</td>
            <td>${esc(extra || '-')}</td>
            <td>${status}</td>
            <td class="text-right">
                ${btn('View', `viewUser(${Number(u.id)})`, '#155eef')}
                ${active
                    ? btn('Deactivate', `setActive(${Number(u.id)}, false)`, '#dc2626')
                    : btn('Activate', `setActive(${Number(u.id)}, true)`, '#16a34a')}
            </td>
        </tr>`;
    }).join('');
}

/* ADD WORKING SCHOLAR MODAL HANDLERS */
function openAddScholarModal() {
    document.getElementById('wsFullName').value = '';
    document.getElementById('wsEmployeeId').value = '';
    document.getElementById('wsPassword').value = '';
    document.getElementById('addScholarModal').classList.remove('hidden');
}

function closeAddScholarModal() {
    document.getElementById('addScholarModal').classList.add('hidden');
}

async function handleCreateScholar(e) {
    e.preventDefault();
    const fullName = document.getElementById('wsFullName').value.trim();
    const employeeId = document.getElementById('wsEmployeeId').value.trim();
    const password = document.getElementById('wsPassword').value;

    if (employeeId.length !== 8) {
        alert('Employee ID must be exactly 8 digits.');
        return;
    }

    try {
        await api('1_admin/users.php', {
            method: 'POST',
            body: {
                role: 'working_scholar',
                full_name: fullName,
                id_number: employeeId,
                password: password
            }
        });
        alert('Working Scholar account created successfully!');
        closeAddScholarModal();
        await loadUsers();
    } catch (err) {
        alert(err.message || 'Failed to create account.');
    }
}

async function setActive(id, makeActive) {
    const u = usersData.find(x => Number(x.id) === id);
    const name = u ? u.full_name : 'this user';
    if (!confirm((makeActive ? 'Activate ' : 'Deactivate ') + name + '?')) return;
    try {
        await api('1_admin/users.php', { method: 'PUT', body: { id: id, is_active: makeActive ? 1 : 0 } });
        await loadUsers();
    } catch (err) {
        alert(err.message);
    }
}

async function clearFlag(id) {
    try {
        await api('1_admin/users.php', { method: 'PUT', body: { id: id, clear_flag: 1 } });
        closeUserModal();
        await loadUsers();
    } catch (err) {
        alert(err.message);
    }
}

function viewUser(id) {
    const u = usersData.find(x => Number(x.id) === id);
    if (!u) return;
    const row = (k, v) => `<p style="margin:6px 0;"><strong>${k}:</strong> ${esc(v || '-')}</p>`;
    const flagged = Number(u.is_flagged) === 1;
    document.getElementById('modalTitle').textContent = u.full_name;
    document.getElementById('modalBodyContent').innerHTML =
        row('ID Number', u.id_number) +
        row('Role', u.role === 'working_scholar' ? 'SAO Working Scholar' : u.role === 'student' ? 'Student' : 'Administrator') +
        row('Email', u.email) +
        row('Mobile', u.mobile_number) +
        row('Campus', u.campus) +
        row('Academic Level', u.academic_level) +
        row('Program / Year', u.program_year) +
        row('Status', Number(u.is_active) === 1 ? 'Active' : 'Inactive') +
        row('Flagged', flagged ? 'Yes (unresolved accountability)' : 'No') +
        row('Created', u.created_at) +
        (flagged ? `<p style="margin-top:12px;">${btn('Clear flag', `clearFlag(${Number(u.id)})`, '#d97706')}</p>` : '');
    document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

// ---------------------------------------------------------------- notifications
async function loadNotifications() {
    try {
        const data = await api('api/notifications.php?filter=' + currentNotifTab);
        notificationsData = data.notifications || [];
        renderNotifications(data.unread_count);
    } catch (err) {
        notificationsData = [];
        renderNotifications(0);
    }
}

function renderNotifications(unreadCount) {
    const notifListContainer = document.getElementById('notifListContainer');
    const notifBadge = document.getElementById('notifBadge');
    notifListContainer.innerHTML = '';

    if (notificationsData.length === 0) {
        notifListContainer.innerHTML = `<div class="empty-notif">No notifications found.</div>`;
    } else {
        notificationsData.forEach(n => {
            const card = document.createElement('div');
            card.className = `notif-card ${n.alert ? 'is-alert' : ''}`;
            card.innerHTML = `
                <p>${esc(n.message)}</p>
                ${!n.is_read ? `<button class="mark-read-btn" onclick="markAsRead(${Number(n.id)})">Mark as read</button>` : '<span style="font-size: 10px; color: #94a3b8;">Read</span>'}
            `;
            notifListContainer.appendChild(card);
        });
    }

    if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = 'flex';
    } else {
        notifBadge.style.display = 'none';
    }
}

async function markAsRead(id) {
    try {
        await api('api/notifications.php', { method: 'POST', body: { action: 'read', id: id } });
    } catch (err) { /* ignore */ }
    loadNotifications();
}

// ---------------------------------------------------------------- tabs, menu, dropdowns
const roleTabBtns = document.querySelectorAll('.role-tab-btn');
roleTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        roleTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRole = e.target.getAttribute('data-role');
        loadUsers();
    });
});

const notifTabBtns = document.querySelectorAll('.notif-popup .tab-btn');
notifTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentNotifTab = e.target.getAttribute('data-tab');
        loadNotifications();
    });
});

const menuBtn = document.getElementById('menuBtn');
const leftEdgeHover = document.getElementById('leftEdgeHover');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

function setSideMenuOpen(isOpen, persist = true) {
    clearTimeout(sideMenuCloseTimer);
    if (sideMenu) sideMenu.classList.toggle('active', isOpen);
    if (menuOverlay) menuOverlay.classList.toggle('active', isOpen);
    if (persist) {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'true' : 'false');
        } catch (err) { /* storage unavailable */ }
    }
}

function openSideMenu() {
    setSideMenuOpen(true, true);
}

function closeSideMenu() {
    setSideMenuOpen(false, true);
}

function scheduleSideMenuClose() {
    clearTimeout(sideMenuCloseTimer);
    sideMenuCloseTimer = setTimeout(() => {
        const hoveringMenu = menuBtn && menuBtn.matches(':hover');
        const hoveringEdge = leftEdgeHover && leftEdgeHover.matches(':hover');
        const hoveringDrawer = sideMenu && sideMenu.matches(':hover');
        if (!hoveringMenu && !hoveringEdge && !hoveringDrawer) {
            setSideMenuOpen(false, false);
        }
    }, 150);
}

if (menuBtn) {
    menuBtn.addEventListener('mouseenter', () => setSideMenuOpen(true, false));
    menuBtn.addEventListener('mouseleave', scheduleSideMenuClose);
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSideMenu();
    });
}
if (leftEdgeHover) {
    leftEdgeHover.addEventListener('mouseenter', () => setSideMenuOpen(true, false));
    leftEdgeHover.addEventListener('mouseleave', scheduleSideMenuClose);
}
if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeSideMenu);
if (menuOverlay) menuOverlay.addEventListener('click', closeSideMenu);

if (sideMenu) {
    sideMenu.addEventListener('mouseenter', () => clearTimeout(sideMenuCloseTimer));
    sideMenu.addEventListener('mouseleave', scheduleSideMenuClose);

    sideMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
            } catch (err) { /* storage unavailable */ }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true') {
            setSideMenuOpen(true, true);
        }
    } catch (err) { /* storage unavailable */ }
});

const notifWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');
const profileWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');

notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileWrapper.classList.remove('active');
    notifWrapper.classList.toggle('active');
    loadNotifications();
});

profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifWrapper.classList.remove('active');
    profileWrapper.classList.toggle('active');
});

document.addEventListener('click', () => {
    notifWrapper.classList.remove('active');
    profileWrapper.classList.remove('active');
});

// ---------------------------------------------------------------- initial load
loadUsers();
loadNotifications();