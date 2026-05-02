// Shared product/inventory data management
// Used by product_management.html, inventory.js, cashier_checkout.html

const INVENTORY_KEY = 'posInventory';

export function loadInventory() {
  try {
    const data = localStorage.getItem(INVENTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load inventory:', e);
    return [];
  }
}

export function saveInventory(inventory) {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.error('Failed to save inventory:', e);
  }
}

export function getInStockProducts() {
  const inventory = loadInventory();
  return inventory.filter(item => (item.quantity || 0) > 0);
}

export function searchProducts(query) {
  const products = getInStockProducts();
  const lowerQuery = query.toLowerCase();
  return products.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) || 
    p.barcode.includes(lowerQuery)
  );
}

// Default sample data (if empty)
export function ensureSampleData() {
  let inventory = loadInventory();
  if (inventory.length === 0) {
    inventory = [
      { id: 1, name: 'Mineral Water 1.5L', barcode: '645123456789', price: 5.50, quantity: 124, category: 'Beverages', description: '1.5L bottle' },
      { id: 2, name: 'Coca-Cola 500ml', barcode: '645123456790', price: 3.00, quantity: 89, category: 'Beverages', description: '500ml can' },
      { id: 3, name: 'Lays Chips', barcode: '645123456791', price: 2.50, quantity: 8, category: 'Snacks', description: 'Classic flavor' },
      { id: 4, name: 'Energy Drink', barcode: '645123456792', price: 9.50, quantity: 204, category: 'Beverages', description: '250ml' }
    ];
    saveInventory(inventory);
  }
  return inventory;
}

