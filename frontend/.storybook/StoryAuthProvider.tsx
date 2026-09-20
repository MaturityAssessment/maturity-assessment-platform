import type { ReactNode } from "react";
import { AuthContext, type AuthContextType } from "@/context";

const storyAuth: AuthContextType = {
  isAuthenticated: true,
  user: {
    id: 1,
    email: "alex@example.com",
    name: "Alex Morgan",
    role: "ADMIN",
    approvalStatus: "APPROVED",
    helpBalloonsEnabled: true,
    completedHelpTours: {},
    dismissedHelpTourPrompts: {},
  },
  handleLogout: () => undefined,
  refreshUserData: async () => undefined,
  completeHelpTour: async () => undefined,
  dismissHelpTourPrompt: async () => undefined,
};

export function StoryAuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={storyAuth}>{children}</AuthContext.Provider>;
}
