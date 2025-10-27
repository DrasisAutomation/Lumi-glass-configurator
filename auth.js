// Authentication state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in, update profile
        updateUserProfile(user);
    } else {
        // User is signed out, redirect to login
        window.location.href = 'login.html';
    }
});

// Update user profile in navbar
function updateUserProfile(user) {
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');

    console.log('Updating user profile:', user);
    
    // Set avatar source
    if (user.photoURL) {
        userAvatar.src = user.photoURL;
        console.log('Setting avatar to:', user.photoURL);
    } else {
        // Use a default avatar if no photo URL
        userAvatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0IiBmaWxsPSIjMTk3MWMyIi8+CjxwYXRoIGQ9Ik0yMCAyMVYxOUMyMCAxNy4zNDMgMTguNjU3IDIgMTcgMkg3QzUuMzQzIDIgNCAxNy4zNDMgNCAxOVYyMSIgc3Ryb2tlPSIjMTk3MWMyIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
        console.log('Using default avatar');
    }

    userAvatar.alt = user.displayName || 'User Avatar';
    userProfile.style.display = 'flex';

    // Add click event to profile for dropdown
    setupProfileDropdown(user);
}

// Setup profile dropdown functionality
function setupProfileDropdown(user) {
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    
    console.log('Setting up profile dropdown for user:', user.displayName);
    
    // Remove existing dropdown if any
    const existingDropdown = document.getElementById('profile-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    // Create dropdown menu
    const dropdown = document.createElement('div');
    dropdown.id = 'profile-dropdown';
    dropdown.className = 'profile-dropdown';
    dropdown.innerHTML = `
        <div class="dropdown-content">
            <div class="user-info">
                <img src="${user.photoURL || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSI4IiByPSI0IiBmaWxsPSIjMTk3MWMyIi8+CjxwYXRoIGQ9Ik0yMCAyMVYxOUMyMCAxNy4zNDMgMTguNjU3IDIgMTcgMkg3QzUuMzQzIDIgNCAxNy4zNDMgNCAxOVYyMSIgc3Ryb2tlPSIjMTk3MWMyIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+'}" alt="Profile" class="dropdown-avatar">
                <div class="user-details">
                    <div class="user-name">${user.displayName || 'User'}</div>
                    <div class="user-email">${user.email}</div>
                </div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout-item" id="dropdown-logout-btn">
                <span>🚪 Logout</span>
            </button>
        </div>
    `;

    // Add dropdown to page
    document.body.appendChild(dropdown);

    // Toggle dropdown on profile click
    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.style.display === 'block';
        closeAllDropdowns();
        if (!isVisible) {
            dropdown.style.display = 'block';
            
            // Position dropdown below profile
            const rect = userProfile.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }
    });

    // Logout functionality
    document.getElementById('dropdown-logout-btn').addEventListener('click', () => {
        const userConfirmed = confirm("Are you sure you want to logout?");
        if (userConfirmed) {
            auth.signOut()
                .then(() => {
                    // Clear session storage
                    sessionStorage.removeItem('lumi_authenticated');
                    sessionStorage.removeItem('lumi_user');
                    handleSignedOutUser();
                    closeAllDropdowns();
                })
                .catch((error) => {
                    console.error('Logout error:', error);
                });
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', closeAllDropdowns);
}

// Close all dropdowns
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.profile-dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.style.display = 'none';
    });
}

// Handle signed out user
function handleSignedOutUser() {
    // Redirect to login page
    window.location.href = 'login.html';
}