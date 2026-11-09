/**
 * Gestión de tema (Oscuro / Claro) con persistencia en localStorage
 * y limpieza automática de extensiones .html en la URL
 */
(function() {
  // 1. Limpieza inmediata de extensión .html en la barra de navegación del navegador
  try {
    if (window.location.pathname.endsWith('.html')) {
      let cleanPath = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
      if (!cleanPath) cleanPath = '/';
      const cleanUrl = cleanPath + window.location.search + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }
  } catch (e) {
    // Protección en caso de ejecución en entornos no-browser
  }

  const THEME_KEY = 'bak_docs_theme';

  function getPreferredTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      return savedTheme;
    }
    // Oscuro por defecto según especificación
    return 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle');
    buttons.forEach(btn => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      btn.setAttribute('title', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      
      const sunIcon = btn.querySelector('.icon-sun');
      const moonIcon = btn.querySelector('.icon-moon');
      if (sunIcon && moonIcon) {
        if (theme === 'dark') {
          sunIcon.style.display = 'block';
          moonIcon.style.display = 'none';
        } else {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'block';
        }
      }
    });
  }

  // Inicializar tema inmediatamente antes de renderizar para evitar parpadeos
  const currentTheme = getPreferredTheme();
  document.documentElement.setAttribute('data-theme', currentTheme);

  document.addEventListener('DOMContentLoaded', () => {
    updateToggleButtons(currentTheme);

    const buttons = document.querySelectorAll('.theme-toggle');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
      });
    });

    initMobileMenu();
  });

  // Control de menú móvil para la landing page
  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const drawer = document.getElementById('mobileNavDrawer');
    const backdrop = document.getElementById('mobileNavBackdrop');
    if (!toggleBtn || !drawer) return;

    function toggleMenu(forceOpen) {
      const isOpen = forceOpen !== undefined ? forceOpen : !drawer.classList.contains('open');
      drawer.classList.toggle('open', isOpen);
      if (backdrop) backdrop.classList.toggle('open', isOpen);
      toggleBtn.setAttribute('aria-expanded', isOpen);
      
      const openIcon = toggleBtn.querySelector('.icon-menu-open');
      const closeIcon = toggleBtn.querySelector('.icon-menu-close');
      if (openIcon && closeIcon) {
        openIcon.style.display = isOpen ? 'none' : 'block';
        closeIcon.style.display = isOpen ? 'block' : 'none';
      }
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => toggleMenu(false));
    }

    const drawerLinks = drawer.querySelectorAll('a');
    drawerLinks.forEach(link => {
      link.addEventListener('click', () => toggleMenu(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        toggleMenu(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 880 && drawer.classList.contains('open')) {
        toggleMenu(false);
      }
    });
  }
})();
