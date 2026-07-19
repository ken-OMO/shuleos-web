export const queryKeys = {
  auth: { currentUser: ["auth", "current-user"] as const },
  notifications: { all: ["notifications"] as const },
  navigation: { badges: ["navigation", "badges"] as const },
} as const;
