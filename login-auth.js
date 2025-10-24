// Authentication state observer
let isSigningIn = false;
let otpTimer;
let otpTimeLeft = 900; // 15 minutes in seconds

// Check server status
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/health-check`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Server is not available:', error);
        return false;
    }
}

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});

// Check if user is already authenticated and verified
function checkAuthStatus() {
    const user = auth.currentUser;
    
    if (user) {
        console.log('User found in Firebase:', user.email);
        showUserProfile(user);
        showLoading(true);
        
        // Check if this user needs OTP verification
        checkUserVerificationStatus(user);
    } else {
        // User is signed out, show login button
        showLoading(false);
        document.getElementById('google-signin-btn').style.display = 'flex';
        document.getElementById('user-profile-section').style.display = 'none';
    }
}

// Check user verification status - Skip OTP if email exists in Firebase Auth
async function checkUserVerificationStatus(user) {
    console.log('Checking if user needs OTP for:', user.email);
    
    // Check if this user exists in Firebase Auth (already registered)
    const userExists = await checkIfUserExistsInFirebase(user.email);
    
    if (userExists) {
        console.log('Existing Firebase Auth user, no OTP required');
        redirectToApp();
    } else {
        console.log('First time user, OTP verification required');
        showLoading(false);
        sendOTP(user);
    }
}

// Check if user exists in Firebase Authentication
// Check if user exists in Firebase Authentication
async function checkIfUserExistsInFirebase(email) {
    try {
        // Try to fetch the user's profile - if it fails, user doesn't exist
        // This is a workaround since Firebase client SDK doesn't have direct user existence check
        const methods = await auth.fetchSignInMethodsForEmail(email);
        return methods && methods.length > 0;
    } catch (error) {
        console.error('Error checking user in Firebase:', error);
        // If there's an error checking, assume user doesn't exist (require OTP for security)
        return false;
    }
}

// Show user profile
function showUserProfile(user) {
    const userProfileSection = document.getElementById('user-profile-section');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    
    // Set user information
    if (user.photoURL) {
        userAvatar.src = user.photoURL;
    } else {
        // Use default avatar if no photo
        userAvatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0IiBmaWxsPSIjMTk3MWMyIi8+CjxwYXRoIGQ9Ik0yMCAyMVYxOUMyMCAxNy4zNDMgMTguNjU3IDIgMTcgMkg3QzUuMzQzIDIgNCAxNy4zNDMgNCAxOVYyMSIgc3Ryb2tlPSIjMTk3MWMyIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
    }
    
    userName.textContent = user.displayName || 'User';
    userEmail.textContent = user.email;
    
    // Show profile section
    userProfileSection.style.display = 'block';
    
    // Setup logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

// Handle logout
function handleLogout() {
    const userConfirmed = confirm("Are you sure you want to logout?");
    if (userConfirmed) {
        auth.signOut()
            .then(() => {
                // Clear session storage
                sessionStorage.removeItem('lumi_authenticated');
                sessionStorage.removeItem('lumi_user');
                
                // Clear any stored timers
                const user = auth.currentUser;
                if (user) {
                    localStorage.removeItem(`otp_timer_${user.uid}`);
                }
                
                // Clear OTP timer
                clearOTPTimer();
                
                // Reset UI
                document.getElementById('user-profile-section').style.display = 'none';
                document.getElementById('otp-section').style.display = 'none';
                document.getElementById('google-signin-btn').style.display = 'flex';
                document.getElementById('google-signin-btn').disabled = false;
                
                // Clear OTP inputs
                const otpInputs = document.querySelectorAll('.otp-input');
                otpInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled');
                });
                
                console.log('User logged out successfully');
            })
            .catch((error) => {
                console.error('Logout error:', error);
                showAuthError('Failed to logout. Please try again.');
            });
    }
}

// Google Sign-In
document.getElementById('google-signin-btn').addEventListener('click', () => {
    signInWithGoogle();
});

// Sign in with another account
document.getElementById('signin-another-account-btn').addEventListener('click', () => {
    signInWithGoogle();
});

async function signInWithGoogle() {
    if (isSigningIn) return;
    isSigningIn = true;
    document.getElementById('google-signin-btn').disabled = true;

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'login' });

    try {
        // Sign in with Google to get the user info
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const email = user.email;

        console.log(`🔍 User signed in: ${email}`);

        // Check if it's a Gmail account
        if (!email.endsWith('@gmail.com')) {
            await auth.signOut();
            showAuthError('Only Gmail accounts are allowed. Please use a Gmail address.');
            return;
        }

        console.log('✅ Gmail user → checking if user exists in Firebase Auth');

        // Check if user already exists in Firebase Authentication
        const userExists = await checkIfUserExistsInFirebase(email);
        
        if (userExists) {
            console.log('✅ Existing Firebase Auth user → login directly');
            // User exists in Firebase Auth, no OTP needed
            redirectToApp();
        } else {
            console.log('🆕 New user → OTP verification required');
            // User doesn't exist in Firebase Auth, require OTP
            await auth.signOut(); // Sign out the temporary user
            
            // Store the email for OTP verification
            sessionStorage.setItem('pendingEmail', email);
            
            // Send OTP to admin
            const otpRes = await fetch(`${API_BASE_URL}/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email,
                    adminEmail: 'drasisconfigurator@gmail.com' // Send OTP to admin
                })
            });
            
            const otpData = await otpRes.json();

            if (otpData.success) {
                showOTPSection();
                setupOTPInputs();
                startOTPTimer(email);
            } else {
                showAuthError('Failed to send OTP. Please try again.');
            }
        }
    } catch (error) {
        console.error('Google sign-in error:', error);
        
        // Make sure to sign out on error
        try {
            await auth.signOut();
        } catch (signOutError) {
            console.error('Sign out error:', signOutError);
        }
        
        if (error.code === 'auth/popup-closed-by-user') {
            showAuthError('Sign-in cancelled.');
        } else {
            showAuthError('Google sign-in failed. Please try again.');
        }
        
        // Reset UI on error
        document.getElementById('google-signin-btn').style.display = 'flex';
        document.getElementById('otp-section').style.display = 'none';
    } finally {
        isSigningIn = false;
        document.getElementById('google-signin-btn').disabled = false;
    }
}

// Updated sendOTP function - only sends OTP for new users
async function sendOTP(user) {
    showLoading(true);
    
    const serverAvailable = await checkServerStatus();
    if (!serverAvailable) {
        showLoading(false);
        showAuthError('Server is not available. Please make sure the backend server is running on port 3001.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: user.email,
                userId: user.uid,
                isNewUser: true
            })
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
            showLoading(false);
            showOTPSection();
            setupOTPInputs();
            startOTPTimer(user.uid);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        showLoading(false);
        showAuthError('Failed to send verification code. Server might be down. Please try again later.');
    }
}

// Show OTP section
function showOTPSection() {
    document.getElementById('google-signin-btn').style.display = 'none';
    document.getElementById('otp-section').style.display = 'block';
    document.getElementById('signin-another-account-btn').style.display = 'block';
}

// Show loading state
function showLoading(show) {
    if (show) {
        document.getElementById('loading-section').style.display = 'block';
        document.getElementById('google-signin-btn').style.display = 'none';
        document.getElementById('otp-section').style.display = 'none';
    } else {
        document.getElementById('loading-section').style.display = 'none';
    }
}

// Set up OTP input fields
function setupOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verify-btn');

    // Clear any existing inputs
    otpInputs.forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });

    // Auto-focus first input
    otpInputs[0].focus();

    // Handle input events
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/\D/g, '');
                return;
            }
            
            if (value) {
                input.classList.add('filled');
                if (index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            } else {
                input.classList.remove('filled');
            }
            
            checkOTPComplete();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
                otpInputs[index - 1].classList.remove('filled');
            }
        });

        // Paste handling
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text');
            const numbers = pasteData.replace(/\D/g, '').split('');
            
            numbers.forEach((num, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = num;
                    otpInputs[i].classList.add('filled');
                }
            });
            
            checkOTPComplete();
            if (otpInputs[numbers.length]) {
                otpInputs[numbers.length].focus();
            }
        });
    });

    verifyBtn.addEventListener('click', verifyOTP);
}

// Check if OTP is complete
function checkOTPComplete() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verify-btn');

    let complete = true;
    otpInputs.forEach(input => {
        if (!input.value) complete = false;
    });

    verifyBtn.disabled = !complete;
    return complete;
}

// Verify OTP
// Verify OTP
async function verifyOTP() {
    const otpInputs = document.querySelectorAll('.otp-input');
    let otp = '';
    otpInputs.forEach(i => otp += i.value);

    const email = sessionStorage.getItem('pendingEmail');
    if (!email) {
        showAuthError('Email missing. Please sign in again.');
        return;
    }

    const verifyBtn = document.getElementById('verify-btn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';

    try {
        const res = await fetch(`${API_BASE_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await res.json();

        if (data.success && data.customToken) {
            console.log('✅ OTP verified, creating user in Firebase Auth...');
            
            // Sign in with custom token (this will create the user in Firebase Auth)
            await auth.signInWithCustomToken(data.customToken);
            
            redirectToApp();
        } else {
            showAuthError(data.message || 'Invalid OTP');
        }
    } catch (err) {
        console.error('Error verifying OTP:', err);
        showAuthError('Verification failed.');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify OTP';
    }
}


// Show authentication error
function showAuthError(message) {
    const errorElement = document.getElementById('auth-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Redirect to main application
function redirectToApp() {
    // Store authentication token in sessionStorage
    sessionStorage.setItem('lumi_authenticated', 'true');
    sessionStorage.setItem('lumi_user', JSON.stringify({
        email: auth.currentUser.email,
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL
    }));
    
    // Redirect to main app
    window.location.href = 'index.html';
}

// OTP Timer functionality
function startOTPTimer(userId) {
    clearOTPTimer();
    
    // Always start fresh timer when sending new OTP
    localStorage.removeItem(`otp_timer_${userId}`);
    
    // Store new timer
    localStorage.setItem(`otp_timer_${userId}`, JSON.stringify({
        startTime: Date.now(),
        expiresIn: 900
    }));
    otpTimeLeft = 900;

    updateTimerDisplay();
    
    otpTimer = setInterval(() => {
        otpTimeLeft--;
        updateTimerDisplay();
        
        if (otpTimeLeft <= 0) {
            clearOTPTimer();
            const countdownElement = document.getElementById('otp-countdown');
            const resendBtn = document.getElementById('resend-otp-btn');
            
            if (countdownElement) {
                countdownElement.textContent = 'OTP expired!';
            }
            if (resendBtn) {
                resendBtn.disabled = false;
            }
            // Clear stored timer
            localStorage.removeItem(`otp_timer_${userId}`);
        }
    }, 1000);
}

function updateTimerDisplay() {
    const countdownElement = document.getElementById('otp-countdown');
    const resendBtn = document.getElementById('resend-otp-btn');
    
    if (countdownElement) {
        const minutes = Math.floor(otpTimeLeft / 60);
        const seconds = otpTimeLeft % 60;
        countdownElement.textContent = `OTP expires in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (resendBtn) {
        resendBtn.disabled = otpTimeLeft > 0;
        
        // Remove any existing event listeners and add a fresh one
        resendBtn.replaceWith(resendBtn.cloneNode(true));
        const newResendBtn = document.getElementById('resend-otp-btn');
        
        newResendBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (user) {
                // Clear any existing timer completely
                clearOTPTimer();
                localStorage.removeItem(`otp_timer_${user.uid}`);
                
                // Send new OTP
                sendOTP(user);
            }
        });
    }
}

function clearOTPTimer() {
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
}