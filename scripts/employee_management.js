// --- CONFIGURATION ---
// Supabase client is already initialized globally via scripts/supabase.js

let employees = [];
let editingEmployeeId = null;

// --- ACCESS CONTROL ---
const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || localStorage.getItem("userRole") || "admin").toLowerCase();

if (role !== "admin") {
  alert("Only administrators can access Employee Management.");
  window.location.href = "login.html";
}

// --- DOM ELEMENTS ---
const employeesTbody = document.getElementById("employeesTbody");
const employeeSearchInput = document.getElementById("employeeSearchInput");
const employeeModalOverlay = document.getElementById("employeeModalOverlay");
const employeeModalTitle = document.getElementById("employeeModalTitle");
const employeeForm = document.getElementById("employeeForm");

const employeeNameInput = document.getElementById("employeeNameInput");
const employeeRoleInput = document.getElementById("employeeRoleInput");
const employeePhoneInput = document.getElementById("employeePhoneInput");
const employeeEmailInput = document.getElementById("employeeEmailInput");

const tempPasswordInput = document.getElementById("tempPasswordInput");

// Password Success Modal Elements
const passwordSuccessModal = document.getElementById("passwordSuccessModal");
const passwordModalName = document.getElementById("passwordModalName");
const passwordModalEmployeeId = document.getElementById("passwordModalEmployeeId");
const passwordModalPassword = document.getElementById("passwordModalPassword");
const copyPasswordBtn = document.getElementById("copyPasswordBtn");
const closePasswordModalBtn = document.getElementById("closePasswordModalBtn");
const closePasswordModalOkBtn = document.getElementById("closePasswordModalOkBtn");

// --- UTILS ---
function generateEmployeeId() {
  const year = new Date().getFullYear().toString().slice(-2);
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EMP-${year}${rand}`;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 10; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

// --- CORE LOGIC ---

// Load from LocalStorage for UI speed, but in a real app, we'd fetch from a 'profiles' table
async function loadEmployees() {
  try {
    console.log("Fetching employees from database...");
    const { data, error } = await invokeFunction('manage-employees', { action: 'list' });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to fetch employees.');

    // The function returns { success: true, users: [...] }
    employees = (data.users || []).map(user => {
      const safeRole = String(user.role || 'N/A');
      return {
        id: user.id,
        name: user.name || 'Unknown',
        role: safeRole.charAt(0).toUpperCase() + safeRole.slice(1),
        phone: user.phone || 'N/A',
        email: user.email || 'N/A',
        employeeId: user.employeeId || 'N/A'
      };
    });

    renderEmployees();
    updateStats();
  } catch (err) {
    console.error("Failed to load employees from database:", err);
    const errMsg = err.context?.statusText || err.message || JSON.stringify(err);
    employeesTbody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center; padding: 20px;"><b>Error loading employees:</b> ${errMsg}</td></tr>`;
  }
}

function updateStats() {
  const total = employees.length;
  document.getElementById("totalEmployeesBadge").textContent = String(total);
  document.getElementById("totalEmployeesValue").textContent = String(total);
}

function renderEmployees() {
  const query = employeeSearchInput.value.trim().toLowerCase();
  const filtered = employees.filter((emp) => {
    // Combine all fields so they can all be searched at once
    const target = `${emp.name} ${emp.role} ${emp.phone} ${emp.email} ${emp.employeeId}`.toLowerCase();
    return target.includes(query);
  });

  if (filtered.length === 0) {
    employeesTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No employees found matching "<b>${query}</b>".</td></tr>`;
    return;
  }

  employeesTbody.innerHTML = filtered.map(emp => `
      <tr>
        <td>${emp.name}</td>
        <td><span class="chip">${emp.role}</span></td>
        <td>${emp.phone}</td>
        <td>${emp.email}</td>
        <td>${emp.employeeId}</td>
        <td><small style="color: #059669; font-weight: 500;">*** Hashed & Hidden ***</small></td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn-secondary" data-action="edit" data-id="${emp.id}">Edit</button>
            <button type="button" class="btn-danger" data-action="delete" data-id="${emp.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
}

// --- MODAL HANDLERS ---
function openAddModal() {
  editingEmployeeId = null;
  employeeModalTitle.textContent = "Add Employee";
  employeeForm.reset();
  employeeEmailInput.disabled = false;
  tempPasswordInput.value = generatePassword();
  employeeModalOverlay.classList.remove("hidden");
}

function openEditModal(employee) {
  editingEmployeeId = employee.id;
  employeeModalTitle.textContent = "Edit Employee";
  employeeForm.reset();

  // Pre-fill form
  employeeNameInput.value = employee.name;
  employeeRoleInput.value = employee.role;
  employeePhoneInput.value = employee.phone;
  employeeEmailInput.value = employee.email;
  employeeEmailInput.disabled = true; // Don't allow changing email (PK)
  tempPasswordInput.value = ""; // Always clear password field
  employeeModalOverlay.classList.remove("hidden");
}

function closeEmployeeModal() {
  employeeModalOverlay.classList.add("hidden");
  employeeEmailInput.disabled = false; // Re-enable for next time
}

function showPasswordModal(name, employeeId, password) {
  passwordModalName.textContent = name;
  passwordModalEmployeeId.textContent = employeeId;
  passwordModalPassword.value = password;
  passwordSuccessModal.classList.remove("hidden");
}

function closePasswordModal() {
  passwordSuccessModal.classList.add("hidden");
}

// --- DATABASE ACTIONS (THE "WIRING") ---

async function handleSaveEmployee(event) {
  event.preventDefault();

  const name = employeeNameInput.value.trim();
  const rawRole = employeeRoleInput.value;
  const phone = employeePhoneInput.value.trim();
  const newPassword = tempPasswordInput.value.trim();

  if (editingEmployeeId) {
    // --- UPDATE LOGIC ---
    try {
      const updatePayload = {
        action: 'update',
        userId: editingEmployeeId,
        name: name,
        phone: phone,
        role: rawRole.toLowerCase(),
      };

      if (newPassword) {
        updatePayload.password = newPassword;
      }

      const { error } = await invokeFunction('manage-employees', updatePayload);

      if (error) throw error;

      // Re-fetch from DB to ensure UI is in sync
      await loadEmployees();
      closeEmployeeModal();

      alert(`Employee "${name}" updated successfully!`);

    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to update employee: " + err.message);
    }
    return;
  }

// --- CREATE LOGIC ---
  // Generate a temporary password for the new user
  const email = employeeEmailInput.value.trim();
  const tempPassword = newPassword || generatePassword(); // Use field value, fallback to generate
  const employeeId = generateEmployeeId();

  try {
    // 1. CALL THE "SECRET ROOM" (Edge Function)
    console.log("Calling Edge Function to create user...");
    const { data, error } = await invokeFunction('manage-employees', {
      action: 'create',
      email: email,
      password: tempPassword,
      role: rawRole.toLowerCase(),
      name: name,
      phone: phone,
      employeeId: employeeId
    });

    if (error) throw error;

    // 2. UPDATE LOCAL UI STATE
    const newEmployee = {
      id: data.user.id, // The UUID returned from Supabase Auth
      name: name,
      role: rawRole,
      phone: phone,
      email: email,
      employeeId: employeeId
    };

    // Re-fetch from DB to get the new list, including the one just created
    await loadEmployees();
    closeEmployeeModal();

    showPasswordModal(name, newEmployee.employeeId, tempPassword);

  } catch (err) {
    console.error(err);
    alert("Failed to create employee: " + err.message);
  }
}

async function handleTableAction(event) {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const id = target.dataset.id;
  const action = target.dataset.action;

  const employee = employees.find((emp) => emp.id === id);
  if (!employee) return;

  if (action === "edit") {
    openEditModal(employee);
  } else if (action === "delete") {
    if (!window.confirm(`Permanently ban ${employee.name} from the system?`)) return;

    try {
      // CALL THE "SECRET ROOM" to delete the user from Auth
      const { error } = await invokeFunction('manage-employees', { action: 'delete', userId: id });

      if (error) throw error;

      // Update UI
      // Re-fetch from DB to update the list
      await loadEmployees();
      alert("Employee removed successfully.");

    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }
}

// --- EVENT LISTENERS ---
document.getElementById("addEmployeeBtn").addEventListener("click", openAddModal);
document.getElementById("closeEmployeeModalBtn").addEventListener("click", closeEmployeeModal);
document.getElementById("cancelEmployeeModalBtn").addEventListener("click", closeEmployeeModal);
employeeForm.addEventListener("submit", handleSaveEmployee);
employeeSearchInput.addEventListener("input", renderEmployees);
employeesTbody.addEventListener("click", handleTableAction);

closePasswordModalBtn.addEventListener("click", closePasswordModal);
closePasswordModalOkBtn.addEventListener("click", closePasswordModal);
copyPasswordBtn.addEventListener("click", async () => {
  try {
    const textToCopy = passwordModalPassword.value;
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      // Fallback for standard HTTP Live Server
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }

    // Temporarily change the copy icon to a checkmark
    const icon = copyPasswordBtn.querySelector('i');
    icon.className = 'fa-solid fa-check';
    setTimeout(() => {
      icon.className = 'fa-solid fa-copy';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
});

// --- INITIALIZE ---
loadEmployees();