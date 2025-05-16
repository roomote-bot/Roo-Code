// Format time for display - this is a client-side utility function
export function getFormattedTime(date: Date): string {
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60),
  );

  if (diffInHours < 24) {
    return diffInHours === 0
      ? 'Just now'
      : diffInHours === 1
        ? '1 hour ago'
        : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays < 7) {
    return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
  }

  return date.toLocaleDateString();
}
