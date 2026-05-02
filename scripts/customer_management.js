// ============================================================
//  customer_management.js
//  Wires up customer_management.html to the manage-customers
//  Supabase Edge Function
// ============================================================

// --- STATE ---
let customers = [];
let editingCustomerId = null;
let currentPage = 1;
const itemsPerPage = 10;

// --- ROLE ACCESS ---
const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || localStorage.getItem("userRole") || "admin").toLowerCase();

// --- DOM: FORM FIELDS ---
const customerForm       = document.getElementById("customerForm");
const nameInput          = document.getElementById("customerName");
const phoneInput         = document.getElementById("customerPhone");
const emailInput         = document.getElementById("customerEmail");
const tierSelect         = document.getElementById("customerTier");
const loyaltyInput       = document.getElementById("customerLoyalty");
const dobInput           = document.getElementById("customerDob");
const addressInput       = document.getElementById("customerAddress");
const submitBtn          = customerForm?.querySelector('button[type="submit"]');
const submitBtnText      = submitBtn ? submitBtn.querySelector("span") : null;

// --- DOM: TABLE & SEARCH ---
const tableWrapper       = document.querySelector(".premium-table-wrapper");
const searchInput        = document.querySelector(".premium-search");
const filterSelect       = document.querySelector(".premium-filter");

// --- DOM: STATS ---
const totalBadge         = document.querySelectorAll(".stat-badge")[0];
const totalValue         = document.querySelectorAll(".stat-value")[0];
const newMonthBadge      = document.querySelectorAll(".stat-badge")[1];
const newMonthValue      = document.querySelectorAll(".stat-value")[1];
const highValueBadge     = document.querySelectorAll(".stat-badge")[3];
const highValueValue     = document.querySelectorAll(".stat-value")[3];
const customerCountSpan  = document.querySelector(".customer-count");

// ============================================================
//  LOAD CUSTOMERS
// ============================================================
async function loadCustomers() {
  try {
    renderTableLoading();

    const { data, error } = await window.supabase
      .from('customers')
      .select('*')
      .order('full_name');

    if (error) throw error;

    customers = data || [];
    renderTable();
    updateStats();
  } catch (err) {
    console.error("Failed to load customers:", err);
    renderTableError(err.message || JSON.stringify(err));
  }
}

// ============================================================
//  STATS
// ============================================================
function updateStats() {
  const total = customers.length;

  // New this month
  const now = new Date();
  const newThisMonth = customers.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // High value = Gold or Platinum tier
  const highValue = customers.filter(c =>
    ["gold", "platinum"].includes((c.tier || "").toLowerCase())
  ).length;

  if (totalBadge)    totalBadge.textContent    = total;
  if (totalValue)    totalValue.textContent    = total;
  if (newMonthBadge) newMonthBadge.textContent = `+${newThisMonth}`;
  if (newMonthValue) newMonthValue.textContent = newThisMonth;
  if (highValueBadge) highValueBadge.textContent = highValue;
  if (highValueValue) highValueValue.textContent = highValue;

  if (customerCountSpan) {
    customerCountSpan.textContent = `${total} active • ${newThisMonth} new this month`;
  }
}

// ============================================================
//  RENDER TABLE
// ============================================================
function getTierClass(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "gold" || t === "platinum") return "vip";
  if (t === "silver") return "active";
  return "new";
}

function getTierBadgeClass(tier) {
  const t = (tier || "").toLowerCase();
  if (t === "gold" || t === "platinum") return "vip";
  if (t === "silver") return "active";
  return "new";
}

function getTierLabel(tier) {
  const t = (tier || "bronze").toLowerCase();
  if (t === "platinum") return "Platinum VIP";
  if (t === "gold")     return "Gold";
  if (t === "silver")   return "Silver";
  return "Bronze";
}

function renderTable() {
  const query      = (searchInput?.value || "").trim().toLowerCase();
  const filterVal  = (filterSelect?.value || "All Customers").toLowerCase();

  let filtered = customers.filter(c => {
    const target = `${c.full_name} ${c.phone} ${c.email} ${c.tier}`.toLowerCase();
    return target.includes(query);
  });

  if (filterVal !== "all customers") {
    filtered = filtered.filter(c => getTierLabel(c.tier).toLowerCase() === filterVal);
  }

  // --- PAGINATION ---
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;

  // Remove old dynamic rows (keep the sticky header row)
  const headerRow = tableWrapper?.querySelector(".table-header-row");
  if (tableWrapper) {
    tableWrapper.innerHTML = "";
    if (headerRow) tableWrapper.appendChild(headerRow);
  }

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "padding: 40px; text-align: center; color: #94a3b8; font-size: 16px;";
    empty.innerHTML = `<i class="fa-solid fa-users" style="font-size:32px;margin-bottom:12px;display:block;"></i>No customers found.`;
    tableWrapper?.appendChild(empty);
    return;
  }

  paginated.forEach((c, index) => {
    const rowClass  = getTierClass(c.tier);
    const badgeClass = getTierBadgeClass(c.tier);
    const label     = getTierLabel(c.tier);
    const shortId   = `#C${String(startIndex + index + 1).padStart(3, "0")}`;
    const initials  = (c.full_name || "?").charAt(0).toUpperCase();
    const row = document.createElement("div");
    row.className = `customer-row ${rowClass}-row`;
    row.dataset.id = c.id;
    row.innerHTML = `
      <div class="table-cell id-col">${shortId}</div>
      <div class="table-cell name-col">
        <div class="customer-avatar" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; font-weight: 700; font-size: 18px;">
          ${initials}
        </div>
        <div class="customer-details">
          <div class="customer-name">${c.full_name || "Unknown"}</div>
          <div class="customer-email">${c.email || "—"}</div>
        </div>
      </div>
      <div class="table-cell phone-col">${c.phone || "—"}</div>
      <div class="table-cell spend-col">
        <span class="currency">GHC</span> 0
        <div class="spend-trend steady">—</div>
      </div>
      <div class="table-cell visits-col">0</div>
      <div class="table-cell points-col">
        ${c.loyalty_points ?? 0} pts
        ${badgeClass === "vip" ? `<span class="points-badge vip">${label}</span>` : ""}
      </div>
      <div class="table-cell status-col">
        <span class="status-badge ${badgeClass}">${label}</span>
      </div>
      <div class="table-cell actions-col">
        <button class="action-btn edit" data-action="edit" data-id="${c.id}" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="action-btn" data-action="delete" data-id="${c.id}" title="Delete"
          style="color:#ef4444;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    tableWrapper?.appendChild(row);
  });
}

function renderTableLoading() {
  const headerRow = tableWrapper?.querySelector(".table-header-row");
  if (tableWrapper) {
    tableWrapper.innerHTML = "";
    if (headerRow) tableWrapper.appendChild(headerRow);
  }
  const loading = document.createElement("div");
  loading.style.cssText = "padding: 40px; text-align: center; color: #94a3b8; font-size: 16px;";
  loading.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:28px;margin-bottom:12px;display:block;"></i>Loading customers...`;
  tableWrapper?.appendChild(loading);
}

function renderTableError(msg) {
  const headerRow = tableWrapper?.querySelector(".table-header-row");
  if (tableWrapper) {
    tableWrapper.innerHTML = "";
    if (headerRow) tableWrapper.appendChild(headerRow);
  }
  const err = document.createElement("div");
  err.style.cssText = "padding: 40px; text-align: center; color: #ef4444; font-size: 15px;";
  err.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="font-size:28px;margin-bottom:12px;display:block;"></i><b>Error loading customers:</b><br>${msg}`;
  tableWrapper?.appendChild(err);
}

// ============================================================
//  FORM — CREATE / UPDATE
// ============================================================
function setFormMode(mode, customer = null) {
  const heroTitle = document.querySelector(".hero-title");
  const heroBadge = document.querySelector(".add-customer-badge");

  if (mode === "edit" && customer) {
    editingCustomerId = customer.id;
    if (heroTitle)    heroTitle.textContent = "Edit Customer";
    if (heroBadge)    heroBadge.innerHTML   = `<i class="fa-solid fa-pen"></i> Editing`;
    if (submitBtnText) submitBtnText.textContent = "Save Changes";

    if (nameInput)    nameInput.value    = customer.full_name || "";
    if (phoneInput)   phoneInput.value   = customer.phone || "";
    if (emailInput)   emailInput.value   = customer.email || "";
    if (tierSelect) {
      const t = (customer.tier || "bronze").toLowerCase();
      if (t === "platinum") tierSelect.value = "Platinum";
      else if (t === "gold") tierSelect.value = "Gold";
      else if (t === "silver") tierSelect.value = "Silver";
      else tierSelect.value = "Bronze";
    }
    if (loyaltyInput) loyaltyInput.value = customer.loyalty_points ?? 0;
    if (dobInput)     dobInput.value     = customer.date_of_birth || "";
    if (addressInput) addressInput.value = customer.address || "";

    // Scroll to form
    customerForm?.scrollIntoView({ behavior: "smooth", block: "start" });

  } else {
    editingCustomerId = null;
    if (heroTitle)     heroTitle.textContent    = "Add New Customer";
    if (heroBadge)     heroBadge.innerHTML      = `<i class="fa-solid fa-user-plus"></i> Quick Add`;
    if (submitBtnText) submitBtnText.textContent = "Create Profile";
    customerForm?.reset();
  }
}

function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const full_name     = (nameInput?.value || "").trim();
  const phone         = (phoneInput?.value || "").trim();
  const email         = (emailInput?.value || "").trim();
  
  // MUST BE EXACT TITLE CASE TO MATCH POSTGRESQL CHECK CONSTRAINT
  const dbTier        = tierSelect?.value || "Bronze";
  
  const loyalty_points = parseInt(loyaltyInput?.value || "0", 10);
  const date_of_birth  = (dobInput?.value || "").trim() || null;
  const address        = (addressInput?.value || "").trim() || null;

  if (!full_name || !phone) {
    alert("Full Name and Phone Number are required.");
    return;
  }

  // Disable button while saving
  if (submitBtn) {
    submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = "Saving...";
  }

  try {
    if (editingCustomerId) {
      // --- UPDATE ---
      const { error } = await window.supabase
        .from('customers')
        .update({
          full_name,
          phone,
          email: email || null,
          tier: dbTier,
          loyalty_points,
          date_of_birth,
          address
        })
        .eq('id', editingCustomerId);

      if (error) throw error;

      await loadCustomers();
      setFormMode("add");
      alert(`"${full_name}" updated successfully!`);

    } else {
      // --- CREATE ---
      const { error } = await window.supabase
        .from('customers')
        .insert([{
          full_name,
          phone,
          email: email || null,
          tier: dbTier,
          loyalty_points,
          date_of_birth,
          address
        }]);

      if (error) throw error;

      await loadCustomers();
      customerForm?.reset();
      alert(`Customer "${full_name}" added successfully!`);
    }

  } catch (err) {
    console.error("Save failed:", err);
    const detailedError = err.context?.error?.message || err.message || JSON.stringify(err);
    alert("Failed to save customer: " + detailedError);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = editingCustomerId ? "Save Changes" : "Create Profile";
    }
  }
}

// ============================================================
//  TABLE ACTIONS — EDIT / DELETE
// ============================================================
function handleTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id     = btn.dataset.id;
  const action = btn.dataset.action;
  const customer = customers.find(c => c.id === id);
  if (!customer) return;

  if (action === "edit") {
    setFormMode("edit", customer);

  } else if (action === "delete") {
    if (!window.confirm(`Permanently delete "${customer.full_name}"?`)) return;
    deleteCustomer(id, customer.full_name);
  }
}

async function deleteCustomer(id, name) {
  try {
    const { error } = await window.supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await loadCustomers();
    alert(`"${name}" deleted successfully.`);

  } catch (err) {
    console.error("Delete failed:", err);
    alert("Failed to delete customer: " + (err.message || JSON.stringify(err)));
  }
}

// ============================================================
//  EXPORT CSV
// ============================================================
function exportCSV() {
  if (customers.length === 0) {
    alert("No customers to export.");
    return;
  }

  const headers = ["Full Name", "Email", "Phone", "Address", "Date of Birth", "Loyalty Points", "Tier", "Created At"];
  const rows = customers.map(c => [
    c.full_name || "",
    c.email || "",
    c.phone || "",
    c.address || "",
    c.date_of_birth || "",
    c.loyalty_points ?? 0,
    getTierLabel(c.tier),
    c.created_at ? new Date(c.created_at).toLocaleDateString() : ""
  ]);

  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
customerForm?.addEventListener("submit", handleFormSubmit);
tableWrapper?.addEventListener("click", handleTableClick);

// Reset to page 1 whenever user searches or filters
searchInput?.addEventListener("input", () => { currentPage = 1; renderTable(); });
filterSelect?.addEventListener("change", () => { currentPage = 1; renderTable(); });

document.querySelector(".btn-export")?.addEventListener("click", exportCSV);

// Pagination listeners
const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderTable(); }
  });
}
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    currentPage++; renderTable();
  });
}

// Cancel edit when Reset Form is clicked
document.querySelector('.action-btn.secondary')?.addEventListener("click", () => {
  setFormMode("add");
});

// ============================================================
//  INIT
// ============================================================
loadCustomers();