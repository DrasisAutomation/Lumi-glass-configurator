// Enhanced Admin Authentication
let ADMIN_CONFIG = {};
let isCreatingAccount = false;
let isAdminAuthenticated = false;
let failedAttempts = 0;

// Load admin configuration
async function loadAdminConfig() {
    try {
        const response = await fetch('./config-admin.js');
        const configText = await response.text();
        
        // Extract the config object from the file
        const configMatch = configText.match(/const ADMIN_CONFIG = ({[^}]+});/);
        if (configMatch) {
            ADMIN_CONFIG = eval(`(${configMatch[1]})`);
        }
    } catch (error) {
        console.error('Failed to load admin config:', error);
        showAdminMessage('Configuration error. Please contact administrator.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadAdminConfig();
    checkFailedAttempts();
    setupEventListeners();
    
    // ALWAYS require authentication on page load
    showAdminLogin();
});

// Check for existing failed attempts
function checkFailedAttempts() {
    const attemptsData = localStorage.getItem('admin_failed_attempts');
    if (attemptsData) {
        const { count, timestamp } = JSON.parse(attemptsData);
        const now = Date.now();
        
        // If lockout period has passed, reset attempts
        if (now - timestamp > ADMIN_CONFIG.lockoutDuration) {
            resetFailedAttempts();
        } else {
            failedAttempts = count;
            updateFailedAttemptsDisplay();
            
            // If max attempts reached, disable login
            if (failedAttempts >= ADMIN_CONFIG.maxFailedAttempts) {
                disableLogin();
                startLockoutTimer(timestamp);
            }
        }
    }
}

// Update failed attempts display
function updateFailedAttemptsDisplay() {
    const attemptsElement = document.getElementById('failed-attempts');
    const countElement = document.getElementById('attempt-count');
    
    if (failedAttempts > 0) {
        attemptsElement.style.display = 'block';
        countElement.textContent = failedAttempts;
    } else {
        attemptsElement.style.display = 'none';
    }
}

// Record a failed attempt
function recordFailedAttempt() {
    failedAttempts++;
    localStorage.setItem('admin_failed_attempts', JSON.stringify({
        count: failedAttempts,
        timestamp: Date.now()
    }));
    updateFailedAttemptsDisplay();
    
    if (failedAttempts >= ADMIN_CONFIG.maxFailedAttempts) {
        disableLogin();
        startLockoutTimer(Date.now());
    }
}

// Reset failed attempts
function resetFailedAttempts() {
    failedAttempts = 0;
    localStorage.removeItem('admin_failed_attempts');
    updateFailedAttemptsDisplay();
    enableLogin();
}

// Disable login form
function disableLogin() {
    document.getElementById('admin-password').disabled = true;
    document.getElementById('admin-login-btn').disabled = true;
    document.getElementById('admin-login-btn').textContent = 'Account Locked';
}

// Enable login form
function enableLogin() {
    document.getElementById('admin-password').disabled = false;
    document.getElementById('admin-login-btn').disabled = false;
    document.getElementById('admin-login-btn').textContent = 'Access Admin Panel';
}

// Start lockout timer
function startLockoutTimer(lockoutStart) {
    const timerElement = document.getElementById('lockout-timer');
    const updateTimer = () => {
        const now = Date.now();
        const timeLeft = ADMIN_CONFIG.lockoutDuration - (now - lockoutStart);
        
        if (timeLeft <= 0) {
            resetFailedAttempts();
            return;
        }
        
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        setTimeout(updateTimer, 1000);
    };
    
    updateTimer();
}

// Setup event listeners
function setupEventListeners() {
    // Admin login
    document.getElementById('admin-login-btn').addEventListener('click', authenticateAdmin);
    document.getElementById('admin-password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            authenticateAdmin();
        }
    });

    // Account creation form
    document.getElementById('create-account-form').addEventListener('submit', function(e) {
        e.preventDefault();
        if (isAdminAuthenticated) {
            createUserAccount();
        } else {
            showMessage('Please authenticate first.', 'error');
        }
    });

    // Logout admin
    document.getElementById('logout-admin-btn').addEventListener('click', logoutAdmin);
}

// Hash password using SHA-256
function hashPassword(password) {
    return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

// Authenticate admin
function authenticateAdmin() {
    // Check if account is locked
    if (failedAttempts >= ADMIN_CONFIG.maxFailedAttempts) {
        showAdminMessage('Account temporarily locked due to too many failed attempts. Please try again later.', 'error');
        return;
    }

    const password = document.getElementById('admin-password').value;
    const loginBtn = document.getElementById('admin-login-btn');

    if (!password) {
        showAdminMessage('Please enter the admin password.', 'error');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Verifying...';

    // Simulate verification delay for security
    setTimeout(() => {
        const hashedPassword = hashPassword(password);
        
        if (hashedPassword === ADMIN_CONFIG.passwordHash) {
            // Successful login
            isAdminAuthenticated = true;
            resetFailedAttempts(); // Reset on successful login
            showAdminPanel();
            showAdminMessage('Admin access granted!', 'success');
            
            // Set a very short session that doesn't persist across reloads
            sessionStorage.setItem(ADMIN_CONFIG.sessionKey, JSON.stringify({
                authenticated: true,
                timestamp: Date.now()
            }));
        } else {
            // Failed login
            recordFailedAttempt();
            showAdminMessage('Invalid admin password. Please try again.', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Access Admin Panel';
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-password').focus();
        }
    }, 1000);
}

// Show admin panel after successful authentication
function showAdminPanel() {
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('create-account-form').style.display = 'block';
    document.getElementById('admin-message').style.display = 'none';
}

// Show admin login form
function showAdminLogin() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('create-account-form').style.display = 'none';
    document.getElementById('user-details').style.display = 'none';
    document.getElementById('admin-password').focus();
    
    // Always require password on page load - clear any existing session
    isAdminAuthenticated = false;
    sessionStorage.removeItem(ADMIN_CONFIG.sessionKey);
}

// Logout admin
function logoutAdmin() {
    isAdminAuthenticated = false;
    sessionStorage.removeItem(ADMIN_CONFIG.sessionKey);
    document.getElementById('create-account-form').reset();
    document.getElementById('user-details').style.display = 'none';
    document.getElementById('message').style.display = 'none';
    showAdminLogin();
    
    // Reset admin login form
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-login-btn').disabled = false;
    document.getElementById('admin-login-btn').textContent = 'Access Admin Panel';
}

// Create user account
async function createUserAccount() {
    if (!isAdminAuthenticated) {
        showMessage('Admin authentication required. Please log in again.', 'error');
        showAdminLogin();
        return;
    }

    if (isCreatingAccount) return;
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const createBtn = document.getElementById('create-btn');

    // Validation
    if (!email || !password || !confirmPassword) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long.', 'error');
        return;
    }

    isCreatingAccount = true;
    createBtn.disabled = true;
    createBtn.textContent = 'Creating Account...';
    showLoading(true);
    hideMessage();

    try {
        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('User account created successfully:', user.email);
        
        // Show success message with credentials
        showUserDetails(email, password);
        showMessage('User account created successfully!', 'success');
        
        // Reset form
        document.getElementById('create-account-form').reset();
        
    } catch (error) {
        console.error('Account creation error:', error);
        
        let errorMessage = 'Failed to create user account. Please try again.';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please use a stronger password.';
                break;
        }
        
        showMessage(errorMessage, 'error');
    } finally {
        isCreatingAccount = false;
        createBtn.disabled = false;
        createBtn.textContent = 'Create User Account';
        showLoading(false);
    }
}

// Show user details after creation
function showUserDetails(email, password) {
    const userDetails = document.getElementById('user-details');
    const createdEmail = document.getElementById('created-email');
    const createdPassword = document.getElementById('created-password');
    
    createdEmail.textContent = email;
    createdPassword.textContent = password;
    userDetails.style.display = 'block';
}

// Show admin message
function showAdminMessage(message, type) {
    const messageElement = document.getElementById('admin-message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
}

// Show message
function showMessage(message, type) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = 'block';
    
    // Auto-hide success messages after 10 seconds
    if (type === 'success') {
        setTimeout(() => {
            hideMessage();
        }, 10000);
    }
}

// Hide message
function hideMessage() {
    const messageElement = document.getElementById('message');
    messageElement.style.display = 'none';
}

// Show loading state
function showLoading(show) {
    if (show) {
        document.getElementById('loading-section').style.display = 'block';
        document.getElementById('create-account-form').style.display = 'none';
    } else {
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('create-account-form').style.display = 'block';
    }
}

// Password strength indicator
document.getElementById('password').addEventListener('input', function(e) {
    const password = e.target.value;
    const strengthText = document.querySelector('.password-strength');
    
    if (password.length === 0) {
        strengthText.textContent = 'Password must be at least 6 characters long';
        strengthText.style.color = '#666';
    } else if (password.length < 6) {
        strengthText.textContent = 'Password too short';
        strengthText.style.color = '#e74c3c';
    } else if (password.length < 8) {
        strengthText.textContent = 'Password strength: Fair';
        strengthText.style.color = '#f39c12';
    } else {
        strengthText.textContent = 'Password strength: Good';
        strengthText.style.color = '#27ae60';
    }
});

// Auto-logout after session timeout
setInterval(() => {
    const sessionData = sessionStorage.getItem(ADMIN_CONFIG.sessionKey);
    if (sessionData) {
        const { timestamp } = JSON.parse(sessionData);
        const now = Date.now();
        
        if (now - timestamp >= ADMIN_CONFIG.sessionTimeout) {
            // Session expired
            logoutAdmin();
            showAdminMessage('Session expired. Please log in again.', 'error');
        }
    }
}, 30000); // Check every 30 seconds