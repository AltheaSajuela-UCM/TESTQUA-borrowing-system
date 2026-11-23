// Borrowed Items page logic: fetches active borrowings from the backend and renders the table.
// Backend: backend/2_working_scholar/borrowing.php?view=all  ->  { borrowings: [...] }

const SIDEBAR_STORAGE_KEY = 'webventory_sidebar_open';

let borrowedItemsData = [];
let currentFilter = 'All';
let sidebarCloseTimer = null;

// Maps one row from borrowing.php to the field names the table uses.
function mapBorrowing(b) {
    return {
        id:            b.id,
        item_name:     b.item_name,
        transaction_no: b.transaction_code,
        borrower_name: b.borrower,
        id_number:     b.user_id_number,
        date_borrowed: b.processed_at,
        due_date:      b.expected_return_date,
        status:        b.display_status   // Borrowed | Overdue | Due Soon
    };
}

async function loadBorrowedItems() {
    try {
        const res = await WS.api('2_working_scholar/borrowing.php?view=all');
        if (!Array.isArray(res.borrowings)) {
            throw new Error('Server did not return data. Open the site through a PHP server (http://localhost/...), not Live Server or a double-clicked file.');
        }
        borrowedItemsData = res.borrowings.map(mapBorrowing);
    } catch (err) {
        console.error('Borrowed items failed to load:', err);
        const tbody = document.getElementById('table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#b91c1c;padding:24px;">Could not load data: '
            + esc(err && err.message ? err.message : String(err)) + '</td></tr>';
        return;
    }
    renderBorrowedTable(currentFilter);
}

function switchFilter(filterName, evt) {
    currentFilter = filterName;
    document.querySelectorAll('.content-tabs .content-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
    renderBorrowedTable(currentFilter);
}

function renderBorrowedTable(filter) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filtered = borrowedItemsData;
    const lowerFilter = filter.toLowerCase();

    if (lowerFilter === 'borrowed') {
        filtered = borrowedItemsData.filter(i => String(i.status).toLowerCase() === 'borrowed');
    } else if (lowerFilter === 'overdue') {
        filtered = borrowedItemsData.filter(i => String(i.status).toLowerCase() === 'overdue');
    } else if (lowerFilter === 'due soon') {
        filtered = borrowedItemsData.filter(i => String(i.status).toLowerCase() === 'due soon' || String(i.status).toLowerCase() === 'duesoon');
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">NONE</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        if (String(item.status).toLowerCase() === 'overdue') {
            tr.className = 'row-overdue';
        }

        const statusClass = String(item.status).toLowerCase().replace(/\s+/g, '-');

        tr.innerHTML = `
            <td><strong>${esc(item.item_name || item.item)}</strong><br><small style="color:#64748b;">${esc(item.transaction_no || '—')}</small></td>
            <td>${esc(item.borrower_name || item.borrower)}<br><small style="color:#64748b;">${esc(item.id_number || '')}</small></td>
            <td>${fmtDate(item.date_borrowed)}</td>
            <td>${fmtDate(item.due_date)}</td>
            <td><span class="badge-status ${statusClass}">${esc(item.status)}</span></td>
            <td style="text-align: right;">
                <button class="btn btn-light" onclick="viewBorrowDetails('${item.id}')">View</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewBorrowDetails(id) {
    // Action handler for reviewing a specific borrowed item entry
    window.location.href = `working_scholar_return_processing.html?id=${id}`;
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
    loadBorrowedItems();
});

// Export CSV button (the backend builds the file).
function exportTableToCSV() {
    WS.download('2_working_scholar/borrowing.php?view=all&format=csv');
}