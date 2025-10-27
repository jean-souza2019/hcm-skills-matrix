import LoadingButton from '@mui/lab/LoadingButton'
import {
  Box,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnackbar } from 'notistack'

import { listModules } from '@/api/modules'
import { listClaims, upsertClaim } from '@/api/skills'
import { listCareerPlans } from '@/api/assessments'
import type { ModuleRoutine, SkillLevel } from '@/types/domain'
import { skillLevelOptions } from '@/utils/skillLevel'
import { queryClient } from '@/lib/queryClient'
import { formatDate } from '@/utils/date'

interface DraftClaim {
  currentLevel: SkillLevel
  evidence: string
}

interface ModuleWithDraft extends ModuleRoutine {
  draft: DraftClaim
  claimId?: string
}

export function SelfAssessmentPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [drafts, setDrafts] = useState<Record<string, DraftClaim>>({})

  const modulesQuery = useQuery({
    queryKey: ['modules', { all: true }],
    queryFn: () => listModules({ perPage: 100 }),
  })

  const claimsQuery = useQuery({
    queryKey: ['skills', 'claims', 'me'],
    queryFn: () => listClaims({ me: true }),
  })

  const careerPlansQuery = useQuery({
    queryKey: ['career-plans', 'me'],
    queryFn: () => listCareerPlans(),
  })

  useEffect(() => {
    if (!claimsQuery.data) return
    const nextDrafts: Record<string, DraftClaim> = {}
    claimsQuery.data.forEach((claim) => {
      nextDrafts[claim.moduleId] = {
        currentLevel: claim.currentLevel,
        evidence: claim.evidence ?? '',
      }
    })
    setDrafts((prev) => ({ ...prev, ...nextDrafts }))
  }, [claimsQuery.data])

  const modulesWithDrafts: ModuleWithDraft[] = useMemo(() => {
    const modules = modulesQuery.data?.data ?? []
    return modules.map((module) => {
      const claim = claimsQuery.data?.find((item) => item.moduleId === module.id)
      const draft = drafts[module.id] ?? {
        currentLevel: 'NAO_ATENDE' as SkillLevel,
        evidence: '',
      }
      return {
        ...module,
        draft,
        claimId: claim?.id,
      }
    })
  }, [modulesQuery.data?.data, claimsQuery.data, drafts])

  const saveMutation = useMutation({
    mutationFn: async ({ moduleId, data }: { moduleId: string; data: DraftClaim }) => {
      return upsertClaim({
        moduleId,
        currentLevel: data.currentLevel,
        evidence: data.evidence,
      })
    },
    onSuccess: () => {
      enqueueSnackbar(t('selfAssessment.success'), { variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['skills', 'claims', 'me'] })
    },
    onError: () => {
      enqueueSnackbar('Erro ao salvar avaliação.', { variant: 'error' })
    },
  })

  const handleDraftChange = (
    moduleId: string,
    partial: Partial<DraftClaim>,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [moduleId]: {
        currentLevel: partial.currentLevel ?? prev[moduleId]?.currentLevel ?? 'NAO_ATENDE',
        evidence: partial.evidence ?? prev[moduleId]?.evidence ?? '',
      },
    }))
  }

  const latestPlan = careerPlansQuery.data?.[0]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h4" gutterBottom>
          {t('selfAssessment.title')}
        </Typography>
        <Typography color="text.secondary">{t('selfAssessment.intro')}</Typography>
      </Box>

      <Grid container spacing={3}>
        {modulesWithDrafts.map((module) => (
          <Grid item xs={12} md={6} key={module.id}>
            <Card>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="h6">{module.description}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {module.code}
                  </Typography>
                </Box>
                <Select
                  value={module.draft.currentLevel}
                  onChange={(event) =>
                    handleDraftChange(module.id, {
                      currentLevel: event.target.value as SkillLevel,
                    })
                  }
                  fullWidth
                >
                  {skillLevelOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <TextField
                  label={t('selfAssessment.evidence')}
                  multiline
                  minRows={3}
                  value={module.draft.evidence}
                  onChange={(event) =>
                    handleDraftChange(module.id, {
                      evidence: event.target.value,
                    })
                  }
                />
                <LoadingButton
                  variant="contained"
                  onClick={() => saveMutation.mutate({ moduleId: module.id, data: module.draft })}
                  loading={saveMutation.isPending}
                >
                  {t('selfAssessment.submit')}
                </LoadingButton>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {latestPlan && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('manager.plan')}
            </Typography>
            <Typography>{latestPlan.objectives}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {latestPlan.dueDate
                ? `${t('manager.dueDate')}: ${formatDate(latestPlan.dueDate)}`
                : undefined}
            </Typography>
            {latestPlan.notes && (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {latestPlan.notes}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
