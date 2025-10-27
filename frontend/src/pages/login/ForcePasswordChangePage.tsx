import LockResetIcon from '@mui/icons-material/LockReset'
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
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { changePassword } from '@/api/auth'
import { paths } from '@/router/paths'
import { useAuthStore } from '@/store/auth'

const basePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
})

export type ForcePasswordFormValues = z.infer<typeof basePasswordSchema>

export function ForcePasswordChangePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)

  const schema = useMemo(
    () =>
      basePasswordSchema.superRefine((data, ctx) => {
        if (data.newPassword !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['confirmPassword'],
            message: t('passwordChange.mismatch'),
          })
        }
      }),
    [t],
  )

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForcePasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!user) {
      navigate(paths.login, { replace: true })
    }
  }, [navigate, user])

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ForcePasswordFormValues) =>
      changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      enqueueSnackbar(t('passwordChange.success'), { variant: 'success' })
      reset()
      if (user) {
        updateUser({ ...user, mustChangePassword: false })
      }
      navigate(paths.dashboard, { replace: true })
    },
    onError: () => {
      enqueueSnackbar(t('passwordChange.error'), { variant: 'error' })
    },
  })

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
      <Container maxWidth="sm">
        <Paper elevation={8} sx={{ p: 4, borderRadius: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar sx={{ bgcolor: 'secondary.main' }}>
              <LockResetIcon />
            </Avatar>
            <Typography component="h1" variant="h5" textAlign="center">
              {t('passwordChange.title')}
            </Typography>
            <Typography color="text.secondary" textAlign="center">
              {t('passwordChange.subtitle')}
            </Typography>
            <Box
              component="form"
              sx={{ mt: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
            >
              <Controller
                name="currentPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label={t('passwordChange.current')}
                    fullWidth
                    required
                    error={Boolean(errors.currentPassword)}
                    helperText={errors.currentPassword?.message}
                  />
                )}
              />
              <Controller
                name="newPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label={t('passwordChange.new')}
                    fullWidth
                    required
                    error={Boolean(errors.newPassword)}
                    helperText={errors.newPassword?.message}
                  />
                )}
              />
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label={t('passwordChange.confirm')}
                    fullWidth
                    required
                    error={Boolean(errors.confirmPassword)}
                    helperText={errors.confirmPassword?.message}
                  />
                )}
              />
              <LoadingButton
                type="submit"
                variant="contained"
                loading={mutation.isPending}
                fullWidth
              >
                {t('passwordChange.submit')}
              </LoadingButton>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}
