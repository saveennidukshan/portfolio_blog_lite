const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'blog.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance and integrity
db.pragma('journal_mode = WAL');

// Create tables for personal blog
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT DEFAULT '',
    content TEXT NOT NULL,
    cover_image TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    reading_time TEXT DEFAULT '4 min read',
    published INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    locked_until DATETIME DEFAULT NULL,
    last_login DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Check if columns exist (for migration if table already existed)
const existingCols = db.prepare('PRAGMA table_info(posts)').all().map(c => c.name);
if (!existingCols.includes('tags')) {
  db.exec("ALTER TABLE posts ADD COLUMN tags TEXT DEFAULT ''");
}
if (!existingCols.includes('reading_time')) {
  db.exec("ALTER TABLE posts ADD COLUMN reading_time TEXT DEFAULT '4 min read'");
}
if (!existingCols.includes('published')) {
  db.exec("ALTER TABLE posts ADD COLUMN published INTEGER DEFAULT 1");
}

// Calculate reading time helper
function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  return `${minutes} min read`;
}

// Author information for the personal blog
const author = {
  name: "Saveen",
  title: "Full Stack Developer",
  bio: "Thoughts and deep dives on Node.js, Express, UI design systems, modern web architecture, and developer craftsmanship.",
  avatarInitials: "S",
  github: "https://github.com",
  twitter: "https://twitter.com",
  linkedin: "https://linkedin.com",
  email: "saveen@example.com"
};

// Seed default secure admin account if none exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
if (adminCount.count === 0) {
  const salt = bcrypt.genSaltSync(12);
  const defaultPassword = 'AdminSecure2026!';
  const passwordHash = bcrypt.hashSync(defaultPassword, salt);

  db.prepare(`
    INSERT INTO admin_users (username, email, password_hash)
    VALUES (?, ?, ?)
  `).run('admin', 'admin@example.com', passwordHash);

  console.log('Default secure admin user created: admin / AdminSecure2026!');
}

// Seed sample personal blog posts if empty
const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get();
if (postCount.count === 0) {
  const insertPost = db.prepare(`
    INSERT INTO posts (title, slug, excerpt, content, cover_image, tags, reading_time, published)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const initialPosts = [
    {
      title: 'Getting Started with Express.js',
      slug: 'getting-started-with-expressjs',
      excerpt: 'Learn how to build lightweight, robust web applications with Express.js, the battle-tested framework for Node.js.',
      tags: 'Express, Node.js, Backend',
      content: `Express.js is one of the most enduring, minimal, and flexible web application frameworks in the JavaScript ecosystem. Whether you are creating a simple JSON microservice or a server-rendered web application, Express provides the core essentials.

## Why Choose Express?

Express offers a thin, transparent layer on top of Node.js HTTP primitives:

- **Minimalist Core:** No bloat. You only include the middleware and libraries you actually need.
- **Robust Routing:** Straightforward routing with parameter support, wildcards, and regular expressions.
- **Thriving Ecosystem:** Thousands of mature, tested npm packages designed specifically as Express middleware.
- **Predictable Pipeline:** Everything is a middleware function that receives \`(req, res, next)\`.

## Setting Up Your Project

Getting started requires only a few terminal commands:

\`\`\`bash
mkdir my-app
cd my-app
npm init -y
npm install express
\`\`\`

## Writing Your First Server

Here is a clean, minimal HTTP server in Express:

\`\`\`javascript
const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Welcome to Express.js!');
});

app.listen(PORT, () => {
  console.log(\`Server is running on http://localhost:\${PORT}\`);
});
\`\`\`

## Middleware: The Heart of Express

Middleware functions have access to the request object (\`req\`), the response object (\`res\`), and the \`next\` function in the application’s request-response cycle:

\`\`\`javascript
app.use((req, res, next) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  next();
});
\`\`\`

Understanding this simple flow gives you complete control over authentication, validation, error handling, and request lifecycle management.`
    },
    {
      title: 'Mastering EJS Templates in Modern Web Apps',
      slug: 'mastering-ejs-templates',
      excerpt: 'A comprehensive guide to EJS — the clean templating language that lets you generate dynamic HTML markup with plain JavaScript.',
      tags: 'EJS, JavaScript, SSR',
      content: `Server-side rendering (SSR) remains one of the fastest, most reliable ways to serve web content to users and search engines. EJS (Embedded JavaScript) provides a zero-fuss templating syntax directly embedded in HTML.

## Core Template Tags

EJS uses intuitive delimiters:

- \`<%= value %>\` — Outputs escaped value (prevents XSS vulnerabilities).
- \`<%- rawHtml %>\` — Outputs raw unescaped HTML (use carefully).
- \`<% jsCode %>\` — Executes JavaScript without outputting text (for loops, conditionals).
- \`<%- include('path/to/partial') %>\` — Reusable components and layout partials.

## Creating Modular Partials

The cleanest way to structure an EJS app is to separate reusable pieces like headers and footers into a \`views/partials\` directory:

\`\`\`ejs
<%- include('partials/header', { title: 'Personal Blog' }) %>

<main class="container">
  <h1>Welcome to my blog</h1>
</main>

<%- include('partials/footer') %>
\`\`\`

## Rendering Dynamic Loops

Rendering dynamic lists from your database query is as natural as writing a \`forEach\` in standard JavaScript:

\`\`\`ejs
<div class="articles-list">
  <% posts.forEach(post => { %>
    <article class="article-card">
      <h2><%= post.title %></h2>
      <p><%= post.excerpt %></p>
      <a href="/blog/<%= post.slug %>">Read full article</a>
    </article>
  <% }); %>
</div>
\`\`\`

No complex build pipelines, no hydration mismatches — just instant, fast HTML delivered straight to the browser.`
    },
    {
      title: 'Modern CSS Design Patterns with shadcn/ui Principles',
      slug: 'modern-css-design-patterns',
      excerpt: 'Explore modern CSS techniques, HSL/HEX color tokens, and the minimal aesthetic that defines shadcn/ui.',
      tags: 'CSS, UI Design, shadcn',
      content: `The modern web has moved past heavy component libraries with rigid JavaScript wrappers. Instead, the paradigm pioneered by shadcn/ui emphasizes owning your own code, using CSS custom properties for theming, and designing with purpose.

## Defining Semantic Tokens

By defining semantic CSS variables on \`:root\`, you create an adaptable foundation that supports dark mode and custom palettes effortlessly:

\`\`\`css
:root {
  --background: #ffffff;
  --foreground: #09090b;
  --card: #ffffff;
  --card-foreground: #09090b;
  --primary: #18181b;
  --primary-foreground: #fafafa;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --border: #e4e4e7;
  --radius: 0.5rem;
}
\`\`\`

## Fluid Typography and Spacing

Clean typography elevates any personal blog. Utilizing subtle tracking, controlled line-heights, and muted metadata creates that distinct, polished editorial look:

\`\`\`css
.article-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: var(--foreground);
}
\`\`\`

## Subtle Interactive States

Using delicate borders and subtle hover box-shadows gives components tactile feedback without visual clutter:

\`\`\`css
.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  border-color: #d4d4d8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}
\`\`\`

Pairing these principles with semantic HTML yields blazing fast, lightweight pages that are a joy to read.`
    },
    {
      title: 'Building Scalable REST APIs with Node.js and Express',
      slug: 'building-scalable-rest-apis',
      excerpt: 'A practical blueprint for structuring clean, maintainable REST APIs with SQLite and Express.',
      tags: 'APIs, Node.js, Architecture',
      content: `A well-designed REST API is predictable, easy to consume, and resilient to change. Let us explore the key conventions for organizing an API backend in Node.js.

## REST Resource Conventions

Follow standard HTTP verbs and pluralized nouns:

- \`GET /api/posts\` — Retrieve a paginated list of posts
- \`GET /api/posts/:id\` — Retrieve a specific post
- \`POST /api/posts\` — Create a new post
- \`PUT /api/posts/:id\` — Replace or update an entire post
- \`DELETE /api/posts/:id\` — Remove a post

## Centralized Error Handling

Never let unhandled errors crash your Node process. Express allows you to define an error-handling middleware by accepting four arguments:

\`\`\`javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});
\`\`\`

## Database Prepared Statements

When working with relational databases like SQLite, always use prepared statements to ensure optimal performance and eliminate SQL injection vulnerabilities:

\`\`\`javascript
const statement = db.prepare('SELECT * FROM posts WHERE slug = ?');
const post = statement.get(requestedSlug);
\`\`\`

With these foundations, your API remains clean, performant, and ready to scale.`
    }
  ];

  for (const post of initialPosts) {
    const time = calculateReadingTime(post.content);
    insertPost.run(post.title, post.slug, post.excerpt, post.content, '', post.tags, time);
  }
}

module.exports = {
  db,
  author,
  calculateReadingTime
};
