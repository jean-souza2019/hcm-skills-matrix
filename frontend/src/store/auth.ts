import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Role, User } from '@/types/domain'

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  setLoading: (loading: boolean) => void
  setCredentials: (payload: { token: string; user: User }) => void
  updateUser: (user: User | null) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
      setCredentials: ({ token, user }) =>
        set({
          token,
          user,
        }),
      updateUser: (user) => set({ user }),
      signOut: () =>
        set({
          token: null,
          user: null,
        }),
    }),
    {
      name: 'hcm-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      version: 1,
    },
  ),
)

export const selectToken = (state: AuthState) => state.token
export const selectUser = (state: AuthState) => state.user
export const selectRole = (state: AuthState): Role | null =>
  state.user?.role ?? null
export const selectIsAuthenticated = (state: AuthState) =>
  Boolean(state.token && state.user)
