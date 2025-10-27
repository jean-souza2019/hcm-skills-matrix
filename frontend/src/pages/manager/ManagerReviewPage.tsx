import LoadingButton from '@mui/lab/LoadingButton'
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'

import { listCollaborators } from '@/api/collaborators'
import { listModules } from '@/api/modules'
import { listClaims } from '@/api/skills'
import {
  createCareerPlan,
  listAssessments,
  listCareerPlans,
  removeCareerPlan,
  updateCareerPlan,
  upsertAssessment,
} from '@/api/assessments'
import type { CareerPlan, CollaboratorProfile, ModuleRoutine, SkillLevel } from '@/types/domain'
import { skillLevelLabels, skillLevelOptions } from '@/utils/skillLevel'
import { formatDate, toIsoDate } from '@/utils/date'
import { queryClient } from '@/lib/queryClient'

interface TargetDraft {
  targetLevel: SkillLevel
  comment: string
}

const planSchema = z.object({
  objectives: z.string().min(3),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  moduleIds: z.array(z.string()).min(1, 'Selecione pelo menos um módulo.'),
})

type PlanFormValues = z.infer<typeof planSchema>

export function ManagerReviewPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorProfile | null>(null)
  const [drafts, setDrafts] = useState<Record<string, TargetDraft>>({})
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
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

  const collaboratorsQuery = useQuery({
    queryKey: ['collaborators', { page: 1, perPage: 100 }],
    queryFn: () => listCollaborators({ page: 1, perPage: 100 }),
  })

  const modulesQuery = useQuery({
    queryKey: ['modules', { all: true }],
    queryFn: () => listModules({ perPage: 100 }),
  })

  const claimsQuery = useQuery({
    enabled: Boolean(selectedCollaborator?.id),
    queryKey: ['skills', 'claims', selectedCollaborator?.id],
    queryFn: () => listClaims({ collaboratorId: selectedCollaborator!.id }),
  })

  const assessmentsQuery = useQuery({
    enabled: Boolean(selectedCollaborator?.id),
    queryKey: ['assessments', selectedCollaborator?.id],
    queryFn: () => listAssessments({ collaboratorId: selectedCollaborator!.id }),
  })

  const plansQuery = useQuery({
    enabled: Boolean(selectedCollaborator?.id),
    queryKey: ['career-plans', selectedCollaborator?.id],
    queryFn: () => listCareerPlans(selectedCollaborator!.id),
  })

  useEffect(() => {
    setSelectedPlanId(null)
  }, [selectedCollaborator?.id])

  useEffect(() => {
    if (!selectedCollaborator || !assessmentsQuery.data) return
    const nextDrafts: Record<string, TargetDraft> = {}
    assessmentsQuery.data.forEach((assessment) => {
      nextDrafts[assessment.moduleId] = {
        targetLevel: assessment.targetLevel,
        comment: assessment.comment ?? '',
      }
    })
    setDrafts(nextDrafts)
  }, [assessmentsQuery.data, selectedCollaborator])

  useEffect(() => {
    if (!plansQuery.data || plansQuery.data.length === 0) {
      setSelectedPlanId(null)
      return
    }
    setSelectedPlanId((prev) => prev ?? plansQuery.data![0].id)
  }, [plansQuery.data])

  const selectedPlan = useMemo(() => {
    return plansQuery.data?.find((plan) => plan.id === selectedPlanId) ?? null
  }, [plansQuery.data, selectedPlanId])

  const planModules = useMemo(() => {
    if (!selectedPlan) return []
    return (selectedPlan.modules ?? [])
      .map((entry) => entry.module ?? modulesQuery.data?.data?.find((item) => item.id === entry.moduleId))
      .filter((module): module is ModuleRoutine => Boolean(module))
  }, [selectedPlan, modulesQuery.data?.data])

  const rows = useMemo(() => {
    return planModules.map((module) => {
      const claim = claimsQuery.data?.find((item) => item.moduleId === module.id)
      const assessment = assessmentsQuery.data?.find((item) => item.moduleId === module.id)
      const draft = drafts[module.id] ?? {
        targetLevel: assessment?.targetLevel ?? claim?.currentLevel ?? 'NAO_ATENDE',
        comment: assessment?.comment ?? '',
      }
      return {
        module,
        claim,
        assessment,
        draft,
      }
    })
  }, [planModules, claimsQuery.data, assessmentsQuery.data, drafts])

  const assessmentMutation = useMutation({
    mutationFn: ({ moduleId, draft }: { moduleId: string; draft: TargetDraft }) =>
      upsertAssessment({
        collaboratorId: selectedCollaborator!.id,
        moduleId,
        targetLevel: draft.targetLevel,
        comment: draft.comment,
      }),
    onSuccess: () => {
      enqueueSnackbar('Avaliação registrada!', { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['assessments', selectedCollaborator?.id] })
    },
    onError: () => {
      enqueueSnackbar('Não foi possível salvar a avaliação.', { variant: 'error' })
    },
  })

  const planForm = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      objectives: '',
      dueDate: '',
      notes: '',
      moduleIds: [],
    },
  })

  const createPlanMutation = useMutation({
    mutationFn: (values: PlanFormValues) =>
      createCareerPlan({
        collaboratorId: selectedCollaborator!.id,
        objectives: values.objectives,
        dueDate: toIsoDate(values.dueDate) ?? undefined,
        notes: values.notes,
        moduleIds: values.moduleIds,
      }),
    onSuccess: (plan) => {
      enqueueSnackbar(t('manager.planSuccess'), { variant: 'success' })
      planForm.reset({ objectives: '', dueDate: '', notes: '', moduleIds: [] })
      queryClient.invalidateQueries({ queryKey: ['career-plans', selectedCollaborator?.id] })
      setSelectedPlanId(plan.id)
    },
    onError: () => {
      enqueueSnackbar('Não foi possível salvar o plano.', { variant: 'error' })
    },
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: PlanFormValues }) =>
      updateCareerPlan(id, {
        objectives: values.objectives,
        dueDate: values.dueDate ? toIsoDate(values.dueDate) : null,
        notes: values.notes,
        moduleIds: values.moduleIds,
      }),
    onSuccess: (plan) => {
      enqueueSnackbar(t('manager.planUpdated'), { variant: 'success' })
      planForm.reset({ objectives: '', dueDate: '', notes: '', moduleIds: [] })
      setEditingPlanId(null)
      queryClient.invalidateQueries({ queryKey: ['career-plans', selectedCollaborator?.id] })
      setSelectedPlanId(plan?.id ?? null)
    },
    onError: () => {
      enqueueSnackbar('Não foi possível atualizar o plano.', { variant: 'error' })
    },
  })

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => removeCareerPlan(id),
    onSuccess: (_data, id) => {
      enqueueSnackbar(t('manager.planDeleted'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['career-plans', selectedCollaborator?.id] })
      if (selectedPlanId === id) {
        setSelectedPlanId(null)
      }
      if (editingPlanId === id) {
        setEditingPlanId(null)
        planForm.reset({ objectives: '', dueDate: '', notes: '', moduleIds: [] })
      }
    },
    onError: () => {
      enqueueSnackbar('Não foi possível remover o plano.', { variant: 'error' })
    },
  })

  const isPlanSubmitting = createPlanMutation.isPending || updatePlanMutation.isPending
  const isEditingPlan = Boolean(editingPlanId)

  const handlePlanSubmit = planForm.handleSubmit((values) => {
    if (editingPlanId) {
      updatePlanMutation.mutate({ id: editingPlanId, values })
    } else {
      createPlanMutation.mutate(values)
    }
  })

  const handleEditPlan = (plan: CareerPlan) => {
    setEditingPlanId(plan.id)
    setSelectedPlanId(plan.id)
    planForm.reset({
      objectives: plan.objectives,
      dueDate: plan.dueDate ? plan.dueDate.slice(0, 10) : '',
      notes: plan.notes ?? '',
      moduleIds: plan.modules?.map((entry) => entry.moduleId) ?? [],
    })
  }

  const handleDeletePlan = (plan: CareerPlan) => {
    setConfirmDialog({
      open: true,
      title: t('common.delete'),
      message: t('manager.deletePlanConfirm'),
      confirmLabel: t('common.delete'),
      onConfirm: () => deletePlanMutation.mutate(plan.id),
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4">{t('manager.title')}</Typography>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('manager.selectCollaborator')}
        </Typography>
        <Select
          value={selectedCollaborator?.id ?? ''}
          onChange={(event) => {
            const collaborator = collaboratorsQuery.data?.data.find(
              (item) => item.id === event.target.value,
            )
            setSelectedCollaborator(collaborator ?? null)
            setDrafts({})
          }}
          displayEmpty
          fullWidth
        >
          <MenuItem value="">
            <em>Selecione...</em>
          </MenuItem>
          {collaboratorsQuery.data?.data.map((collaborator) => (
            <MenuItem key={collaborator.id} value={collaborator.id}>
              {collaborator.fullName}
            </MenuItem>
          ))}
        </Select>
      </Paper>

      {selectedCollaborator && plansQuery.data && plansQuery.data.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('manager.selectPlan')}
          </Typography>
          <Select
            fullWidth
            value={selectedPlanId ?? ''}
            onChange={(event) => setSelectedPlanId(event.target.value)}
          >
            {plansQuery.data.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                {formatDate(plan.createdAt ?? '')} - {plan.objectives.slice(0, 40)}
              </MenuItem>
            ))}
          </Select>
        </Paper>
      )}

      {selectedCollaborator && plansQuery.data && plansQuery.data.length === 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">{t('manager.noPlansMessage')}</Typography>
        </Paper>
      )}

      {selectedCollaborator && selectedPlan && (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('modules.description')}</TableCell>
                <TableCell>{t('selfAssessment.title')}</TableCell>
                <TableCell>{t('manager.targetLevel')}</TableCell>
                <TableCell>{t('manager.comment')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>{t('manager.noPlanModules')}</TableCell>
                </TableRow>
              )}
              {rows.map(({ module, claim, draft }) => (
                <TableRow key={module.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{module.description}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {module.code}
                    </Typography>
                  </TableCell>
                  <TableCell>{claim ? skillLevelLabels[claim.currentLevel] : '-'}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={drafts[module.id]?.targetLevel ?? draft.targetLevel}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [module.id]: {
                            targetLevel: event.target.value as SkillLevel,
                            comment: prev[module.id]?.comment ?? draft.comment,
                          },
                        }))
                      }
                    >
                      {skillLevelOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={drafts[module.id]?.comment ?? draft.comment}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [module.id]: {
                            targetLevel: prev[module.id]?.targetLevel ?? draft.targetLevel,
                            comment: event.target.value,
                          },
                        }))
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <LoadingButton
                      size="small"
                      variant="contained"
                      onClick={() =>
                        assessmentMutation.mutate({
                          moduleId: module.id,
                          draft: drafts[module.id] ?? draft,
                        })
                      }
                      loading={assessmentMutation.isPending}
                    >
                      {t('manager.saveAssessment')}
                    </LoadingButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {selectedCollaborator && !selectedPlan && plansQuery.data && plansQuery.data.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">{t('manager.noPlanModules')}</Typography>
        </Paper>
      )}

      {selectedCollaborator && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('manager.plan')}
            </Typography>
            <Box
              component="form"
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}
              onSubmit={handlePlanSubmit}
            >
              <Controller
                name="objectives"
                control={planForm.control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label={t('manager.objectives')}
                    multiline
                    minRows={3}
                    error={fieldState.invalid}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                name="dueDate"
                control={planForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="date"
                    label={t('manager.dueDate')}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
              <Controller
                name="notes"
                control={planForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('collaborators.notes')}
                    multiline
                    minRows={2}
                  />
                )}
              />
              <Controller
                name="moduleIds"
                control={planForm.control}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    multiple
                    options={modulesQuery.data?.data ?? []}
                    getOptionLabel={(option) => `${option.description} (${option.code})`}
                    value={(modulesQuery.data?.data ?? []).filter((module) =>
                      field.value?.includes(module.id),
                    )}
                    onChange={(_event, selected) =>
                      field.onChange(selected.map((module) => module.id))
                    }
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option.id}
                          label={option.code}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t('manager.planModules')}
                        placeholder={t('manager.planModulesPlaceholder')}
                        error={fieldState.invalid}
                        helperText={fieldState.error?.message}
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                  />
                )}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={isPlanSubmitting}
                >
                  {isEditingPlan ? t('common.update') : t('common.save')}
                </LoadingButton>
                {isEditingPlan && (
                  <Button
                    onClick={() => {
                      setEditingPlanId(null)
                      planForm.reset({ objectives: '', dueDate: '', notes: '', moduleIds: [] })
                    }}
                    disabled={isPlanSubmitting}
                  >
                    {t('common.cancel')}
                  </Button>
                )}
              </Box>
            </Box>

            {plansQuery.data && plansQuery.data.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1">Histórico</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {plansQuery.data.map((plan) => (
                    <Paper key={plan.id} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                          {formatDate(plan.createdAt ?? '')}
                        </Typography>
                        <Box>
                          <Tooltip title={t('common.edit')}>
                            <span>
                              <IconButton onClick={() => handleEditPlan(plan)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={t('common.delete')}>
                            <span>
                              <IconButton onClick={() => handleDeletePlan(plan)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Typography>{plan.objectives}</Typography>
                      {plan.dueDate && (
                        <Typography color="text.secondary">
                          {t('manager.dueDate')}: {formatDate(plan.dueDate)}
                        </Typography>
                      )}
                      {plan.notes && (
                        <Typography color="text.secondary">{plan.notes}</Typography>
                      )}
                      {plan.modules && plan.modules.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {plan.modules.map((entry) => (
                            <Chip
                              key={entry.id}
                              label={`${entry.module?.code ?? ''} ${entry.module?.description ?? ''}`.trim()}
                              size="small"
                            />
                          ))}
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

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
          <LoadingButton
            variant="contained"
            color="error"
            loading={deletePlanMutation.isPending}
            onClick={() => {
              confirmDialog.onConfirm?.()
              setConfirmDialog((prev) => ({ ...prev, open: false }))
            }}
          >
            {confirmDialog.confirmLabel ?? t('common.confirm')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
