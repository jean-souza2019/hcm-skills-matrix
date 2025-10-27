import { skillLevels } from '@/types/domain'

export const skillLevelLabels: Record<string, string> = {
  NAO_ATENDE: 'Não atende',
  ATENDE: 'Atende',
  IMPLANTA_SOZINHO: 'Implanta sozinho',
  ESPECIALISTA: 'Especialista',
}

export const skillLevelColors: Record<string, string> = {
  NAO_ATENDE: '#f87171',
  ATENDE: '#f97316',
  IMPLANTA_SOZINHO: '#38bdf8',
  ESPECIALISTA: '#22c55e',
}

export const skillLevelOptions = skillLevels.map((value) => ({
  value,
  label: skillLevelLabels[value],
}))
