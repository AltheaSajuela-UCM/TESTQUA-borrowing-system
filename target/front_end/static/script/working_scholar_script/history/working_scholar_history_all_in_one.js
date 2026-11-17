// Working Scholar - History (wired to 2_working_scholar/history.php)
// Needs api.js, auth.js and common.js loaded BEFORE this file.
// Sidebar, dropdowns and notifications now come from common.js.

let historyData = [];

async function loadHistory() {
    try {
        const d = await WS.api('2_working_scholar/history.php');
        historyData = (d.history || []).map(r => ({
            dateTime: fmtDate(r.date_time),
            type: r.type,
            student: r.student,
            item: r.item,
            action: r.action
        }));
        applyFilters();
    } catch (err) {
        if (err.message === 'auth') return;
        document.getElementById('table-body').innerHTML =
            '<tr><td colspan="5" style="text-align:center;color:#dc2626;padding:32px;font-size:13px;">' + esc(err.message) + '</td></tr>';
    }
}

// Render History Table Data (Handles empty state gracefully)
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:32px;font-size:13px;">No history records found</td></tr>';
        return;
    }

    data.forEach(row => {
        const actionStr = row.action || '';
        const actionClass = actionStr.toLowerCase() === 'rejected' ? 'action-rejected' : '';

        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + esc(row.dateTime || '—') + '</td>' +
            '<td><span class="badge-type">' + esc(row.type || 'Borrow Request') + '</span></td>' +
            '<td><strong>' + esc(row.student || '—') + '</strong></td>' +
            '<td>' + esc(row.item || '—') + '</td>' +
            '<td><span class="' + actionClass + '">' + esc(actionStr) + '</span></td>';
        tbody.appendChild(tr);
    });
}

// Filter Functionality (done in the browser on the rows already loaded)
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

document.addEventListener('DOMContentLoaded', loadHistory);