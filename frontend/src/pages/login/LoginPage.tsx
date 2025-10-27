import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LoadingButton from '@mui/lab/LoadingButton'
import {
  Avatar,
  Box,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { login } from '@/api/auth'
import { paths } from '@/router/paths'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { enqueueSnackbar } = useSnackbar()
  const setCredentials = useAuthStore((state) => state.setCredentials)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setCredentials({ token: data.accessToken, user: data.user })
      queryClient.clear()
      const redirectTo = (location.state as { from?: Location })?.from?.pathname
      const nextRoute =
        data.user.mustChangePassword ?? false
          ? paths.forcePasswordChange
          : redirectTo ?? paths.dashboard
      navigate(nextRoute, { replace: true })
    },
    onError: () => {
      enqueueSnackbar(t('login.error'), { variant: 'error' })
    },
  })

  useEffect(() => {
    if (token && user) {
      navigate(user.mustChangePassword ? paths.forcePasswordChange : paths.dashboard, {
        replace: true,
      })
    }
  }, [navigate, token, user])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)',
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={8} sx={{ p: 4, borderRadius: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              {t('login.title')}
            </Typography>
            <Box
              component="form"
              sx={{ mt: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="email"
                    label={t('login.email')}
                    fullWidth
                    required
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                  />
                )}
              />
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label={t('login.password')}
                    fullWidth
                    required
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message}
                  />
                )}
              />
              <LoadingButton
                type="submit"
                variant="contained"
                loading={mutation.isPending}
                fullWidth
              >
                {t('login.submit')}
              </LoadingButton>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
