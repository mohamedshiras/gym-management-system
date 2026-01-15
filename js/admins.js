// Admins Module
let currentAdminId = null;
let allAdmins = [];

document.addEventListener('DOMContentLoaded', () => {
    // Load admins
    loadAdmins();

    // Setup event listeners
    setupAdminEventListeners();

    // Check for action parameter
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'add') {
        openAddAdminModal();
    }
});

// Setup event listeners
function setupAdminEventListeners() {
    // Add admin button
    const addAdminBtn = document.getElementById('addAdminBtn');
    if (addAdminBtn) {
        addAdminBtn.addEventListener('click', openAddAdminModal);
    }

    // Close modal buttons
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');

    if (closeModal) closeModal.addEventListener('click', closeAdminModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAdminModal);

    // Save admin button
    const saveAdminBtn = document.getElementById('saveAdminBtn');
    if (saveAdminBtn) {
        saveAdminBtn.addEventListener('click', saveAdmin);
    }

    // Delete modal
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDeleteAdminModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteAdminModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDeleteAdmin);

    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('adminPassword');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.querySelector('i').classList.toggle('fa-eye');
            togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterAdmins(e.target.value);
        });
    }

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

// Load all admins
async function loadAdmins() {
    const tbody = document.getElementById('adminsTableBody');
    const adminCount = document.getElementById('adminCount');

    try {
        const snapshot = await adminsCollection.orderBy('createdAt', 'desc').get();

        allAdmins = [];
        snapshot.forEach(doc => {
            allAdmins.push({ id: doc.id, ...doc.data() });
        });

        adminCount.textContent = `${allAdmins.length} admins`;
        renderAdminsTable(allAdmins);

    } catch (error) {
        console.error('Error loading admins:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="color: var(--danger);">
                    Error loading admins. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Render admins table
function renderAdminsTable(admins) {
    const tbody = document.getElementById('adminsTableBody');
    const currentAdmin = Auth.getCurrentAdmin();

    if (admins.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="empty-state">
                        <i class="fas fa-user-shield"></i>
                        <h3>No Admins Found</h3>
                        <p>Create administrator accounts</p>
                        <button class="btn btn-primary" onclick="openAddAdminModal()">
                            <i class="fas fa-user-plus"></i> Add Admin
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    admins.forEach(admin => {
        const row = document.createElement('tr');

        const createdDate = admin.createdAt ?
            Utils.formatDate(admin.createdAt.toDate()) : 'N/A';

        const isCurrentAdmin = currentAdmin && currentAdmin.id === admin.id;

        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="user-avatar" style="width: 40px; height: 40px; font-size: 0.9rem;">
                        ${Utils.getInitials(admin.name)}
                    </div>
                    <div>
                        <div style="font-weight: 500;">
                            ${admin.name}
                            ${isCurrentAdmin ? '<span style="color: var(--luminous-yellow); font-size: 0.8rem;"> (You)</span>' : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td>${admin.username}</td>
            <td>${createdDate}</td>
            <td><span class="badge badge-${admin.status === 'active' ? 'active' : 'inactive'}">${admin.status}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-primary btn-sm" onclick="openEditAdminModal('${admin.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!isCurrentAdmin ? `
                        <button class="btn btn-danger btn-sm" onclick="openDeleteAdminModal('${admin.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter admins by search
function filterAdmins(searchTerm) {
    const filtered = allAdmins.filter(admin => {
        const search = searchTerm.toLowerCase();
        return admin.name.toLowerCase().includes(search) ||
            admin.username.toLowerCase().includes(search);
    });
    renderAdminsTable(filtered);
    document.getElementById('adminCount').textContent = `${filtered.length} admins`;
}

// Open add admin modal
function openAddAdminModal() {
    currentAdminId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus" style="margin-right: 10px;"></i>Add New Admin';
    document.getElementById('adminForm').reset();
    document.getElementById('adminId').value = '';
    document.getElementById('adminStatus').value = 'active';

    // Show password fields
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('confirmPasswordGroup').style.display = 'block';
    document.getElementById('adminPassword').required = true;
    document.getElementById('confirmPassword').required = true;

    document.getElementById('adminModal').classList.add('active');
}

// Open edit admin modal
function openEditAdminModal(id) {
    currentAdminId = id;
    const admin = allAdmins.find(a => a.id === id);

    if (!admin) {
        Utils.showToast('Admin not found', 'error');
        return;
    }

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit" style="margin-right: 10px;"></i>Edit Admin';
    document.getElementById('adminId').value = id;
    document.getElementById('adminName').value = admin.name;
    document.getElementById('adminUsername').value = admin.username;
    document.getElementById('adminPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('adminStatus').value = admin.status;

    // Hide password fields for edit (optional change)
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('confirmPasswordGroup').style.display = 'block';
    document.getElementById('adminPassword').required = false;
    document.getElementById('confirmPassword').required = false;
    document.getElementById('adminPassword').placeholder = 'Leave blank to keep current';
    document.getElementById('confirmPassword').placeholder = 'Leave blank to keep current';

    document.getElementById('adminModal').classList.add('active');
}

// Close admin modal
function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
    document.getElementById('adminForm').reset();
    document.getElementById('adminPassword').placeholder = 'Enter password';
    document.getElementById('confirmPassword').placeholder = 'Confirm password';
    currentAdminId = null;
}

// Save admin
async function saveAdmin() {
    const form = document.getElementById('adminForm');
    const adminId = document.getElementById('adminId').value;
    const password = document.getElementById('adminPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Validate passwords match if password is provided
    if (password && password !== confirmPassword) {
        Utils.showToast('Passwords do not match', 'error');
        return;
    }

    // For new admin, password is required
    if (!adminId && !password) {
        Utils.showToast('Password is required for new admin', 'error');
        return;
    }

    // Validate password length
    if (password && password.length < 6) {
        Utils.showToast('Password must be at least 6 characters', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveAdminBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    const adminData = {
        name: document.getElementById('adminName').value.trim(),
        username: document.getElementById('adminUsername').value.trim().toLowerCase(),
        status: document.getElementById('adminStatus').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // Check if username already exists (for new or changed username)
        const existingSnapshot = await adminsCollection
            .where('username', '==', adminData.username)
            .get();

        const usernameExists = existingSnapshot.docs.some(doc => doc.id !== adminId);

        if (usernameExists) {
            Utils.showToast('Username already exists', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Admin';
            return;
        }

        // Hash password if provided
        if (password) {
            adminData.password = await Utils.hashPassword(password);
        }

        if (adminId) {
            // Update existing admin
            await adminsCollection.doc(adminId).update(adminData);

            // Update session if editing current admin
            const currentAdmin = Auth.getCurrentAdmin();
            if (currentAdmin && currentAdmin.id === adminId) {
                const updatedSession = { ...currentAdmin, ...adminData };
                delete updatedSession.password;
                localStorage.setItem('adminSession', JSON.stringify(updatedSession));
            }

            Utils.showToast('Admin updated successfully!', 'success');
        } else {
            // Add new admin
            adminData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await adminsCollection.add(adminData);
            Utils.showToast('Admin added successfully!', 'success');
        }

        closeAdminModal();
        loadAdmins();

    } catch (error) {
        console.error('Error saving admin:', error);
        Utils.showToast('Error saving admin. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Admin';
    }
}

// Open delete admin modal
function openDeleteAdminModal(id) {
    currentAdminId = id;
    const admin = allAdmins.find(a => a.id === id);

    if (admin) {
        document.getElementById('deleteAdminName').textContent = admin.name;
    }

    document.getElementById('deleteModal').classList.add('active');
}

// Close delete admin modal
function closeDeleteAdminModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentAdminId = null;
}

// Confirm delete admin
async function confirmDeleteAdmin() {
    if (!currentAdminId) return;

    // Prevent deleting yourself
    const currentAdmin = Auth.getCurrentAdmin();
    if (currentAdmin && currentAdmin.id === currentAdminId) {
        Utils.showToast('You cannot delete your own account', 'error');
        closeDeleteAdminModal();
        return;
    }

    // Ensure at least one admin remains
    if (allAdmins.length <= 1) {
        Utils.showToast('Cannot delete the last admin account', 'error');
        closeDeleteAdminModal();
        return;
    }

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';

    try {
        await adminsCollection.doc(currentAdminId).delete();

        Utils.showToast('Admin deleted successfully!', 'success');
        closeDeleteAdminModal();
        loadAdmins();

    } catch (error) {
        console.error('Error deleting admin:', error);
        Utils.showToast('Error deleting admin. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    }
}

// Make functions globally available
window.openAddAdminModal = openAddAdminModal;
window.openEditAdminModal = openEditAdminModal;
window.openDeleteAdminModal = openDeleteAdminModal;
