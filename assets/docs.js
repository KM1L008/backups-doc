/**
 * ==========================================================================
 * SISTEMA DE BACKUPS 3-2-1 — MOTOR DE DOCUMENTACIÓN (docs.js)
 * Carga dinámica de Markdown, parser de callouts de Obsidian, wikilinks,
 * syntax highlighting, copy-to-clipboard y paginación.
 * ==========================================================================
 */

const MODULES_CONFIG = [
  {
    id: "panel",
    num: "00",
    name: "Panel principal",
    navTitle: "Panel principal",
    subtitle: "Visión general, regla 3-2-1 y arquitectura del sistema",
    file: "notas/Panel principal.md",
    altFile: "notas/modulos/Panel principal.md",
    badge: "Visión General"
  },
  {
    id: "01",
    num: "01",
    name: "01 - Usuario de backup en MariaDB",
    navTitle: "01 · Usuario MariaDB y .my.cnf",
    subtitle: "Principio de mínimo privilegio y credenciales protegidas",
    file: "notas/modulos/01 - Usuario de backup en MariaDB.md",
    altFile: "notas/01 - Usuario de backup en MariaDB.md",
    badge: "Fase 1"
  },
  {
    id: "02",
    num: "02",
    name: "02 - Disco externo",
    navTitle: "02 · Disco externo (Copia 2)",
    subtitle: "Montaje NTFS, permisos y validación de escritura",
    file: "notas/modulos/02 - Disco externo.md",
    altFile: "notas/02 - Disco externo.md",
    badge: "Fase 2"
  },
  {
    id: "03",
    num: "03",
    name: "03 - Cloudflare R2",
    navTitle: "03 · Cloudflare R2 (Offsite)",
    subtitle: "Bucket S3, API token de cuenta y configuración de rclone",
    file: "notas/modulos/03 - Cloudflare R2.md",
    altFile: "notas/03 - Cloudflare R2.md",
    badge: "Fase 3"
  },
  {
    id: "04",
    num: "04",
    name: "04 - Script maestro de backup",
    navTitle: "04 · Script maestro de backup",
    subtitle: "Pipeline bash completo, rotación de 7 días y logging dual",
    file: "notas/modulos/04 - Script maestro de backup.md",
    altFile: "notas/04 - Script maestro de backup.md",
    badge: "Fase 4"
  },
  {
    id: "05",
    num: "05",
    name: "05 - Automatización con cron",
    navTitle: "05 · Automatización con cron",
    subtitle: "Ejecución periódica desatendida y entorno de ejecución",
    file: "notas/modulos/05 - Automatización con cron.md",
    altFile: "notas/05 - Automatización con cron.md",
    badge: "Fase 5"
  },
  {
    id: "06",
    num: "06",
    name: "06 - n8n y Telegram",
    navTitle: "06 · n8n y bot de Telegram",
    subtitle: "Disparo bajo demanda, webhook seguro y parseo de salida",
    file: "notas/modulos/06 - n8n y Telegram.md",
    altFile: "notas/06 - n8n y Telegram.md",
    badge: "Fase 6"
  },
  {
    id: "07",
    num: "07",
    name: "07 - Glosario y comandos útiles",
    navTitle: "07 · Glosario y comandos",
    subtitle: "Referencia rápida de comandos y sintaxis del sistema",
    file: "notas/modulos/07 - Glosario y comandos útiles.md",
    altFile: "notas/07 - Glosario y comandos útiles.md",
    badge: "Referencia"
  }
];

// SVGs para Callouts de Obsidian
const CALLOUT_ICONS = {
  info: `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  warning: `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  tip: `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></svg>`,
  note: `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  question: `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  important: `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="12 8 8 12 12 16 16 12 12 8"></polygon></svg>`,
  danger: `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
};

class DocsApp {
  constructor() {
    this.currentModuleId = 'panel';
    this.contentEl = document.getElementById('docsContent');
    this.breadcrumbModuleEl = document.getElementById('breadcrumbModule');
    this.paginationEl = document.getElementById('docsPagination');
    this.sidebarNavListEl = document.getElementById('sidebarNavList');
    this.sidebarSearchInput = document.getElementById('sidebarSearch');
    this.sidebarEl = document.getElementById('docsSidebar');
    this.backdropEl = document.getElementById('sidebarBackdrop');
    this.mobileToggleBtn = document.getElementById('mobileSidebarToggle');

    this.init();
  }

  init() {
    this.renderSidebarNav();
    this.setupListeners();
    this.handleInitialRoute();
  }

  setupListeners() {
    // Escucha de cambio en URL / historial
    window.addEventListener('popstate', () => {
      const moduleId = this.getModuleIdFromUrl();
      this.loadModule(moduleId, false);
    });

    // Búsqueda en sidebar
    if (this.sidebarSearchInput) {
      this.sidebarSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = this.sidebarNavListEl.querySelectorAll('.sidebar-nav-item');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(query) ? '' : 'none';
        });
      });
    }

    // Toggle móvil del sidebar
    if (this.mobileToggleBtn && this.sidebarEl && this.backdropEl) {
      this.mobileToggleBtn.addEventListener('click', () => {
        this.sidebarEl.classList.toggle('open');
        this.backdropEl.classList.toggle('open');
      });

      this.backdropEl.addEventListener('click', () => {
        this.sidebarEl.classList.remove('open');
        this.backdropEl.classList.remove('open');
      });
    }
  }

  getModuleIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const mod = params.get('modulo') || params.get('fase') || params.get('doc');
    if (mod) {
      const match = MODULES_CONFIG.find(m => m.id === mod || m.num === mod || m.name.toLowerCase().includes(mod.toLowerCase()));
      if (match) return match.id;
    }
    const hash = window.location.hash.replace('#', '').trim();
    if (hash) {
      const match = MODULES_CONFIG.find(m => m.id === hash || m.num === hash);
      if (match) return match.id;
    }
    return 'panel';
  }

  renderSidebarNav() {
    if (!this.sidebarNavListEl) return;
    this.sidebarNavListEl.innerHTML = MODULES_CONFIG.map(m => `
      <li class="sidebar-nav-item ${m.id === this.currentModuleId ? 'active' : ''}" data-id="${m.id}">
        <a href="?modulo=${m.id}" onclick="event.preventDefault(); window.docsApp.navigateTo('${m.id}');">
          <span class="nav-module-num">${m.num}</span>
          <span class="nav-module-label">${m.navTitle}</span>
        </a>
      </li>
    `).join('');
  }

  navigateTo(moduleId) {
    if (moduleId === this.currentModuleId) return;
    const url = new URL(window.location);
    url.searchParams.set('modulo', moduleId);
    // Eliminar .html de la ruta en la barra de direcciones
    url.pathname = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    window.history.pushState({ moduleId }, '', url);
    this.loadModule(moduleId, false);

    // Cerrar sidebar móvil si está abierto
    if (this.sidebarEl) this.sidebarEl.classList.remove('open');
    if (this.backdropEl) this.backdropEl.classList.remove('open');
  }

  handleInitialRoute() {
    // Limpiar extensión .html de la URL en la carga inicial
    try {
      if (window.location.pathname.endsWith('.html')) {
        let cleanPath = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
        if (!cleanPath) cleanPath = '/';
        const cleanUrl = cleanPath + window.location.search + window.location.hash;
        window.history.replaceState(null, '', cleanUrl);
      }
    } catch (e) {}

    const initialId = this.getModuleIdFromUrl();
    this.loadModule(initialId, true);
  }

  async loadModule(moduleId, isInitial = false) {
    const moduleConfig = MODULES_CONFIG.find(m => m.id === moduleId) || MODULES_CONFIG[0];
    this.currentModuleId = moduleConfig.id;

    // Actualizar sidebar activo
    const items = this.sidebarNavListEl.querySelectorAll('.sidebar-nav-item');
    items.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-id') === moduleConfig.id);
    });

    // Actualizar breadcrumb
    if (this.breadcrumbModuleEl) {
      this.breadcrumbModuleEl.textContent = moduleConfig.name;
    }

    // Mostrar loader
    this.contentEl.innerHTML = `
      <div class="docs-loading">
        <div class="spinner"></div>
        <p>Cargando módulo: <strong>${moduleConfig.name}</strong>...</p>
      </div>
    `;

    try {
      let rawMarkdown = '';
      try {
        const res = await fetch(moduleConfig.file);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        rawMarkdown = await res.text();
      } catch (err) {
        // Intento con ruta alternativa si la principal falla
        if (moduleConfig.altFile) {
          const resAlt = await fetch(moduleConfig.altFile);
          if (!resAlt.ok) throw new Error(`HTTP ${resAlt.status}`);
          rawMarkdown = await resAlt.text();
        } else {
          throw err;
        }
      }

      this.renderMarkdown(rawMarkdown, moduleConfig);
      this.renderPagination(moduleConfig);
      this.initCodeCopyButtons();
      this.setupWikilinks();

      // Scroll al inicio
      window.scrollTo({ top: 0, behavior: isInitial ? 'auto' : 'smooth' });

    } catch (error) {
      console.error('Error cargando markdown:', error);
      this.contentEl.innerHTML = `
        <div class="obsidian-callout callout-danger" style="margin-top:2rem;">
          <div class="callout-header">
            ${CALLOUT_ICONS.danger}
            <span class="callout-title">Error al cargar el archivo</span>
          </div>
          <div class="callout-body">
            <p>No se pudo cargar el archivo <code>${moduleConfig.file}</code>.</p>
            <p><strong>Nota:</strong> Si abriste el archivo con doble clic (protocolo <code>file://</code>), los navegadores bloquean <code>fetch</code> por seguridad (CORS). Debes servir el proyecto con un servidor web local:</p>
            <div class="code-block-wrapper">
              <div class="code-block-header">
                <span class="code-lang-label">BASH</span>
              </div>
              <pre><code>python3 -m http.server 8000</code></pre>
            </div>
            <p>Luego abre <a href="http://localhost:8000/docs.html">http://localhost:8000/docs.html</a> en tu navegador.</p>
          </div>
        </div>
      `;
    }
  }

  /**
   * Pre-procesa frontmatter YAML, enlaces Obsidian [[...]] y Callouts
   */
  preprocessMarkdown(md) {
    let text = md;

    // 1. Quitar frontmatter YAML si existe (entre --- al inicio)
    text = text.replace(/^---[\r\n]+[\s\S]*?[\r\n]+---[\r\n]*/, '');

    // 2. Normalizar el primer encabezado del módulo para que siempre sea h1 (#)
    // En algunos archivos el autor escribió '## Fase X' en vez de '# Fase X'
    text = text.replace(/^(\s*)##[ \t]+([^\r\n]+)/m, '$1# $2');

    // 3. Normalizar entidades HTML en blockquotes (&gt; a >)
    text = text.replace(/^(&gt;|>)\s?/gm, '> ');

    // 3. Procesar Wikilinks: [[Nombre de nota]]
    text = text.replace(/\[\[(.*?)\]\]/g, (match, target) => {
      const cleanTarget = target.trim();
      const found = MODULES_CONFIG.find(m => 
        m.name.toLowerCase() === cleanTarget.toLowerCase() ||
        m.id === cleanTarget ||
        cleanTarget.startsWith(m.num)
      );

      const targetId = found ? found.id : '01';
      return `<a href="?modulo=${targetId}" class="wikilink" data-module="${targetId}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>${cleanTarget}</a>`;
    });

    // 4. Procesar Callouts de Obsidian (> [!tipo] Titulo)
    const calloutRegex = /(?:^|\n)> \[!(info|warning|tip|note|question|important|caution|danger)\][ \t]*([^\n]*)\n((?:>.*\n?)*)/gi;
    text = text.replace(calloutRegex, (match, type, title, body) => {
      const cleanType = type.toLowerCase() === 'caution' ? 'warning' : type.toLowerCase();
      const defaultTitles = {
        info: 'Información',
        warning: 'Advertencia',
        tip: 'Consejo',
        note: 'Nota',
        question: 'Prerrequisitos / Pregunta',
        important: 'Importante',
        danger: 'Peligro'
      };

      const finalTitle = title.trim() || defaultTitles[cleanType] || cleanType.toUpperCase();
      const iconSvg = CALLOUT_ICONS[cleanType] || CALLOUT_ICONS.note;
      
      // Extraer líneas limpias del cuerpo
      const cleanBody = body.split('\n').map(line => line.replace(/^>\s?/, '')).join('\n').trim();

      // Parsear el cuerpo de la llamada con marked si está disponible
      let parsedBodyHtml = cleanBody;
      if (typeof marked !== 'undefined') {
        parsedBodyHtml = marked.parse(cleanBody);
      }

      return `\n\n<div class="obsidian-callout callout-${cleanType}">\n<div class="callout-header">${iconSvg}<span class="callout-title">${finalTitle}</span></div>\n<div class="callout-body">${parsedBodyHtml}</div>\n</div>\n\n`;
    });

    return text;
  }

  renderMarkdown(rawMarkdown, moduleConfig) {
    const preprocessed = this.preprocessMarkdown(rawMarkdown);

    if (typeof marked !== 'undefined') {
      // Usar marked nativo SIN sobreescribir renderer.table ni renderer.heading con firmas incompatibles
      marked.setOptions({
        gfm: true,
        breaks: false
      });

      const parsedHtml = marked.parse(preprocessed);
      this.contentEl.innerHTML = parsedHtml;

      // Envolver tablas en un div responsive en el DOM
      this.contentEl.querySelectorAll('table').forEach(table => {
        if (table.parentElement && table.parentElement.classList.contains('table-responsive')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });

      // Syntax Highlighting
      if (typeof hljs !== 'undefined') {
        this.contentEl.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }

      // Envolver bloques de código con header y botón de copiar
      this.enhanceCodeBlocks();

    } else {
      this.contentEl.innerHTML = `<pre style="white-space:pre-wrap;">${preprocessed}</pre>`;
    }
  }

  enhanceCodeBlocks() {
    const preBlocks = this.contentEl.querySelectorAll('pre');
    preBlocks.forEach(pre => {
      if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) return;

      const codeEl = pre.querySelector('code');
      let lang = 'CODE';
      if (codeEl) {
        const classes = Array.from(codeEl.classList);
        const langClass = classes.find(c => c.startsWith('language-') || c.startsWith('lang-'));
        if (langClass) {
          lang = langClass.replace(/^(language-|lang-)/, '').toUpperCase();
        }
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span class="code-lang-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          ${lang}
        </span>
        <button class="copy-code-btn" type="button" aria-label="Copiar código al portapapeles">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copiar</span>
        </button>
      `;

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }

  initCodeCopyButtons() {
    const copyBtns = this.contentEl.querySelectorAll('.copy-code-btn');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const wrapper = btn.closest('.code-block-wrapper');
        const code = wrapper ? wrapper.querySelector('pre code') : null;
        if (!code) return;

        const textToCopy = code.innerText;
        try {
          await navigator.clipboard.writeText(textToCopy);
          btn.classList.add('copied');
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>¡Copiado! ✓</span>
          `;
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copiar</span>
            `;
          }, 2000);
        } catch (err) {
          console.error('Error al copiar al portapapeles:', err);
        }
      });
    });
  }

  setupWikilinks() {
    const links = this.contentEl.querySelectorAll('.wikilink');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const modId = link.getAttribute('data-module');
        if (modId) {
          this.navigateTo(modId);
        }
      });
    });
  }

  renderPagination(current) {
    if (!this.paginationEl) return;
    const currentIndex = MODULES_CONFIG.findIndex(m => m.id === current.id);
    const prev = currentIndex > 0 ? MODULES_CONFIG[currentIndex - 1] : null;
    const next = currentIndex < MODULES_CONFIG.length - 1 ? MODULES_CONFIG[currentIndex + 1] : null;

    let html = '';

    if (prev) {
      html += `
        <button class="pagination-btn prev" type="button" onclick="window.docsApp.navigateTo('${prev.id}')">
          <span class="pagination-direction">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Anterior
          </span>
          <span class="pagination-title">${prev.navTitle}</span>
        </button>
      `;
    } else {
      html += `<div></div>`;
    }

    if (next) {
      html += `
        <button class="pagination-btn next" type="button" onclick="window.docsApp.navigateTo('${next.id}')">
          <span class="pagination-direction">
            Siguiente
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
          <span class="pagination-title">${next.navTitle}</span>
        </button>
      `;
    }

    this.paginationEl.innerHTML = html;
  }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.docsApp = new DocsApp();
});
