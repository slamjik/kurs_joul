import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token') || null,
  refreshToken: localStorage.getItem('refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  setAuth: ({ user, access, refresh }) => {
    if (access) localStorage.setItem('access_token', access)
    if (refresh) localStorage.setItem('refresh_token', refresh)
    if (user) localStorage.setItem('user_info', JSON.stringify(user))

    set({
      user: user || get().user,
      token: access || get().token,
      refreshToken: refresh || get().refreshToken,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  setUser: (user) => {
    localStorage.setItem('user_info', JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_info')
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  initFromStorage: () => {
    const token = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    const savedUser = localStorage.getItem('user_info')

    let user = null
    if (savedUser) {
      try {
        user = JSON.parse(savedUser)
      } catch (e) {
        user = null
      }
    }

    set({
      token,
      refreshToken,
      user,
      isAuthenticated: !!token,
    })
  },
}))
