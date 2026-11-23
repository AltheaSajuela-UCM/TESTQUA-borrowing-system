// Admin > Reports: wired to backend/1_admin/reports.php (inventory, borrowing, returns, overdue, damaged/lost
// and the organization leaderboard) and backend/api/notifications.php (bell). Page markup is unchanged:
// the table header follows each report, and a Leaderboard card is added next to the five existing ones.
// Put this file at: target/front_end/static/script/admin_script/reports/admin_all_in_one.js
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

// card title -> report type understood by reports.php
const REPORT_TYPES = {
    'Inventory Report': 'inventory',
    'Borrowing Report': 'borrowing',
    'Returns Report': 'returns',
    'Overdue Report': 'overdue',
    'Damaged/Lost Report': 'damaged_lost',
    'Organization Leaderboard': 'leaderboard'
};

// Which column the category / status dropdowns filter, and which status values exist, per report
const STATUS_FILTERS = {
    inventory:    { column: 'Availability', options: ['Available', 'Borrowed', 'Under Maintenance', 'Damaged', 'Missing', 'Unavailable'] },
    borrowing:    { column: 'Status', options: ['Pending', 'Borrowed', 'Overdue', 'Completed', 'Returned', 'Rejected', 'Cancelled'] },
    damaged_lost: { column: 'Status', options: ['Open', 'Resolved'] }
};

let currentType = 'inventory';
let currentReport = null;            // last response: {title, headers, rows}
let notifications = [];
let currentNotifTab = 'all';
let loadTimer = null;
let sidebarCloseTimer = null;

// ---------------------------------------------------------------- sidebar + dropdowns
function setSidebarOpen(isOpen, persist = true) {
    clearTimeout(sidebarCloseTimer);
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show', isOpen);
    if (overlay) overlay.classList.toggle('show', isOpen);
    if (persist) {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'true' : 'false');
        } catch (e) { /* storage unavailable */ }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const willOpen = sidebar ? !sidebar.classList.contains('show') : true;
    setSidebarOpen(willOpen, true);
}

function scheduleSidebarClose() {
    clearTimeout(sidebarCloseTimer);
    sidebarCloseTimer = setTimeout(() => {
        const menuBtn = document.getElementById('menu-btn');
        const leftEdgeHover = document.getElementById('left-edge-hover');
        const sidebar = document.getElementById('sidebar');
        const hoveringMenu = menuBtn && menuBtn.matches(':hover');
        const hoveringEdge = leftEdgeHover && leftEdgeHover.matches(':hover');
        const hoveringSidebar = sidebar && sidebar.matches(':hover');
        if (!hoveringMenu && !hoveringEdge && !hoveringSidebar) {
            setSidebarOpen(false, false);
        }
    }, 150);
}

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const leftEdgeHover = document.getElementById('left-edge-hover');
    const sidebar = document.getElementById('sidebar');

    if (menuBtn) {
        menuBtn.addEventListener('mouseenter', () => setSidebarOpen(true, false));
        menuBtn.addEventListener('mouseleave', scheduleSidebarClose);
    }

    if (leftEdgeHover) {
        leftEdgeHover.addEventListener('mouseenter', () => setSidebarOpen(true, false));
        leftEdgeHover.addEventListener('mouseleave', scheduleSidebarClose);
    }

    if (sidebar) {
        sidebar.addEventListener('mouseenter', () => clearTimeout(sidebarCloseTimer));
        sidebar.addEventListener('mouseleave', scheduleSidebarClose);

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
            setSidebarOpen(true, true);
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

// ---------------------------------------------------------------- report loading
// Date boxes take dd/mm/yyyy (or yyyy-mm-dd). Anything else is ignored until it is a full date.
function parseDate(txt) {
    txt = (txt || '').trim();
    const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) return txt;
    return '';
}

function reportQuery(extra) {
    const p = new URLSearchParams({ type: currentType });
    const from = parseDate(document.getElementById('date-from').value);
    const to = parseDate(document.getElementById('date-to').value);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    Object.keys(extra || {}).forEach(k => p.set(k, extra[k]));
    return p.toString();
}

async function loadReport() {
    try {
        currentReport = await api('1_admin/reports.php?' + reportQuery());
    } catch (err) {
        currentReport = null;
        document.getElementById('table-body').innerHTML =
            `<tr><td style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">${esc(err.message)}</td></tr>`;
        return;
    }
    document.getElementById('preview-table-title').innerText = `${currentReport.title} Preview`;
    renderTable();
}

// Category / Status dropdowns only apply to reports that have those columns
function setupFilterControls() {
    const cat = document.getElementById('category-filter');
    const stat = document.getElementById('status-filter');
    const hasCategory = currentReport === null || (currentReport.headers || []).includes('Category');
    cat.disabled = !hasCategory;
    if (!hasCategory) cat.value = 'All';

    const sf = STATUS_FILTERS[currentType];
    stat.disabled = !sf;
    stat.innerHTML = '<option value="All">All Statuses</option>' +
        (sf ? sf.options.map(o => `<option value="${o}">${o}</option>`).join('') : '');
}

function filteredRows() {
    if (!currentReport) return [];
    const headers = currentReport.headers || [];
    let rows = currentReport.rows || [];

    const catIdx = headers.indexOf('Category');
    const catVal = document.getElementById('category-filter').value;
    if (catIdx >= 0 && catVal !== 'All') rows = rows.filter(r => r[catIdx] === catVal);

    const sf = STATUS_FILTERS[currentType];
    const statVal = document.getElementById('status-filter').value;
    if (sf && statVal !== 'All') {
        const i = headers.indexOf(sf.column);
        if (i >= 0) rows = rows.filter(r => r[i] === statVal);
    }
    return rows;
}

function badgeClassFor(value) {
    const v = String(value).toLowerCase();
    if (v === 'borrowed' || v === 'available') return 'borrowed';
    if (v === 'overdue' || v === 'damaged' || v === 'missing') return 'overdue';
    if (v === 'completed' || v === 'resolved') return 'completed';
    if (v === 'rejected' || v === 'cancelled' || v === 'unavailable') return 'rejected';
    return 'pending';
}

function renderTable() {
    setupFilterControls();
    const table = document.getElementById('report-table');
    const thead = table.querySelector('thead');
    const tbody = document.getElementById('table-body');
    const headers = currentReport ? currentReport.headers || [] : [];

    thead.innerHTML = '<tr>' + headers.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>';
    tbody.innerHTML = '';

    const rows = filteredRows();
    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${Math.max(headers.length, 1)}" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No records found</td></tr>`;
        return;
    }

    const badgeCols = ['Status', 'Availability'].map(h => headers.indexOf(h)).filter(i => i >= 0);
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = row.map((cell, i) => {
            const text = (cell === null || cell === '' || cell === undefined) ? '—' : cell;
            return badgeCols.includes(i)
                ? `<td><span class="badge ${badgeClassFor(text)}">${esc(text)}</span></td>`
                : `<td>${esc(text)}</td>`;
        }).join('');
        tbody.appendChild(tr);
    });
}

// ---------------------------------------------------------------- cards + filters
function selectCard(cardElement, reportTitle) {
    document.querySelectorAll('.report-card').forEach(c => c.classList.remove('active'));
    cardElement.classList.add('active');
    document.getElementById('preview-table-title').innerText = `${reportTitle} Preview`;
    currentType = REPORT_TYPES[reportTitle] || 'inventory';
    currentReport = null;
    document.getElementById('category-filter').value = 'All';
    loadReport();
}

// Category / Status dropdown: filter the rows already loaded
function applyFilters() {
    renderTable();
}

// Date boxes: ask the server again after a pause in typing
function dateChanged() {
    clearTimeout(loadTimer);
    loadTimer = setTimeout(loadReport, 300);
}

// ---------------------------------------------------------------- export
// CSV is built from the rows on screen, so it respects the Category / Status filters.
function exportTableToCSV() {
    if (!currentReport) return;
    const cell = v => {
        let s = String(v == null ? '' : v);
        if (/^[=+\-@]/.test(s)) s = "'" + s;           // stop spreadsheet formula injection
        return '"' + s.replace(/"/g, '""') + '"';
    };
    const lines = [currentReport.headers.map(cell).join(',')]
        .concat(filteredRows().map(r => r.map(cell).join(',')));
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.download = `${currentType}_report.csv`;
    a.href = window.URL.createObjectURL(blob);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// PDF is made by the server for the selected report and date range (it ignores the Category / Status filters).
function exportTablePDF() {
    window.location.href = BASE + '1_admin/reports.php?' + reportQuery({ format: 'pdf' });
}

// ---------------------------------------------------------------- initial load
window.onload = async () => {
    // The date boxes shipped with made-up dates (01/09/2026 - 21/09/2026) that would hide current data.
    const from = document.getElementById('date-from');
    const to = document.getElementById('date-to');
    from.value = '';
    to.value = '';
    from.placeholder = 'From dd/mm/yyyy';
    to.placeholder = 'To dd/mm/yyyy';
    from.addEventListener('input', dateChanged);
    to.addEventListener('input', dateChanged);

    // Export PDF used to open the browser's print dialog; use the server's PDF instead.
    const pdfBtn = document.querySelector('.action-buttons .btn');
    if (pdfBtn) {
        pdfBtn.removeAttribute('onclick');
        pdfBtn.addEventListener('click', exportTablePDF);
    }

    // Leaderboard report exists in the backend but had no card
    const grid = document.querySelector('.cards-grid');
    const lb = document.createElement('div');
    lb.className = 'report-card';
    lb.innerHTML = '<div class="card-icon">🏆</div><div class="card-title">Leaderboard</div>';
    lb.addEventListener('click', () => selectCard(lb, 'Organization Leaderboard'));
    grid.appendChild(lb);

    // Category dropdown from the real categories
    try {
        const data = await api('1_admin/categories.php');
        const names = (data.categories || []).map(c => c.name);
        if (names.length) {
            document.getElementById('category-filter').innerHTML =
                '<option value="All">All Categories</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
        }
    } catch (err) { /* keep the two default options */ }

    loadReport();
    loadNotifications();
};