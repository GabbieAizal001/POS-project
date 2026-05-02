let currentCategoryId = null;
let currentEditCategoryId = null;
let currentEditItemId = null;
let inventoryItems = [];
let categories = [];

// Supabase functions
async function insertInventoryItem(itemData) {
  const { data, error } = await window.supabase.from('inventory').insert([itemData]).select().single();
  if (error) throw error;
  return data;
}

async function updateInventoryItem(id, itemData) {
  const { data, error } = await window.supabase.from('inventory').update(itemData).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteInventoryItem(id) {
  const { error } = await window.supabase.from('inventory').delete().eq('id', id);
  if (error) throw error;
}

async function loadCategoriesFromDB() {
  const { data, error } = await window.supabase.from('categories').select('*').order('name');
  if (error) throw error;
  return data || [];
}

async function insertCategoryDB(categoryData) {
  const { data, error } = await window.supabase.from('categories').insert([categoryData]).select().single();
  if (error) throw error;
  return data;
}

async function updateCategoryDB(id, categoryData) {
  const { data, error } = await window.supabase.from('categories').update(categoryData).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deleteCategoryDB(id) {
  const { error } = await window.supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

async function loadInventory() {
  try {
    const [cats, items] = await Promise.all([loadCategoriesFromDB(), window.supabase.from('inventory').select('*').order('item_name')]);
    categories = cats;
    if (items.error) throw items.error;
    inventoryItems = items.data || [];
    populateInventoryUI();
  } catch (error) {
    console.error('Load inventory error:', error);
    alert('Failed to load inventory: ' + error.message);
  }
}

function createCategoryPill(id, name) {
  const pill = document.createElement("div");
  pill.className = "category-item";
  pill.dataset.categoryId = id;
  pill.innerHTML = `
    <span class="category-name">${name}</span>
    <button type="button" class="category-menu-btn" onclick="openCategoryMenu(this)">⋮</button>
  `;
  pill.addEventListener("click", function(e){
    if(e.target.closest(".category-menu-btn")) return;
    selectCategory(id, name);
  });
  return pill;
}

function createItemCard(item) {
  const card = document.createElement("div");
  card.className = "item-card";
  card.dataset.itemId = item.id;
  card.dataset.categoryId = item.category_id || '';
  card.dataset.name = item.item_name;
  card.dataset.barcode = item.barcode;

  card.dataset.price = item.price;
  card.dataset.quantity = item.quantity;
  card.dataset.taxRate = item.tax_rate;
  card.dataset.unit = item.unit;
  card.dataset.discount = item.discount_eligibility;
  card.innerHTML = `
    <button type="button" class="item-menu-btn" onclick="openItemMenu(this)">⋯</button>
    <div class="item-info">
      <h4>${item.item_name}</h4>
      <p>${item.barcode || "—"}</p>
      <p>${item.unit ? `(${item.unit})` : ''}</p>
      <p class="item-price">GHC ${parseFloat(item.price).toFixed(2)}</p>
      ${item.tax_rate ? `<small>Tax: ${item.tax_rate}% | Disc: ${item.discount_eligibility?.toUpperCase()}</small>` : ''}
    </div>
    <div class="item-qty">${item.quantity}</div>
  `;
  return card;
}

function populateInventoryUI() {
  const grid = document.getElementById('itemsGrid');
  if (!grid) return;

  // Clear existing item cards (keep add-card)
  grid.querySelectorAll('.item-card').forEach(card => card.remove());

  // Create categories
  const catList = document.getElementById('categoryList');
  if (catList) {
    catList.innerHTML = '';
    categories.forEach(cat => {
      catList.appendChild(createCategoryPill(cat.id, cat.name));
    });
  }

  // Add all items
  inventoryItems.forEach(item => grid.appendChild(createItemCard(item)));
  updateCategoryEmptyState();
  
  // Reselect category if possible
  if (currentCategoryId) {
    const cat = categories.find(c => String(c.id) === String(currentCategoryId));
    if (cat) selectCategory(cat.id, cat.name);
  } else if (categories.length > 0) {
    selectCategory(categories[0].id, categories[0].name);
  }
}

// Item menu: global handler
document.addEventListener("click", function(e){
  const targetEl = (e.target && e.target.nodeType === 3) ? e.target.parentElement : e.target;
  const btn = targetEl && targetEl.closest ? targetEl.closest(".item-menu-btn") : null;
  if(btn){
    e.preventDefault();
    openItemMenu(btn);
  }
}, true);

function updateCategoryEmptyState(){
  const empty = document.getElementById("categoryEmpty");
  const list = document.getElementById("categoryList");
  if(!empty || !list) return;
  empty.style.display = (list.children.length === 0) ? "block" : "none";
}

function addCategory(){
  const overlay = document.getElementById("categoryModalOverlay");
  if(!overlay) return;

  const input = document.getElementById("categoryNameInput");
  if(input){
    input.value = "";
    input.classList.remove("field-error");
    const field = input.closest(".modal-field");
    if(field){
      field.classList.remove("has-error");
    }
  }

  const saveBtn = document.getElementById("saveCategoryBtn");
  if(saveBtn){
    saveBtn.disabled = true;
  }

  overlay.classList.add("active");
}

function closeCategoryModal(){
  const overlay = document.getElementById("categoryModalOverlay");
  if(overlay){
    overlay.classList.remove("active");
  }
}

async function saveCategoryFromModal(){
  const input = document.getElementById("categoryNameInput");
  if(!input) return;

  const ok = validateItemField(input, "text");
  if(!ok) return;

  const name = input.value.trim();
  const saveBtn = document.getElementById("saveCategoryBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const newCat = await insertCategoryDB({ name });
    categories.push(newCat);

    const pill = createCategoryPill(newCat.id, newCat.name);
    const list = document.getElementById("categoryList");
    if(list){
      list.appendChild(pill);
    }

    updateCategoryEmptyState();
    closeCategoryModal();
    selectCategory(newCat.id, newCat.name);
  } catch (error) {
    console.error('Insert category error:', error);
    alert('Error saving category: ' + (error.message || error));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

function addItem(){
  const overlay = document.getElementById("itemModalOverlay");
  if(!overlay) return;

  const userRole = localStorage.getItem('userRole') || '';
  if (!['admin', 'manager'].includes(userRole)) {
    alert('Only admins and managers can add items.');
    return;
  }

  // reset fields
  ["itemNameInput","barcodeInput","descriptionInput","priceInput","quantityInput","taxRateInput","unitInput"].forEach(id => {
    const input = document.getElementById(id);
    if(input){
      input.value = "";
      input.classList.remove("field-error");
      const field = input.closest(".modal-field");
      if(field) field.classList.remove("has-error");
    }
  });
  const discountSelect = document.getElementById("discountInput");
  if(discountSelect) discountSelect.value = "";

  const saveBtn = document.getElementById("saveItemBtn");
  if(saveBtn) saveBtn.disabled = true;

  overlay.classList.add("active");
}

function closeItemModal(){
  const overlay = document.getElementById("itemModalOverlay");
  if(overlay){
    overlay.classList.remove("active");
  }
}

function validateItemField(input, type){
  if(!input) return false;
  const value = input.value.trim();
  let valid = true;

  if(type === "text"){
    valid = value !== "";
  }else if(type === "number"){
    valid = value !== "" && !isNaN(value) && parseFloat(value) >= 0;
  }

  const field = input.closest(".modal-field");
  if(!valid){
    input.classList.add("field-error");
    if(field) field.classList.add("has-error");
  }else{
    input.classList.remove("field-error");
    if(field) field.classList.remove("has-error");
  }
  return valid;
}

function validateItemForm(){
  const nameInput = document.getElementById("itemNameInput");
  const barcodeInput = document.getElementById("barcodeInput");
  const priceInput = document.getElementById("priceInput");
  const quantityInput = document.getElementById("quantityInput");
  const taxRateInput = document.getElementById("taxRateInput");
  const unitInput = document.getElementById("unitInput");
  const discountInput = document.getElementById("discountInput");

  const nameValid = validateItemField(nameInput, "text");
  const barcodeValid = validateItemField(barcodeInput, "text");
  const priceValid = validateItemField(priceInput, "number");
  const quantityValid = validateItemField(quantityInput, "number");
  const taxValid = validateItemField(taxRateInput, "number");
  const unitValid = validateItemField(unitInput, "text");
  const discountValid = discountInput.value !== "";

  const allValid = nameValid && barcodeValid && priceValid && quantityValid && taxValid && unitValid && discountValid;

  const saveBtn = document.getElementById("saveItemBtn");
  if(saveBtn) saveBtn.disabled = !allValid;

  return allValid;
}

async function saveItemFromModal(){
  if(!validateItemForm()) return;

  if(!currentCategoryId) {
    alert('Please select a category first.');
    return;
  }

  const userRole = localStorage.getItem('userRole') || '';
  if (!['admin', 'manager'].includes(userRole)) {
    alert('Only admins and managers can add items.');
    return;
  }

  const saveBtn = document.getElementById("saveItemBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const itemData = {
      category_id: currentCategoryId,
      item_name: document.getElementById("itemNameInput").value.trim(),
      barcode: document.getElementById("barcodeInput").value.trim(),

      price: parseFloat(document.getElementById("priceInput").value),
      quantity: parseInt(document.getElementById("quantityInput").value, 10),
      tax_rate: parseFloat(document.getElementById("taxRateInput").value),
      unit: document.getElementById("unitInput").value.trim() || 'pcs',
      discount_eligibility: document.getElementById("discountInput").value || 'none'
    };

    const newItem = await insertInventoryItem(itemData);
    const grid = document.getElementById('itemsGrid');
    if (grid) grid.appendChild(createItemCard(newItem));

    closeItemModal();
    alert('Item saved successfully!');
  } catch (error) {
    console.error('Insert error:', error);
    alert('Error saving item: ' + (error.message || error));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

function openItemMenu(button){
  const userRole = localStorage.getItem('userRole') || '';
  if (!['admin', 'manager'].includes(userRole)) {
    alert('Only admins and managers can edit items.');
    return;
  }

  const card = button.closest(".item-card");
  if(!card) return;

  const itemId = card.dataset.itemId;
  currentEditItemId = itemId;

  const overlay = document.getElementById("itemActionOverlay");
  if(!overlay) return;
  overlay.dataset.itemId = itemId;

  // populate edit fields from dataset
  ['name', 'barcode', 'description', 'price', 'quantity', 'taxRate', 'unit', 'discount'].forEach(key => {
    const input = document.getElementById('edit' + key.charAt(0).toUpperCase() + key.slice(1) + 'Input') || document.getElementById('editItem' + key.charAt(0).toUpperCase() + key.slice(1) + 'Input');
    if (input) input.value = card.dataset[key] || '';
  });
  const discountInput = document.getElementById("editDiscountInput");
  if (discountInput) discountInput.value = card.dataset.discount || '';

  // clear errors
  document.querySelectorAll('.modal-field').forEach(field => field.classList.remove('has-error'));
  document.querySelectorAll('input.field-error').forEach(input => input.classList.remove('field-error'));

  overlay.classList.add("active");
}

function closeItemActionModal(){
  const overlay = document.getElementById("itemActionOverlay");
  if(overlay){
    overlay.classList.remove("active");
    overlay.dataset.itemId = "";
  }
  currentEditItemId = null;
}

function validateEditItemForm(){
  const priceInput = document.getElementById("editItemPriceInput");
  const qtyInput = document.getElementById("editItemQuantityInput");
  const taxInput = document.getElementById("editTaxRateInput");
  const unitInput = document.getElementById("editUnitInput");
  const discountInput = document.getElementById("editDiscountInput");

  const priceOk = validateItemField(priceInput, "number");
  const qtyOk = validateItemField(qtyInput, "number");
  const taxOk = validateItemField(taxInput, "number");
  const unitOk = validateItemField(unitInput, "text");
  const discountOk = discountInput.value !== "";

  return priceOk && qtyOk && taxOk && unitOk && discountOk;
}

async function saveItemEdit(){
  if(!validateEditItemForm()) return;

  const saveBtn = document.querySelector('.btn-primary[onclick="saveItemEdit()"]');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const itemData = {
      item_name: document.getElementById("editItemNameInput").value.trim(),
      barcode: document.getElementById("editItemBarcodeInput").value.trim(),

      price: parseFloat(document.getElementById("editItemPriceInput").value),
      quantity: parseInt(document.getElementById("editItemQuantityInput").value, 10),
      tax_rate: parseFloat(document.getElementById("editTaxRateInput").value),
      unit: document.getElementById("editUnitInput").value.trim() || 'pcs',
      discount_eligibility: document.getElementById("editDiscountInput").value || 'none'
    };

    await updateInventoryItem(currentEditItemId, itemData);
    await loadInventory(); // Refresh UI
    closeItemActionModal();
    alert('Item updated successfully!');
  } catch (error) {
    console.error('Update error:', error);
    alert('Error updating item: ' + (error.message || error));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function deleteCurrentItem(){
  if(!confirm('Delete this item?')) return;

  try {
    await deleteInventoryItem(currentEditItemId);
    await loadInventory(); // Refresh UI
    closeItemActionModal();
  } catch (error) {
    console.error('Delete error:', error);
    alert('Error deleting item: ' + (error.message || error));
  }
}

// Category functions (local)
function openCategoryMenu(button){
  const pill = button.closest(".category-item");
  if(!pill) return;
  const categoryId = pill.dataset.categoryId;
  currentEditCategoryId = categoryId;

  const overlay = document.getElementById("categoryActionOverlay");
  if(!overlay) return;

  const nameEl = pill.querySelector(".category-name");
  const input = document.getElementById("renameCategoryInput");
  if(input){
    input.value = nameEl ? nameEl.textContent.trim() : "";
    input.classList.remove("field-error");
    const field = input.closest(".modal-field");
    if(field) field.classList.remove("has-error");
  }

  overlay.classList.add("active");
}

function closeCategoryActionModal(){
  const overlay = document.getElementById("categoryActionOverlay");
  if(overlay){
    overlay.classList.remove("active");
  }
  currentEditCategoryId = null;
}

async function renameCurrentCategory(){
  const input = document.getElementById("renameCategoryInput");
  if(!input) return;

  const newName = input.value.trim();
  if(newName === ""){
    input.classList.add("field-error");
    const field = input.closest(".modal-field");
    if(field) field.classList.add("has-error");
    return;
  }

  if(currentEditCategoryId){
    try {
      const saveBtn = document.querySelector('#categoryActionOverlay .btn-primary');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

      await updateCategoryDB(currentEditCategoryId, { name: newName });
      
      const pill = document.querySelector('.category-item[data-category-id="'+currentEditCategoryId+'"]');
      if(pill){
        const nameEl = pill.querySelector(".category-name");
        if(nameEl) nameEl.textContent = newName;
      }

      if(String(currentCategoryId) === String(currentEditCategoryId)){
        const heading = document.querySelector(".items-area h2");
        if(heading) heading.textContent = "Items - " + newName;
        const subtitle = document.querySelector(".add-card-subtitle");
        if(subtitle) subtitle.textContent = newName;
      }
      
      const catObj = categories.find(c => String(c.id) === String(currentEditCategoryId));
      if (catObj) catObj.name = newName;

      closeCategoryActionModal();
    } catch (error) {
      console.error('Update category error:', error);
      alert('Error updating category: ' + (error.message || error));
    } finally {
      const saveBtn = document.querySelector('#categoryActionOverlay .btn-primary');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
    }
  }
}

async function deleteCurrentCategory(){
  if(!currentEditCategoryId){
    closeCategoryActionModal();
    return;
  }

  if(!confirm('Delete this category and all its items?')) return;

  try {
    const delBtn = document.querySelector('#categoryActionOverlay .btn-danger');
    if (delBtn) { delBtn.disabled = true; delBtn.textContent = 'Deleting...'; }

    await deleteCategoryDB(currentEditCategoryId);

    const pill = document.querySelector('.category-item[data-category-id="'+currentEditCategoryId+'"]');
    if(pill) pill.remove();

    document.querySelectorAll('.item-card[data-category-id="'+currentEditCategoryId+'"]').forEach(card => card.remove());

    categories = categories.filter(c => String(c.id) !== String(currentEditCategoryId));
    inventoryItems = inventoryItems.filter(i => String(i.category_id) !== String(currentEditCategoryId));

    if(String(currentCategoryId) === String(currentEditCategoryId)){
      currentCategoryId = null;
      const heading = document.querySelector(".items-area h2");
      if(heading) heading.textContent = "Manage items";
      const addCard = document.querySelector(".add-card");
      if(addCard) addCard.classList.add("hidden");
      
      if (categories.length > 0) {
        selectCategory(categories[0].id, categories[0].name);
      }
    }

    updateCategoryEmptyState();
    closeCategoryActionModal();
  } catch (error) {
    console.error('Delete category error:', error);
    alert('Error deleting category: ' + (error.message || error));
  } finally {
    const delBtn = document.querySelector('#categoryActionOverlay .btn-danger');
    if (delBtn) { delBtn.disabled = false; delBtn.textContent = 'Delete'; }
  }
}

function selectCategory(categoryId, categoryName){
  currentCategoryId = categoryId;

  document.querySelectorAll(".category-item").forEach(pill => {
    pill.classList.toggle("active", String(pill.dataset.categoryId) === String(categoryId));
  });

  const heading = document.querySelector(".items-area h2");
  if(heading) heading.textContent = "Items - " + categoryName;

  document.querySelectorAll(".item-card").forEach(card => {
    card.style.display = (String(card.dataset.categoryId) === String(categoryId)) ? "flex" : "none";
  });

  const addCard = document.querySelector(".add-card");
  if(addCard) addCard.classList.remove("hidden");

  const subtitle = document.querySelector(".add-card-subtitle");
  if(subtitle) subtitle.textContent = categoryName;
}

// Init
window.addEventListener("DOMContentLoaded", async function(){
  const userRole = localStorage.getItem('userRole') || '';
  const isWriter = ['admin', 'manager'].includes(userRole);
  if (!isWriter) {
    const addCard = document.querySelector(".add-card");
    if (addCard) addCard.style.display = 'none';
  }

  // Search
  const searchInput = document.getElementById("query");
  if(searchInput){
    searchInput.addEventListener("input", function(){
      const term = this.value.trim().toLowerCase();
      document.querySelectorAll("#itemsGrid .item-card").forEach(card => {
        const inCategory = !currentCategoryId || String(card.dataset.categoryId) === String(currentCategoryId);
        if(!inCategory){
          card.style.display = "none";
          return;
        }
        const haystack = (card.textContent || "").toLowerCase();
        card.style.display = term === "" || haystack.includes(term) ? "flex" : "none";
      });
    });
  }

  // Realtime validation
  ["itemNameInput","barcodeInput","descriptionInput","priceInput","quantityInput","taxRateInput","unitInput"].forEach(id => {
    const input = document.getElementById(id);
    if(input){
      input.addEventListener("input", function(){
        const type = ["priceInput","quantityInput","taxRateInput"].includes(id) ? "number" : "text";
        validateItemField(this, type);
        validateItemForm();
      });
    }
  });
  const discountSelect = document.getElementById("discountInput");
  if(discountSelect) discountSelect.addEventListener("change", validateItemForm);

  ["editItemNameInput","editItemBarcodeInput","editDescriptionInput","editItemPriceInput","editItemQuantityInput","editTaxRateInput","editUnitInput"].forEach(id => {
    const input = document.getElementById(id);
    if(input){
      input.addEventListener("input", function(){
        const type = id.includes('Price') || id.includes('Quantity') || id.includes('Tax') ? "number" : "text";
        validateItemField(this, type);
        validateEditItemForm();
      });
    }
  });
  const editDiscountSelect = document.getElementById("editDiscountInput");
  if(editDiscountSelect) editDiscountSelect.addEventListener("change", validateEditItemForm);

  // Category modal validation
  const catInput = document.getElementById("categoryNameInput");
  if(catInput){
    const saveBtn = document.getElementById("saveCategoryBtn");
    catInput.addEventListener("input", function(){
      const ok = validateItemField(this, "text");
      if(saveBtn) saveBtn.disabled = !ok;
    });
  }

  const addCard = document.querySelector(".add-card");
  if(addCard) addCard.classList.add("hidden");

  updateCategoryEmptyState();
  await loadInventory();
});
