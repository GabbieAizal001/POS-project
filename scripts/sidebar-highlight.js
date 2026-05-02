(function() {
  'use strict';
  
  let currentActiveLink = null;
  
  function highlightCurrentPage(path = null) {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    
    sidebarLinks.forEach(link => {
      const linkPath = link.getAttribute('href').split('/').pop().split('?')[0].toLowerCase();
      
      if (path ? linkPath === path.toLowerCase() : window.location.pathname.split('/').pop().toLowerCase() === linkPath) {
        if (currentActiveLink) currentActiveLink.classList.remove('active');
        link.classList.add('active');
        currentActiveLink = link;
      } else {
        link.classList.remove('active');
      }
    });
  }
  
  // Handle navigation clicks
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.sidebar-nav a');
    if (link) {
      const targetPath = link.getAttribute('href').split('/').pop().split('?')[0];
      setTimeout(() => highlightCurrentPage(targetPath), 100);
    }
  });
  
// Handle modal/search button clicks (stay on current page)
  document.addEventListener('click', (e) => {
    const searchBtn = e.target.closest('.search-btn, .quick-btn');
    const modalClose = e.target.closest('.modal-close, .modal-overlay');
    if (searchBtn || modalClose) {
      // Don't change sidebar highlight for internal actions
      e.stopPropagation();
    }
  });
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => highlightCurrentPage());
  } else {
    highlightCurrentPage();
  }
  
  // Support manual trigger
  window.highlightSidebar = highlightCurrentPage;
  
})();

