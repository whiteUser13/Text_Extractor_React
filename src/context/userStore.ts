// src/context/userStore.ts
import { create } from "zustand"

export interface User {
  id: string
  username: string
  group_name: string
  is_activate?: boolean
}

// interface UserStore {
//   user: User | null
//   setUser: (user: User | null) => void
// }

// export const useUserStore = create<UserStore>((set) => ({
//   user: null,
//   setUser: (user) => set({ user }),
// }))
type UserStore = {
  user: User | null
  initialized: boolean
  setUser: (user: User | null) => void
  setInitialized: (v: boolean) => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  initialized: false,

  setUser: (user) => set({ user }),
  setInitialized: (v) => set({ initialized: v }),
}))
