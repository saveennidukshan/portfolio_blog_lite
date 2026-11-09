# Saveen's Personal Engineering Blog & Secure Admin Panel

A clean, minimalist personal engineering blog built with **Express.js**, **EJS**, and **SQLite**, designed following **shadcn/ui** aesthetic principles and equipped with a **secure admin panel** for writing and managing articles.

## Features

### Public Personal Blog
- **Zero Navbar Clutter:** Clean, distraction-free reading experience without a public navbar.
- **Root Blog Feed (`/`):** Author profile with live search and tag filtering (`#Express`, `#Node.js`, `#CSS`, `#APIs`).
- **Individual Article View (`/blog/:slug`):** Editorial layout with reading time, date, tags, and rendered markdown.
- **Draft Privacy:** Drafts written in the admin panel are completely hidden from public visitors.

### Secure Admin Panel (`/admin`)
- **Protected Portal:** Access guarded by `requireAdmin` middleware. Unauthorized visits redirect to `/admin/login`.
- **Brute-Force & Rate Limiting:** Failed attempts are tracked. 5 consecutive failed attempts trigger a 15-minute lockout.
- **Session Security:** `httpOnly: true`, `sameSite: 'lax'`, session regeneration on login to prevent Session Fixation.
- **Anti-CSRF Tokens:** All state-changing requests (`POST /admin/posts/...`) require cryptographic CSRF tokens.
- **Password Encryption:** Passwords hashed with `bcryptjs` (12 salt rounds).
- **Interactive Markdown Editor:**
  - Auto-generated URL slugs from article titles.
  - Formatting toolbar (Bold, Italic, H2, H3, Code Blocks, Quotes, Lists, Links).
  - **Live Reader Preview:** Tabbed "Write" vs "Live Preview" mode to inspect formatted markdown before publishing.
  - Live word count and reading time estimator.
  - One-click Draft vs Published status toggle.
  - Permanent deletion with confirmation dialog.

---

## Admin Credentials

- **Admin Login URL:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Default Username:** `admin` *(or email: `admin@example.com`)*
- **Default Password:** `AdminSecure2026!`

---

## Project Structure

```text
my-express-blog-app/
├── app.js                       # Express application configuration & session setup
├── package.json                 # Scripts & dependencies
├── README.md                    # Documentation
├── db/
│   ├── blog.db                  # SQLite database (posts & admin_users tables)
│   └── database.js              # Database connection, migrations & admin seeding
├── middleware/
│   └── auth.js                  # requireAdmin, isGuestAdmin, csrfProtection, setAdminLocals
├── routes/
│   ├── admin.js                 # Admin auth & blog management endpoints
│   └── blog.js                  # Public blog view routes & markdown renderer
├── public/
│   ├── css/
│   │   ├── style.css            # Public blog design system (shadcn/ui)
│   │   └── admin.css            # Admin dashboard & editor stylesheet
│   └── js/
│       ├── main.js              # Public live search & copy link
│       └── admin.js             # Live preview, markdown toolbar, modal & search
└── views/
    ├── 404.ejs                  # Error page
    ├── index.ejs                # Public homepage showing author profile & articles
    ├── blogs/
    │   └── show.ejs             # Public individual blog view
    ├── admin/
    │   ├── login.ejs            # Secure admin sign in portal
    │   ├── dashboard.ejs        # Admin articles management table & metrics
    │   └── editor.ejs           # Unified write/edit article canvas with live preview
    └── partials/
        ├── footer.ejs           # Public footer
        ├── header.ejs           # Public HTML head (no navbar)
        ├── admin-header.ejs     # Admin topbar with navigation & user pill
        └── admin-footer.ejs     # Admin footer
```

---

## Getting Started

### 1. Run Development Server
```bash
npm run dev
```

### 2. Run Production Server
```bash
npm start
```

### 3. Open in Browser
- **Public Blog:** [http://localhost:3000](http://localhost:3000)
- **Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)
