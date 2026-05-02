// Authentication guard for role-based routing + theme
// Usage: <script src="../scripts/auth-guard.js"></script> before other scripts in HTML

(function() {
  const filename = window.location.pathname.split('/').pop().toLowerCase() || 'login.html';

  async function checkAuth() {
    if (filename === 'login.html') return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const storedRole = localStorage.getItem('userRole');
      const userRole = (session?.user?.user_metadata?.role || session?.user?.app_metadata?.role || storedRole || 'cashier').toLowerCase();

      if (!session || !storedRole) {
        await window.logout();
        return false;
      }

      // RBAC Screen Permissions
      const roleAccess = {
        admin: ['admin_dashboard.html', 'employee_management.html', 'inventory.html', 'customer_management.html', 'reports.html', 'product_management.html', 'admin_settings.html'],
        manager: ['manager_dashboard.html', 'inventory.html', 'manager_sales_report.html', 'customer_management.html', 'manager_settings.html'],
        cashier: ['cashier_dashboard.html', 'cashier_checkout.html', 'cashier_history.html', 'product_management.html', 'customer_management.html', 'cashier_settings.html', 'receipt.html', 'cashier_customers.html']

      };

      const allowedPages = roleAccess[userRole] || roleAccess.cashier;
      if (filename.endsWith('.html') && !allowedPages.includes(filename)) {
        window.location.href = `${userRole}_dashboard.html`;
        return false;
      }

      // Strip old themes, apply correct theme
      document.documentElement.classList.remove('admin-theme', 'manager-theme', 'cashier-theme');
      document.body.classList.remove('role-admin', 'role-manager', 'role-cashier');
      
      document.documentElement.classList.add(`${userRole}-theme`);
      document.body.classList.add(`role-${userRole}`);

      // Dynamically load correct dashboard CSS for shared pages
      const roleCSS = { 'admin': '../styles/a_Dashboard.css', 'manager': '../styles/manager_dashboard.css', 'cashier': '../styles/cashier_dashboard.css' };
      if (roleCSS[userRole] && !document.querySelector(`link[href="${roleCSS[userRole]}"]`)) {
        const roleLink = document.createElement('link');
        roleLink.rel = 'stylesheet';
        roleLink.href = roleCSS[userRole];
        document.head.appendChild(roleLink);
      }

      // Apply global Dark Mode if saved in localStorage
      if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark'); // Admin theme fallback
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.removeAttribute('data-theme');
      }

      return true;
    } catch (err) {
      console.error('Auth check failed', err);
      await window.logout();
      return false;
    }
  }

  // Run check on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }

  // Global logout function for sidebar
  window.logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch(e) {}
    localStorage.clear();
    document.documentElement.classList.remove('cashier-theme', 'manager-theme', 'admin-theme');
    window.location.href = 'login.html';
  };
})();
