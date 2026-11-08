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
  });
})();
