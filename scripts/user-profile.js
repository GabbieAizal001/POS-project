(function() {
  'use strict';
  
  window.updateProfileDisplay = function() {
    const userName = localStorage.getItem('userName') || 'User';
    const userRole = localStorage.getItem('userRole') || 'Cashier';
    
    const nameEl = document.querySelector('.profile-name');
    const roleEl = document.querySelector('.profile-role');
    
    if (nameEl) nameEl.textContent = userName;
    if (roleEl) roleEl.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
  };
  
  function tryUpdate() {
    if (localStorage.getItem('userName')) {
      window.updateProfileDisplay();
      return;
    }
    setTimeout(tryUpdate, 500);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryUpdate);
  } else {
    tryUpdate();
  }
})();

