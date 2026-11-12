// Clean initial state (empty arrays and 0 metrics ready for backend integration)
let pendingRequests = [];
let overdueAlerts = [];
let notifications = [];

// WS Guide Modal Steps Configuration
const guideSteps = [
    {
        step: "WORKING SCHOLAR GUIDE - STEP 1 OF 4",
        title: "Welcome, Ben!",
        desc: "You will use the Working Scholar Portal to process requests, release inventory, record returns, and assist students."
    },
    {
        step: "WORKING SCHOLAR GUIDE - STEP 2 OF 4",
        title: "Process borrowing requests",
        desc: "Open Process Requests, verify the transaction number, student name, ID, mobile number, item, and any notes. Choose Yes, Complete to approve or Incomplete to reject with a reason. Set the expected return schedule before approval."
    },
    {
        step: "WORKING SCHOLAR GUIDE - STEP 3 OF 4",
        title: "Release the requested item",
        desc: "Retrieve the item from inventory, verify the transaction number as your reference, inspect its condition, and release it to the correct student."
    },
    {
        step: "WORKING SCHOLAR GUIDE - STEP 4 OF 4",
        title: "Record an item return",
        desc: "Ask the student for the transaction number, inspect the returned item, choose its condition—including Lost or Damaged when applicable—and select Complete Return."
    }
];

let currentGuideStep = 0;

// Toggle Sidebar Navigation Drawer
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebar-overlay').classList.toggle('show');
}

// Toggle Profile Dropdown
function toggleProfileDropdown() {
    closeAllDropdowns();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

// Toggle Notification Dropdown
function toggleNotificationDropdown() {
    closeAllDropdowns();
    document.getElementById('notification-dropdown').classList.toggle('show');
    renderNotifications('all');
}

// Close All Dropdowns
function closeAllDropdowns() {
    document.getElementById('profile-dropdown').classList.remove('show');
    document.getElementById('notification-dropdown').classList.remove('show');
}

// Render Notifications based on tab
function renderNotifications(filter) {
    const container = document.getElementById('notif-list-container');
    container.innerHTML = '';

    let filtered = notifications;
    if (filter === 'unread') {
        filtered = notifications.filter(n => n.type === 'unread');
    } else if (filter === 'alerts') {
        filtered = notifications.filter(n => n.isAlert);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 16px; font-size: 12px;">No notifications</div>`;
        return;
    }

    filtered.forEach(notif => {
        const card = document.createElement('div');
        card.className = `notif-card ${notif.isAlert ? 'alert-card' : ''}`;
        card.innerHTML = `
            <div>${notif.text}</div>
            <button class="mark-read-btn" onclick="markAsRead(${notif.id})">Mark as read</button>
        `;
        container.appendChild(card);
    });
}

// Switch Notification Tab
function switchNotifTab(tabName) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderNotifications(tabName);
}

// Mark notification as read
function markAsRead(id) {
    notifications = notifications.filter(n => n.id !== id);
    if (notifications.length === 0) {
        document.getElementById('notif-dot').style.display = 'none';
    }
    renderNotifications('all');
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};

// Render Pending Requests Table (Empty State)
function renderPendingTable(data) {
    const tbody = document.getElementById('pending-table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 24px; font-size: 13px;">No pending requests</td></tr>`;
        return;
    }
}

// Render Overdue Alerts List (Empty State)
function renderOverdueAlerts(data) {
    const container = document.getElementById('overdue-list-container');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 24px; font-size: 13px;">No overdue alerts</div>`;
        return;
    }
}

// Update Metrics UI
function updateMetrics() {
    document.getElementById('metric-pending').innerText = pendingRequests.length;
    document.getElementById('metric-borrowed').innerText = 0;
    document.getElementById('metric-overdue').innerText = overdueAlerts.length;
    document.getElementById('metric-available').innerText = 0;
}

// WS Guide Modal Controls
function openGuideModal() {
    currentGuideStep = 0;
    updateGuideModalContent();
    document.getElementById('modal-overlay').classList.add('show');
}

function closeGuideModal() {
    document.getElementById('modal-overlay').classList.remove('show');
}

function updateGuideModalContent() {
    const stepData = guideSteps[currentGuideStep];
    document.getElementById('guide-step-indicator').innerText = stepData.step;
    document.getElementById('guide-title').innerText = stepData.title;
    document.getElementById('guide-desc').innerText = stepData.desc;

    const backBtn = document.getElementById('guide-back-btn');
    const nextBtn = document.getElementById('guide-next-btn');

    if (currentGuideStep === 0) {
        backBtn.style.visibility = 'hidden';
    } else {
        backBtn.style.visibility = 'visible';
    }

    if (currentGuideStep === guideSteps.length - 1) {
        nextBtn.innerText = 'Finish guide';
    } else {
        nextBtn.innerText = 'Next step';
    }
}

function nextGuideStep() {
    if (currentGuideStep < guideSteps.length - 1) {
        currentGuideStep++;
        updateGuideModalContent();
    } else {
        closeGuideModal();
    }
}

function prevGuideStep() {
    if (currentGuideStep > 0) {
        currentGuideStep--;
        updateGuideModalContent();
    }
}

// Initialize on page load with clean empty states
window.onload = () => {
    renderPendingTable(pendingRequests);
    renderOverdueAlerts(overdueAlerts);
    updateMetrics();
};