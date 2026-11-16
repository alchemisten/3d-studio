export const AR_LANDING_PARAM = 'ar';

/** Hosts use this to derive `isLanding` from the page they were opened with. */
export const isArLanding = (search: string): boolean => new URLSearchParams(search).get(AR_LANDING_PARAM) === '1';
