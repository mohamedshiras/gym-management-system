// Members Module
let currentMemberId = null;
let allMembers = [];

document.addEventListener('DOMContentLoaded', () => {
    // Load members
    loadMembers();

    // Setup event listeners
    setupMemberEventListeners();

    // Check for action parameter
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'add') {
        openAddMemberModal();
    }
});

// Setup event listeners
function setupMemberEventListeners() {
    // Add member button
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', openAddMemberModal);
    }

    // Training type change handler
    const trainingType = document.getElementById('trainingType');
    if (trainingType) {
        trainingType.addEventListener('change', updateMonthlyPayment);
    }

    // Close modal buttons
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');

    if (closeModal) closeModal.addEventListener('click', closeMemberModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeMemberModal);

    // Save member button
    const saveMemberBtn = document.getElementById('saveMemberBtn');
    if (saveMemberBtn) {
        saveMemberBtn.addEventListener('click', saveMember);
    }

    // View modal close
    const closeViewModal = document.getElementById('closeViewModal');
    const closeViewBtn = document.getElementById('closeViewBtn');

    if (closeViewModal) closeViewModal.addEventListener('click', closeViewMemberModal);
    if (closeViewBtn) closeViewBtn.addEventListener('click', closeViewMemberModal);

    // Edit from view
    const editFromViewBtn = document.getElementById('editFromViewBtn');
    if (editFromViewBtn) {
        editFromViewBtn.addEventListener('click', () => {
            closeViewMemberModal();
            openEditMemberModal(currentMemberId);
        });
    }

    // Delete modal
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDeleteMemberModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteMemberModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDeleteMember);

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterMembers(e.target.value);
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

// Load all members
async function loadMembers() {
    const tbody = document.getElementById('membersTableBody');
    const memberCount = document.getElementById('memberCount');

    try {
        const snapshot = await membersCollection.orderBy('createdAt', 'desc').get();

        allMembers = [];
        snapshot.forEach(doc => {
            allMembers.push({ id: doc.id, ...doc.data() });
        });

        memberCount.textContent = `${allMembers.length} members`;
        renderMembersTable(allMembers);

    } catch (error) {
        console.error('Error loading members:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: var(--danger);">
                    Error loading members. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Render members table
function renderMembersTable(members) {
    const tbody = document.getElementById('membersTableBody');

    if (members.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No Members Found</h3>
                        <p>Start by adding your first gym member</p>
                        <button class="btn btn-primary" onclick="openAddMemberModal()">
                            <i class="fas fa-user-plus"></i> Add Member
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    members.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong style="color: var(--luminous-yellow);">#${member.memberId || member.id}</strong></td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="user-avatar" style="width: 40px; height: 40px; font-size: 0.9rem;">
                        ${Utils.getInitials(member.fullName)}
                    </div>
                    <div>
                        <div style="font-weight: 500;">${member.fullName}</div>
                    </div>
                </div>
            </td>
            <td>${member.phone}</td>
            <td>${member.email || '-'}</td>
            <td><span class="badge badge-${member.status === 'active' ? 'active' : 'inactive'}">${member.status}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewMember('${member.id}')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="openEditMemberModal('${member.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${member.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter members by search
function filterMembers(searchTerm) {
    const filtered = allMembers.filter(member => {
        const search = searchTerm.toLowerCase();
        const memberId = (member.memberId || member.id || '').toLowerCase();
        return member.fullName.toLowerCase().includes(search) ||
            member.phone.includes(search) ||
            memberId.includes(search) ||
            (member.email && member.email.toLowerCase().includes(search));
    });
    renderMembersTable(filtered);
    document.getElementById('memberCount').textContent = `${filtered.length} members`;
}

// Open add member modal
function openAddMemberModal() {
    currentMemberId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus" style="margin-right: 10px;"></i>Add New Member';
    document.getElementById('memberForm').reset();
    document.getElementById('memberId').value = '';
    document.getElementById('status').value = 'active';
    document.getElementById('trainingType').value = 'weight-training';
    document.getElementById('monthlyPayment').value = '1,750';
    document.getElementById('memberModal').classList.add('active');
}

// Open edit member modal
async function openEditMemberModal(id) {
    currentMemberId = id;
    const member = allMembers.find(m => m.id === id);

    if (!member) {
        Utils.showToast('Member not found', 'error');
        return;
    }

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit" style="margin-right: 10px;"></i>Edit Member';
    document.getElementById('memberId').value = id;
    document.getElementById('fullName').value = member.fullName;
    document.getElementById('phone').value = member.phone;
    document.getElementById('email').value = member.email || '';
    document.getElementById('dob').value = member.dob;
    document.getElementById('height').value = member.height;
    document.getElementById('weight').value = member.weight;
    document.getElementById('address').value = member.address;
    document.getElementById('medicalNote').value = member.medicalNote || '';
    document.getElementById('trainingType').value = member.trainingType || 'weight-training';
    updateMonthlyPayment();
    document.getElementById('status').value = member.status;

    document.getElementById('memberModal').classList.add('active');
}

// Close member modal
function closeMemberModal() {
    document.getElementById('memberModal').classList.remove('active');
    document.getElementById('memberForm').reset();
    currentMemberId = null;
}

// Save member
async function saveMember() {
    const form = document.getElementById('memberForm');

    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const saveBtn = document.getElementById('saveMemberBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    const memberData = {
        fullName: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim() || null,
        dob: document.getElementById('dob').value,
        height: parseFloat(document.getElementById('height').value),
        weight: parseFloat(document.getElementById('weight').value),
        address: document.getElementById('address').value.trim(),
        medicalNote: document.getElementById('medicalNote').value.trim() || null,
        trainingType: document.getElementById('trainingType').value,
        monthlyPayment: document.getElementById('trainingType').value === 'weight-training' ? 1750 : 2750,
        status: document.getElementById('status').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const memberId = document.getElementById('memberId').value;

        if (memberId) {
            // Update existing member
            await membersCollection.doc(memberId).update(memberData);
            Utils.showToast('Member updated successfully!', 'success');
        } else {
            // Add new member with sequential ID
            const newMemberId = await Utils.generateMemberId();
            memberData.memberId = newMemberId;
            memberData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await membersCollection.doc(newMemberId).set(memberData);
            Utils.showToast(`Member added successfully! ID: ${newMemberId}`, 'success');
        }

        closeMemberModal();
        loadMembers();

    } catch (error) {
        console.error('Error saving member:', error);
        Utils.showToast('Error saving member. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Member';
    }
}

// View member details
function viewMember(id) {
    currentMemberId = id;
    const member = allMembers.find(m => m.id === id);

    if (!member) {
        Utils.showToast('Member not found', 'error');
        return;
    }

    const detailsCard = document.getElementById('memberDetailsCard');
    detailsCard.innerHTML = `
        <div class="member-avatar-large">${Utils.getInitials(member.fullName)}</div>
        <div class="member-info">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                <h2 style="margin: 0;">${member.fullName}</h2>
                <span style="background: var(--luminous-yellow); color: var(--text-dark); padding: 5px 15px; border-radius: 5px; font-weight: 700; font-size: 1.1rem;">
                    #${member.memberId || member.id}
                </span>
            </div>
            <span class="badge badge-${member.status === 'active' ? 'active' : 'inactive'}" style="margin-bottom: 15px; display: inline-block;">
                ${member.status}
            </span>
            <div class="member-info-grid">
                <div class="info-item">
                    <label>Phone</label>
                    <p>${member.phone}</p>
                </div>
                <div class="info-item">
                    <label>Email</label>
                    <p>${member.email || 'Not provided'}</p>
                </div>
                <div class="info-item">
                    <label>Date of Birth</label>
                    <p>${Utils.formatDate(member.dob)} (${Utils.calculateAge(member.dob)} years)</p>
                </div>
                <div class="info-item">
                    <label>Height</label>
                    <p>${member.height} cm</p>
                </div>
                <div class="info-item">
                    <label>Weight</label>
                    <p>${member.weight} kg</p>
                </div>
                <div class="info-item">
                    <label>BMI</label>
                    <p>${(member.weight / ((member.height / 100) ** 2)).toFixed(1)}</p>
                </div>
                <div class="info-item">
                    <label>Training Type</label>
                    <p>${member.trainingType === 'weight-cardio' ? 'Weight Training + Cardio' : 'Weight Training'}</p>
                </div>
                <div class="info-item">
                    <label>Monthly Payment</label>
                    <p style="color: var(--luminous-yellow); font-weight: 600;">Rs ${member.monthlyPayment ? member.monthlyPayment.toLocaleString() : (member.trainingType === 'weight-cardio' ? '2,750' : '1,750')}</p>
                </div>
            </div>
            <div class="info-item" style="margin-top: 15px;">
                <label>Address</label>
                <p>${member.address}</p>
            </div>
            ${member.medicalNote ? `
                <div class="info-item" style="margin-top: 15px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3);">
                    <label style="color: #ffc107;">Medical Notes</label>
                    <p>${member.medicalNote}</p>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('viewMemberModal').classList.add('active');
}

// Close view member modal
function closeViewMemberModal() {
    document.getElementById('viewMemberModal').classList.remove('active');
}

// Open delete confirmation modal
function openDeleteModal(id) {
    currentMemberId = id;
    const member = allMembers.find(m => m.id === id);

    if (member) {
        document.getElementById('deleteMemberName').textContent = member.fullName;
    }

    document.getElementById('deleteModal').classList.add('active');
}

// Close delete modal
function closeDeleteMemberModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentMemberId = null;
}

// Confirm delete member
async function confirmDeleteMember() {
    if (!currentMemberId) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';

    try {
        // Delete member's schedules first
        const schedulesSnapshot = await schedulesCollection.where('memberId', '==', currentMemberId).get();
        const batch = db.batch();

        schedulesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Delete member
        batch.delete(membersCollection.doc(currentMemberId));

        await batch.commit();

        Utils.showToast('Member deleted successfully!', 'success');
        closeDeleteMemberModal();
        loadMembers();

    } catch (error) {
        console.error('Error deleting member:', error);
        Utils.showToast('Error deleting member. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    }
}

// Update monthly payment based on training type
function updateMonthlyPayment() {
    const trainingType = document.getElementById('trainingType').value;
    const monthlyPayment = document.getElementById('monthlyPayment');
    if (trainingType === 'weight-training') {
        monthlyPayment.value = '1,750';
    } else {
        monthlyPayment.value = '2,750';
    }
}

// Make functions globally available
window.openAddMemberModal = openAddMemberModal;
window.openEditMemberModal = openEditMemberModal;
window.viewMember = viewMember;
window.openDeleteModal = openDeleteModal;
window.updateMonthlyPayment = updateMonthlyPayment;
