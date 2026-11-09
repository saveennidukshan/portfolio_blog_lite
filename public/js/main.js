// ============================================================
// Personal Blog — Client Interactions & Live Search
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearch');
  const tagPills = document.querySelectorAll('.tag-pill');
  const postCards = document.querySelectorAll('.post-card');
  const noResults = document.getElementById('noResults');
  const resetFilterBtn = document.getElementById('resetFilterBtn');

  let activeTag = 'all';

  // Filter posts based on active search text and selected tag
  function filterPosts() {
    if (!postCards.length) return;

    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    let visibleCount = 0;

    postCards.forEach(card => {
      const title = card.getAttribute('data-title') || '';
      const excerpt = card.getAttribute('data-excerpt') || '';
      const tags = card.getAttribute('data-tags') || '';

      const matchesQuery = !query || title.includes(query) || excerpt.includes(query) || tags.includes(query);
      const matchesTag = activeTag === 'all' || tags.includes(activeTag);

      if (matchesQuery && matchesTag) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    if (clearSearchBtn) {
      clearSearchBtn.style.display = query ? 'block' : 'none';
    }
  }

  // Search input event
  if (searchInput) {
    searchInput.addEventListener('input', filterPosts);

    // Keyboard shortcut '/' to focus search
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (e.key === '/' && activeTag !== 'input' && activeTag !== 'textarea') {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.blur();
        filterPosts();
      }
    });
  }

  // Clear search button
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.focus();
      filterPosts();
    });
  }

  // Reset filter button in empty state
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      activeTag = 'all';
      tagPills.forEach(p => p.classList.toggle('active', p.getAttribute('data-tag') === 'all'));
      filterPosts();
    });
  }

  // Tag filter pills
  tagPills.forEach(pill => {
    pill.addEventListener('click', () => {
      tagPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeTag = pill.getAttribute('data-tag') || 'all';
      filterPosts();
    });
  });

  // Share / Copy Link button in Single Article View
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const copyLinkText = document.getElementById('copyLinkText');

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(window.location.href);
        } else {
          const tempInput = document.createElement('input');
          tempInput.value = window.location.href;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }

        if (copyLinkText) {
          const originalText = copyLinkText.textContent;
          copyLinkText.textContent = 'Copied!';
          setTimeout(() => {
            copyLinkText.textContent = originalText;
          }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    });
  }
});
