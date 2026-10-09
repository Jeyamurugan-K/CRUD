
const STORAGE_KEY = "novaAdminRecords";

const recordsBody = document.getElementById("recordsBody");
const modalBackdrop = document.getElementById("modalBackdrop");
const recordForm = document.getElementById("recordForm");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

let records = loadRecords();
let toastTimer;

// Read records from browser storage
function loadRecords() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : [];
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Unable to load records:", error);
        return [];
    }
}

// Save records to browser storage
function saveRecords() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
    } catch (error) {
        showToast("Unable to save data. Check browser storage.");
        return false;
    }
}

// Safely display user-entered text
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// Create initials for the avatar
function getInitials(name) {
    return name.trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0] || "")
        .join("")
        .toUpperCase();
}

// Format creation date
function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

// Display records and update dashboard statistics
function renderRecords() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const filteredRecords = records.filter(record => {
        const matchesSearch = [
            record.name,
            record.email,
            record.department
        ].some(value =>
            String(value).toLowerCase().includes(query)
        );

        const matchesStatus =
            selectedStatus === "all" ||
            record.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    document.getElementById("totalCount").textContent =
        records.length;

    document.getElementById("activeCount").textContent =
        records.filter(record =>
            record.status === "Active"
        ).length;

    document.getElementById("inactiveCount").textContent =
        records.filter(record =>
            record.status === "Inactive"
        ).length;

    document.getElementById("resultsLabel").textContent =
        `Showing ${filteredRecords.length} of ${records.length} records`;

    recordsBody.innerHTML = filteredRecords.map(record => `
        <tr>
            <td>
                <div class="person-cell">
                    <span class="person-avatar">
                        ${escapeHTML(getInitials(record.name))}
                    </span>
                    <span class="person-name">
                        ${escapeHTML(record.name)}
                    </span>
                </div>
            </td>
            <td>${escapeHTML(record.email)}</td>
            <td>${escapeHTML(record.department)}</td>
            <td>
                <span class="status-pill ${
                    record.status === "Active"
                        ? "status-active"
                        : "status-inactive"
                }">
                    ${escapeHTML(record.status)}
                </span>
            </td>
            <td>${escapeHTML(formatDate(record.createdAt))}</td>
            <td>
                <button class="action-btn"
                    data-action="edit"
                    data-id="${escapeHTML(record.id)}">
                    Edit
                </button>
                <button class="action-btn delete"
                    data-action="delete"
                    data-id="${escapeHTML(record.id)}">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

    emptyState.classList.toggle(
        "show",
        filteredRecords.length === 0
    );
}

// Open the form for adding or editing
function openModal(record = null) {
    recordForm.reset();

    document.getElementById("recordId").value =
        record ? record.id : "";

    document.getElementById("modalTitle").textContent =
        record ? "Edit Record" : "Add Record";

    document.getElementById("saveBtn").textContent =
        record ? "Update Record" : "Save Record";

    document.getElementById("nameInput").value =
        record ? record.name : "";

    document.getElementById("emailInput").value =
        record ? record.email : "";

    document.getElementById("departmentInput").value =
        record ? record.department : "";

    document.getElementById("statusInput").value =
        record ? record.status : "Active";

    document.getElementById("formError").textContent = "";

    modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";

    document.getElementById("nameInput").focus();
}

// Close the form
function closeModal() {
    modalBackdrop.hidden = true;
    document.body.style.overflow = "";
    recordForm.reset();
}

// Show success or error messages
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

// Add a new record or update an existing one
recordForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const id = document.getElementById("recordId").value;
    const name = document.getElementById("nameInput")
        .value.trim();

    const email = document.getElementById("emailInput")
        .value.trim();

    const department =
        document.getElementById("departmentInput").value;

    const status =
        document.getElementById("statusInput").value;

    const formError =
        document.getElementById("formError");

    if (!name || !email || !department) {
        formError.textContent =
            "Please fill in all required fields.";
        return;
    }

    // Prevent duplicate email addresses
    const duplicate = records.some(record =>
        record.email.toLowerCase() === email.toLowerCase() &&
        record.id !== id
    );

    if (duplicate) {
        formError.textContent =
            "This email address already exists.";
        return;
    }

    const previousRecords = [...records];

    if (id) {
        const index = records.findIndex(
            record => record.id === id
        );

        if (index === -1) {
            formError.textContent =
                "Record not found. Please refresh the page.";
            return;
        }

        records[index] = {
            ...records[index],
            name,
            email,
            department,
            status
        };
    } else {
        const newRecord = {
            id: (
                window.crypto &&
                typeof window.crypto.randomUUID === "function"
            )
                ? window.crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
            name,
            email,
            department,
            status,
            createdAt: new Date().toISOString()
        };

        records.unshift(newRecord);
    }

    if (!saveRecords()) {
        records = previousRecords;
        return;
    }

    closeModal();
    renderRecords();

    showToast(
        id
            ? "Record updated successfully!"
            : "Record added successfully!"
    );
});

// Delete a record
function deleteRecord(id) {
    const record = records.find(
        item => item.id === id
    );

    if (!record) {
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete ${record.name}?`
    );

    if (!confirmed) {
        return;
    }

    const previousRecords = records;
    records = records.filter(item => item.id !== id);

    if (!saveRecords()) {
        records = previousRecords;
        return;
    }

    renderRecords();
    showToast("Record deleted successfully!");
}

// Handle Edit and Delete buttons
recordsBody.addEventListener("click", function(event) {
    const button = event.target.closest(
        "button[data-action]"
    );

    if (!button) {
        return;
    }

    const record = records.find(
        item => item.id === button.dataset.id
    );

    if (!record) {
        return;
    }

    if (button.dataset.action === "edit") {
        openModal(record);
    }

    if (button.dataset.action === "delete") {
        deleteRecord(record.id);
    }
});

// Button events
document.getElementById("addBtn").addEventListener(
    "click",
    () => openModal()
);

document.getElementById("toolbarAddBtn").addEventListener(
    "click",
    () => openModal()
);

document.getElementById("closeBtn").addEventListener(
    "click",
    closeModal
);

document.getElementById("cancelBtn").addEventListener(
    "click",
    closeModal
);

// Search and status filter
searchInput.addEventListener("input", renderRecords);
statusFilter.addEventListener("change", renderRecords);

// Close modal when clicking outside it
modalBackdrop.addEventListener("click", function(event) {
    if (event.target === modalBackdrop) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && !modalBackdrop.hidden) {
        closeModal();
    }
});

// Initial dashboard display
renderRecords();