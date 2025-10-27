import LoadingButton from '@mui/lab/LoadingButton'
import {
  Box,
  Card,
  CardContent,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
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
  upsertAssessment,
} from '@/api/assessments'
import type { CollaboratorProfile, SkillLevel } from '@/types/domain'
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
})

type PlanFormValues = z.infer<typeof planSchema>

export function ManagerReviewPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedCollaborator, setSelectedCollaborator] = useState<CollaboratorProfile | null>(null)
  const [drafts, setDrafts] = useState<Record<string, TargetDraft>>({})

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

  const rows = useMemo(() => {
    if (!modulesQuery.data?.data) return []
    return modulesQuery.data.data.map((module) => {
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
  }, [modulesQuery.data?.data, claimsQuery.data, assessmentsQuery.data, drafts])

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
    },
  })

  const careerPlanMutation = useMutation({
    mutationFn: (values: PlanFormValues) =>
      createCareerPlan({
        collaboratorId: selectedCollaborator!.id,
        objectives: values.objectives,
        dueDate: toIsoDate(values.dueDate) ?? undefined,
        notes: values.notes,
      }),
    onSuccess: () => {
      enqueueSnackbar(t('manager.planSuccess'), { variant: 'success' })
      planForm.reset({ objectives: '', dueDate: '', notes: '' })
      queryClient.invalidateQueries({ queryKey: ['career-plans', selectedCollaborator?.id] })
    },
    onError: () => {
      enqueueSnackbar('Não foi possível salvar o plano.', { variant: 'error' })
    },
  })

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

      {selectedCollaborator && (
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

      {selectedCollaborator && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('manager.plan')}
            </Typography>
            <Box
              component="form"
              sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}
              onSubmit={planForm.handleSubmit((values) => careerPlanMutation.mutate(values))}
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
              <LoadingButton type="submit" variant="contained" loading={careerPlanMutation.isPending}>
                {t('common.save')}
              </LoadingButton>
            </Box>

            {plansQuery.data && plansQuery.data.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1">Histórico</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {plansQuery.data.map((plan) => (
                    <Paper key={plan.id} sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {formatDate(plan.createdAt ?? '')}
                      </Typography>
                      <Typography>{plan.objectives}</Typography>
                      {plan.dueDate && (
                        <Typography color="text.secondary">
                          {t('manager.dueDate')}: {formatDate(plan.dueDate)}
                        </Typography>
                      )}
                      {plan.notes && (
                        <Typography color="text.secondary">{plan.notes}</Typography>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
