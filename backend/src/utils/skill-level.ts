import { SkillLevel } from '../domain/enums';

export const skillLevelOrder: SkillLevel[] = [
  SkillLevel.NAO_ATENDE,
  SkillLevel.ATENDE,
  SkillLevel.IMPLANTA_SOZINHO,
  SkillLevel.ESPECIALISTA,
];

export const skillLevelScore: Record<SkillLevel, number> = {
  [SkillLevel.NAO_ATENDE]: 0,
  [SkillLevel.ATENDE]: 1,
  [SkillLevel.IMPLANTA_SOZINHO]: 2,
  [SkillLevel.ESPECIALISTA]: 3,
};
