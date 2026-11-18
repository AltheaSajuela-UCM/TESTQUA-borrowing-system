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

    profileMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle("hidden");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
        if (!profileDropdown.classList.contains("hidden")) {
            profileDropdown.classList.add("hidden");
        }
    });

    // 3. Account Settings: load from and save to the backend
    const PROFILE_API = "../../../../backend/3_student/account_setting.php";
    const editBtn = document.getElementById("edit-btn");
    const messageBox = document.getElementById("settings-message");
    const fields = {
        full_name: document.getElementById("full-name"),
        identifier_id: document.getElementById("student-id"),
        email: document.getElementById("email"),
        mobile_number: document.getElementById("mobile-number"),
        campus: document.getElementById("campus"),
        academic_level: document.getElementById("academic-level")
    };
    let isEditing = false;

    function showMessage(text, isError) {
        messageBox.textContent = text;
        messageBox.style.color = isError ? "#dc3545" : "#198754";
        messageBox.style.display = text ? "block" : "none";
    }

    function initialsOf(name) {
        const parts = (name || "").trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "--";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function fillForm(p) {
        fields.full_name.value = p.full_name || "";
        fields.identifier_id.value = p.identifier_id || "";
        fields.email.value = p.email || "";
        fields.mobile_number.value = p.mobile_number || "";
        fields.campus.value = p.campus || "";
        fields.academic_level.value = p.academic_level || "";
        document.getElementById("user-name").textContent = p.full_name || "";
        document.getElementById("avatar-large").textContent = initialsOf(p.full_name);
        document.getElementById("header-initials").textContent = initialsOf(p.full_name);
    }

    function setEditing(on) {
        isEditing = on;
        Object.values(fields).forEach(f => { f.disabled = !on; });
        editBtn.textContent = on ? "Save Changes" : "Edit Account Settings";
        editBtn.style.backgroundColor = on ? "#198754" : "#0d6efd";
    }

    async function loadProfile() {
        try {
            const res = await fetch(PROFILE_API, { credentials: "same-origin" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unable to load your profile.");
            fillForm(data);
        } catch (err) {
            showMessage(err.message, true);
        }
    }

    editBtn.addEventListener("click", async () => {
        if (!isEditing) {
            showMessage("", false);
            setEditing(true);
            fields.full_name.focus();
            return;
        }

        editBtn.disabled = true;
        editBtn.textContent = "Saving...";
        try {
            const res = await fetch(PROFILE_API, {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fields.full_name.value.trim(),
                    identifier_id: fields.identifier_id.value.trim(),
                    email: fields.email.value.trim(),
                    mobile_number: fields.mobile_number.value.trim(),
                    campus: fields.campus.value,
                    academic_level: fields.academic_level.value
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save changes.");

            fillForm(data.profile);
            setEditing(false);
            showMessage("Account settings updated successfully.", false);
        } catch (err) {
            editBtn.textContent = "Save Changes";   // stay in edit mode so they can correct it
            showMessage(err.message, true);
        } finally {
            editBtn.disabled = false;
        }
    });

    loadProfile();
});