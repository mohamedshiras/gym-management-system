// Schedules Module
let currentScheduleId = null;
let allSchedules = [];
let allMembersForSchedule = [];

document.addEventListener('DOMContentLoaded', () => {
    // Load data
    loadMembersForDropdown();
    loadSchedules();

    // Setup event listeners
    setupScheduleEventListeners();

    // Check for action parameter
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action === 'add') {
        setTimeout(() => openAddScheduleModal(), 500);
    }
});

// Setup event listeners
function setupScheduleEventListeners() {
    // Add schedule button
    const addScheduleBtn = document.getElementById('addScheduleBtn');
    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', openAddScheduleModal);
    }

    // Close modal buttons
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');

    if (closeModal) closeModal.addEventListener('click', closeScheduleModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeScheduleModal);

    // Save schedule button
    const saveScheduleBtn = document.getElementById('saveScheduleBtn');
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', saveSchedule);
    }

    // Delete modal
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDeleteScheduleModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteScheduleModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDeleteSchedule);

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSchedules(e.target.value);
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

// Load members for dropdown
async function loadMembersForDropdown() {
    try {
        const snapshot = await membersCollection.where('status', '==', 'active').orderBy('fullName').get();

        allMembersForSchedule = [];
        const memberSelect = document.getElementById('memberId');

        // Clear existing options except first
        memberSelect.innerHTML = '<option value="">-- Select a Member --</option>';

        snapshot.forEach(doc => {
            const member = { id: doc.id, ...doc.data() };
            allMembersForSchedule.push(member);

            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = member.fullName;
            memberSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading members for dropdown:', error);
    }
}

// Load all schedules
async function loadSchedules() {
    const tbody = document.getElementById('schedulesTableBody');
    const scheduleCount = document.getElementById('scheduleCount');

    try {
        const snapshot = await schedulesCollection.orderBy('date', 'desc').get();

        allSchedules = [];
        snapshot.forEach(doc => {
            allSchedules.push({ id: doc.id, ...doc.data() });
        });

        scheduleCount.textContent = `${allSchedules.length} schedules`;
        renderSchedulesTable(allSchedules);

    } catch (error) {
        console.error('Error loading schedules:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color: var(--danger);">
                    Error loading schedules. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Get member name by ID
function getMemberName(memberId) {
    const member = allMembersForSchedule.find(m => m.id === memberId);
    return member ? member.fullName : 'Unknown Member';
}

// Get workout type label
function getWorkoutTypeLabel(type) {
    const types = {
        'strength': 'Strength Training',
        'cardio': 'Cardio',
        'flexibility': 'Flexibility',
        'hiit': 'HIIT',
        'crossfit': 'CrossFit',
        'yoga': 'Yoga',
        'personal': 'Personal Training',
        'group': 'Group Class',
        'other': 'Other'
    };
    return types[type] || type;
}

// Render schedules table
function renderSchedulesTable(schedules) {
    const tbody = document.getElementById('schedulesTableBody');

    if (schedules.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state">
                        <i class="fas fa-calendar-alt"></i>
                        <h3>No Schedules Found</h3>
                        <p>Create individual workout schedules for members</p>
                        <button class="btn btn-primary" onclick="openAddScheduleModal()">
                            <i class="fas fa-calendar-plus"></i> Add Schedule
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    schedules.forEach(schedule => {
        const row = document.createElement('tr');

        const statusClass = schedule.status === 'completed' ? 'active' :
            schedule.status === 'cancelled' ? 'inactive' : 'pending';

        row.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar" style="width: 35px; height: 35px; font-size: 0.8rem;">
                        ${Utils.getInitials(getMemberName(schedule.memberId))}
                    </div>
                    ${getMemberName(schedule.memberId)}
                </div>
            </td>
            <td>${schedule.title}</td>
            <td>${Utils.formatDate(schedule.date)}</td>
            <td>${Utils.formatTime(schedule.time)}</td>
            <td>${getWorkoutTypeLabel(schedule.type)}</td>
            <td><span class="badge badge-${statusClass}">${schedule.status}</span></td>
            <td>
                <div class="actions">
                    <button class="btn btn-primary btn-sm" onclick="openEditScheduleModal('${schedule.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="openDeleteScheduleModal('${schedule.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filter schedules by search
function filterSchedules(searchTerm) {
    const filtered = allSchedules.filter(schedule => {
        const search = searchTerm.toLowerCase();
        const memberName = getMemberName(schedule.memberId).toLowerCase();
        return memberName.includes(search) ||
            schedule.title.toLowerCase().includes(search);
    });
    renderSchedulesTable(filtered);
    document.getElementById('scheduleCount').textContent = `${filtered.length} schedules`;
}

// Open add schedule modal
function openAddScheduleModal() {
    currentScheduleId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-calendar-plus" style="margin-right: 10px;"></i>Add Schedule';
    document.getElementById('scheduleForm').reset();
    document.getElementById('scheduleId').value = '';
    document.getElementById('scheduleStatus').value = 'scheduled';
    document.getElementById('scheduleDuration').value = '60';

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scheduleDate').value = today;

    document.getElementById('scheduleModal').classList.add('active');
}

// Open edit schedule modal
function openEditScheduleModal(id) {
    currentScheduleId = id;
    const schedule = allSchedules.find(s => s.id === id);

    if (!schedule) {
        Utils.showToast('Schedule not found', 'error');
        return;
    }

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit" style="margin-right: 10px;"></i>Edit Schedule';
    document.getElementById('scheduleId').value = id;
    document.getElementById('memberId').value = schedule.memberId;
    document.getElementById('scheduleTitle').value = schedule.title;
    document.getElementById('scheduleDate').value = schedule.date;
    document.getElementById('scheduleTime').value = schedule.time;
    document.getElementById('scheduleType').value = schedule.type;
    document.getElementById('scheduleDuration').value = schedule.duration || 60;
    document.getElementById('scheduleNotes').value = schedule.notes || '';
    document.getElementById('scheduleStatus').value = schedule.status;

    document.getElementById('scheduleModal').classList.add('active');
}

// Close schedule modal
function closeScheduleModal() {
    document.getElementById('scheduleModal').classList.remove('active');
    document.getElementById('scheduleForm').reset();
    currentScheduleId = null;
}

// Save schedule
async function saveSchedule() {
    const form = document.getElementById('scheduleForm');

    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const saveBtn = document.getElementById('saveScheduleBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    const scheduleData = {
        memberId: document.getElementById('memberId').value,
        title: document.getElementById('scheduleTitle').value.trim(),
        date: document.getElementById('scheduleDate').value,
        time: document.getElementById('scheduleTime').value,
        type: document.getElementById('scheduleType').value,
        duration: parseInt(document.getElementById('scheduleDuration').value) || 60,
        notes: document.getElementById('scheduleNotes').value.trim() || null,
        status: document.getElementById('scheduleStatus').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const scheduleId = document.getElementById('scheduleId').value;

        if (scheduleId) {
            // Update existing schedule
            await schedulesCollection.doc(scheduleId).update(scheduleData);
            Utils.showToast('Schedule updated successfully!', 'success');
        } else {
            // Add new schedule
            scheduleData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await schedulesCollection.add(scheduleData);
            Utils.showToast('Schedule added successfully!', 'success');
        }

        closeScheduleModal();
        loadSchedules();

    } catch (error) {
        console.error('Error saving schedule:', error);
        Utils.showToast('Error saving schedule. Please try again.', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Schedule';
    }
}

// Open delete schedule modal
function openDeleteScheduleModal(id) {
    currentScheduleId = id;
    document.getElementById('deleteModal').classList.add('active');
}

// Close delete schedule modal
function closeDeleteScheduleModal() {
    document.getElementById('deleteModal').classList.remove('active');
    currentScheduleId = null;
}

// Confirm delete schedule
async function confirmDeleteSchedule() {
    if (!currentScheduleId) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span> Deleting...';

    try {
        await schedulesCollection.doc(currentScheduleId).delete();

        Utils.showToast('Schedule deleted successfully!', 'success');
        closeDeleteScheduleModal();
        loadSchedules();

    } catch (error) {
        console.error('Error deleting schedule:', error);
        Utils.showToast('Error deleting schedule. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    }
}

// Make functions globally available
window.openAddScheduleModal = openAddScheduleModal;
window.openEditScheduleModal = openEditScheduleModal;
window.openDeleteScheduleModal = openDeleteScheduleModal;
