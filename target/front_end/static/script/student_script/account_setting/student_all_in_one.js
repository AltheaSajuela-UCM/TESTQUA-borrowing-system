document.addEventListener("DOMContentLoaded", () => {
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

    const editBtn = document.getElementById("edit-btn");
    const form = document.getElementById("settings-form");
    const fullNameInput = document.getElementById("full-name");
    const mobileInput = document.getElementById("mobile-number");
    const message = document.getElementById("settings-message");
    const editableInputs = [fullNameInput, mobileInput];
    const apiUrl = "../../../../backend/api/profile.php";
    let isEditing = false;

    function showMessage(text, isError) {
        message.textContent = text;
        message.classList.toggle("error", isError);
    }

    function setProfile(profile) {
        fullNameInput.value = profile.full_name || "";
        document.getElementById("student-id").value = profile.identifier_id || "";
        mobileInput.value = profile.mobile_number || "";

        const name = profile.full_name || "";
        document.getElementById("profile-full-name").textContent = name;
        document.querySelectorAll(".user-avatar-large, .avatar-initials").forEach(avatar => {
            avatar.textContent = name.split(/\s+/).filter(Boolean).slice(0, 2)
                .map(part => part.charAt(0)).join("").toUpperCase();
        });
    }

    async function loadProfile() {
        try {
            const response = await fetch(apiUrl, { credentials: "same-origin" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to load your profile.");
            setProfile(data);
        } catch (error) {
            showMessage(error.message || "Unable to load your profile.", true);
        }
    }

    async function saveProfile() {
        if (!form.reportValidity()) return;

        editBtn.disabled = true;
        showMessage("Saving changes...", false);
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: fullNameInput.value.trim(),
                    mobile_number: mobileInput.value.trim()
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to save your profile.");

            setProfile(data.profile);
            isEditing = false;
            editableInputs.forEach(input => { input.disabled = true; });
            editBtn.textContent = "Edit Account Settings";
            showMessage("Your profile has been updated.", false);
        } catch (error) {
            showMessage(error.message || "Unable to save your profile.", true);
        } finally {
            editBtn.disabled = false;
        }
    }

    if (editBtn && form && fullNameInput && mobileInput && message) {
        editBtn.addEventListener("click", () => {
            if (isEditing) {
                saveProfile();
                return;
            }

            isEditing = true;
            editableInputs.forEach(input => { input.disabled = false; });
            editBtn.textContent = "Save Changes";
            showMessage("", false);
            fullNameInput.focus();
        });

        loadProfile();
    }
});