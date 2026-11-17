// Admin > Account Settings: wired to backend/1_admin/account_setting.php (same endpoint as backend/api/profile.php):
// loads the logged-in admin's name, ID and mobile number, and saves changes to them. Page markup is unchanged.
// Put this file at: target/front_end/static/script/admin_script/account_setting/admin_all_in_one.js
const API = '../../../../backend/1_admin/account_setting.php';

function initialsOf(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sidebar Toggle Logic
    const menuBtn = document.getElementById("menu-btn");
    const closeSidebarBtn = document.getElementById("close-sidebar-btn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener("click", () => {
            sidebar.classList.remove("closed");
            overlay.classList.remove("hidden");
        });

        const closeSidebar = () => {
            sidebar.classList.add("closed");
            overlay.classList.add("hidden");
        };

        if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
        overlay.addEventListener("click", closeSidebar);
    }

    // 2. Profile Dropdown Toggle Logic
    const profileMenuBtn = document.getElementById("profile-menu-btn");
    const profileDropdown = document.getElementById("profile-dropdown");

    if (profileMenuBtn && profileDropdown) {
        profileMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("hidden");
        });

        document.addEventListener("click", () => {
            if (!profileDropdown.classList.contains("hidden")) {
                profileDropdown.classList.add("hidden");
            }
        });
    }

    // 3. Load and save the profile
    const editBtn = document.getElementById("edit-btn");
    const formInputs = document.querySelectorAll("#settings-form input");
    const nameInput = document.getElementById("full-name");
    const idInput = document.getElementById("admin-id");
    const mobileInput = document.getElementById("mobile-number");
    let isEditing = false;

    function showProfile(p) {
        nameInput.value = p.full_name || '';
        idInput.value = p.identifier_id || '';
        mobileInput.value = p.mobile_number || '';

        const initials = initialsOf(p.full_name);
        const headerName = document.querySelector('.user-info h2');
        const role = document.querySelector('.user-role');
        const bigAvatar = document.querySelector('.user-avatar-large');
        const smallAvatar = document.querySelector('.avatar-initials');
        if (headerName) headerName.textContent = p.full_name || '';
        if (role && p.role_title) role.textContent = p.role_title;
        if (bigAvatar) bigAvatar.textContent = initials;
        if (smallAvatar) smallAvatar.textContent = initials;
    }

    function setEditing(on) {
        isEditing = on;
        formInputs.forEach(input => { input.disabled = !on; });
        if (on) {
            editBtn.textContent = "Save Changes";
            editBtn.style.backgroundColor = "#198754";      // success green
            nameInput.focus();
        } else {
            editBtn.textContent = "Edit Account Settings";
            editBtn.style.backgroundColor = "#0d6efd";      // back to blue
        }
    }

    async function loadProfile() {
        try {
            const res = await fetch(API, { credentials: 'same-origin' });
            if (!res.ok) return;                            // auth.js already redirects when the session is gone
            showProfile(await res.json());
        } catch (err) { /* server unreachable: leave the page as it is */ }
    }

    async function saveProfile() {
        const full_name = nameInput.value.trim();
        const identifier_id = idInput.value.trim();
        const mobile_number = mobileInput.value.trim();

        if (!full_name) { alert('Full name is required.'); return; }
        if (!/^\d{8}$/.test(identifier_id)) { alert('Admin ID must be exactly 8 digits.'); return; }

        editBtn.disabled = true;
        try {
            const res = await fetch(API, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name, identifier_id, mobile_number })
            });
            let data = {};
            try { data = await res.json(); } catch (e) { /* non-JSON */ }
            if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));

            showProfile(data.profile || { full_name, identifier_id, mobile_number });
            setEditing(false);
            alert('Account settings saved.');
        } catch (err) {
            alert(err.message);                             // stay in edit mode so nothing typed is lost
        } finally {
            editBtn.disabled = false;
        }
    }

    if (editBtn) {
        editBtn.addEventListener("click", () => {
            if (!isEditing) setEditing(true);
            else saveProfile();
        });
    }

    loadProfile();
});
    