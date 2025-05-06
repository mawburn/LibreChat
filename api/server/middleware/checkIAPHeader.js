const passport = require('passport');
const cookies = require('cookie');
const jwt = require('jsonwebtoken');
const { User, findSession } = require('~/models');
const { logger } = require('~/config');
const { setAuthTokens } = require('~/server/services/AuthService');
const { refreshController } = require('~/server/controllers/AuthController');

/**
 * Middleware to inject and log Google IAP headers
 * @function
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Next middleware function
 */
const injectIAPHeader = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info('Inject google iap header for dev');
    req.headers['x-goog-authenticated-user-email'] = 'accounts.google.com:dev.user@librechat.com';
  } else if (req.headers['x-forwarded-for']) {
    const ips = req.headers['x-forwarded-for'].split(',');

    const ipAddr = {
      client: ips[0].trim(),
    };

    ips.forEach((ip, idx) => {
      if (idx !== 1) {
        ipAddr[`proxy-${idx}`] = ip.trim();
      }
    });

    logger.debug(`Google IAP Header: ${req.headers['x-goog-authenticated-user-email']}`, {
      ipAddr,
    });
  }
  next();
};

/**
 * Middleware to check IAP header authentication status, and pass to refreshController
 * @function
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Next middleware function
 */
const checkIAPHeader = async (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // Check if we have a valid session in development mode
    const refreshToken = req.headers.cookie ? cookies.parse(req.headers.cookie).refreshToken : null;
    if (refreshToken) {
      try {
        // Validate existing token if present
        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findOne({ _id: payload.id });
        if (user) {
          logger.debug('Development mode: Valid session found');
          return refreshController(req, res, next);
        }
      } catch (err) {
        // Token invalid or expired, will auto-login below
        logger.debug('Development mode: Invalid token, will create new session');
      }
    }

    // Auto-login for development mode
    logger.info('Development mode: Creating auto-login session');
    const email = 'dev.user@librechat.com';
    let user = await User.findOne({ email });

    if (!user) {
      // Create development user if it doesn't exist
      user = new User({
        provider: 'gcpIap',
        email,
        username: 'dev_user',
        name: 'Development User',
        emailVerified: true,
      });
      await user.save();
      logger.info(`Created development user: ${email}`);
    }

    // Create authentication tokens
    await setAuthTokens(user._id, res);
    return refreshController(req, res, next);
  }

  // Production mode checks
  const refreshToken = req.headers.cookie ? cookies.parse(req.headers.cookie).refreshToken : null;
  const hasXGoogHeader = req.headers && req.headers['x-goog-authenticated-user-email'];
  if (hasXGoogHeader && !refreshToken) {
    return res.redirect('/oauth/iap/callback');
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const userId = payload.id;
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.redirect('/oauth/iap/callback');
    }

    const session = await findSession({ refreshToken: refreshToken, userId: userId });

    if (!session || session.expiration <= new Date()) {
      return res.redirect('/oauth/iap/callback');
    }

    // IAP check passed, forward to refreshController
    return refreshController(req, res, next);
  } catch (err) {
    console.error(`[checkIAPHeaderAndSession] Error verifying refresh token: ${err}`);
    return res.redirect('/oauth/iap/callback');
  }
};

module.exports = { checkIAPHeader, injectIAPHeader };
