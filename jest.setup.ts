jest.mock('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: jest.fn(),
    createUser: jest.fn(),
    getUserByEmail: jest.fn(),
    createCustomToken: jest.fn(),
  };

  const mockFirestore = jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
      })),
    })),
  }));

  const mockStorage = jest.fn();

  // Criar uma instância que será referenciada tanto pelo initializeApp quanto por app()
  const mockApp = {
    auth: () => mockAuth,
    firestore: () => mockFirestore,
    storage: () => mockStorage,
  };

  return {
    initializeApp: jest.fn().mockImplementation(() => {
      return mockApp;
    }),
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
});

// Versão simplificada do mock do console
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();
console.info = jest.fn();
console.debug = jest.fn();
