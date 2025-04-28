const { Strategy: PassportHTTPHeaderStrategy } = require('passport-http-header-strategy');
const { createSocialUser } = require('./process');
const User = require('~/models/User');

async function gcpIAPLogin(req, token, done) {
  try {
    const email = token.split(':')[1];

    if (!email) {
      return done(new Error('Invalid email in token'), null);
    }

    let user = await User.findOne({ email });

    if (!user) {
      const username = email.split('@')[0];

      const name = username
        .split('.')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

      user = await createSocialUser({
        email,
        username,
        name,
        emailVerified: true,
        provider: 'gcpIap',
      });
    }

    return done(null, user);
  } catch (error) {
    console.error(`[GCP IAP Login] Error during login: ${error}`);
    return done(error, null);
  }
}

module.exports = () => {
  // Register the strategy with a name that can be referenced
  const strategy = new PassportHTTPHeaderStrategy(
    {
      header: 'X-Goog-Authenticated-User-Email',
      passReqToCallback: true,
    },
    gcpIAPLogin,
  );

  // Set the name property explicitly for reference in middleware
  strategy.name = 'gcpIapHeader';

  return strategy;
};
