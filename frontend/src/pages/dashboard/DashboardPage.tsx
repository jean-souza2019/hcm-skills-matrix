import { Card, CardContent, Grid, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useTranslation } from 'react-i18next'

import { fetchKpis, fetchTrends } from '@/api/dashboard'
import type { KPIsResponse, SkillLevel } from '@/types/domain'
import { skillLevelLabels, skillLevelColors } from '@/utils/skillLevel'

const KPI_ITEMS: Array<{ key: keyof KPIsResponse; labelKey: string }> = [
  { key: 'totalCollaborators', labelKey: 'dashboard.kpis.collaborators' },
  { key: 'totalModules', labelKey: 'dashboard.kpis.modules' },
  { key: 'totalClaims', labelKey: 'dashboard.kpis.claims' },
  { key: 'totalAssessments', labelKey: 'dashboard.kpis.assessments' },
]

const COLORS = Object.values(skillLevelColors)

const fallbackLevel: SkillLevel = 'NAO_ATENDE'

function getLevelLabel(level?: SkillLevel | null) {
  const safeLevel: SkillLevel = level ?? fallbackLevel
  return skillLevelLabels[safeLevel as keyof typeof skillLevelLabels]
}

export function DashboardPage() {
  const { t } = useTranslation()

  const kpisQuery = useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: fetchKpis,
  })

  const trendsQuery = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: fetchTrends,
  })

  return (
    <Grid container spacing={3}>
      {KPI_ITEMS.map(({ key, labelKey }) => (
        <Grid item xs={12} sm={6} md={3} key={key as string}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                {t(labelKey)}
              </Typography>
              <Typography variant="h4">
                {kpisQuery.data ? kpisQuery.data[key] : '--'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              {t('dashboard.kpis.averageGap')}
            </Typography>
            <Typography variant="h4">
              {kpisQuery.data ? kpisQuery.data.averageGap.toFixed(2) : '--'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ height: 360 }}>
          <CardContent sx={{ height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.distribution')}
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  dataKey="count"
                  data={trendsQuery.data?.levelDistribution ?? []}
                  nameKey="level"
                  label={({ level }) => skillLevelLabels[level]}
                >
                  {(trendsQuery.data?.levelDistribution ?? []).map((entry, index) => (
                    <Cell key={entry.level} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => {
                    const payload = props?.payload as { level?: SkillLevel } | undefined
                    return [value, getLevelLabel(payload?.level)]
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ height: 360 }}>
          <CardContent sx={{ height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {t('dashboard.topGaps')}
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendsQuery.data?.topGaps ?? []}>
                <XAxis dataKey="moduleCode" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="gap" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
