const express = require('express');
const { db, author } = require('../db/database');

const router = express.Router();

// Helper: Enhanced markdown-like parser for blog content
function renderContent(text) {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Fenced code blocks with language support
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    return `<div class="code-block-wrapper">${langLabel}<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers (h1, h2, h3)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Bold & Italics
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="prose-link" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // Clean up empty tags and unwanted wrapping around block elements
  html = html.replace(/<p>\s*<(h[1-3]|div|pre|ul|blockquote)/g, '<$1');
  html = html.replace(/<\/(h[1-3]|div|pre|ul|blockquote)>\s*<\/p>/g, '</$1>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

// Redirect /blog to root /
router.get('/', (req, res) => {
  res.redirect('/');
});

// GET /blog/:slug — Single blog view
router.get('/:slug', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);

  // If post not found, or post is draft and user is not admin
  const isAdmin = req.session && req.session.adminUser;
  if (!post || (post.published !== 1 && !isAdmin)) {
    return res.status(404).render('404', {
      title: 'Article Not Found',
      author
    });
  }

  // Parse tags
  post.tagList = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  post.htmlContent = renderContent(post.content);

  // Fetch 3 other published articles for the "Keep Reading" section
  const morePosts = db.prepare(`
    SELECT id, title, slug, excerpt, tags, reading_time, created_at
    FROM posts
    WHERE slug != ? AND published = 1
    ORDER BY created_at DESC
    LIMIT 3
  `).all(req.params.slug);

  morePosts.forEach(p => {
    p.tagList = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  });

  res.render('blogs/show', {
    title: post.title,
    post,
    morePosts,
    author,
    isPreview: post.published !== 1
  });
});

module.exports = router;
module.exports.renderContent = renderContent;
