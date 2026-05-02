const checkbox = document.querySelector('.switch input');

// checkbox.addEventListener('change', function() {
//   if (this.checked) {
//     document.body.classList.add('dark-mode');
//   } else {
//     document.body.classList.remove('dark-mode');
//   }
// });

// Supabase Authentication
document.addEventListener('DOMContentLoaded', async function() {
  const loginForm = document.getElementById('loginForm');
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employeeId = document.getElementById('employee_id').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!employeeId || !password) {
      alert('Please enter Employee ID and Password');
      return;
    }

    try {
      const email = employeeId.includes('@') ? employeeId : `${employeeId}@posify.com`;
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        alert(`Login failed: ${error.message}. Test: EMP-260101 / AmA7!2kL9p (create in Supabase first)`);
        return;
      }

      if (session?.user) {
        // Additional user verification
        
        let determinedRole = session.user.user_metadata?.role || session.user.app_metadata?.role;
        
        if (!determinedRole) {
          const idLower = employeeId.toLowerCase();
          if (idLower.includes('admin') || idLower === 'emp-100000') determinedRole = 'admin';
          else if (idLower.includes('manager') || idLower === 'emp-260102') determinedRole = 'manager';
          else determinedRole = 'cashier';
        }

        const role = determinedRole.toLowerCase(); // consistent lowercase
        const userId = session.user.id;
        // Store user name from metadata
        const userName = session.user.user_metadata?.full_name || employeeId || 'User';
        localStorage.setItem('userName', userName);
        console.log('Stored userName:', userName, 'Metadata:', session.user.user_metadata);
        
        // Reset shift tracking only if it's a new day, allowing logouts for breaks
        if (role === 'cashier') {
          const shiftDate = localStorage.getItem('shiftDate');
          const today = new Date().toDateString();
          if (shiftDate !== today) {
            localStorage.removeItem('shiftActive');
            localStorage.removeItem('startingFloat');
            localStorage.removeItem('shiftDate');
          }
        }

        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', userId);
        localStorage.setItem('employeeId', employeeId);
        localStorage.setItem('accessToken', session.access_token);
        window.location.href = `${role}_dashboard.html`;
      }
    } catch (err) {
      alert('Login error. Check console.');
      console.error(err);
    }
  });
});
