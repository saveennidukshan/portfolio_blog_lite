const crypto = require('crypto');

// Generate cryptographically secure CSRF token
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware: Require Admin Authentication
function requireAdmin(req, res, next) {
  if (req.session && req.session.adminUser) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  req.session.adminError = 'Please sign in to access the admin panel.';
  res.redirect('/admin/login');
}

// Middleware: Redirect authenticated admin away from login page
function isGuestAdmin(req, res, next) {
  if (req.session && req.session.adminUser) {
    return res.redirect('/admin');
  }
  next();
}

// Middleware: CSRF Token Generation and Verification
function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }
  res.locals.csrfToken = req.session.csrfToken;

  // Verify CSRF token on mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.body._csrf || req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).render('404', {
        title: '403 Forbidden',
        message: 'Invalid or missing CSRF security token. Please try again.'
      });
    }
  }

  next();
}

// Middleware: Set Admin Context & Flash Messages
function setAdminLocals(req, res, next) {
  res.locals.adminUser = req.session.adminUser || null;
  res.locals.adminSuccess = req.session.adminSuccess || null;
  res.locals.adminError = req.session.adminError || null;

  delete req.session.adminSuccess;
  delete req.session.adminError;

  next();
}

module.exports = {
  requireAdmin,
  isGuestAdmin,
  csrfProtection,
  setAdminLocals
};
