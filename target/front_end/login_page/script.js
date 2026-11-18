// Backend roles use underscores, the role switcher uses a hyphen
const ROLE_TO_BACKEND = {
    'student': 'student',
    'working-scholar': 'working_scholar',
    'admin': 'admin'
};

// Where each role lands after login (paths are relative to login_page/)
const ROLE_HOME = {
    'student': '../templates/student/student_dashboard.html',
    'working_scholar': '../templates/working_scholar/working_scholar_dashboard.html',
    'admin': '../templates/admin/admin_dashboard.html'
};

const API_BASE = '../../../backend/api';

let currentRole = 'student'; 
let authMode = 'create';     
let currentStep = 1;

// Restrict inputs to digits only
function validateNumericInput(inputElement) {
    inputElement.value = inputElement.value.replace(/[^0-9]/g, '');
}

function setAppView(role) {
    currentRole = role;
    
    const buttons = document.querySelectorAll('.switcher-btn');
    buttons.forEach(btn => btn.classList.remove('active-switcher'));
    event.target.classList.add('active-switcher');

    const roleBadge = document.getElementById('roleBadge');
    const authTabsContainer = document.getElementById('authTabsContainer');

    if (role === 'student') {
        roleBadge.textContent = 'Student';
        roleBadge.className = 'role-badge student-badge';
        authTabsContainer.style.display = 'flex';
        switchAuthTab('create');
    } 
    else if (role === 'working-scholar') {
        roleBadge.textContent = 'Working Scholar';
        roleBadge.className = 'role-badge scholar-badge';
        authTabsContainer.style.display = 'none';
        switchAuthTab('signin');
    } 
    else if (role === 'admin') {
        roleBadge.textContent = 'Administrator';
        roleBadge.className = 'role-badge admin-badge';
        authTabsContainer.style.display = 'none';
        switchAuthTab('signin');
    }
}

function switchAuthTab(mode) {
    authMode = mode;
    const tabCreate = document.getElementById('tabCreateAccount');
    const tabSignIn = document.getElementById('tabSignIn');
    const stepWizard = document.getElementById('stepWizardContainer');
    const formStudentCreate = document.getElementById('formStudentCreate');
    const formSignIn = document.getElementById('formSignIn');
    const viewAccountCreated = document.getElementById('viewAccountCreated');
    const footerPrompt = document.getElementById('footerPrompt');
    const footerActionLink = document.getElementById('footerActionLink');
    const cardFooterText = document.getElementById('cardFooterText');

    viewAccountCreated.style.display = 'none';
    cardFooterText.style.display = 'block';

    if (mode === 'create' && currentRole === 'student') {
        if (tabCreate) tabCreate.classList.add('active');
        if (tabSignIn) tabSignIn.classList.remove('active');
        stepWizard.style.display = 'block';
        formStudentCreate.style.display = 'block';
        formSignIn.style.display = 'none';
        footerPrompt.textContent = 'Already have an account?';
        footerActionLink.textContent = 'Sign in';
        goToStep(1);
    } else {
        if (tabCreate) tabCreate.classList.remove('active');
        if (tabSignIn) tabSignIn.classList.add('active');
        stepWizard.style.display = 'none';
        formStudentCreate.style.display = 'none';
        formSignIn.style.display = 'block';
        footerPrompt.textContent = currentRole === 'student' ? "Don't have an account?" : '';
        footerActionLink.textContent = currentRole === 'student' ? 'Create Account' : '';
    }
}

/* STEP VALIDATIONS */
function validateStep1AndNext() {
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim();
    const contact = document.getElementById('regContact').value.trim();
    const email = document.getElementById('regEmail').value.trim();

    if (!firstName) {
        alert('Please enter your First Name.');
        return;
    }
    if (!lastName) {
        alert('Please enter your Last Name.');
        return;
    }
    if (studentId.length !== 8) {
        alert('Student ID must be exactly 8 digits.');
        return;
    }
    if (contact.length < 10) {
        alert('Please enter a valid Contact Number.');
        return;
    }
    if (!email || !email.includes('@')) {
        alert('Please enter a valid Email Address.');
        return;
    }

    goToStep(2);
}

function validateStep2AndNext() {
    const pass = document.getElementById('regPassword').value;
    const confirmPass = document.getElementById('regConfirmPassword').value;

    if (pass.length < 8) {
        alert('Password must be at least 8 characters long.');
        return;
    }
    if (pass !== confirmPass) {
        alert('Passwords do not match. Please try again.');
        return;
    }

    goToStep(3);
}

function goToStep(stepNumber) {
    currentStep = stepNumber;

    document.getElementById('createStep1').style.display = stepNumber === 1 ? 'block' : 'none';
    document.getElementById('createStep2').style.display = stepNumber === 2 ? 'block' : 'none';
    document.getElementById('createStep3').style.display = stepNumber === 3 ? 'block' : 'none';

    const titles = { 1: 'Your Details', 2: 'Password', 3: 'Review and Confirm' };
    document.getElementById('stepCounterText').textContent = `STEP ${stepNumber} OF 3`;
    document.getElementById('stepTitleText').textContent = titles[stepNumber];

    for (let i = 1; i <= 3; i++) {
        const item = document.getElementById(`wizardStep${i}`);
        const icon = document.getElementById(`stepIcon${i}`);

        if (i < stepNumber) {
            item.className = 'step-item completed';
            icon.innerHTML = '&#10003;';
        } else if (i === stepNumber) {
            item.className = 'step-item active';
            icon.textContent = i;
        } else {
            item.className = 'step-item';
            icon.textContent = i;
        }
    }

    document.getElementById('stepDivider1').className = stepNumber >= 2 ? 'step-divider active' : 'step-divider';
    document.getElementById('stepDivider2').className = stepNumber >= 3 ? 'step-divider active' : 'step-divider';

    if (stepNumber === 3) {
        const fName = document.getElementById('regFirstName').value.trim();
        const mName = document.getElementById('regMiddleName').value.trim();
        const lName = document.getElementById('regLastName').value.trim();
        const full = `${fName} ${mName ? mName + ' ' : ''}${lName}`.trim();

        document.getElementById('revFullName').textContent = full;
        document.getElementById('revStudentId').textContent = document.getElementById('regStudentId').value;
        document.getElementById('revContact').textContent = document.getElementById('regContact').value;
        document.getElementById('revEmail').textContent = document.getElementById('regEmail').value;
    }
}

function showAccountCreatedSuccess() {
    document.getElementById('formStudentCreate').style.display = 'none';
    document.getElementById('stepWizardContainer').style.display = 'none';

    const fName = document.getElementById('regFirstName').value.trim();
    const mName = document.getElementById('regMiddleName').value.trim();
    const lName = document.getElementById('regLastName').value.trim();
    const full = `${fName} ${mName ? mName + ' ' : ''}${lName}`.trim();

    document.getElementById('successFullName').textContent = full;
    document.getElementById('successStudentId').textContent = document.getElementById('regStudentId').value;

    document.getElementById('viewAccountCreated').style.display = 'block';
}

function toggleAuthModeFromFooter(e) {
    e.preventDefault();
    if (currentRole !== 'student') return;
    if (authMode === 'create') {
        switchAuthTab('signin');
    } else {
        switchAuthTab('create');
    }
}

function togglePasswordVisibility(inputId, icon) {
    const passwordInput = document.getElementById(inputId);
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function openTermsModal(e) {
    e.preventDefault();
    document.getElementById('termsModal').style.display = 'flex';
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
}

function acceptTerms() {
    document.getElementById('termsCheckbox').checked = true;
    closeTermsModal();
}

/* FORGOT PASSWORD: step 1 send code -> step 2 verify -> step 3 new password
   Uses backend/api/password_recovery.php (actions: request, verify, reset). */
let recoveryChannel = 'email';
let recoveryContact = '';

async function recoveryCall(payload) {
    const res = await fetch(API_BASE + '/password_recovery.php', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await res.json(); }
    catch (err) { throw new Error('The server sent an unexpected response. Please try again.'); }
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
}

function showRecoveryError(step, message) {
    const box = document.getElementById('recoveryError' + step);
    if (box) { box.textContent = message || ''; box.style.display = message ? 'block' : 'none'; }
}

function showRecoveryStep(step) {
    for (let i = 1; i <= 3; i++) {
        document.getElementById('recoveryStep' + i).style.display = (i === step) ? 'block' : 'none';
        showRecoveryError(i, '');
    }
}

function setRecoveryChannel(channel) {
    recoveryChannel = channel;
    document.getElementById('recoverTabEmail').classList.toggle('active', channel === 'email');
    document.getElementById('recoverTabNumber').classList.toggle('active', channel === 'number');
    document.getElementById('recoveryContactLabel').textContent = channel === 'email' ? 'Email Address' : 'Contact Number';
    const input = document.getElementById('recoveryContact');
    input.placeholder = channel === 'email' ? 'name@uc.edu.ph' : '09XXXXXXXXX';
    input.type = channel === 'email' ? 'email' : 'tel';
    input.value = '';
    showRecoveryError(1, '');
}

function openForgotPasswordModal(e) {
    if (e) e.preventDefault();
    recoveryContact = '';
    setRecoveryChannel('email');
    document.getElementById('recoveryCode').value = '';
    document.getElementById('resetNewPassword').value = '';
    document.getElementById('resetConfirmPassword').value = '';
    showRecoveryStep(1);
    document.getElementById('forgotPasswordModal').style.display = 'flex';
}

function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
}

// Step 1 (also used by "Resend Code" on step 2)
async function sendResetCode(isResend) {
    const step = isResend ? 2 : 1;
    if (!isResend) recoveryContact = document.getElementById('recoveryContact').value.trim();
    showRecoveryError(step, '');

    try {
        const data = await recoveryCall({ action: 'request', channel: recoveryChannel, contact: recoveryContact });

        document.getElementById('recoveryStep2Subtitle').textContent =
            recoveryChannel === 'email' ? 'Enter the code sent to your email.' : 'Enter the code sent to your contact number.';
        document.getElementById('recoverySentTo').textContent = data.sent_to || recoveryContact;

        // Only present when the server runs with 'recovery_dev_mode' => true
        const devRow = document.getElementById('recoveryDevCodeRow');
        if (data.dev_code) {
            document.getElementById('recoveryDevCode').textContent = data.dev_code;
            devRow.style.display = 'block';
        } else {
            devRow.style.display = 'none';
        }

        document.getElementById('recoveryCode').value = '';
        showRecoveryStep(2);
    } catch (err) {
        showRecoveryError(step, err.message);
    }
}

// Step 2
async function verifyResetCode() {
    const code = document.getElementById('recoveryCode').value.trim();
    showRecoveryError(2, '');
    if (code.length !== 6) { showRecoveryError(2, 'Enter the 6-digit verification code.'); return; }

    try {
        await recoveryCall({ action: 'verify', code: code });
        showRecoveryStep(3);
    } catch (err) {
        showRecoveryError(2, err.message);
    }
}

// Step 3
async function submitNewPassword() {
    const newPass = document.getElementById('resetNewPassword').value;
    const confirmPass = document.getElementById('resetConfirmPassword').value;
    showRecoveryError(3, '');

    if (newPass.length < 8) { showRecoveryError(3, 'New password must be at least 8 characters long.'); return; }
    if (newPass !== confirmPass) { showRecoveryError(3, 'New passwords do not match. Please try again.'); return; }

    try {
        await recoveryCall({ action: 'reset', new_password: newPass });
        alert('Password successfully updated! You can now sign in with your new password.');
        closeForgotPasswordModal();
        switchAuthTab('signin');
    } catch (err) {
        showRecoveryError(3, err.message);
    }
}
async function handleFormSubmit(e) {
    e.preventDefault();

    if (authMode === 'create') {
        if (!document.getElementById('termsCheckbox').checked) {
            alert('Please agree to the Terms and Conditions to complete your registration.');
            return;
        }
        try {
            const res = await fetch(API_BASE + '/sign_up.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'student',
                    first_name: document.getElementById('regFirstName').value.trim(),
                    middle_name: document.getElementById('regMiddleName').value.trim(),
                    last_name: document.getElementById('regLastName').value.trim(),
                    id_number: document.getElementById('regStudentId').value.trim(),
                    mobile_number: document.getElementById('regContact').value.trim(),
                    email: document.getElementById('regEmail').value.trim(),
                    password: document.getElementById('regPassword').value,
                    terms_accepted: true
                })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Registration failed.');
                return;
            }
            showAccountCreatedSuccess();
        } catch (err) {
            alert('Cannot reach the server. Is XAMPP (Apache + MySQL) running?');
        }
        return;
    }

    const idVal = document.getElementById('signInId').value.trim();
    const password = document.getElementById('signInPassword').value;

    if (idVal.length !== 8) {
        alert('ID Number must be exactly 8 digits.');
        return;
    }

    try {
        const res = await fetch(API_BASE + '/login.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_number: idVal, password: password })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Login failed.');
            return;
        }

        // The account's real role must match the tab the user picked
        if (data.user.role !== ROLE_TO_BACKEND[currentRole]) {
            await fetch(API_BASE + '/logout.php', { method: 'POST', credentials: 'same-origin' });
            alert('This account is not a ' + currentRole.replace('-', ' ') + ' account.');
            return;
        }

        window.location.href = ROLE_HOME[data.user.role];
    } catch (err) {
        alert('Cannot reach the server. Is XAMPP (Apache + MySQL) running?');
    }
}