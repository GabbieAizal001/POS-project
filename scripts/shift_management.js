/**
 * Shift Management & Blind Count Float Verification
 * Include this script in cashier_dashboard.html
 */

document.addEventListener('DOMContentLoaded', () => {
  const userRole = localStorage.getItem('userRole');
  if (userRole !== 'cashier') return;

  const isShiftActive = localStorage.getItem('shiftActive') === 'true';
  
  if (!isShiftActive) {
    renderFloatModal();
  } else {
    applyFloatToDashboard();
  }
});

function renderFloatModal() {
  // Create the modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'floatVerificationOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px)center;
    display: flex; align-items: ; justify-content: center;
    z-index: 9999;
  `;

  overlay.innerHTML = `
    <div style="background: white; padding: 32px; border-radius: 24px; width: 90%; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; font-family: 'Inter', sans-serif;">
      <div style="background: #eff6ff; color: #3b82f6; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px;">
        <i class="fa-solid fa-cash-register"></i>
      </div>
      <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 22px;">Open Register</h2>
      <p style="color: #64748b; font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
        Please count the physical cash currently in your drawer (Blind Count) and enter the exact total to start your shift.
      </p>
      
      <div style="text-align: left; margin-bottom: 24px;">
        <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 8px; font-size: 14px;">Total Cash Counted (GHC)</label>
        <input type="number" id="blindCountInput" placeholder="0.00" step="0.01" min="0" 
          style="width: 100%; padding: 14px 16px; border: 2px solid #cbd5e1; border-radius: 12px; font-size: 18px; font-weight: 600; outline: none; transition: border-color 0.2s; box-sizing: border-box;">
      </div>
      
      <button id="openShiftBtn" style="width: 100%; padding: 16px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: background 0.2s;">
        Open Shift & Accept Responsibility
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Handle Submission
  document.getElementById('openShiftBtn').addEventListener('click', () => {
    const input = document.getElementById('blindCountInput');
    const floatAmount = parseFloat(input.value);
    
    if (isNaN(floatAmount) || floatAmount < 0) {
      alert("Please enter a valid cash amount.");
      return;
    }

    // Store the shift, the counted float, and the current date locally
    localStorage.setItem('shiftActive', 'true');
    localStorage.setItem('startingFloat', floatAmount.toFixed(2));
    localStorage.setItem('shiftDate', new Date().toDateString());
    
    overlay.remove();
    applyFloatToDashboard();
  });
}

function applyFloatToDashboard() {
  const startingFloat = parseFloat(localStorage.getItem('startingFloat') || '0');
  console.log(`Shift active. Starting Float: GHC ${startingFloat.toFixed(2)}`);
  
  // If you have an element that displays the till balance, update it here
  const tillDisplay = document.getElementById('tillBalanceValue');
  if (tillDisplay) {
    tillDisplay.textContent = `GHC ${startingFloat.toFixed(2)}`;
  }
}

// Expose a Cash-In function globally so it can be called from a button on the dashboard
window.addCashToFloat = function() {
  const amount = parseFloat(prompt("Enter amount of change added to the drawer by manager (Cash In):"));
  if (!isNaN(amount) && amount > 0) {
    const currentFloat = parseFloat(localStorage.getItem('startingFloat') || '0');
    const newFloat = currentFloat + amount;
    localStorage.setItem('startingFloat', newFloat.toFixed(2));
    alert(`Successfully added GHC ${amount.toFixed(2)} to float.\nNew starting float total is GHC ${newFloat.toFixed(2)}`);
    applyFloatToDashboard(); // Refresh the UI
  }
};