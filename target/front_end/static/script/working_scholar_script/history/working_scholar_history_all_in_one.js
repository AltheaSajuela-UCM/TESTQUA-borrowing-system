// Working Scholar > History: loads the activity log from backend/2_working_scholar/history.php.
// Header, sidebar and notifications come from common.js
// (load order: api.js -> auth.js -> common.js -> this file).
const SIDEBAR_STORAGE_KEY = 'webventory_sidebar_open';

let historyData = [];
let sidebarCloseTimer = null;

// Render the table (handles the empty state)
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">No history records found</td></tr>`;
        return;
    }

    data.forEach(row => {
        const actionStr = row.action || '';
        const actionClass = actionStr.toLowerCase() === 'rejected' ? 'action-rejected' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${esc(row.dateTime || '—')}</td>
            <td><span class="badge-type">${esc(row.type || 'Borrow Request')}</span></td>
            <td><strong>${esc(row.student || '—')}</strong></td>
            <td>${esc(row.item || '—')}</td>
            <td><span class="${actionClass}">${esc(actionStr)}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Type / date / search filters
function applyFilters() {
    const typeVal = document.getElementById('type-filter').value;
    const dateVal = document.getElementById('date-filter').value;
    const searchVal = document.getElementById('search-filter').value.toLowerCase();

    const filtered = historyData.filter(row => {
        const matchesType = (typeVal === 'All' || row.type === typeVal);
        const matchesDate = (!dateVal || (row.dateTime || '').includes(dateVal));
        const matchesSearch = (
            (row.dateTime || '').toLowerCase().includes(searchVal) ||
            (row.type || '').toLowerCase().includes(searchVal) ||
            (row.student || '').toLowerCase().includes(searchVal) ||
            (row.item || '').toLowerCase().includes(searchVal) ||
            (row.action || '').toLowerCase().includes(searchVal)
        );
        return matchesType && matchesDate && matchesSearch;
    });

    renderTable(filtered);
}

// Load the activity log from the backend
async function loadHistory() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 32px; font-size: 13px;">Loading history…</td></tr>`;
    try {
        const data = await WS.api('2_working_scholar/history.php');
        historyData = (data.history || []).map(r => ({
            dateTime: r.date_time,
            type: r.type,
            student: r.student,
            item: r.item,
            action: r.action
        }));
        applyFilters();
    } catch (err) {
        if (err.message === 'auth') return;   // redirected to the login page
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #dc2626; padding: 32px; font-size: 13px;">Could not load history: ${esc(err.message)}</td></tr>`;
    }
}

function setSidebarOpen(isOpen, persist = true) {
    clearTimeout(sidebarCloseTimer);
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('show', isOpen);
    if (overlay) overlay.classList.toggle('show', isOpen);
    if (persist) {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'true' : 'false');
        } catch (err) { /* storage unavailable */ }
    }
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

function initSidebarPersistence() {
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
}

document.addEventListener('DOMContentLoaded', () => {
    initSidebarPersistence();
    loadHistory();
});