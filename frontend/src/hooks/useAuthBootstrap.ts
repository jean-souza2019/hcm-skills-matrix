import { useEffect } from 'react'

import { fetchCurrentUser } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

export function useAuthBootstrap() {
  const token = useAuthStore((state) => state.token)
  const setLoading = useAuthStore((state) => state.setLoading)
  const updateUser = useAuthStore((state) => state.updateUser)
  const signOut = useAuthStore((state) => state.signOut)

  useEffect(() => {
    let mounted = true

    async function loadCurrentUser() {
      if (!token) {
        updateUser(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const user = await fetchCurrentUser()
        if (mounted) {
          updateUser(user)
        }
      } catch (error) {
        console.error('Não foi possível carregar o usuário atual.', error)
        signOut()
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadCurrentUser()

    return () => {
      mounted = false
    }
  }, [token, setLoading, updateUser, signOut])
}
