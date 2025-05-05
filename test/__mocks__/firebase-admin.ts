const mockAuth = {
  verifyIdToken: jest.fn(),
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
  createCustomToken: jest.fn(),
};

const mockFirestore = jest.fn();

const mockStorage = jest.fn();

const mockApp = {
  auth: () => mockAuth,
  firestore: () => mockFirestore,
  storage: () => mockStorage,
};

const firebase = {
  initializeApp: jest.fn().mockReturnValue(mockApp),
  credential: {
    cert: jest.fn(),
  },
  app: jest.fn((name) => {
    if (name !== 'me-adote-app') {
      throw new Error('App not found');
    }
    return mockApp;
  }),
};

export default firebase;
