// Working Scholar - Cancellation Requests (wired to 2_working_scholar/cancellations.php)
// Needs api.js, auth.js and common.js loaded BEFORE this file.

let cancelationRequestsData = [];
let activeCancelationIndex = null;

async function loadCancellations() {
    try {
        const d = await WS.api('2_working_scholar/cancellations.php?status=pending');
        cancelationRequestsData = (d.cancellations || []).map(r => ({
            id: Number(r.id),
            requestId: r.request_code,
            studentName: r.student_name,
            studentId: r.student_id,
            item: r.item_name,
            itemCode: r.item_code,
            dateRequested: fmtDate(r.requested_at),
            reason: r.reason
        }));
        renderTable(cancelationRequestsData);
    } catch (err) {
        if (err.message === 'auth') return;
        document.getElementById('table-body').innerHTML =
            '<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:32px;font-size:13px;">' + esc(err.message) + '</td></tr>';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:32px;font-size:13px;">No cancellation requests found</td></tr>';
        return;
    }
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + esc(row.requestId) + '</td>' +
            '<td><strong>' + esc(row.studentName) + '</strong><div style="font-size:11px;color:#64748b;">' + esc(row.studentId) + '</div></td>' +
            '<td><strong>' + esc(row.item) + '</strong><div style="font-size:11px;color:#64748b;">' + esc(row.itemCode) + '</div></td>' +
            '<td>' + esc(row.dateRequested) + '</td>' +
            '<td>' + esc(row.reason || '—') + '</td>' +
            '<td style="text-align:right;white-space:nowrap;">' +
                '<button class="btn btn-light" onclick="declineCancellation(' + index + ')">Decline</button> ' +
                '<button class="btn btn-primary" onclick="openAcceptModal(' + index + ')">Accept Cancellation</button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function openAcceptModal(index) {
    activeCancelationIndex = index;
    const r = cancelationRequestsData[index];
    if (!r) return;
    document.getElementById('modal-subtitle').innerText =
        "Confirm that " + r.studentName + "'s request to cancel borrowing " + r.item + " will be accepted.";
    document.getElementById('modal-overlay').classList.add('show');
    document.getElementById('accept-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
    document.getElementById('accept-modal').classList.remove('show');
}

async function resolveCancellation(row, action) {
    try {
        await WS.api('2_working_scholar/cancellations.php', {
            method: 'POST', body: { request_id: row.id, action: action }
        });
    } catch (err) {
        if (err.message !== 'auth') alert(err.message);
    }
    await loadCancellations();   // always show the real state afterwards
}

async function confirmAcceptCancellation() {
    const row = cancelationRequestsData[activeCancelationIndex];
    closeModal();
    if (row) await resolveCancellation(row, 'accept');
    activeCancelationIndex = null;
}

async function declineCancellation(index) {
    const row = cancelationRequestsData[index];
    if (!row) return;
    if (confirm("Decline " + row.studentName + "'s request to cancel " + row.item + "? The borrow request stays pending.")) {
        await resolveCancellation(row, 'decline');
    }
}

document.addEventListener('DOMContentLoaded', loadCancellations);
