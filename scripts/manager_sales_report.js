let allSalesRecords = [];
let inventoryData = [];
let allExpenses = [];
let salesChart = null;

const fromDateInput = document.getElementById("fromDateInput");
const toDateInput = document.getElementById("toDateInput");
const salesRecordsTbody = document.getElementById("salesRecordsTbody");
const totalSalesValue = document.getElementById("totalSalesValue");
const totalItemsSoldValue = document.getElementById("totalItemsSoldValue");
const totalStockValue = document.getElementById("totalStockValue");
const totalExpensesValue = document.getElementById("totalExpensesValue");

const expensesTbody = document.getElementById("expensesTbody");
const expenseModalOverlay = document.getElementById("expenseModalOverlay");
const expenseForm = document.getElementById("expenseForm");

const params = new URLSearchParams(window.location.search);
const role = (params.get("role") || localStorage.getItem("userRole") || "manager").toLowerCase();
if (role !== "manager") {
  alert("Only managers can access Sales Report.");
  window.location.href = "login.html";
}

// Set default dates (current month)
const dateToday = new Date();
fromDateInput.value = new Date(dateToday.getFullYear(), dateToday.getMonth(), 1).toISOString().split('T')[0];
toDateInput.value = new Date(dateToday.getFullYear(), dateToday.getMonth() + 1, 0).toISOString().split('T')[0];

async function loadData() {
  try {
    // Load Sales from Supabase
    const { data: salesData, error: salesError } = await window.supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
    if (salesError) throw salesError;

    // Map DB sales to the format expected by the report
    allSalesRecords = (salesData || []).map(sale => {
      const dateObj = new Date(sale.created_at);
      
      // Safely parse JSON arrays in case Supabase returns them as strings
      let parsedLines = [];
      if (typeof sale.line_items === 'string') {
        try { parsedLines = JSON.parse(sale.line_items); } catch(e) {}
      } else if (Array.isArray(sale.line_items)) {
        parsedLines = sale.line_items;
      }

      return {
        id: sale.receipt_id,
        date: dateObj.toISOString().slice(0, 10),
        time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cashier: sale.cashier_name,
        items: sale.items_count,
        total: parseFloat(sale.total_amount),
        paymentMethod: sale.payment_method,
        lines: parsedLines
      };
    });

    // Load Expenses from Supabase
    const { data: expData, error: expError } = await window.supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    if (expError) throw expError;

    allExpenses = (expData || []).map(exp => ({
      id: exp.id,
      date: exp.date,
      description: exp.description,
      amount: parseFloat(exp.amount),
      addedBy: exp.added_by
    }));

    // Load Inventory from Supabase
    const { data: invData, error: invError } = await window.supabase
      .from('inventory')
      .select('id, item_name, barcode, quantity, price')
      .order('item_name');
    if (invError) throw invError;
    inventoryData = invData || [];
  } catch (err) {
    console.error("Error fetching report data:", err);
    alert("Failed to load report data: " + err.message);
  }

  refreshReport();
}

// Safe local date parsing helper to prevent timezone shift bugs
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d);
}

function getFilteredSales() {
  const fromDate = parseLocalDate(fromDateInput.value);
  const toDate = parseLocalDate(toDateInput.value);
  
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  return allSalesRecords.filter((row) => {
    const rDate = parseLocalDate(row.date);
    if (!rDate) return false;
    rDate.setHours(12, 0, 0, 0); 
    if (fromDate && rDate < fromDate) return false;
    if (toDate && rDate > toDate) return false;
    return true;
  });
}

function getFilteredExpenses() {
  const fromDate = parseLocalDate(fromDateInput.value);
  const toDate = parseLocalDate(toDateInput.value);
  
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  return allExpenses.filter((row) => {
    const recordDate = parseLocalDate(row.date);
    if (!recordDate) return false;
    recordDate.setHours(12, 0, 0, 0);
    if (fromDate && recordDate < fromDate) return false;
    if (toDate && recordDate > toDate) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTable(rows) {
  if (!rows.length) {
    salesRecordsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No inventory or sales data found.</td></tr>`;
    return;
  }

  salesRecordsTbody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td style="font-weight: 600;">${row.name || 'Unknown'}</td>
        <td style="color: var(--muted); font-family: monospace;">${row.barcode || '-'}</td>
        <td><span style="display: inline-block; background: var(--secondary); color: var(--primary); padding: 4px 8px; border-radius: 8px; font-weight: bold;">${row.qtySold || 0}</span></td>
        <td>
          <span style="display: inline-block; padding: 4px 8px; border-radius: 8px; font-weight: bold; ${(row.inStock || 0) <= 10 ? 'background: #fef3c7; color: #d97706;' : 'background: #d1fae5; color: #059669;'}">
            ${row.inStock || 0} left
          </span>
        </td>
        <td style="font-weight: 700; color: var(--primary);">GHC ${(row.revenue || 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");
}

function renderExpensesTable(rows) {
  if (!rows.length) {
    expensesTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No expenses recorded for this range.</td></tr>`;
    return;
  }

  expensesTbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.date}</td>
      <td style="font-weight: 500;">${row.description}</td>
      <td style="color: var(--muted);">${row.addedBy}</td>
      <td style="font-weight: 700; color: #ef4444;">GHC ${row.amount.toFixed(2)}</td>
    </tr>
  `).join("");
}

function renderStats(salesRows, combinedData, expenseRows) {
  const totalSales = salesRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const totalSoldItems = combinedData.reduce((sum, row) => sum + row.qtySold, 0);
  const totalCurrentStock = combinedData.reduce((sum, row) => sum + row.inStock, 0);
  const totalExpenses = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  if (totalSalesValue) totalSalesValue.textContent = `GHC ${totalSales.toFixed(2)}`;
  if (totalItemsSoldValue) totalItemsSoldValue.textContent = String(totalSoldItems);
  if (totalStockValue) totalStockValue.textContent = String(totalCurrentStock);
  if (totalExpensesValue) totalExpensesValue.textContent = `GHC ${totalExpenses.toFixed(2)}`;
}

function getDailyAggregation(rows) {
  const bucket = {};
  rows.forEach((row) => {
    bucket[row.date] = (bucket[row.date] || 0) + Number(row.total || 0);
  });
  const labels = Object.keys(bucket).sort();
  const totals = labels.map((date) => Number(bucket[date].toFixed(2)));
  return { labels, totals };
}

function renderChart(rows) {
  const ctx = document.getElementById("salesTrendChart").getContext("2d");
  const { labels, totals } = getDailyAggregation(rows);

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Daily Revenue",
          data: totals,
          borderColor: "rgba(139, 156, 228, 1)",
          backgroundColor: "rgba(139, 156, 228, 0.2)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

function refreshReport() {
  const filteredSales = getFilteredSales();
  const filteredExpenses = getFilteredExpenses();
  
  // Aggregate sales data per product
  const productSales = {};
  filteredSales.forEach(sale => {
    (sale.lines || []).forEach(item => {
      const name = item.name || "Unknown";
      if (!productSales[name]) {
        productSales[name] = { qtySold: 0, revenue: 0 };
      }
      productSales[name].qtySold += Number(item.qty) || 0;
      productSales[name].revenue += Number(item.total) || (Number(item.qty) * Number(item.price)) || 0;
    });
  });

  // Combine with inventory
  let combinedData = inventoryData.map(inv => {
    const name = inv.item_name || "Unknown";
    const sales = productSales[name] || { qtySold: 0, revenue: 0 };

    // Dynamic Code Workaround: Visually deduct the sold items from the original DB quantity
    const displayStock = Math.max(0, (Number(inv.quantity) || 0) - (sales.qtySold || 0));

    return {
      name: name,
      barcode: inv.barcode || "N/A",
      inStock: displayStock,
      qtySold: sales.qtySold || 0,
      revenue: sales.revenue || 0
    };
  });

  // Include products that were sold but might have been deleted from inventory
  Object.keys(productSales).forEach(productName => {
    if (!combinedData.find(item => item.name === productName)) {
      combinedData.push({
        name: productName,
        barcode: "Deleted/Unknown",
        inStock: 0,
        qtySold: productSales[productName].qtySold || 0,
        revenue: productSales[productName].revenue || 0
      });
    }
  });

  // Sort safely to prevent NaN math errors
  combinedData.sort((a, b) => {
    const revDiff = (b.revenue || 0) - (a.revenue || 0);
    if (revDiff !== 0) return revDiff;
    const qtyDiff = (b.qtySold || 0) - (a.qtySold || 0);
    if (qtyDiff !== 0) return qtyDiff;
    return (a.inStock || 0) - (b.inStock || 0);
  });

  renderTable(combinedData);
  renderExpensesTable(filteredExpenses);
  renderStats(filteredSales, combinedData, filteredExpenses);
  renderChart(filteredSales);
}

// --- Modal & Expense Logic ---
document.getElementById("addExpenseBtn").addEventListener("click", () => {
  document.getElementById("expenseDate").value = new Date().toISOString().split('T')[0];
  expenseModalOverlay.classList.remove("hidden");
});

document.getElementById("cancelExpenseBtn").addEventListener("click", () => {
  expenseModalOverlay.classList.add("hidden");
  expenseForm.reset();
});

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("expenseDate").value;
  const description = document.getElementById("expenseDesc").value;
  const amount = parseFloat(document.getElementById("expenseAmount").value);

  // Get the currently logged in manager's details
  const { data: { session } } = await window.supabase.auth.getSession();
  const addedBy = localStorage.getItem("userName") || document.querySelector('.profile-name')?.textContent || "Manager";
  const addedById = session?.user?.id || null;

  const submitBtn = expenseForm.querySelector('button[type="submit"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving..."; }

  try {
    const { data, error } = await window.supabase
      .from('expenses')
      .insert([{
        date: date,
        description: description,
        amount: amount,
        added_by: addedBy,
        added_by_id: addedById,
        category: 'General'
      }])
      .select()
      .single();

    if (error) throw error;

    // Push successful DB entry to local array to update UI instantly
    allExpenses.push({ id: data.id, date: data.date, description: data.description, amount: parseFloat(data.amount), addedBy: data.added_by });
    
    expenseModalOverlay.classList.add("hidden");
    expenseForm.reset();
    refreshReport();
  } catch (err) {
    console.error("Expense save failed:", err);
    alert("Failed to save expense: " + err.message);
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Save Expense"; }
  }
});

document.getElementById("applyFiltersBtn").addEventListener("click", loadData);

document.getElementById("printReportBtn").addEventListener("click", () => {
  // Set the print header data before triggering print
  const from = fromDateInput.value;
  const to = toDateInput.value;
  
  let dateRangeStr = "All Time";
  if (from && to) {
    dateRangeStr = `${from} to ${to}`;
  }
  
  document.getElementById("printDateRange").textContent = `Date Range: ${dateRangeStr}`;
  document.getElementById("printGeneratedAt").textContent = `Generated: ${new Date().toLocaleString()}`;
  
  window.print();
});

loadData();
