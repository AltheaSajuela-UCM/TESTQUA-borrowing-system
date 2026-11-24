// Working Scholar - Return Processing (wired to 2_working_scholar/borrowing.php)
// Needs api.js, auth.js and common.js loaded BEFORE this file.

const SIDEBAR_STORAGE_KEY = 'webventory_sidebar_open';

let activeTx = null;       // the active borrowing being returned
let idReturned = false;    // working scholar confirmed the student's ID was handed back
let sidebarCloseTimer = null;

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const t = document.getElementById(viewId);
    if (t) t.classList.add('active');
}

function showError(msg) {
    const el = document.getElementById('return-error');
    if (!el) return;
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
}

function showResults(rows) {
    const box = document.getElementById('tx-results');
    if (!box) return;
    box.innerHTML = '';
    if (!rows) return;
    rows.forEach(r => {
        const b = document.createElement('button');
        b.className = 'btn btn-light';
        b.style.cssText = 'display:block;width:100%;text-align:left;margin-top:6px;';
        b.textContent = r.transaction_code + ' · ' + r.item_name + ' · ' + r.borrower;
        b.onclick = () => { showResults(null); selectTransaction(r); };
        box.appendChild(b);
    });
}

function selectTransaction(r) {
    showError('');
    activeTx = null;
    const card = document.getElementById('return-form-card');
    if (r.status !== 'active') {
        if (card) card.style.display = 'none';
        showError(r.transaction_code + ' is ' + (r.display_status || r.status).toLowerCase() + ' - only borrowed items can be returned.');
        return;
    }
    activeTx = r;
    idReturned = false;

    document.getElementById('return-item-name').innerText = r.item_name;
    document.getElementById('return-item-meta').innerText =
        (r.unit_code || r.item_code) + ' · ' + r.borrower + ' · ' + r.transaction_code;
    const badge = document.getElementById('return-status-badge');
    if (badge) {
        const overdue = Number(r.is_overdue) === 1;
        badge.innerText = overdue ? 'Overdue' : 'Borrowed';
        badge.className = 'badge-status ' + (overdue ? 'overdue' : 'borrowed');
    }
    document.getElementById('return-time-val').value = new Date().toLocaleString();
    document.getElementById('return-condition-select').value = 'Good';
    document.getElementById('late-notes').value = '';

    // Only items that kept the student's ID need the "ID handed back" confirmation.
    const idBtn = document.getElementById('confirm-id-btn');
    if (idBtn) {
        idBtn.style.display = Number(r.id_surrendered) === 1 ? 'inline-block' : 'none';
        idBtn.innerText = 'Confirm student ID return';
    }
    if (card) card.style.display = 'block';
}

async function searchTransaction() {
    const q = document.getElementById('find-tx-input').value.trim();
    showError('');
    showResults(null);
    if (!q) { showError('Enter a transaction ID, student ID or item code.'); return; }
    try {
        const d = await WS.api('2_working_scholar/borrowing.php?status=active&q=' + encodeURIComponent(q));
        const rows = d.borrowings || [];
        if (rows.length === 0) {
            document.getElementById('return-form-card').style.display = 'none';
            showError('No borrowed item matches "' + q + '".');
        } else if (rows.length === 1) {
            selectTransaction(rows[0]);
        } else {
            document.getElementById('return-form-card').style.display = 'none';
            showResults(rows);   // several active borrowings (e.g. a student ID): let the user pick
        }
    } catch (err) {
        if (err.message !== 'auth') showError(err.message);
    }
}

function confirmIdReturn() {
    idReturned = !idReturned;
    document.getElementById('confirm-id-btn').innerText =
        idReturned ? 'Student ID returned ✓' : 'Confirm student ID return';
}

async function completeReturn() {
    if (!activeTx) return;
    showError('');
    const btn = document.getElementById('complete-return-btn');
    const condition = document.getElementById('return-condition-select').value;
    if (btn) btn.disabled = true;
    try {
        const res = await WS.api('2_working_scholar/borrowing.php', {
            method: 'POST',
            body: {
                action: 'return',
                transaction_id: Number(activeTx.id),
                return_condition: condition,
                late_notes: document.getElementById('late-notes').value.trim(),
                id_returned: idReturned
            }
        });
        document.getElementById('success-msg').innerText =
            'Transaction ' + activeTx.transaction_code + ' was completed at ' +
            document.getElementById('return-time-val').value + '. Condition recorded as ' + condition + '.' +
            (res.case_id ? ' Accountability case ' + res.case_id + ' was opened.' : '');
        switchView('view-return-success');
    } catch (err) {
        if (err.message !== 'auth') showError(err.message);
    } finally {
        if (btn) btn.disabled = false;
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

document.addEventListener('DOMContentLoaded', async () => {
    initSidebarPersistence();
    const tx = new URLSearchParams(window.location.search).get('tx');
    if (!tx) return;
    document.getElementById('find-tx-input').value = tx;
    const n = parseInt((tx.match(/\d+/) || [])[0], 10);
    if (!n) return searchTransaction();
    try {
        const d = await WS.api('2_working_scholar/borrowing.php?id=' + n);
        selectTransaction(d.borrowing);
    } catch (err) {
        if (err.message !== 'auth') showError(err.message);
    }
});