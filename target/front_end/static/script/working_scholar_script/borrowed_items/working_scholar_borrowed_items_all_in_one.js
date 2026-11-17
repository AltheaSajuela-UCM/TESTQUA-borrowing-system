// Working Scholar - Borrowed Items (wired to 2_working_scholar/borrowing.php)
// Needs api.js, auth.js and ws_common.js loaded BEFORE this file.

let borrowedItemsData = [];
let currentFilter = 'All';

async function loadBorrowed() {
    try {
        const d = await WS.api('2_working_scholar/borrowing.php?view=all');   // all active borrowings
        borrowedItemsData = (d.borrowings || []).map(r => ({
            id: Number(r.id),
            transactionId: r.transaction_code,
            itemName: r.item_name,
            borrower: r.borrower,
            dateBorrowed: fmtDate(r.processed_at),
            dueDate: fmtDate(r.expected_return_date),
            status: r.display_status          // Borrowed | Due Soon | Overdue
        }));
        renderTable(borrowedItemsData);
    } catch (err) {
        if (err.message === 'auth') return;
        document.getElementById('table-body').innerHTML =
            '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:32px;font-size:13px;">' + esc(err.message) + '</td></tr>';
    }
}

function filteredItems() {
    const want = { 'Borrowed': 'borrowed', 'Overdue': 'overdue', 'Due Soon': 'due soon' }[currentFilter];
    return want ? borrowedItemsData.filter(i => (i.status || '').toLowerCase() === want) : borrowedItemsData;
}

function switchFilter(filterName, evt) {
    currentFilter = filterName;
    document.querySelectorAll('.content-tab-btn').forEach(b => b.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');
    renderTable(borrowedItemsData);
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const rows = filteredItems();
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:32px;font-size:13px;">No borrowed items found</td></tr>';
        return;
    }
    rows.forEach(item => {
        const s = (item.status || '').toLowerCase();
        const isOverdue = s === 'overdue';
        const cls = isOverdue ? 'overdue' : (s === 'due soon' ? 'due-soon' : 'borrowed');
        const tr = document.createElement('tr');
        if (isOverdue) tr.className = 'row-overdue';
        tr.innerHTML =
            '<td><strong>' + esc(item.itemName) + '</strong></td>' +
            '<td>' + esc(item.borrower) + '</td>' +
            '<td>' + esc(item.dateBorrowed) + '</td>' +
            '<td style="' + (isOverdue ? 'color:#dc2626;font-weight:600;' : '') + '">' + esc(item.dueDate) + '</td>' +
            '<td><span class="badge-status ' + cls + '">' + esc(item.status) + '</span></td>' +
            '<td style="text-align:right;white-space:nowrap;">' +
                (isOverdue ? '<button class="btn-danger-sm" onclick="sendReminder(' + item.id + ')">Send reminder</button> ' : '') +
                '<a href="working_scholar_return_processing.html?tx=' + encodeURIComponent(item.transactionId) +
                '" class="btn btn-light" style="text-decoration:none;display:inline-block;">Process Return</a>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

async function sendReminder(id) {
    try {
        await WS.api('2_working_scholar/borrowing.php', { method: 'POST', body: { action: 'send_reminder', transaction_id: id } });
        alert('Overdue reminder sent to the student.');
    } catch (err) {
        if (err.message !== 'auth') alert(err.message);   // e.g. "A reminder was already sent in the last hour"
    }
}

// Exports what the current tab shows (data columns only, no action buttons)
function exportTableToCSV() {
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [['Transaction', 'Item', 'Borrower', 'Date Borrowed', 'Due Date', 'Status'].map(q).join(',')];
    filteredItems().forEach(i => lines.push(
        [i.transactionId, i.itemName, i.borrower, i.dateBorrowed, i.dueDate, i.status].map(q).join(',')));
    const a = document.createElement('a');
    a.download = 'borrowed_items_monitoring.csv';
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.addEventListener('DOMContentLoaded', loadBorrowed);
