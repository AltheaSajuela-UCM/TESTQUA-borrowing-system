// ==========================================
// Backend helpers (student portal)
// ==========================================
const STUDENT_API = '../../../../backend/3_student/';
const LOGIN_PAGE = '../../login_page/index.html';

function esc(v) {
    return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
function txCode(id) { return 'TXN-' + String(id).padStart(5, '0'); }
function dateOnly(s) { return s ? String(s).slice(0, 10) : ''; }
function prettyTime(s) {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T'));
    return isNaN(d) ? String(s) : d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
}

// Calls a backend/3_student endpoint. Sends the user to login if the session is gone.
async function studentApi(file, options) {
    const res = await fetch(STUDENT_API + file, Object.assign({ credentials: 'same-origin' }, options || {}));
    if (res.status === 401 || res.status === 403) {
        window.location.replace(LOGIN_PAGE);
        throw new Error('auth');
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* non-JSON response */ }
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
}

// Notifications are built from transactions, so "read" is remembered in this browser.
function loadReadIds(owner) {
    try { return JSON.parse(localStorage.getItem('webventory_read_notifs_' + owner) || '[]'); }
    catch (e) { return []; }
}
function saveReadId(owner, id) {
    try {
        const ids = loadReadIds(owner);
        if (!ids.includes(id)) { ids.push(id); localStorage.setItem('webventory_read_notifs_' + owner, JSON.stringify(ids)); }
    } catch (e) { /* storage unavailable */ }
}

// Elements Selection
const menuBtn = document.getElementById('menuBtn');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

const notifDropdownWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');

const profileDropdownWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');

// 1. SIDE MENU (DRAWER) TOGGLE
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

// 2. NOTIFICATION DROPDOWN TOGGLE
notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdownWrapper.classList.remove('active'); // Close profile if open
    notifDropdownWrapper.classList.toggle('active');
});

// 3. PROFILE DROPDOWN TOGGLE
profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdownWrapper.classList.remove('active'); // Close notification if open
    profileDropdownWrapper.classList.toggle('active');
});

// CLOSE ALL DROPDOWNS ON CLICK OUTSIDE
document.addEventListener('click', (e) => {
    if (!notifDropdownWrapper.contains(e.target)) {
        notifDropdownWrapper.classList.remove('active');
    }
    if (!profileDropdownWrapper.contains(e.target)) {
        profileDropdownWrapper.classList.remove('active');
    }
});

// 4. LIVE DATA: notifications, stats and active borrowings
let notifs = [];
let notifTab = 'all';
let notifOwner = '';
const notifListEl = document.querySelector('#notifPopup .notif-list');
const tabBtns = document.querySelectorAll('.tab-btn');

function renderPopup() {
    let shown = notifs;
    if (notifTab === 'unread') shown = notifs.filter((n) => !n.read);
    else if (notifTab === 'alerts') shown = notifs.filter((n) => n.alert);

    if (shown.length === 0) {
        notifListEl.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:12px;">No notifications</div>';
        return;
    }
    notifListEl.innerHTML = shown.map((n) => `
        <div class="notif-card ${n.read ? '' : 'is-unread'}" data-type="${n.alert ? 'alert' : 'normal'}">
            <p>${esc(n.message)}</p>
            ${n.read ? '' : `<button class="mark-read-btn" data-id="${n.id}">Mark as read</button>`}
        </div>`).join('');
}

function renderRecent() {
    const box = document.getElementById('recentNotifications');
    if (!box || notifs.length === 0) return;
    box.innerHTML = notifs.slice(0, 3).map((n) => `
        <div class="notification-item">
            <span class="notif-icon">${esc(n.icon || '🔔')}</span>
            <div>
                <p class="notif-text">${esc(n.message)}</p>
                <span class="notif-time">${esc(prettyTime(n.time))}</span>
            </div>
        </div>`).join('');
}

tabBtns.forEach((tab) => {
    tab.addEventListener('click', () => {
        tabBtns.forEach((btn) => btn.classList.remove('active'));
        tab.classList.add('active');
        notifTab = tab.dataset.tab;
        renderPopup();
    });
});

// Mark as read (stopPropagation: the list re-renders, which would otherwise look like an outside click)
notifListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.mark-read-btn');
    if (!btn) return;
    e.stopPropagation();
    const id = Number(btn.dataset.id);
    const n = notifs.find((x) => x.id === id);
    if (n) { n.read = true; saveReadId(notifOwner, id); }
    renderPopup();
});

const openPageBtn = document.querySelector('#notifPopup .open-page-btn');
if (openPageBtn) {
    openPageBtn.addEventListener('click', () => { window.location.href = 'student_notification.html'; });
}

async function loadNotifs() {
    try {
        const data = await studentApi('notifications.php');
        notifOwner = data.owner;
        const read = loadReadIds(notifOwner);
        notifs = (data.notifications || []).map((n) => ({
            id: n.id, message: n.message, time: n.time, icon: n.icon,
            alert: !!n.alert, read: read.includes(n.id)
        }));
        renderPopup();
        renderRecent();
    } catch (err) { /* keep the placeholder */ }
}

async function loadDashboard() {
    try {
        const d = await studentApi('dashboard.php');
        const first = String(d.user.full_name || 'Student').split(' ')[0];

        document.getElementById('welcomeName').textContent = `Welcome, ${first}!`;
        document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        guideSteps[0].title = `Welcome to Webventory, ${first}!`;

        document.getElementById('statActive').textContent = d.stats.active;
        document.getElementById('statOverdue').textContent = d.stats.overdue;
        document.getElementById('statAvailable').textContent = d.stats.available;

        const body = document.getElementById('activeBorrowingsBody');
        if (d.active_borrowings.length > 0) {
            body.innerHTML = d.active_borrowings.map((b) => {
                const overdue = Number(b.is_overdue) === 1;
                const pill = overdue
                    ? 'background:#fee2e2;color:#b91c1c'
                    : 'background:#dbeafe;color:#1e40af';
                return `<tr>
                    <td>${esc(b.item_name)}</td>
                    <td>${esc(b.item_code)}</td>
                    <td>${esc(dateOnly(b.expected_return_date) || '—')}</td>
                    <td><span style="${pill};font-size:11px;font-weight:600;padding:3px 10px;border-radius:9999px;display:inline-block">${overdue ? 'Overdue' : 'Borrowed'}</span></td>
                </tr>`;
            }).join('');
        }
    } catch (err) { /* leave the page's default content */ }
}

loadDashboard();
loadNotifs();

// ==========================================
// 5. "HOW BORROWING WORKS" GUIDE MODAL LOGIC
// ==========================================
const guideModalOverlay = document.getElementById('guideModalOverlay');
const openGuideBtn = document.getElementById('openGuideBtn');
const guideExitBtn = document.getElementById('guideExitBtn');
const guideBackBtn = document.getElementById('guideBackBtn');
const guideNextBtn = document.getElementById('guideNextBtn');

const guideStepTitle = document.getElementById('guideStepTitle');
const guideTitle = document.getElementById('guideTitle');
const guideDescription = document.getElementById('guideDescription');
const guideBoxText = document.getElementById('guideBoxText');
const progressBars = document.querySelectorAll('.guide-progress-bars .progress-bar');

const guideSteps = [
    {
        step: "STEP 1 OF 6",
        title: "Welcome to Webventory, Juan!",
        description: "Webventory is your Student Portal for requesting, claiming, managing, and returning items from the Student Affairs Office.",
        boxText: "This quick guide will show you the complete borrowing process before you begin.",
        nextText: "Next step"
    },
    {
        step: "STEP 2 OF 6",
        title: "Create a borrowing request",
        description: "Choose Academic or Non-Academic, select the item you want, review the automatically filled details, then confirm the request or exit.",
        boxText: "You can review your request before submitting it.",
        nextText: "Next step"
    },
    {
        step: "STEP 3 OF 6",
        title: "Claim your item at the SAO Office",
        description: "Proceed to the SAO Office at the Alicia Gotianuy Building, beside the Scholarship Office.",
        boxText: "Take a screenshot or picture of your transaction number and present it to the Working Scholar. Handle every borrowed item with care.",
        nextText: "Next step"
    },
    {
        step: "STEP 4 OF 6",
        title: "Cancel a pending request",
        description: "Open Cancel Borrow Request, select the pending item, then confirm the cancellation or go back.",
        boxText: "Cancellation is only available after a request has been submitted and before the item is released.",
        nextText: "Next step"
    },
    {
        step: "STEP 5 OF 6",
        title: "Return the borrowed item",
        description: "Bring the item back to the SAO Office at the Alicia Gotianuy Building, beside the Scholarship Office, and present your transaction number.",
        boxText: "Items must be complete and must not be damaged or lost, especially board games and other Non-Academic items.",
        nextText: "Next step"
    },
    {
        step: "STEP 6 OF 6",
        title: "What to do when an item is overdue",
        description: "Return the item to the SAO Office as soon as possible. Present the borrowed item together with your transaction number, student ID, and name to the Working Scholar.",
        boxText: "Webventory will notify you when a borrowed item becomes overdue, or when an item is removed from the catalog or becomes unavailable.",
        nextText: "Start borrowing"
    }
];

let currentGuideStep = 0;

function updateGuideModal() {
    const data = guideSteps[currentGuideStep];
    guideStepTitle.textContent = `BORROWING GUIDE · ${data.step}`;
    guideTitle.textContent = data.title;
    guideDescription.textContent = data.description;
    guideBoxText.textContent = data.boxText;
    guideNextBtn.textContent = data.nextText;

    // Buttons state
    guideBackBtn.disabled = currentGuideStep === 0;

    // Progress bar fills
    progressBars.forEach((bar, index) => {
        if (index <= currentGuideStep) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    });
}

openGuideBtn.addEventListener('click', () => {
    currentGuideStep = 0;
    updateGuideModal();
    guideModalOverlay.classList.remove('hidden');
});

function closeGuideModal() {
    guideModalOverlay.classList.add('hidden');
}

guideExitBtn.addEventListener('click', closeGuideModal);

guideNextBtn.addEventListener('click', () => {
    if (currentGuideStep < guideSteps.length - 1) {
        currentGuideStep++;
        updateGuideModal();
    } else {
        closeGuideModal(); // Finished all steps
    }
});

guideBackBtn.addEventListener('click', () => {
    if (currentGuideStep > 0) {
        currentGuideStep--;
        updateGuideModal();
    }
});