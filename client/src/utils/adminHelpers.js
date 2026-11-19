// Show a date nicely, or a dash if there is none (used by the admin tables)
export const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

// Count warnings for each user, e.g. { userId: 2 }
export const countWarningsPerUser = (warnings) => {
  const counts = {};
  for (let i = 0; i < warnings.length; i++) {
    const w = warnings[i];
    if (!w.user) continue;
    if (!counts[w.user._id]) counts[w.user._id] = 0;
    counts[w.user._id] = counts[w.user._id] + 1;
  }
  return counts;
};
