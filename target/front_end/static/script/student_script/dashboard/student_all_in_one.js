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
const leftEdgeHover = document.getElementById('leftEdgeHover');
const sideMenu = document.getElementById('sideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');
const SIDEBAR_STORAGE_KEY = 'webventory_sidebar_open';
let sideMenuCloseTimer = null;

const notifDropdownWrapper = document.getElementById('notifDropdownWrapper');
const notifBtn = document.getElementById('notifBtn');

const profileDropdownWrapper = document.getElementById('profileDropdownWrapper');
const profileBtn = document.getElementById('profileBtn');

// 1. SIDE MENU (DRAWER) TOGGLE & HOVER
function setSideMenuState(isOpen, persist = true, showOverlay = true) {
    clearTimeout(sideMenuCloseTimer);
    if (sideMenu) sideMenu.classList.toggle('active', isOpen);
    if (menuOverlay) menuOverlay.classList.toggle('active', isOpen && showOverlay);
    if (persist) {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'true' : 'false');
        } catch (err) {}
    }
}

function openSideMenu() {
    setSideMenuState(true, true, true);
}

function closeSideMenu() {
    setSideMenuState(false, true, false);
}

function scheduleSideMenuClose() {
    clearTimeout(sideMenuCloseTimer);
    sideMenuCloseTimer = setTimeout(() => {
        const hoveringMenu = menuBtn && menuBtn.matches(':hover');
        const hoveringEdge = leftEdgeHover && leftEdgeHover.matches(':hover');
        const hoveringDrawer = sideMenu && sideMenu.matches(':hover');
        if (!hoveringMenu && !hoveringEdge && !hoveringDrawer) {
            setSideMenuState(false, false, false);
        }
    }, 150);
}

if (menuBtn) {
    menuBtn.addEventListener('mouseenter', () => setSideMenuState(true, false, false));
    menuBtn.addEventListener('mouseleave', scheduleSideMenuClose);
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSideMenu();
    });
}

if (leftEdgeHover) {
    leftEdgeHover.addEventListener('mouseenter', () => setSideMenuState(true, false, false));
    leftEdgeHover.addEventListener('mouseleave', scheduleSideMenuClose);
}

if (sideMenu) {
    sideMenu.addEventListener('mouseenter', () => clearTimeout(sideMenuCloseTimer));
    sideMenu.addEventListener('mouseleave', scheduleSideMenuClose);
}

if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeSideMenu);
if (menuOverlay) menuOverlay.addEventListener('click', closeSideMenu);

// Keep side menu open across page navigation when user clicks a menu link
if (sideMenu) {
    const sideLinks = sideMenu.querySelectorAll('a');
    sideLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
            } catch (err) {}
        });
    });
}

// Restore side menu state on page load
try {
    if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true') {
        openSideMenu();
    }
} catch (err) {}

// 2. NOTIFICATION DROPDOWN TOGGLE
if (notifBtn && notifDropdownWrapper) {
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profileDropdownWrapper) profileDropdownWrapper.classList.remove('active'); // Close profile if open
        notifDropdownWrapper.classList.toggle('active');
    });
}

// 3. PROFILE DROPDOWN TOGGLE
if (profileBtn && profileDropdownWrapper) {
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notifDropdownWrapper) notifDropdownWrapper.classList.remove('active'); // Close notification if open
        profileDropdownWrapper.classList.toggle('active');
    });
}

// CLOSE ALL DROPDOWNS ON CLICK OUTSIDE
document.addEventListener('click', (e) => {
    if (notifDropdownWrapper && !notifDropdownWrapper.contains(e.target)) {
        notifDropdownWrapper.classList.remove('active');
    }
    if (profileDropdownWrapper && !profileDropdownWrapper.contains(e.target)) {
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
    if (!notifListEl) return;
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
if (notifListEl) {
    notifListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.mark-read-btn');
        if (!btn) return;
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const n = notifs.find((x) => x.id === id);
        if (n) { n.read = true; saveReadId(notifOwner, id); }
        renderPopup();
    });
}

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

        const welcomeNameEl = document.getElementById('welcomeName');
        const todayDateEl = document.getElementById('todayDate');
        if (welcomeNameEl) welcomeNameEl.textContent = `Welcome, ${first}!`;
        if (todayDateEl) {
            todayDateEl.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
        guideSteps[0].title = `Welcome to Webventory, ${first}!`;

        const statActiveEl = document.getElementById('statActive');
        const statOverdueEl = document.getElementById('statOverdue');
        const statAvailableEl = document.getElementById('statAvailable');
        if (statActiveEl) statActiveEl.textContent = d.stats.active;
        if (statOverdueEl) statOverdueEl.textContent = d.stats.overdue;
        if (statAvailableEl) statAvailableEl.textContent = d.stats.available;

        const body = document.getElementById('activeBorrowingsBody');
        if (body && d.active_borrowings.length > 0) {
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
    if (guideStepTitle) guideStepTitle.textContent = `BORROWING GUIDE · ${data.step}`;
    if (guideTitle) guideTitle.textContent = data.title;
    if (guideDescription) guideDescription.textContent = data.description;
    if (guideBoxText) guideBoxText.textContent = data.boxText;
    if (guideNextBtn) guideNextBtn.textContent = data.nextText;

    // Buttons state
    if (guideBackBtn) guideBackBtn.disabled = currentGuideStep === 0;

    // Progress bar fills
    progressBars.forEach((bar, index) => {
        if (index <= currentGuideStep) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
    });
}

if (openGuideBtn && guideModalOverlay) {
    openGuideBtn.addEventListener('click', () => {
        currentGuideStep = 0;
        updateGuideModal();
        guideModalOverlay.classList.remove('hidden');
    });
}

function closeGuideModal() {
    if (guideModalOverlay) guideModalOverlay.classList.add('hidden');
}

if (guideExitBtn) guideExitBtn.addEventListener('click', closeGuideModal);

if (guideNextBtn) {
    guideNextBtn.addEventListener('click', () => {
        if (currentGuideStep < guideSteps.length - 1) {
            currentGuideStep++;
            updateGuideModal();
        } else {
            closeGuideModal(); // Finished all steps
        }
    });
}

if (guideBackBtn) {
    guideBackBtn.addEventListener('click', () => {
        if (currentGuideStep > 0) {
            currentGuideStep--;
            updateGuideModal();
        }
    });
}