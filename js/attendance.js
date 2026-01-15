// Attendance Module
let currentDate = Utils.getTodayDate();
let allMembersData = {};
let memberToRemove = null;
let removeDateContext = null;

// Initialize payments collection reference
const paymentsCollection = db.collection('payments');

document.addEventListener('DOMContentLoaded', () => {
    // Set today's date display
    displayTodayDate();

    // Load all members for reference
    loadAllMembers();

    // Load today's attendance
    loadAttendance(currentDate);

    // Setup event listeners
    setupAttendanceEventListeners();

    // Set date picker to today
    document.getElementById('attendanceDatePicker').value = currentDate;
});

// Display today's date
function displayTodayDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayDateDisplay').textContent = today.toLocaleDateString('en-US', options);
}

// Setup event listeners
function setupAttendanceEventListeners() {
    // Mark attendance button
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    if (markAttendanceBtn) {
        markAttendanceBtn.addEventListener('click', markAttendance);
    }

    // Enter key on member ID input
    const memberIdInput = document.getElementById('memberIdInput');
    if (memberIdInput) {
        memberIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                markAttendance();
            }
        });

        // Auto-format input
        memberIdInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) value = value.slice(0, 4);
            e.target.value = value;
        });
    }

    // Fetch attendance button
    const fetchAttendanceBtn = document.getElementById('fetchAttendanceBtn');
    if (fetchAttendanceBtn) {
        fetchAttendanceBtn.addEventListener('click', () => {
            const selectedDate = document.getElementById('attendanceDatePicker').value;
            if (selectedDate) {
                loadAttendance(selectedDate);
            } else {
                Utils.showToast('Please select a date', 'warning');
            }
        });
    }

    // Show today button
    const showTodayBtn = document.getElementById('showTodayBtn');
    if (showTodayBtn) {
        showTodayBtn.addEventListener('click', () => {
            const today = Utils.getTodayDate();
            document.getElementById('attendanceDatePicker').value = today;
            loadAttendance(today);
        });
    }

    // Remove modal buttons
    const closeRemoveModal = document.getElementById('closeRemoveModal');
    const cancelRemoveBtn = document.getElementById('cancelRemoveBtn');
    const confirmRemoveBtn = document.getElementById('confirmRemoveBtn');

    if (closeRemoveModal) closeRemoveModal.addEventListener('click', closeRemoveAttendanceModal);
    if (cancelRemoveBtn) cancelRemoveBtn.addEventListener('click', closeRemoveAttendanceModal);
    if (confirmRemoveBtn) confirmRemoveBtn.addEventListener('click', confirmRemoveAttendance);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
}

// Load all members for reference
async function loadAllMembers() {
    try {
        const snapshot = await membersCollection.get();
        allMembersData = {};
        let totalCount = 0;

        snapshot.forEach(doc => {
            const member = doc.data();
            allMembersData[doc.id] = member;
            if (member.status === 'active') totalCount++;
        });

        document.getElementById('totalMembersCount').textContent = totalCount;
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

// Mark attendance
async function markAttendance() {
    const memberIdInput = document.getElementById('memberIdInput');
    const memberId = memberIdInput.value.trim().padStart(4, '0');

    if (!memberId || memberId === '0000') {
        Utils.showToast('Please enter a valid member ID', 'warning');
        memberIdInput.focus();
        return;
    }

    const markBtn = document.getElementById('markAttendanceBtn');
    markBtn.disabled = true;
    markBtn.innerHTML = '<span class="loading-spinner"></span> Marking...';

    try {
        // Check if member exists
        const memberDoc = await membersCollection.doc(memberId).get();

        if (!memberDoc.exists) {
            Utils.showToast(`Member #${memberId} not found`, 'error');
            memberIdInput.value = '';
            memberIdInput.focus();
            return;
        }

        const memberData = memberDoc.data();
        const today = Utils.getTodayDate();

        // Check for pending payment
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const paymentSnapshot = await paymentsCollection
            .where('memberId', '==', memberId)
            .where('month', '==', currentMonth)
            .get();

        const monthlyFee = memberData.monthlyPayment || (memberData.trainingType === 'weight-cardio' ? 2750 : 1750);
        let paidAmount = 0;
        if (!paymentSnapshot.empty) {
            paidAmount = paymentSnapshot.docs[0].data().amount;
        }
        const remainingBalance = monthlyFee - paidAmount;
        const hasOutstandingBalance = remainingBalance > 0;

        // Get or create today's attendance document
        const attendanceRef = attendanceCollection.doc(today);
        const attendanceDoc = await attendanceRef.get();

        let attendanceData = {
            date: today,
            members: [],
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (attendanceDoc.exists) {
            attendanceData = attendanceDoc.data();
        }

        // Check if member already marked
        const existingEntry = attendanceData.members.find(m => m.memberId === memberId);

        if (existingEntry) {
            Utils.showToast(`${memberData.fullName} (#${memberId}) is already marked present`, 'warning');
            memberIdInput.value = '';
            memberIdInput.focus();
            return;
        }

        // Add member to attendance
        attendanceData.members.push({
            memberId: memberId,
            memberName: memberData.fullName,
            checkInTime: new Date().toISOString(),
            markedBy: Auth.getCurrentAdmin()?.name || 'Admin'
        });

        await attendanceRef.set(attendanceData);

        // Show success message with payment warning if needed
        if (hasOutstandingBalance) {
            showPaymentBalanceAlert(memberData.fullName, memberId, remainingBalance, paidAmount);
        } else {
            Utils.showToast(`${memberData.fullName} (#${memberId}) marked present!`, 'success');
        }

        memberIdInput.value = '';
        memberIdInput.focus();

        // Reload attendance if viewing today
        if (document.getElementById('attendanceDatePicker').value === today) {
            loadAttendance(today);
        }

    } catch (error) {
        console.error('Error marking attendance:', error);
        Utils.showToast('Error marking attendance. Please try again.', 'error');
    } finally {
        markBtn.disabled = false;
        markBtn.innerHTML = '<i class="fas fa-check"></i> Mark Present';
    }
}

// Load attendance for a specific date
async function loadAttendance(date) {
    const attendanceList = document.getElementById('attendanceList');
    const attendanceCount = document.getElementById('attendanceCount');
    const attendanceListTitle = document.getElementById('attendanceListTitle');

    // Update title
    const isToday = date === Utils.getTodayDate();
    const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    attendanceListTitle.textContent = isToday ? "Today's Attendance" : `Attendance for ${displayDate}`;

    attendanceList.innerHTML = '<p style="text-align: center; color: #888;">Loading...</p>';

    try {
        const attendanceDoc = await attendanceCollection.doc(date).get();

        if (!attendanceDoc.exists || !attendanceDoc.data().members || attendanceDoc.data().members.length === 0) {
            attendanceList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Attendance Records</h3>
                    <p>${isToday ? 'No members have checked in today yet' : 'No attendance records for this date'}</p>
                </div>
            `;
            attendanceCount.textContent = '0 members present';

            // Update stats
            if (isToday) {
                document.getElementById('todayAttendanceCount').textContent = '0';
                updateAttendancePercentage(0);
            }
            return;
        }

        const data = attendanceDoc.data();
        const members = data.members || [];

        attendanceCount.textContent = `${members.length} members present`;

        // Update stats if viewing today
        if (isToday) {
            document.getElementById('todayAttendanceCount').textContent = members.length;
            updateAttendancePercentage(members.length);
        }

        // Get current month for payment check
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        // Get all member IDs to check payments
        const memberIds = members.map(m => m.memberId);

        // Fetch payment status for all members (store full payment data)
        let memberPayments = {};
        if (memberIds.length > 0) {
            const paymentsSnapshot = await paymentsCollection
                .where('month', '==', currentMonth)
                .get();
            paymentsSnapshot.forEach(doc => {
                const paymentData = doc.data();
                memberPayments[paymentData.memberId] = paymentData.amount;
            });
        }

        // Render attendance list
        attendanceList.innerHTML = '';
        for (const entry of members) {
            const checkInTime = new Date(entry.checkInTime);
            const timeStr = checkInTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const memberData = allMembersData[entry.memberId];
            const monthlyFee = memberData ? (memberData.monthlyPayment || (memberData.trainingType === 'weight-cardio' ? 2750 : 1750)) : 1750;
            const paidAmount = memberPayments[entry.memberId] || 0;
            const remainingBalance = monthlyFee - paidAmount;
            const isFullyPaid = paidAmount >= monthlyFee;

            let paymentBadge = '';
            if (isFullyPaid) {
                paymentBadge = '<span class="paid-badge"><i class="fas fa-check-circle"></i> Paid</span>';
            } else if (paidAmount > 0) {
                paymentBadge = `<span class="pending-payment-badge" title="Partial payment - balance remaining"><i class="fas fa-exclamation-circle"></i> Rs ${remainingBalance.toLocaleString()} Due</span>`;
            } else {
                paymentBadge = `<span class="pending-payment-badge" title="Payment pending for this month"><i class="fas fa-exclamation-circle"></i> Rs ${monthlyFee.toLocaleString()} Due</span>`;
            }

            const item = document.createElement('div');
            item.className = 'member-attendance-item';
            item.innerHTML = `
                <div class="member-attendance-info">
                    <span class="member-id">#${entry.memberId}</span>
                    <div>
                        <div style="font-weight: 500; display: flex; align-items: center; gap: 10px;">
                            ${entry.memberName}
                            ${paymentBadge}
                        </div>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="openRemoveAttendanceModal('${entry.memberId}', '${entry.memberName}', '${date}')" title="Remove Attendance">
                    <i class="fas fa-times"></i>
                </button>
            `;
            attendanceList.appendChild(item);
        }

    } catch (error) {
        console.error('Error loading attendance:', error);
        attendanceList.innerHTML = `
            <div class="empty-state" style="color: var(--danger);">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Attendance</h3>
                <p>Please try again</p>
            </div>
        `;
    }
}

// Update attendance percentage
function updateAttendancePercentage(presentCount) {
    const totalMembers = parseInt(document.getElementById('totalMembersCount').textContent) || 1;
    const percentage = Math.round((presentCount / totalMembers) * 100);
    document.getElementById('attendancePercentage').textContent = `${percentage}%`;
}

// Open remove attendance modal
function openRemoveAttendanceModal(memberId, memberName, date) {
    memberToRemove = memberId;
    removeDateContext = date;
    document.getElementById('removeMemberInfo').textContent = `${memberName} (#${memberId})`;
    document.getElementById('removeModal').classList.add('active');
}

// Close remove attendance modal
function closeRemoveAttendanceModal() {
    document.getElementById('removeModal').classList.remove('active');
    memberToRemove = null;
    removeDateContext = null;
}

// Confirm remove attendance
async function confirmRemoveAttendance() {
    if (!memberToRemove || !removeDateContext) return;

    const confirmBtn = document.getElementById('confirmRemoveBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span> Removing...';

    try {
        const attendanceRef = attendanceCollection.doc(removeDateContext);
        const attendanceDoc = await attendanceRef.get();

        if (attendanceDoc.exists) {
            const data = attendanceDoc.data();
            const updatedMembers = data.members.filter(m => m.memberId !== memberToRemove);

            await attendanceRef.update({
                members: updatedMembers,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Attendance removed successfully', 'success');
            closeRemoveAttendanceModal();
            loadAttendance(removeDateContext);
        }

    } catch (error) {
        console.error('Error removing attendance:', error);
        Utils.showToast('Error removing attendance. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
    }
}

// Make functions globally available
window.openRemoveAttendanceModal = openRemoveAttendanceModal;
window.closePaymentAlertModal = closePaymentAlertModal;

// Show payment balance alert
function showPaymentBalanceAlert(memberName, memberId, remainingBalance, paidAmount) {
    const modal = document.getElementById('paymentAlertModal');
    document.getElementById('alertMemberName').textContent = memberName;
    document.getElementById('alertMemberId').textContent = `#${memberId}`;
    document.getElementById('alertPaymentAmount').textContent = `Rs ${remainingBalance.toLocaleString()}`;

    const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('alertPaymentMonth').textContent = monthName;

    // Update the alert message based on whether it's partial payment
    const alertSubtitle = document.getElementById('alertSubtitle');
    if (alertSubtitle) {
        if (paidAmount > 0) {
            alertSubtitle.innerHTML = `<span style="color: #28a745;">Already paid: Rs ${paidAmount.toLocaleString()}</span> | Remaining balance:`;
        } else {
            alertSubtitle.textContent = 'Full payment pending:';
        }
    }

    modal.classList.add('active');
}

// Close payment alert modal
function closePaymentAlertModal() {
    document.getElementById('paymentAlertModal').classList.remove('active');
}
