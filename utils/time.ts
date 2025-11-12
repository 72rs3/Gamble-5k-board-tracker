export const ELIGIBILITY_HOURS = 72; // 3 days
export const INACTIVITY_DAYS = 3; // 3 days after becoming not eligible

export const formatTimeLeft = (expiryDate: string | null): string => {
  if (!expiryDate) return 'N/A';
  
  const now = new Date();
  const end = new Date(expiryDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let result = '';
  if (days > 0) result += `${days}d `;
  if (hours > 0) result += `${hours}h `;
  if (days === 0 && hours < 24) result += `${minutes}m`;

  return result.trim() + ' left';
};

export const formatLastPlayed = (lastPlayedDate: string | null): string => {
  if (!lastPlayedDate) return 'Never';
  const date = new Date(lastPlayedDate);
  return date.toLocaleString();
};

export const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 10) return "just now";
  
  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const intervalName in intervals) {
    const interval = intervals[intervalName];
    const count = Math.floor(seconds / interval);
    if (count > 0) {
      return `${count} ${intervalName}${count > 1 ? 's' : ''} ago`;
    }
  }

  return `${Math.floor(seconds)} seconds ago`;
};


export const getNotificationMessage = (player: import('./types').Player): string | null => {
  if (player.status !== 'Eligible' || !player.eligibilityExpiresAt) return null;

  const now = new Date();
  const expiry = new Date(player.eligibilityExpiresAt);
  const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours > 0 && diffHours <= 24) {
    return `Player ${player.name}'s eligibility ends in less than 24 hours.`;
  }
  return null;
};