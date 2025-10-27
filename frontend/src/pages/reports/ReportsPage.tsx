import DownloadIcon from '@mui/icons-material/Download'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import LoadingButton from '@mui/lab/LoadingButton'
import {
  Box,
  Grid,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnackbar } from 'notistack'

import { listCollaborators } from '@/api/collaborators'
import { listModules } from '@/api/modules'
import { getCoverageReport } from '@/api/reports'
import { listClaims } from '@/api/skills'
import { useAuthStore } from '@/store/auth'
import { skillLevelLabels } from '@/utils/skillLevel'

export function ReportsPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const user = useAuthStore((state) => state.user)
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState('')
  const [filters, setFilters] = useState({ activity: '', category: '' })
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const collaboratorsQuery = useQuery({
    queryKey: ['collaborators', { page: 1, perPage: 100 }],
    queryFn: () => listCollaborators({ page: 1, perPage: 100 }),
    enabled: user?.role === 'MASTER',
  })

  const modulesQuery = useQuery({
    queryKey: ['modules', { perPage: 200 }],
    queryFn: () => listModules({ perPage: 200 }),
  })

  const collaboratorClaimsQuery = useQuery({
    queryKey: ['skills', 'claims', 'me'],
    queryFn: () => listClaims({ me: true }),
    enabled: user?.role === 'COLABORADOR',
  })

  useEffect(() => {
    if (user?.role === 'COLABORADOR' && collaboratorClaimsQuery.data) {
      const firstClaim = collaboratorClaimsQuery.data[0]
      if (firstClaim) {
        setSelectedCollaboratorId(firstClaim.collaboratorId)
      }
    }
  }, [user?.role, collaboratorClaimsQuery.data])

  const moduleMap = useMemo(() => {
    const map = new Map<string, { category: string | null }>()
    modulesQuery.data?.data.forEach((module) => {
      map.set(module.id, { category: module.observation ?? null })
    })
    return map
  }, [modulesQuery.data?.data])

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    modulesQuery.data?.data.forEach((module) => {
      if (module.observation) {
        set.add(module.observation)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [modulesQuery.data?.data])

  const availableActivities = useMemo(() => {
    const set = new Set<string>()
    collaboratorsQuery.data?.data.forEach((collaborator) => {
      collaborator.activities?.forEach((activity) => {
        if (activity.trim()) {
          set.add(activity)
        }
      })
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [collaboratorsQuery.data?.data])

  const filteredCollaborators = useMemo(() => {
    if (user?.role !== 'MASTER') {
      return []
    }
    const list = collaboratorsQuery.data?.data ?? []
    if (!filters.activity) {
      return list
    }
    return list.filter((collaborator) =>
      collaborator.activities?.includes(filters.activity),
    )
  }, [collaboratorsQuery.data?.data, filters.activity, user?.role])

  useEffect(() => {
    if (user?.role !== 'MASTER' || !selectedCollaboratorId) {
      return
    }
    const stillExists = filteredCollaborators.some(
      (collaborator) => collaborator.id === selectedCollaboratorId,
    )
    if (!stillExists) {
      setSelectedCollaboratorId('')
    }
  }, [filteredCollaborators, selectedCollaboratorId, user?.role])

  const coverageQuery = useQuery({
    enabled: Boolean(selectedCollaboratorId),
    queryKey: ['reports', 'coverage', selectedCollaboratorId],
    queryFn: () => getCoverageReport({ collaboratorId: selectedCollaboratorId }),
  })

  const displayEntries = useMemo(() => {
    return (coverageQuery.data ?? [])
      .map((entry) => {
        const module = moduleMap.get(entry.moduleId)
        return {
          ...entry,
          moduleCategory: module?.category ?? null,
        }
      })
      .filter((entry) =>
        filters.category ? entry.moduleCategory === filters.category : true,
      )
      .sort((a, b) => a.moduleCode.localeCompare(b.moduleCode))
  }, [coverageQuery.data, moduleMap, filters.category])

  const collaboratorMissingId =
    user?.role === 'COLABORADOR' &&
    collaboratorClaimsQuery.isSuccess &&
    !selectedCollaboratorId

  const selectedCollaboratorName =
    displayEntries[0]?.collaboratorName ??
    (filteredCollaborators.find((item) => item.id === selectedCollaboratorId)?.fullName ?? '')

  const hasEntries = displayEntries.length > 0

  const handleDownloadCsv = async () => {
    if (!selectedCollaboratorId || !hasEntries) {
      enqueueSnackbar(t('reports.emptyExport'), { variant: 'info' })
      return
    }

    try {
      setIsDownloadingCsv(true)
      const header = [
        'colaborador',
        'module_code',
        'module_description',
        'category',
        'current_level',
        'target_level',
        'gap',
      ]

      const escapeCsv = (value: string | number | null | undefined) => {
        if (value === null || value === undefined) return '""'
        const sanitized = String(value).replace(/"/g, '""')
        return `"${sanitized}"`
      }

      const lines = displayEntries.map((entry) => [
        escapeCsv(entry.collaboratorName),
        escapeCsv(entry.moduleCode),
        escapeCsv(entry.moduleDescription),
        escapeCsv(entry.moduleCategory ?? ''),
        escapeCsv(entry.currentLevel ? skillLevelLabels[entry.currentLevel] : ''),
        escapeCsv(entry.targetLevel ? skillLevelLabels[entry.targetLevel] : ''),
        escapeCsv(entry.gap ?? ''),
      ])

      const csv = [header.map(escapeCsv).join(','), ...lines.map((line) => line.join(','))].join(
        '\n',
      )

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `coverage-${selectedCollaboratorId}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      enqueueSnackbar('Não foi possível exportar o CSV.', { variant: 'error' })
    } finally {
      setIsDownloadingCsv(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!selectedCollaboratorId || !hasEntries) {
      enqueueSnackbar(t('reports.emptyExport'), { variant: 'info' })
      return
    }

    try {
      setIsDownloadingPdf(true)
      const jsPdfConstructor = await ensureJsPdfLoaded()
      if (!jsPdfConstructor) {
        enqueueSnackbar('Exportação de PDF não suportada neste ambiente.', {
          variant: 'error',
        })
        return
      }

      const doc = new jsPdfConstructor()
      doc.setFontSize(16)
      doc.text(t('reports.title'), 14, 18)
      if (selectedCollaboratorName) {
        doc.setFontSize(12)
        doc.text(`${t('filters.collaborator')}: ${selectedCollaboratorName}`, 14, 28)
      }
      if (filters.category) {
        doc.setFontSize(12)
        doc.text(`${t('filters.category')}: ${filters.category}`, 14, 36)
      }

      ;(doc as any).autoTable({
        startY: filters.category ? 42 : selectedCollaboratorName ? 34 : 24,
        head: [
          [
            t('modules.code'),
            t('modules.description'),
            t('modules.category'),
            t('selfAssessment.title'),
            t('manager.targetLevel'),
            t('reports.gap'),
          ],
        ],
        body: displayEntries.map((entry) => [
          entry.moduleCode,
          entry.moduleDescription,
          entry.moduleCategory ?? '-',
          entry.currentLevel ? skillLevelLabels[entry.currentLevel] : '-',
          entry.targetLevel ? skillLevelLabels[entry.targetLevel] : '-',
          entry.gap ?? '-',
        ]),
      })

      doc.save(`coverage-${selectedCollaboratorId}.pdf`)
    } catch (error) {
      console.error(error)
      enqueueSnackbar('Não foi possível exportar o PDF.', { variant: 'error' })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Typography variant="h4">{t('reports.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <LoadingButton
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!selectedCollaboratorId || coverageQuery.isLoading || !hasEntries}
            onClick={handleDownloadCsv}
            loading={isDownloadingCsv}
          >
            {t('reports.exportCsv')}
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            disabled={!selectedCollaboratorId || coverageQuery.isLoading || !hasEntries}
            onClick={handleDownloadPdf}
            loading={isDownloadingPdf}
          >
            {t('reports.exportPdf')}
          </LoadingButton>
        </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {user?.role === 'MASTER' && (
            <>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('filters.activity')}
                </Typography>
                <Select
                  fullWidth
                  value={filters.activity}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, activity: event.target.value }))
                  }
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{t('filters.all')}</em>
                  </MenuItem>
                  {availableActivities.map((activity) => (
                    <MenuItem key={activity} value={activity}>
                      {activity}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} md={8}>
                <Typography variant="subtitle1" gutterBottom>
                  {t('filters.collaborator')}
                </Typography>
                <Select
                  fullWidth
                  value={selectedCollaboratorId}
                  onChange={(event) => setSelectedCollaboratorId(event.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{t('filters.select')}</em>
                  </MenuItem>
                  {filteredCollaborators.map((collaborator) => (
                    <MenuItem key={collaborator.id} value={collaborator.id}>
                      {collaborator.fullName}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
            </>
          )}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              {t('filters.category')}
            </Typography>
            <Select
              fullWidth
              value={filters.category}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, category: event.target.value }))
              }
              displayEmpty
            >
              <MenuItem value="">
                <em>{t('filters.all')}</em>
              </MenuItem>
              {availableCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>
      </Paper>

      {collaboratorMissingId ? (
        <Paper sx={{ p: 3 }}>
          <Typography color="text.secondary">
            {t('reports.coverage')} indisponível. Realize ao menos uma autoavaliação para gerar o relatório.
          </Typography>
        </Paper>
      ) : (
        <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('modules.code')}</TableCell>
              <TableCell>{t('modules.description')}</TableCell>
              <TableCell>{t('modules.category')}</TableCell>
              <TableCell>{t('selfAssessment.title')}</TableCell>
              <TableCell>{t('manager.targetLevel')}</TableCell>
              <TableCell>{t('reports.gap')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {coverageQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={6}>{t('common.loading')}</TableCell>
              </TableRow>
            )}
            {!coverageQuery.isLoading && !hasEntries && (
              <TableRow>
                <TableCell colSpan={6}>{t('common.noData')}</TableCell>
              </TableRow>
            )}
            {displayEntries.map((entry) => (
              <TableRow key={entry.moduleId} hover>
                <TableCell>{entry.moduleCode}</TableCell>
                <TableCell>{entry.moduleDescription}</TableCell>
                <TableCell>{entry.moduleCategory ?? '-'}</TableCell>
                <TableCell>
                  {entry.currentLevel ? skillLevelLabels[entry.currentLevel] : '-'}
                </TableCell>
                <TableCell>
                  {entry.targetLevel ? skillLevelLabels[entry.targetLevel] : '-'}
                </TableCell>
                <TableCell>{entry.gap ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      )}
    </Box>
  )
}

async function loadScript(src: string) {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${src}"]`)) {
    return new Promise<void>((resolve) => {
      const script = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement
      if (
        script &&
        (script.dataset.loaded === 'true' ||
          (script as any).readyState === 'complete' ||
          script.getAttribute('data-loaded') === 'true')
      ) {
        resolve()
      } else {
        script.addEventListener('load', () => resolve(), { once: true })
      }
    })
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.loaded = 'false'
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true'
        resolve()
      },
      { once: true },
    )
    script.addEventListener(
      'error',
      () => {
        reject(new Error(`Falha ao carregar o script ${src}`))
      },
      { once: true },
    )
    document.body.appendChild(script)
  })
}

async function ensureJsPdfLoaded() {
  if (typeof window === 'undefined') return null
  const globalScope = window as typeof window & {
    jspdf?: {
      jsPDF?: new (...args: any[]) => any
    }
  }

  if (!globalScope.jspdf?.jsPDF) {
    await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
  }

  if (!globalScope.jspdf?.jsPDF) {
    return null
  }

  if (typeof (globalScope.jspdf.jsPDF as any).API?.autoTable !== 'function') {
    await loadScript(
      'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.1/dist/jspdf.plugin.autotable.min.js',
    )
  }

  return globalScope.jspdf.jsPDF
}
