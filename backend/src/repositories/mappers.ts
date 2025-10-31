const toIsoString = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith('Z') || trimmed.includes('+')) {
    return new Date(trimmed).toISOString();
  }

  const candidate = trimmed.includes('T')
    ? `${trimmed}Z`
    : `${trimmed.replace(' ', 'T')}Z`;

  const date = new Date(candidate);

  if (Number.isNaN(date.getTime())) {
    return new Date(trimmed).toISOString();
  }

  return date.toISOString();
};

export const mapDate = (value: string): string => {
  return toIsoString(value) ?? new Date().toISOString();
};

export const mapNullableDate = (value: string | null): string | null => {
  return toIsoString(value);
};

export const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    return value === '1' || value.toLowerCase() === 'true';
  }

  return false;
};

export const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim());
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim());
      }
    } catch {
      return [];
    }
  }

  return [];
};

export const stringifyJson = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return JSON.stringify(value);
};
