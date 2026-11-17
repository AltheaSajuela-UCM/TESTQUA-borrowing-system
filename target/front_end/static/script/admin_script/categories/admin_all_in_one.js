// Admin > Categories & Borrowing Rules: wired to backend/1_admin/categories.php (list, add, edit, delete)
// and backend/api/notifications.php (bell). Page markup is unchanged: the category cards are now built
// from the database instead of the two hard-coded ones.
// Put this file at: target/front_end/static/script/admin_script/categories/admin_all_in_one.js
const BASE = '../../../../backend/';

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

document.addEventListener('DOMContentLoaded', () => {
    let categories = [];
    let editingId = null;                       // null = adding, number = editing that category

    // ---------------------------------------------------------------- dropdowns
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
        profileDropdown.classList.add('hidden');
        loadNotifications();
    });

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
        notifDropdown.classList.add('hidden');
    });

    document.addEventListener('click', () => {
        notifDropdown.classList.add('hidden');
        profileDropdown.classList.add('hidden');
    });

    notifDropdown.addEventListener('click', (e) => e.stopPropagation());
    profileDropdown.addEventListener('click', (e) => e.stopPropagation());

    // ---------------------------------------------------------------- sidebar
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('hidden');
    }

    menuBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // ---------------------------------------------------------------- category cards
    const container = document.querySelector('.category-cards-container');

    async function loadCategories() {
        try {
            const data = await api('1_admin/categories.php');
            categories = data.categories || [];
        } catch (err) {
            container.innerHTML = `<div class="category-card">${esc(err.message)}</div>`;
            return;
        }
        renderCategories();
    }

    function renderCategories() {
        if (categories.length === 0) {
            container.innerHTML = '<div class="category-card">No categories yet.</div>';
            return;
        }
        container.innerHTML = categories.map(c => {
            const waiver = Number(c.requires_waiver) === 1;
            const idSur = Number(c.requires_id_surrender) === 1;
            const core = c.is_core === true || Number(c.is_core) === 1;
            const count = Number(c.item_count);
            return `
            <div class="category-card">
                <div class="card-header">
                    <h3>${esc(c.name)} <small style="font-weight:400;color:#64748b;font-size:12px;">· ${count} item${count === 1 ? '' : 's'}</small></h3>
                    <div>
                        <button class="btn-edit" data-action="edit" data-id="${Number(c.id)}">Edit</button>
                        ${core ? '' : `<button class="btn-edit" data-action="delete" data-id="${Number(c.id)}" style="color:#dc2626;margin-left:6px;">Delete</button>`}
                    </div>
                </div>
                <div class="card-body">
                    <div class="info-group">
                        <span class="label">Requires Waiver</span>
                        <span class="value ${waiver ? 'yes' : 'no'}">${waiver ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="info-group">
                        <span class="label">ID Surrender</span>
                        <span class="value ${idSur ? 'yes' : 'no'}">${idSur ? 'Yes' : 'No'}</span>
                    </div>
                    <div class="info-group">
                        <span class="label">Max Active Borrows</span>
                        <span class="value">${Number(c.max_active_borrows)} per student</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // Edit / Delete buttons (the cards are rebuilt on every load, so listen on the container)
    container.addEventListener('click', async (e) => {
        const b = e.target.closest('button[data-action]');
        if (!b) return;
        const id = Number(b.getAttribute('data-id'));
        const cat = categories.find(c => Number(c.id) === id);
        if (!cat) return;

        if (b.getAttribute('data-action') === 'edit') {
            openModal(cat);
        } else if (confirm(`Delete the category "${cat.name}"?`)) {
            try {
                await api('1_admin/categories.php', { method: 'DELETE', body: { id: id } });
                await loadCategories();
            } catch (err) {
                alert(err.message);
            }
        }
    });

    // ---------------------------------------------------------------- add / edit modal
    const openModalBtn = document.getElementById('openModalBtn');
    const categoryModal = document.getElementById('categoryModal');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const addCategoryForm = document.getElementById('addCategoryForm');

    const nameInput = addCategoryForm.querySelector('input[type="text"]');
    const maxInput = addCategoryForm.querySelector('input[type="number"]');
    const waiverCheck = document.getElementById('waiverCheck');
    const idCheck = document.getElementById('idCheck');
    const modalTitle = categoryModal.querySelector('h2');
    const modalSubtitle = categoryModal.querySelector('.modal-subtitle');
    const submitBtn = addCategoryForm.querySelector('button[type="submit"]');

    function syncVisual(checkbox) {
        checkbox.nextElementSibling.textContent = checkbox.checked ? 'Yes' : 'No';
    }

    // cat = a category to edit, or nothing to add a new one
    function openModal(cat) {
        editingId = cat ? Number(cat.id) : null;
        const core = cat && (cat.is_core === true || Number(cat.is_core) === 1);

        modalTitle.textContent = cat ? 'Edit Category' : 'Add Category';
        modalSubtitle.textContent = cat
            ? 'Update the default borrowing constraints for this category.'
            : 'Set the default borrowing constraints for this category.';
        submitBtn.textContent = cat ? 'Save Changes' : 'Create Category';

        nameInput.value = cat ? cat.name : '';
        nameInput.readOnly = !!core;            // Academic / Non-Academic cannot be renamed
        maxInput.value = cat ? Number(cat.max_active_borrows) : 1;
        waiverCheck.checked = cat ? Number(cat.requires_waiver) === 1 : false;
        idCheck.checked = cat ? Number(cat.requires_id_surrender) === 1 : false;
        syncVisual(waiverCheck);
        syncVisual(idCheck);

        categoryModal.classList.remove('hidden');
    }

    function closeModal() {
        categoryModal.classList.add('hidden');
        addCategoryForm.reset();
        nameInput.readOnly = false;
        syncVisual(waiverCheck);
        syncVisual(idCheck);
        editingId = null;
    }

    openModalBtn.addEventListener('click', () => openModal(null));
    cancelModalBtn.addEventListener('click', closeModal);
    categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) closeModal();
    });

    [waiverCheck, idCheck].forEach(cb => {
        cb.addEventListener('change', () => syncVisual(cb));
    });

    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            name: nameInput.value.trim(),
            requires_waiver: waiverCheck.checked ? 1 : 0,
            requires_id_surrender: idCheck.checked ? 1 : 0,
            max_active_borrows: parseInt(maxInput.value, 10)
        };
        if (!body.name) { alert('Category name is required.'); return; }
        if (isNaN(body.max_active_borrows) || body.max_active_borrows < 1 || body.max_active_borrows > 20) {
            alert('Max active borrowings must be between 1 and 20.');
            return;
        }

        try {
            if (editingId !== null) {
                body.id = editingId;
                await api('1_admin/categories.php', { method: 'PUT', body: body });
                alert('Category updated successfully!');
            } else {
                await api('1_admin/categories.php', { method: 'POST', body: body });
                alert('Category created successfully!');
            }
            closeModal();
            await loadCategories();
        } catch (err) {
            alert(err.message);
        }
    });

    // ---------------------------------------------------------------- notifications
    const notifList = document.getElementById('notifList');
    const tabBtns = document.querySelectorAll('.tab-btn');
    let currentTab = 'all';

    async function loadNotifications() {
        let items = [];
        try {
            const data = await api('api/notifications.php?filter=' + currentTab);
            items = data.notifications || [];
        } catch (err) { /* show the empty state */ }
        renderNotifications(items);
    }

    function renderNotifications(items) {
        notifList.innerHTML = '';

        if (items.length === 0) {
            notifList.innerHTML = `<div style="text-align:center; padding: 16px; color: #64748b; font-size:13px;">No notifications found</div>`;
            return;
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = `notif-item ${item.alert ? 'alert-type' : ''}`;
            div.innerHTML = `
                <p>${esc(item.message)}</p>
                ${item.is_read
                    ? '<span style="font-size: 10px; color: #94a3b8;">Read</span>'
                    : `<button class="mark-read-btn" data-id="${Number(item.id)}">Mark as read</button>`}
            `;
            notifList.appendChild(div);
        });

        notifList.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                try {
                    await api('api/notifications.php', {
                        method: 'POST',
                        body: { action: 'read', id: parseInt(e.target.getAttribute('data-id'), 10) }
                    });
                } catch (err) { /* ignore */ }
                loadNotifications();
            });
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = e.target.getAttribute('data-tab');
            loadNotifications();
        });
    });

    // ---------------------------------------------------------------- initial load
    loadCategories();
    loadNotifications();
});
