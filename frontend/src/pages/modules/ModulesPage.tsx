import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import LibraryAddIcon from '@mui/icons-material/LibraryAdd'
import LoadingButton from '@mui/lab/LoadingButton'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useSnackbar } from 'notistack'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import {
  createModule,
  listModules,
  removeModule,
  updateModule,
} from '@/api/modules'
import type { ModuleRoutine } from '@/types/domain'
import { queryClient } from '@/lib/queryClient'

const moduleSchema = z.object({
  code: z.string().min(2),
  description: z.string().min(3),
  observation: z.string().optional(),
})

type ModuleFormValues = z.infer<typeof moduleSchema>

interface DialogState {
  open: boolean
  module?: ModuleRoutine
}

export function ModulesPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [filters, setFilters] = useState({ code: '', description: '' })
  const [dialogState, setDialogState] = useState<DialogState>({ open: false })

  const { data, isLoading } = useQuery({
    queryKey: ['modules', filters],
    queryFn: () =>
      listModules({
        code: filters.code || undefined,
        description: filters.description || undefined,
      }),
  })

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { code: '', description: '', observation: '' },
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: ModuleFormValues) => {
      const { module } = dialogState
      if (module) {
        return updateModule(module.id, payload)
      }
      return createModule(payload)
    },
    onSuccess: () => {
      enqueueSnackbar(t('modules.success'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['modules'] })
      handleCloseDialog()
    },
    onError: () => {
      enqueueSnackbar('Não foi possível salvar o módulo.', { variant: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: removeModule,
    onSuccess: () => {
      enqueueSnackbar(t('modules.deleted'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['modules'] })
    },
    onError: () => {
      enqueueSnackbar('Não foi possível remover o módulo.', { variant: 'error' })
    },
  })

  const handleOpenDialog = (module?: ModuleRoutine) => {
    setDialogState({ open: true, module })
    if (module) {
      form.reset({
        code: module.code,
        description: module.description,
        observation: module.observation ?? '',
      })
    } else {
      form.reset({ code: '', description: '', observation: '' })
    }
  }

  const handleCloseDialog = () => setDialogState({ open: false })

  const handleDelete = (module: ModuleRoutine) => {
    if (window.confirm(`Excluir módulo ${module.code}?`)) {
      deleteMutation.mutate(module.id)
    }
  }

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Typography variant="h4">{t('modules.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<LibraryAddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('modules.create')}
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              label={t('modules.code')}
              value={filters.code}
              onChange={(event) => setFilters((prev) => ({ ...prev, code: event.target.value }))}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label={t('modules.description')}
              value={filters.description}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, description: event.target.value }))
              }
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'stretch' }}>
            <Button
              variant="outlined"
              onClick={() => setFilters({ code: '', description: '' })}
              fullWidth
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
              <TableCell>{t('modules.code')}</TableCell>
              <TableCell>{t('modules.description')}</TableCell>
              <TableCell>{t('modules.observation')}</TableCell>
              <TableCell align="right">{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>{t('common.loading')}</TableCell>
              </TableRow>
            )}
            {!isLoading && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>{t('common.noData')}</TableCell>
              </TableRow>
            )}
            {data?.data.map((module) => (
              <TableRow key={module.id} hover>
                <TableCell>{module.code}</TableCell>
                <TableCell>{module.description}</TableCell>
                <TableCell>{module.observation ?? '-'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenDialog(module)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(module)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={dialogState.open} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {dialogState.module ? t('common.edit') : t('modules.create')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Controller
            name="code"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('modules.code')}
                fullWidth
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('modules.description')}
                fullWidth
                error={fieldState.invalid}
                helperText={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="observation"
            control={form.control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('modules.observation')}
                fullWidth
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <LoadingButton
            onClick={form.handleSubmit((values) => upsertMutation.mutate(values))}
            loading={upsertMutation.isPending}
            variant="contained"
          >
            {t(dialogState.module ? 'common.update' : 'common.save')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
