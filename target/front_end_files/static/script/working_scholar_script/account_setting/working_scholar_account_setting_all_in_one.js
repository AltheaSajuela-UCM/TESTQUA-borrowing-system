// Clean state ready for backend integration
let notifications = [];
let isEditing = false;

// Initial user profile values
let userProfile = {
    fullName: "Ana Reyes",
    wsId: "80000001",
    mobileNumber: "09175550101",
    programYear: ""
};

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

// Render Notifications
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

function switchNotifTab(tabName) {
    document.querySelectorAll('.notif-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderNotifications(tabName);
}

function markAsRead(id) {
    notifications = notifications.filter(n => n.id !== id);
    if (notifications.length === 0) {
        document.getElementById('notif-dot').style.display = 'none';
    }
    renderNotifications('all');
}

// Enable/Disable Form Edit Mode
function toggleEditMode() {
    isEditing = true;

    // Enable editable fields
    document.getElementById('full-name').disabled = false;
    document.getElementById('mobile-number').disabled = false;
    document.getElementById('program-year').disabled = false;
    // WS ID remains read-only as system identifier
    
    // Replace top right button with Save & Cancel buttons
    const container = document.getElementById('action-buttons-container');
    container.innerHTML = `
        <div class="action-buttons-group">
            <button class="btn btn-light" type="button" onclick="cancelEditMode()">Cancel</button>
            <button class="btn btn-primary" type="button" onclick="document.getElementById('account-form').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}))">Save Changes</button>
        </div>
    `;

    document.getElementById('full-name').focus();
}

function cancelEditMode() {
    isEditing = false;

    // Restore original values
    document.getElementById('full-name').value = userProfile.fullName;
    document.getElementById('ws-id').value = userProfile.wsId;
    document.getElementById('mobile-number').value = userProfile.mobileNumber;
    document.getElementById('program-year').value = userProfile.programYear;

    // Disable all fields
    document.getElementById('full-name').disabled = true;
    document.getElementById('ws-id').disabled = true;
    document.getElementById('mobile-number').disabled = true;
    document.getElementById('program-year').disabled = true;

    // Reset button bar
    resetActionButton();
}

function resetActionButton() {
    const container = document.getElementById('action-buttons-container');
    container.innerHTML = `<button id="edit-toggle-btn" class="btn btn-primary" onclick="toggleEditMode()">Edit Account Settings</button>`;
}

// Save Updated Settings
function saveAccountSettings(e) {
    e.preventDefault();

    userProfile.fullName = document.getElementById('full-name').value.trim();
    userProfile.mobileNumber = document.getElementById('mobile-number').value.trim();
    userProfile.programYear = document.getElementById('program-year').value.trim();

    // Update display headers
    document.getElementById('display-name').innerText = userProfile.fullName;

    // Compute initials for avatar badge
    const initials = userProfile.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'WS';
    document.getElementById('header-avatar').innerText = initials;
    document.getElementById('card-avatar').innerText = initials;

    // Lock fields back up
    document.getElementById('full-name').disabled = true;
    document.getElementById('ws-id').disabled = true;
    document.getElementById('mobile-number').disabled = true;
    document.getElementById('program-year').disabled = true;

    isEditing = false;
    resetActionButton();

    alert("Account settings saved successfully!");
}

// Close dropdowns when clicking outside
window.onclick = function(event) {
    if (!event.target.closest('.dropdown-container')) {
        closeAllDropdowns();
    }
};