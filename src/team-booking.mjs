const secretaryName = /\b(?:lisa|petra)\b/i;
const secretaryRole = /\b(?:secretary|receptionist|sekretär(?:in)?|sekretaer(?:in)?|rezeption(?:ist(?:in)?)?)\b/i;

// Existing team records predate the booking switch. Preserve normal booking for
// clinicians, while defaulting the known secretaries to non-bookable until an
// administrator explicitly chooses otherwise.
export function isTeamMemberBookable(profile) {
  if (typeof profile?.bookable === 'boolean') return profile.bookable;
  return !secretaryName.test(`${profile?.id || ''} ${profile?.title || ''}`)
    && !secretaryRole.test(profile?.role || '');
}
