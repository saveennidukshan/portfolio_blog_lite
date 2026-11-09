// ============================================================
// BlogStack Admin Panel — Interactive Client Logic
// ============================================================

// Global Modal Handlers for Delete
function confirmDelete(postId, postTitle) {
  const modal = document.getElementById('deleteModal');
  const titleSpan = document.getElementById('deletePostTitle');
  const form = document.getElementById('deleteForm');

  if (modal && form) {
    if (titleSpan) titleSpan.textContent = `"${postTitle}"`;
    form.action = `/admin/posts/${postId}/delete`;
    modal.style.display = 'flex';
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Client-side markdown renderer for live editor preview
function renderMarkdownPreview(text) {
  if (!text) return '<p class="preview-placeholder">Your rendered markdown will appear here...</p>';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    return `<div class="code-block-wrapper">${langLabel}<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="prose-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean empty tags
  html = html.replace(/<p>\s*<(h[1-3]|div|pre|ul|blockquote)/g, '<$1');
  html = html.replace(/<\/(h[1-3]|div|pre|ul|blockquote)>\s*<\/p>/g, '</$1>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

// Generate URL slug from title
function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

document.addEventListener('DOMContentLoaded', () => {

  // Auto-dismiss toast messages after 4 seconds
  const toast = document.getElementById('adminToast');
  if (toast) {
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Delete button click listener via delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (btn) {
      const postId = btn.getAttribute('data-id');
      const postTitle = btn.getAttribute('data-title');
      confirmDelete(postId, postTitle);
    }
  });

  // -------------------------------------------------------------
  // Dashboard Table Search & Filter Tabs
  // -------------------------------------------------------------
  const searchInput = document.getElementById('adminSearchInput');
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const postRows = document.querySelectorAll('.post-row');

  let activeFilter = 'all';

  function filterAdminTable() {
    if (!postRows.length) return;
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

    postRows.forEach(row => {
      const title = row.getAttribute('data-title') || '';
      const tags = row.getAttribute('data-tags') || '';
      const status = row.getAttribute('data-status') || '';

      const matchesQuery = !query || title.includes(query) || tags.includes(query);
      const matchesFilter = activeFilter === 'all' || status === activeFilter;

      row.style.display = (matchesQuery && matchesFilter) ? '' : 'none';
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterAdminTable);
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter') || 'all';
      filterAdminTable();
    });
  });

  // -------------------------------------------------------------
  // Article Editor Logic
  // -------------------------------------------------------------
  const titleInput = document.getElementById('postTitle');
  const slugInput = document.getElementById('postSlug');
  const autoSlugBtn = document.getElementById('autoSlugBtn');
  const contentTextarea = document.getElementById('postContent');
  const wordCountSpan = document.getElementById('wordCount');
  const readTimeSpan = document.getElementById('readTime');
  const publishCheckbox = document.getElementById('postPublished');
  const publishStatusText = document.getElementById('publishStatusText');

  const tabWrite = document.getElementById('tabWrite');
  const tabPreview = document.getElementById('tabPreview');
  const writePane = document.getElementById('writePane');
  const previewPane = document.getElementById('previewPane');
  const previewTitle = document.getElementById('previewTitle');
  const previewContent = document.getElementById('previewContent');

  // Slug auto-generation
  if (titleInput && slugInput) {
    let slugManuallyEdited = slugInput.value.length > 0 && slugInput.value !== slugify(titleInput.value);

    titleInput.addEventListener('input', () => {
      if (!slugManuallyEdited) {
        slugInput.value = slugify(titleInput.value);
      }
      updateMetrics();
    });

    slugInput.addEventListener('input', () => {
      slugManuallyEdited = true;
    });

    if (autoSlugBtn) {
      autoSlugBtn.addEventListener('click', () => {
        slugInput.value = slugify(titleInput.value);
        slugManuallyEdited = false;
      });
    }
  }

  // Publish Status Checkbox Label
  if (publishCheckbox && publishStatusText) {
    publishCheckbox.addEventListener('change', () => {
      publishStatusText.textContent = publishCheckbox.checked ? 'Status: Published' : 'Status: Draft';
    });
  }

  // Word count & Reading time calculation
  function updateMetrics() {
    if (!contentTextarea) return;
    const text = contentTextarea.value.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const readMinutes = Math.max(1, Math.ceil(words / 200));

    if (wordCountSpan) wordCountSpan.textContent = `${words.toLocaleString()} words`;
    if (readTimeSpan) readTimeSpan.textContent = `${readMinutes} min read`;
  }

  if (contentTextarea) {
    contentTextarea.addEventListener('input', updateMetrics);
    updateMetrics();
  }

  // Write vs Live Preview Tab Switching
  if (tabWrite && tabPreview && writePane && previewPane) {
    tabWrite.addEventListener('click', () => {
      tabWrite.classList.add('active');
      tabPreview.classList.remove('active');
      writePane.style.display = 'flex';
      previewPane.style.display = 'none';
      if (contentTextarea) contentTextarea.focus();
    });

    tabPreview.addEventListener('click', () => {
      tabPreview.classList.add('active');
      tabWrite.classList.remove('active');
      writePane.style.display = 'none';
      previewPane.style.display = 'block';

      if (previewTitle && titleInput) {
        previewTitle.textContent = titleInput.value.trim() || 'Untitled Article';
      }
      if (previewContent && contentTextarea) {
        previewContent.innerHTML = renderMarkdownPreview(contentTextarea.value);
      }
    });
  }

  // Markdown Toolbar Inserts
  const toolbar = document.getElementById('markdownToolbar');
  if (toolbar && contentTextarea) {
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.tool-btn');
      if (!btn) return;

      const tool = btn.getAttribute('data-tool');
      const start = contentTextarea.selectionStart;
      const end = contentTextarea.selectionEnd;
      const val = contentTextarea.value;
      const selected = val.substring(start, end);

      let replacement = '';
      let cursorOffset = 0;

      switch (tool) {
        case 'bold':
          replacement = `**${selected || 'bold text'}**`;
          cursorOffset = selected ? replacement.length : 2;
          break;
        case 'italic':
          replacement = `*${selected || 'italic text'}*`;
          cursorOffset = selected ? replacement.length : 1;
          break;
        case 'h2':
          replacement = `\n## ${selected || 'Heading 2'}\n`;
          cursorOffset = replacement.length;
          break;
        case 'h3':
          replacement = `\n### ${selected || 'Heading 3'}\n`;
          cursorOffset = replacement.length;
          break;
        case 'quote':
          replacement = `\n> ${selected || 'Quotation'}\n`;
          cursorOffset = replacement.length;
          break;
        case 'code':
          replacement = `\`${selected || 'code'}\``;
          cursorOffset = selected ? replacement.length : 1;
          break;
        case 'codeblock':
          replacement = `\n\`\`\`javascript\n${selected || '// code here'}\n\`\`\`\n`;
          cursorOffset = replacement.length;
          break;
        case 'list':
          replacement = `\n- ${selected || 'List item'}\n`;
          cursorOffset = replacement.length;
          break;
        case 'link':
          replacement = `[${selected || 'link text'}](https://example.com)`;
          cursorOffset = replacement.length;
          break;
      }

      contentTextarea.value = val.substring(0, start) + replacement + val.substring(end);
      contentTextarea.focus();
      contentTextarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      updateMetrics();
    });
  }

});
