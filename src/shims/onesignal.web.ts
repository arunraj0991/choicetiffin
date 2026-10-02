export const LogLevel = {
  None: 0,
  Fatal: 1,
  Error: 2,
  Warn: 3,
  Info: 4,
  Debug: 5,
  Verbose: 6,
};

export type NotificationClickEvent = {
  notification: {
    additionalData?: Record<string, unknown>;
  };
};

export type PushSubscriptionChangedState = {
  current: {
    id?: string;
    token?: string;
    optedIn?: boolean;
  };
};

export const OneSignal = {
  Debug: {
    setLogLevel: () => {},
  },
  initialize: () => {},
  login: () => {},
  logout: () => {},
  Notifications: {
    requestPermission: async () => false,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  User: {
    addTag: () => {},
    pushSubscription: {
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  },
};
