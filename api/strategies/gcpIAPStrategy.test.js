const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Strategy: PassportHTTPHeaderStrategy } = require('passport-http-header-strategy');
const User = require('~/models/User');
const { createSocialUser } = require('./process');
const gcpIAPLoginStrategyCreator = require('./gcpIAPStrategy');

// Mocking external dependencies
jest.mock('./process', () => ({
  createSocialUser: jest.fn(),
}));

describe('GCP IAP Login Strategy', () => {
  let mongoServer;
  let gcpIAPLoginInstance;
  const OLD_ENV = process.env;

  // Start and stop in-memory MongoDB
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    process.env = OLD_ENV;
  });

  beforeEach(async () => {
    // Reset environment variables
    process.env = { ...OLD_ENV };
    process.env.GCP_IAP_ENABLED = 'true';

    // Clear mocks and database
    jest.clearAllMocks();
    await User.deleteMany({});

    // Initialize the strategy
    const gcpIAPLogin = gcpIAPLoginStrategyCreator();
    gcpIAPLoginInstance = gcpIAPLogin;
  });

  describe('Strategy setup', () => {
    it('should create a header strategy with the correct configuration', () => {
      expect(gcpIAPLoginInstance).toBeDefined();
      expect(gcpIAPLoginInstance.name).toBe('gcpIapHeader');
      expect(gcpIAPLoginInstance instanceof PassportHTTPHeaderStrategy).toBe(true);
    });
  });

  describe('Strategy verify callback (gcpIAPLogin)', () => {
    let req, verifyCallback, gcpIAPLogin;

    beforeEach(() => {
      // Setup request and callback
      req = {};
      verifyCallback = jest.fn();

      // Get the actual callback function
      gcpIAPLogin = gcpIAPLoginInstance._verify;
    });

    it('should create a new user if one does not exist', async () => {
      // Setup mock email header
      const emailToken = 'accounts.google.com:test.user@example.com';

      // Mock User.findOne to return null (user doesn't exist)
      User.findOne = jest.fn().mockResolvedValue(null);

      // Mock createSocialUser to return a new user
      const mockUser = {
        email: 'test.user@example.com',
        username: 'test.user',
        name: 'Test User',
        provider: 'gcpIap',
      };
      createSocialUser.mockResolvedValue(mockUser);

      // Call the verify function
      await gcpIAPLogin(req, emailToken, verifyCallback);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ email: 'test.user@example.com' });
      expect(createSocialUser).toHaveBeenCalledWith({
        email: 'test.user@example.com',
        username: 'test.user',
        name: 'Test User',
        emailVerified: true,
        provider: 'gcpIap',
      });
      expect(verifyCallback).toHaveBeenCalledWith(null, mockUser);
    });

    it('should return existing user if one is found', async () => {
      // Setup mock email header
      const emailToken = 'accounts.google.com:existing.user@example.com';

      // Create an existing user in the database
      const existingUser = new User({
        email: 'existing.user@example.com',
        username: 'existing.user',
        name: 'Existing User',
        provider: 'gcpIap',
      });

      // Mock User.findOne to return the existing user
      User.findOne = jest.fn().mockResolvedValue(existingUser);

      // Call the verify function
      await gcpIAPLogin(req, emailToken, verifyCallback);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ email: 'existing.user@example.com' });
      expect(createSocialUser).not.toHaveBeenCalled();
      expect(verifyCallback).toHaveBeenCalledWith(null, existingUser);
    });

    it('should handle invalid email token format', async () => {
      // Setup invalid email header (missing email part)
      const emailToken = 'accounts.google.com';

      // Call the verify function
      await gcpIAPLogin(req, emailToken, verifyCallback);

      // Assertions
      expect(verifyCallback).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid email in token' }),
        null,
      );
      expect(User.findOne).not.toHaveBeenCalled();
      expect(createSocialUser).not.toHaveBeenCalled();
    });

    it('should handle errors during user lookup', async () => {
      // Setup mock email header
      const emailToken = 'accounts.google.com:error.user@example.com';

      // Mock User.findOne to throw an error
      const dbError = new Error('Database connection failed');
      User.findOne = jest.fn().mockRejectedValue(dbError);

      // Mock console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Call the verify function
      await gcpIAPLogin(req, emailToken, verifyCallback);

      // Assertions
      expect(verifyCallback).toHaveBeenCalledWith(dbError, null);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'error.user@example.com' });
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should handle errors during user creation', async () => {
      // Setup mock email header
      const emailToken = 'accounts.google.com:new.user@example.com';

      // Mock User.findOne to return null (user doesn't exist)
      User.findOne = jest.fn().mockResolvedValue(null);

      // Mock createSocialUser to throw an error
      const createError = new Error('User creation failed');
      createSocialUser.mockRejectedValue(createError);

      // Mock console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Call the verify function
      await gcpIAPLogin(req, emailToken, verifyCallback);

      // Assertions
      expect(verifyCallback).toHaveBeenCalledWith(createError, null);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'new.user@example.com' });
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Username and name formatting', () => {
    it('should correctly format name from email', async () => {
      // Setup mock email header with compound name
      const emailToken = 'accounts.google.com:john.doe@example.com';

      // Mock User.findOne to return null (user doesn't exist)
      User.findOne = jest.fn().mockResolvedValue(null);

      // Mock createSocialUser to verify the formatted name
      createSocialUser.mockImplementation((userData) => {
        expect(userData.name).toBe('John Doe');
        return { ...userData };
      });

      // Call the verify function
      await gcpIAPLoginInstance._verify({}, emailToken, jest.fn());

      // Validate that createSocialUser was called with correctly formatted name
      expect(createSocialUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'john.doe',
          name: 'John Doe',
        }),
      );
    });

    it('should correctly format name from simple email', async () => {
      // Setup mock email header with simple name
      const emailToken = 'accounts.google.com:alice@example.com';

      // Mock User.findOne to return null (user doesn't exist)
      User.findOne = jest.fn().mockResolvedValue(null);

      // Mock createSocialUser to verify the formatted name
      createSocialUser.mockImplementation((userData) => {
        expect(userData.name).toBe('Alice');
        return { ...userData };
      });

      // Call the verify function
      await gcpIAPLoginInstance._verify({}, emailToken, jest.fn());

      // Validate that createSocialUser was called with correctly formatted name
      expect(createSocialUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'alice',
          name: 'Alice',
        }),
      );
    });
  });
});
