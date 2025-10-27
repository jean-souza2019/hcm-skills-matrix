import type { User } from '@/types/domain'

import { api } from './client'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function fetchCurrentUser() {
  const { data } = await api.get<User>('/users/me')
  return data
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export async function changePassword(payload: ChangePasswordPayload) {
  await api.post('/auth/change-password', payload)
}
