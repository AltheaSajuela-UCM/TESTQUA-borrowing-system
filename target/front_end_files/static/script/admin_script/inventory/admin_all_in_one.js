// Inventory Data Sets
const academicItems = [
    { code: "AC-001", name: "Scientific Calculator", category: "Academic", stock: "10", condition: "Good", status: "Borrowed", statusClass: "status-borrowed", waiver: false, idSurrender: false },
    { code: "AC-002", name: "Basic Calculator", category: "Academic", stock: "10", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false },
    { code: "asd", name: "AS", category: "Academic", stock: "1", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false },
    { code: "asdas", name: "asdas", category: "Academic", stock: "1", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false }
];

const nonAcademicItems = [
    { code: "NA-001", name: "Snakes and Ladders", category: "Non-Academic", stock: "5", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false },
    { code: "NA-002", name: "Scrabble", category: "Non-Academic", stock: "5", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false },
    { code: "NA-003", name: "Chess", category: "Non-Academic", stock: "5", condition: "Good", status: "Borrowed", statusClass: "status-borrowed", waiver: false, idSurrender: false },
    { code: "NA-004", name: "Sungka", category: "Non-Academic", stock: "5", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false },
    { code: "NA-005", name: "Math Board", category: "Non-Academic", stock: "5", condition: "Fair", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false },
    { code: "NA-006", name: "Word Factory", category: "Non-Academic", stock: "5", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false },
    { code: "NA-007", name: "Giant Pick Up Sticks", category: "Non-Academic", stock: "5", condition: "Good", status: "Available", statusClass: "status-available", waiver: false, idSurrender: false }
];

let currentCategory = 'academic';
let currentRuleCategory = 'academic';
let currentAvailCategory = 'academic';
let selectedRuleItem = null;
let selectedAvailItem = null;

let notificationsData = [
    { id: 1, text: "Inventory availability was updated by a Working Scholar.", type: "general", unread: true },
    { id: 2, text: "An accountability case requires review.", type: "alert", unread: true }
];
let currentNotifTab = 'all';

// Render Inventory Table Function
function renderInventoryTable() {
    const tableBody = document.getElementById('inventoryTableBody');
    tableBody.innerHTML = '';

    const items = currentCategory === 'academic' ? academicItems : nonAcademicItems;

    if (items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No items found in this category.</td></tr>`;
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 500;">${item.code}</td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.stock}</td>
            <td>${item.condition}</td>
            <td><span class="status-badge ${item.statusClass}">${item.status}</span></td>
        `;
        tableBody.appendChild(tr);
    });
}

// Render Rules List Modal Function
function renderRulesList() {
    const rulesListContainer = document.getElementById('rulesListContainer');
    rulesListContainer.innerHTML = '';

    const items = currentRuleCategory === 'academic' ? academicItems : nonAcademicItems;

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'rule-item-card';
        card.innerHTML = `
            <div class="rule-item-info">
                <div class="rule-item-icon">
                    <i class="fa-solid fa-box-archive" style="color: #2563eb; font-size: 12px;"></i>
                </div>
                <div class="rule-item-details">
                    <h4>${item.name}</h4>
                    <span>${item.code}</span>
                </div>
            </div>
            <i class="fa-solid fa-chevron-right rule-chevron"></i>
        `;
        card.addEventListener('click', () => openRuleEditView(item));
        rulesListContainer.appendChild(card);
    });
}

function openRuleEditView(item) {
    selectedRuleItem = item;
    document.getElementById('rulesModalMainTitle').textContent = "Update Borrowing Rules";
    document.getElementById('editItemName').textContent = item.name;
    document.getElementById('editItemCode').textContent = item.code;
    document.getElementById('checkWaiver').checked = item.waiver;
    document.getElementById('checkIdSurrender').checked = item.idSurrender;

    document.getElementById('rulesListView').classList.add('hidden');
    document.getElementById('ruleEditView').classList.remove('hidden');
}

function backToRulesList() {
    document.getElementById('rulesModalMainTitle').textContent = "Update Borrowing Rules";
    document.getElementById('ruleEditView').classList.add('hidden');
    document.getElementById('rulesListView').classList.remove('hidden');
}

function saveRuleChanges() {
    if (selectedRuleItem) {
        selectedRuleItem.waiver = document.getElementById('checkWaiver').checked;
        selectedRuleItem.idSurrender = document.getElementById('checkIdSurrender').checked;
        alert(`Borrowing rules updated successfully for ${selectedRuleItem.name}!`);
    }
    backToRulesList();
}

// Render Availability List Modal Function
function renderAvailList() {
    const availListContainer = document.getElementById('availListContainer');
    availListContainer.innerHTML = '';

    const items = currentAvailCategory === 'academic' ? academicItems : nonAcademicItems;

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'rule-item-card';
        card.innerHTML = `
            <div class="rule-item-info">
                <div class="rule-item-icon">
                    <i class="fa-solid fa-dice" style="color: #2563eb; font-size: 12px;"></i>
                </div>
                <div class="rule-item-details">
                    <h4>${item.name}</h4>
                    <span>${item.code}</span>
                </div>
            </div>
            <span class="status-badge ${item.statusClass}">${item.status}</span>
        `;
        card.addEventListener('click', () => openAvailEditView(item));
        availListContainer.appendChild(card);
    });
}

function openAvailEditView(item) {
    selectedAvailItem = item;
    document.getElementById('availabilityModalTitle').textContent = "Update Availability";
    document.getElementById('availEditName').textContent = item.name;
    document.getElementById('availEditCode').textContent = item.code;
    document.getElementById('availStatusSelect').value = item.status;
    document.getElementById('availStockInput').value = item.stock;

    const badgePreview = document.getElementById('availEditBadgePreview');
    badgePreview.textContent = item.status;
    badgePreview.className = `status-badge ${item.statusClass}`;

    document.getElementById('availListView').classList.add('hidden');
    document.getElementById('availEditView').classList.remove('hidden');
}

function backToAvailList() {
    document.getElementById('availabilityModalTitle').textContent = "Update Availability";
    document.getElementById('availEditView').classList.add('hidden');
    document.getElementById('availListView').classList.remove('hidden');
    renderAvailList();
}

function saveAvailabilityChanges() {
    if (selectedAvailItem) {
        const newStatus = document.getElementById('availStatusSelect').value;
        const newStock = document.getElementById('availStockInput').value;

        selectedAvailItem.status = newStatus;
        selectedAvailItem.stock = newStock;
        selectedAvailItem.statusClass = newStatus === 'Available' ? 'status-available' : 'status-borrowed';
        
        alert(`Availability updated successfully for ${selectedAvailItem.name}!`);
        renderInventoryTable();
    }
    backToAvailList();
}

// Category Tab Switchers
const categoryTabBtns = document.querySelectorAll('.dashboard-body > .role-tabs .role-tab-btn');
categoryTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        categoryTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        renderInventoryTable();
    });
});

const rulesTabBtns = document.querySelectorAll('.rules-role-btn');
rulesTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        rulesTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRuleCategory = e.target.getAttribute('data-rulecat');
        renderRulesList();
    });
});

const availTabBtns = document.querySelectorAll('.avail-role-btn');
availTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        availTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentAvailCategory = e.target.getAttribute('data-availcat');
        renderAvailList();
    });
});

// Render Notifications Function
function renderNotifications() {
    const notifListContainer = document.getElementById('notifListContainer');
    const notifBadge = document.getElementById('notifBadge');
    notifListContainer.innerHTML = '';

    let filtered = notificationsData;
    if (currentNotifTab === 'unread') {
        filtered = notificationsData.filter(n => n.unread);
    } else if (currentNotifTab === 'alerts') {
        filtered = notificationsData.filter(n => n.type === 'alert');
    }

    if (filtered.length === 0) {
        notifListContainer.innerHTML = `<div class="empty-notif">No notifications found.</div>`;
    } else {
        filtered.forEach(n => {
            const card = document.createElement('div');
            card.className = `notif-card ${n.type === 'alert' ? 'is-alert' : ''}`;
            card.innerHTML = `
                <p>${n.text}</p>
                ${n.unread ? `<button class="mark-read-btn" onclick="markAsRead(${n.id})">Mark as read</button>` : '<span style="font-size: 10px; color: #94a3b8;">Read</span>'}
            `;
            notifListContainer.appendChild(card);
        });
    }

    const unreadCount = notificationsData.filter(n => n.unread).length;
    if (unreadCount > 0) {
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = 'flex';
    } else {
        notifBadge.style.display = 'none';
    }
}

function markAsRead(id) {
    const item = notificationsData.find(n => n.id === id);
    if (item) item.unread = false;
    renderNotifications();
}

const notifTabBtns = document.querySelectorAll('.notif-popup .tab-btn');
notifTabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        notifTabBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentNotifTab = e.target.getAttribute('data-tab');
        renderNotifications();
    });
});

// Side Drawer Navigation
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

function openSideMenu() {
    sideMenu.classList.add('active');
    menuOverlay.classList.add('active');
}

function closeSideMenu() {
    sideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
}

menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openSideMenu();
});
closeMenuBtn.addEventListener('click', closeSideMenu);
menuOverlay.addEventListener('click', closeSideMenu);

// Dropdown Toggles (Notifications & Profile)
const notifWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');
const profileWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');

notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileWrapper.classList.remove('active');
    notifWrapper.classList.toggle('active');
    renderNotifications();
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

// Modals Functionality
const addItemBtn = document.getElementById('addItemBtn');
const addItemModal = document.getElementById('addItemModal');
const openRulesModal = document.getElementById('openRulesModal');
const rulesModal = document.getElementById('rulesModal');
const openAvailabilityModal = document.getElementById('openAvailabilityModal');
const availabilityModal = document.getElementById('availabilityModal');

addItemBtn.addEventListener('click', () => addItemModal.classList.remove('hidden'));
openRulesModal.addEventListener('click', () => {
    backToRulesList();
    renderRulesList();
    rulesModal.classList.remove('hidden');
});
openAvailabilityModal.addEventListener('click', () => {
    backToAvailList();
    renderAvailList();
    availabilityModal.classList.remove('hidden');
});

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Initial Renders
renderInventoryTable();
renderNotifications();