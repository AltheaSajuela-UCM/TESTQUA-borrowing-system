document.addEventListener('DOMContentLoaded', () => {
    // Dropdown Toggles (Notification & Profile)
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
        profileDropdown.classList.add('hidden');
    });

    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
        notifDropdown.classList.add('hidden');
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        notifDropdown.classList.add('hidden');
        profileDropdown.classList.add('hidden');
    });

    notifDropdown.addEventListener('click', (e) => e.stopPropagation());
    profileDropdown.addEventListener('click', (e) => e.stopPropagation());

    // Sidebar Menu Open/Close logic with Dark Overlay
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

    // Add Category Modal Open/Close
    const openModalBtn = document.getElementById('openModalBtn');
    const categoryModal = document.getElementById('categoryModal');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const addCategoryForm = document.getElementById('addCategoryForm');

    openModalBtn.addEventListener('click', () => {
        categoryModal.classList.remove('hidden');
    });

    cancelModalBtn.addEventListener('click', () => {
        categoryModal.classList.add('hidden');
    });

    categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) {
            categoryModal.classList.add('hidden');
        }
    });

    // Interactive Checkbox toggles for "No" to "Yes" inside modal
    ['waiverCheck', 'idCheck'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                const visual = e.target.nextElementSibling;
                visual.textContent = e.target.checked ? 'Yes' : 'No';
            });
        }
    });

    // Notification Filtering and Mock Data
    const notifications = [
        { id: 1, type: 'unread', alert: false, text: 'Inventory availability was updated by a Working Scholar.' },
        { id: 2, type: 'alert', alert: true, text: 'An accountability case requires review.' }
    ];

    const notifList = document.getElementById('notifList');
    const tabBtns = document.querySelectorAll('.tab-btn');

    function renderNotifications(filter = 'all') {
        notifList.innerHTML = '';
        
        let filtered = notifications;
        if (filter === 'unread') {
            filtered = notifications.filter(n => !n.read);
        } else if (filter === 'alerts') {
            filtered = notifications.filter(n => n.alert);
        }

        if (filtered.length === 0) {
            notifList.innerHTML = `<div style="text-align:center; padding: 16px; color: #64748b; font-size:13px;">No notifications found</div>`;
            return;
        }

        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = `notif-item ${item.alert ? 'alert-type' : ''}`;
            div.innerHTML = `
                <p>${item.text}</p>
                <button class="mark-read-btn" data-id="${item.id}">
                    ${item.read ? 'Mark as unread' : 'Mark as read'}
                </button>
            `;
            notifList.appendChild(div);
        });

        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const notif = notifications.find(n => n.id === id);
                if (notif) {
                    notif.read = !notif.read;
                    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
                    renderNotifications(activeTab);
                }
            });
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderNotifications(e.target.getAttribute('data-tab'));
        });
    });

    renderNotifications('all');

    // Handle Form Submit
    addCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Category created successfully!');
        categoryModal.classList.add('hidden');
        addCategoryForm.reset();
    });
});