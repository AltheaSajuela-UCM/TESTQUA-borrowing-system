
const PROFILE_API = "../../../../backend/2_working_scholar/account_setting.php";

document.addEventListener("DOMContentLoaded", () => {

    console.log("Working Scholar Account Settings JS loaded!");

    const testButton = document.getElementById("edit-btn");

    console.log("Edit button found:", testButton);


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

        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener("click", closeSidebar);
        }

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
            profileDropdown.classList.add("hidden");
        });
    }

    // 3. Account Settings
    const form = document.getElementById("settings-form");
    const editBtn = document.getElementById("edit-btn");

    const fullNameInput = document.getElementById("full-name");
    const scholarIdInput = document.getElementById("scholar-id");
    const mobileInput = document.getElementById("mobile-number");
    const programYearInput = document.getElementById("program-year");
    const academicLevelInput = document.getElementById("academic-level");

    let isEditing = false;

    // Load profile information
    async function loadProfile() {
        try {
            const response = await fetch(PROFILE_API, {
                method: "GET",
                credentials: "same-origin"
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unable to load profile.");
            }

            fullNameInput.value = data.full_name || "";
            scholarIdInput.value = data.identifier_id || "";
            mobileInput.value = data.mobile_number || "";
            programYearInput.value = data.program_year || "";
            academicLevelInput.value = data.academic_level || "";   

        } catch (error) {
            console.error("Profile loading error:", error);
            alert(error.message);
        }
    }

    // Load profile when page opens
    if (form) {
        loadProfile();
    }

    // Edit and Save button
    if (editBtn && form) {
        editBtn.addEventListener("click", async () => {

            if (!isEditing) {
                // Enable editing of mobile number only
                fullNameInput.disabled = false;
                scholarIdInput.disabled = false;
                mobileInput.disabled = false;
                programYearInput.disabled = false;
                academicLevelInput.disabled = false;

                isEditing = false;

                editBtn.textContent = "Save Changes";
                editBtn.style.backgroundColor = "#198754";

                mobileInput.focus();

            } else {
                // Save changes
                try {
                    editBtn.disabled = true;
                    editBtn.textContent = "Saving...";

                    const response = await fetch(PROFILE_API, {
                        method: "POST",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            full_name: fullNameInput.value.trim(),
                            identifier_id: scholarIdInput.value.trim(),
                            mobile_number: mobileInput.value.trim(),
                            program_year: programYearInput.value.trim(),
                            academic_level: academicLevelInput.value.trim()
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || "Failed to save changes.");
                    }

                    alert("Account settings updated successfully!");

                    mobileInput.value =
                        data.profile.mobile_number || "";

                    mobileInput.disabled = true;

                    isEditing = false;

                    editBtn.textContent = "Edit Account Settings";
                    editBtn.style.backgroundColor = "#0d6efd";

                } catch (error) {
                    console.error("Profile update error:", error);
                    alert(error.message);

                    // Keep editing enabled so the user can correct the input
                } finally {
                    editBtn.disabled = false;
                }
            }
        });
    }
});
