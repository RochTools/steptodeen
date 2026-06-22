// ============ MOSQUE HELPER FUNCTIONS ============

export const validateMosqueId = (id: any): id is string => {
  return typeof id === 'string' && id.length > 0;
};

export const parseSavedMosques = (savedData: string | null): string[] => {
  if (!savedData) return [];
  try {
    const parsed = JSON.parse(savedData);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length === 0) return [];
    if (typeof parsed[0] === 'object' && parsed[0] !== null) {
      return parsed
        .filter((m: any) => m && validateMosqueId(m.id))
        .map((m: any) => m.id);
    }
    return parsed.filter(validateMosqueId);
  } catch {
    return [];
  }
};
