import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import LockResetIcon from '@mui/icons-material/LockReset'
import LoadingButton from '@mui/lab/LoadingButton'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Pagination,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { z } from 'zod'

import {
  createCollaborator,
  listCollaborators,
  removeCollaborator,
  updateCollaborator,
  resetCollaboratorAccess,
  type CollaboratorAccessCredentials,
} from '@/api/collaborators'
import type { CollaboratorProfile } from '@/types/domain'
import { formatDate, toIsoDate } from '@/utils/date'
import { queryClient } from '@/lib/queryClient'

const collaboratorSchema = z
  .object({
    fullName: z.string().min(3),
    admissionDate: z.string(),
    activities: z.array(z.string()).default([]),
    notes: z.string().optional(),
    createAccess: z.boolean().default(false),
    accessEmail: z
      .string()
      .trim()
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.createAccess && !data.accessEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe um e-mail para liberar o acesso.',
        path: ['accessEmail'],
      })
    }

    if (data.accessEmail) {
      const parsed = z.string().email().safeParse(data.accessEmail)
      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: parsed.error.issues[0]?.message ?? 'E-mail inválido.',
          path: ['accessEmail'],
        })
      }
    }
  })

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>

interface DialogState {
  open: boolean
  collaborator?: CollaboratorProfile
}

export function CollaboratorsPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [filters, setFilters] = useState({ name: '', activity: '', page: 1 })
  const [dialogState, setDialogState] = useState<DialogState>({ open: false })
  const [accessCredentials, setAccessCredentials] = useState<CollaboratorAccessCredentials | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    onConfirm?: () => void
  }>({
    open: false,
    title: '',
    message: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['collaborators', filters],
    queryFn: () =>
      listCollaborators({
        page: filters.page,
        name: filters.name || undefined,
        activity: filters.activity || undefined,
      }),
  })

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      fullName: '',
      admissionDate: '',
      activities: [],
      notes: '',
      createAccess: false,
      accessEmail: '',
    },
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: CollaboratorFormValues) => {
      const { collaborator } = dialogState
      const admissionDateIso = toIsoDate(payload.admissionDate)
      const requestPayload = {
        fullName: payload.fullName,
        admissionDate: admissionDateIso ?? payload.admissionDate,
        activities: payload.activities,
        notes: payload.notes,
        createAccess: payload.createAccess,
        accessEmail: payload.accessEmail?.trim() || undefined,
      }

      if (collaborator) {
        return updateCollaborator(collaborator.id, requestPayload)
      }

      return createCollaborator(requestPayload)
    },
    onSuccess: (response) => {
      enqueueSnackbar(t('collaborators.success'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['collaborators'] })
      handleCloseDialog()
      if (response.accessCredentials) {
        setAccessCredentials(response.accessCredentials)
      }
    },
    onError: () => {
      enqueueSnackbar(t('common.error') ?? 'Erro ao salvar colaborador.', {
        variant: 'error',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: removeCollaborator,
    onSuccess: () => {
      enqueueSnackbar(t('collaborators.deleted'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['collaborators'] })
    },
    onError: () => {
      enqueueSnackbar('Não foi possível remover o colaborador.', { variant: 'error' })
    },
  })

  const resetAccessMutation = useMutation({
    mutationFn: resetCollaboratorAccess,
  })

  const handleOpenDialog = (collaborator?: CollaboratorProfile) => {
    setDialogState({ open: true, collaborator })
    if (collaborator) {
      form.reset({
        fullName: collaborator.fullName,
        admissionDate: collaborator.admissionDate.slice(0, 10),
        activities: collaborator.activities ?? [],
        notes: collaborator.notes ?? '',
        createAccess: false,
        accessEmail: collaborator.user?.email ?? '',
      })
    } else {
      form.reset({
        fullName: '',
        admissionDate: '',
        activities: [],
        notes: '',
        createAccess: false,
        accessEmail: '',
      })
    }
  }

  function handleCloseDialog() {
    setDialogState({ open: false })
  }

  const handleCloseCredentials = () => setAccessCredentials(null)

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      enqueueSnackbar(t('collaborators.copied'), { variant: 'success' })
    } catch {
      enqueueSnackbar(t('collaborators.copyError'), { variant: 'error' })
    }
  }

  const availableActivities = useMemo(() => {
    const set = new Set<string>()
    data?.data.forEach((item) => {
      item.activities?.forEach((activity) => {
        if (activity.trim()) {
          set.add(activity)
        }
      })
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data?.data])

  const handleDelete = (collaborator: CollaboratorProfile) => {
    setConfirmDialog({
      open: true,
      title: t('collaborators.deleteTitle'),
      message: t('collaborators.deleteConfirm', { name: collaborator.fullName }),
      confirmLabel: t('common.delete'),
      onConfirm: () => deleteMutation.mutate(collaborator.id),
    })
  }

  const handleResetAccess = (collaborator: CollaboratorProfile) => {
    if (!collaborator.user) return
    setConfirmDialog({
      open: true,
      title: t('collaborators.resetAccess'),
      message: t('collaborators.resetAccessConfirm', { name: collaborator.fullName }),
      confirmLabel: t('collaborators.resetAccess'),
      onConfirm: () => {
        setResettingId(collaborator.id)
        resetAccessMutation.mutate(collaborator.id, {
          onSuccess: (response) => {
            setAccessCredentials(response.accessCredentials)
            enqueueSnackbar(t('collaborators.resetAccessSuccess'), { variant: 'success' })
          },
          onError: () => {
            enqueueSnackbar(t('collaborators.resetAccessError'), { variant: 'error' })
          },
          onSettled: () => {
            setResettingId(null)
          },
        })
      },
    })
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Typography variant="h4">{t('collaborators.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('collaborators.create')}
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} component="form" onSubmit={(event) => event.preventDefault()}>
          <Grid item xs={12} md={4}>
            <TextField
              label={t('filters.search')}
              fullWidth
              value={filters.name}
              onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value, page: 1 }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label={t('filters.activity')}
              fullWidth
              value={filters.activity}
              onChange={(event) => setFilters((prev) => ({ ...prev, activity: event.target.value, page: 1 }))}
            />
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setFilters({ name: '', activity: '', page: 1 })}
              sx={{ alignSelf: 'stretch' }}
            >
              {t('filters.clear')}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('collaborators.name')}</TableCell>
              <TableCell>{t('collaborators.admissionDate')}</TableCell>
              <TableCell>{t('collaborators.activities')}</TableCell>
              <TableCell>{t('collaborators.notes')}</TableCell>
              <TableCell>{t('collaborators.access')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>{t('common.loading')}</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>{t('common.noData')}</TableCell>
              </TableRow>
            )}
            {data?.data.map((collaborator) => (
              <TableRow key={collaborator.id} hover>
                <TableCell>{collaborator.fullName}</TableCell>
                <TableCell>{formatDate(collaborator.admissionDate)}</TableCell>
                <TableCell>{collaborator.activities?.join(', ') ?? '-'}</TableCell>
                <TableCell>{collaborator.notes ?? '-'}</TableCell>
                <TableCell>
                  {collaborator.user ? (
                    <Chip color="success" label={collaborator.user.email} size="small" />
                  ) : (
                    <Chip
                      color="default"
                      variant="outlined"
                      label={t('collaborators.noAccess')}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenDialog(collaborator)}>
                    <EditIcon />
                  </IconButton>
                  {collaborator.user && (
                    <Tooltip title={t('collaborators.resetAccess')}>
                      <span>
                        <IconButton
                          onClick={() => handleResetAccess(collaborator)}
                          disabled={resettingId === collaborator.id && resetAccessMutation.isPending}
                        >
                          <LockResetIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <IconButton color="error" onClick={() => handleDelete(collaborator)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          {data?.meta && data.meta.totalPages > 1 && (
            <Pagination
              page={filters.page}
              count={data.meta.totalPages}
              onChange={(_event, page) => setFilters((prev) => ({ ...prev, page }))}
              color="primary"
            />
          )}
        </Box>
      </Paper>

      <Dialog open={dialogState.open} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialogState.collaborator ? t('collaborators.edit') : t('collaborators.create')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Controller
            name="fullName"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('collaborators.name')}
                fullWidth
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="admissionDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="date"
                label={t('collaborators.admissionDate')}
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="activities"
            control={form.control}
            render={({ field }) => (
              <Autocomplete
                multiple
                freeSolo
                options={availableActivities}
                value={field.value ?? []}
                onChange={(_event, value) => field.onChange(value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('collaborators.activities')}
                    placeholder={t('collaborators.activitiesPlaceholder')}
                  />
                )}
              />
            )}
          />
          <Controller
            name="notes"
            control={form.control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('collaborators.notes')}
                multiline
                minRows={3}
                fullWidth
              />
            )}
          />
          {dialogState.collaborator?.user ? (
            <Alert severity="info">
              {t('collaborators.accessExisting', { email: dialogState.collaborator.user.email })}
            </Alert>
          ) : (
            <>
              <Divider />
              <Typography variant="subtitle1" fontWeight={600}>
                {t('collaborators.accessSectionTitle')}
              </Typography>
              <Controller
                name="createAccess"
                control={form.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label={t('collaborators.createAccess')}
                  />
                )}
              />
              <Controller
                name="accessEmail"
                control={form.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type="email"
                    label={t('collaborators.accessEmail')}
                    fullWidth
                    disabled={!form.watch('createAccess')}
                    error={fieldState.invalid}
                    helperText={
                      form.watch('createAccess')
                        ? fieldState.error?.message ?? t('collaborators.accessHelper')
                        : t('collaborators.accessHelper')
                    }
                  />
                )}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <LoadingButton
            onClick={form.handleSubmit((values) => upsertMutation.mutate(values))}
            loading={upsertMutation.isPending}
            variant="contained"
          >
            {t(dialogState.collaborator ? 'common.update' : 'common.save')}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(accessCredentials)}
        onClose={handleCloseCredentials}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('collaborators.accessDialogTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Alert severity="info">{t('collaborators.accessDialogInfo')}</Alert>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="subtitle2">{t('collaborators.accessEmail')}</Typography>
              <Typography>{accessCredentials?.email}</Typography>
            </Box>
            <Tooltip title={t('collaborators.copy') ?? 'Copiar'}>
              <IconButton onClick={() => accessCredentials && handleCopy(accessCredentials.email)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Box>
              <Typography variant="subtitle2">{t('collaborators.accessPassword')}</Typography>
              <Typography fontWeight={600}>{accessCredentials?.temporaryPassword}</Typography>
            </Box>
            <Tooltip title={t('collaborators.copy') ?? 'Copiar'}>
              <IconButton
                onClick={() =>
                  accessCredentials && handleCopy(accessCredentials.temporaryPassword)
                }
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCredentials}>{t('common.close')}</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
            {t('common.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              confirmDialog.onConfirm?.()
              setConfirmDialog((prev) => ({ ...prev, open: false }))
            }}
          >
            {confirmDialog.confirmLabel ?? t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
