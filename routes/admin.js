const express = require('express');
const bcrypt = require('bcryptjs');
const { db, calculateReadingTime } = require('../db/database');
const { requireAdmin, isGuestAdmin, csrfProtection } = require('../middleware/auth');

const router = express.Router();

// Helper: Generate URL-safe slug from title
function generateSlug(title) {
  return (title || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Helper: Ensure unique slug in database
function getUniqueSlug(baseSlug, excludeId = null) {
  let slug = baseSlug || 'untitled-post';
  let counter = 1;

  while (true) {
    let query = 'SELECT id FROM posts WHERE slug = ?';
    let params = [slug];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    const exists = db.prepare(query).get(...params);
    if (!exists) break;
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

// -------------------------------------------------------------
// Admin Auth Routes
// -------------------------------------------------------------

// GET /admin/login
router.get('/login', isGuestAdmin, csrfProtection, (req, res) => {
  res.render('admin/login', {
    title: 'Admin Sign In — Secure Portal',
    layout: false
  });
});

// POST /admin/login
router.post('/login', isGuestAdmin, csrfProtection, (req, res) => {
  const { identity, password } = req.body;

  if (!identity || !password) {
    req.session.adminError = 'Please provide both username/email and password.';
    return res.redirect('/admin/login');
  }

  // Lookup user by username or email
  const user = db.prepare(`
    SELECT * FROM admin_users
    WHERE username = ? OR email = ?
  `).get(identity.trim().toLowerCase(), identity.trim().toLowerCase());

  if (!user) {
    req.session.adminError = 'Invalid credentials provided.';
    return res.redirect('/admin/login');
  }

  // Check account lockout
  if (user.locked_until) {
    const lockTime = new Date(user.locked_until).getTime();
    const now = Date.now();
    if (lockTime > now) {
      const remainingMins = Math.ceil((lockTime - now) / 60000);
      req.session.adminError = `Account temporarily locked due to failed attempts. Try again in ${remainingMins} minute(s).`;
      return res.redirect('/admin/login');
    }
  }

  // Verify password with bcrypt
  const passwordMatch = bcrypt.compareSync(password, user.password_hash);

  if (!passwordMatch) {
    const newAttempts = (user.failed_attempts || 0) + 1;
    let lockUpdate = '';
    const params = [newAttempts];

    if (newAttempts >= 5) {
      // Lock account for 15 minutes
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      lockUpdate = ', locked_until = ?';
      params.push(lockUntil);
    }

    params.push(user.id);
    db.prepare(`UPDATE admin_users SET failed_attempts = ? ${lockUpdate} WHERE id = ?`).run(...params);

    if (newAttempts >= 5) {
      req.session.adminError = 'Account locked for 15 minutes due to 5 consecutive failed login attempts.';
    } else {
      req.session.adminError = `Invalid credentials. (${5 - newAttempts} attempt(s) remaining before temporary lockout)`;
    }
    return res.redirect('/admin/login');
  }

  // Login successful: reset failed attempts, update last_login
  db.prepare(`
    UPDATE admin_users
    SET failed_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(user.id);

  const returnTo = req.session.returnTo || '/admin';

  const setAdminSession = () => {
    req.session.adminUser = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    req.session.adminSuccess = `Welcome back, ${user.username}!`;
    res.redirect(returnTo);
  };

  // Regenerate session to prevent session fixation attacks if supported
  if (typeof req.session.regenerate === 'function') {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
      setAdminSession();
    });
  } else {
    setAdminSession();
  }
});

// POST /admin/logout
router.post('/logout', csrfProtection, (req, res) => {
  if (req.session) {
    delete req.session.adminUser;
    if (typeof req.session.destroy === 'function') {
      return req.session.destroy(() => res.redirect('/admin/login'));
    }
  }
  res.redirect('/admin/login');
});

// -------------------------------------------------------------
// Admin Dashboard & Blog Management
// -------------------------------------------------------------

// Apply requireAdmin and csrfProtection to all remaining admin routes
router.use(requireAdmin);
router.use(csrfProtection);

// GET /admin — Dashboard overview
router.get('/', (req, res) => {
  const posts = db.prepare(`
    SELECT id, title, slug, excerpt, content, tags, reading_time, published, created_at, updated_at
    FROM posts
    ORDER BY created_at DESC
  `).all();

  // Compute stats
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.published === 1).length;
  const draftPosts = totalPosts - publishedPosts;

  let totalWords = 0;
  posts.forEach(p => {
    p.tagList = p.tags ? p.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    totalWords += (p.content || '').trim().split(/\s+/).filter(Boolean).length;
  });

  res.render('admin/dashboard', {
    title: 'Admin Dashboard — Blog Management',
    posts,
    stats: {
      total: totalPosts,
      published: publishedPosts,
      drafts: draftPosts,
      words: totalWords
    }
  });
});

// GET /admin/posts/new — Create article form
router.get('/posts/new', (req, res) => {
  res.render('admin/editor', {
    title: 'Write New Article — Admin Portal',
    mode: 'create',
    post: {
      title: '',
      slug: '',
      excerpt: '',
      tags: '',
      content: '',
      published: 1
    }
  });
});

// POST /admin/posts/new — Create article action
router.post('/posts/new', (req, res) => {
  const { title, slug, excerpt, tags, content, published } = req.body;

  if (!title || !title.trim()) {
    req.session.adminError = 'Article title is required.';
    return res.redirect('/admin/posts/new');
  }

  if (!content || !content.trim()) {
    req.session.adminError = 'Article content is required.';
    return res.redirect('/admin/posts/new');
  }

  const rawSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(title);
  const finalSlug = getUniqueSlug(rawSlug);
  const readingTime = calculateReadingTime(content);
  const isPublished = published === '1' || published === 'on' || published === true ? 1 : 0;

  db.prepare(`
    INSERT INTO posts (title, slug, excerpt, content, cover_image, tags, reading_time, published)
    VALUES (?, ?, ?, ?, '', ?, ?, ?)
  `).run(
    title.trim(),
    finalSlug,
    (excerpt || '').trim(),
    content.trim(),
    (tags || '').trim(),
    readingTime,
    isPublished
  );

  req.session.adminSuccess = `Article "${title.trim()}" created successfully!`;
  res.redirect('/admin');
});

// GET /admin/posts/:id/edit — Edit article form
router.get('/posts/:id/edit', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);

  if (!post) {
    req.session.adminError = 'Article not found.';
    return res.redirect('/admin');
  }

  res.render('admin/editor', {
    title: `Edit: ${post.title} — Admin Portal`,
    mode: 'edit',
    post
  });
});

// POST /admin/posts/:id/edit — Update article action
router.post('/posts/:id/edit', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);

  if (!post) {
    req.session.adminError = 'Article not found.';
    return res.redirect('/admin');
  }

  const { title, slug, excerpt, tags, content, published } = req.body;

  if (!title || !title.trim()) {
    req.session.adminError = 'Article title cannot be empty.';
    return res.redirect(`/admin/posts/${post.id}/edit`);
  }

  if (!content || !content.trim()) {
    req.session.adminError = 'Article content cannot be empty.';
    return res.redirect(`/admin/posts/${post.id}/edit`);
  }

  const rawSlug = slug && slug.trim() ? generateSlug(slug) : generateSlug(title);
  const finalSlug = getUniqueSlug(rawSlug, post.id);
  const readingTime = calculateReadingTime(content);
  const isPublished = published === '1' || published === 'on' || published === true ? 1 : 0;

  db.prepare(`
    UPDATE posts
    SET title = ?, slug = ?, excerpt = ?, content = ?, tags = ?, reading_time = ?, published = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title.trim(),
    finalSlug,
    (excerpt || '').trim(),
    content.trim(),
    (tags || '').trim(),
    readingTime,
    isPublished,
    post.id
  );

  req.session.adminSuccess = `Article "${title.trim()}" updated successfully!`;
  res.redirect('/admin');
});

// POST /admin/posts/:id/toggle-publish — Quick toggle status
router.post('/posts/:id/toggle-publish', (req, res) => {
  const post = db.prepare('SELECT id, title, published FROM posts WHERE id = ?').get(req.params.id);

  if (!post) {
    req.session.adminError = 'Article not found.';
    return res.redirect('/admin');
  }

  const newStatus = post.published === 1 ? 0 : 1;
  db.prepare('UPDATE posts SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, post.id);

  req.session.adminSuccess = `Article "${post.title}" is now ${newStatus === 1 ? 'Published' : 'a Draft'}.`;
  res.redirect('/admin');
});

// POST /admin/posts/:id/delete — Delete article action
router.post('/posts/:id/delete', (req, res) => {
  const post = db.prepare('SELECT id, title FROM posts WHERE id = ?').get(req.params.id);

  if (!post) {
    req.session.adminError = 'Article not found.';
    return res.redirect('/admin');
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);

  req.session.adminSuccess = `Article "${post.title}" was permanently deleted.`;
  res.redirect('/admin');
});

module.exports = router;
