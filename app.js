const express = require('express');
const path = require('path');
const session = require('express-session');
const { db, author } = require('./db/database');
const { setAdminLocals } = require('./middleware/auth');
const blogRoutes = require('./routes/blog');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Secure session configuration
app.use(session({
  name: 'blog_admin_sid',
  secret: process.env.SESSION_SECRET || 'secure-personal-blog-admin-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
    secure: false // Set to true if running strictly behind HTTPS
  }
}));

// Set global template locals
app.use((req, res, next) => {
  res.locals.author = author;
  next();
});

// Admin context locals (flash messages, session status)
app.use(setAdminLocals);

// Root route: Shows author profile and ALL published blog posts
app.get('/', (req, res) => {
  const posts = db.prepare(`
    SELECT id, title, slug, excerpt, tags, reading_time, created_at, updated_at
    FROM posts
    WHERE published = 1
    ORDER BY created_at DESC
  `).all();

  // Extract all unique tags from published posts
  const allTags = new Set();
  posts.forEach(post => {
    post.tagList = post.tags ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    post.tagList.forEach(tag => allTags.add(tag));
  });

  res.render('index', {
    title: `${author.name} — Personal Blog & Engineering Notes`,
    posts,
    tags: Array.from(allTags),
    author
  });
});

// Admin routes (/admin, /admin/login, /admin/posts/...)
app.use('/admin', adminRoutes);

// Blog routes for individual post view (/blog/:slug)
app.use('/blog', blogRoutes);

// Redirects
app.get(['/posts', '/blogs'], (req, res) => res.redirect('/'));

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found',
    author
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('404', {
    title: 'Server Error',
    author
  });
});

// Start the server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Personal blog running at http://localhost:${PORT}`);
    console.log(`Secure admin panel at http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
