// Formatting and thresholds for the storage panel.

const UNITS = ["B", "KB", "MB", "GB", "TB"];

// "512 B", "1,5 KB", "4,3 MB", "60 GB": binary multiples, one decimal below
// 10 (dropped when it is 0), none above.
export function formatBytes(bytes) {
  let value = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const number = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
  }).format(value);
  return `${number} ${UNITS[unit]}`;
}

function hasQuota(quota) {
  return Number.isFinite(quota) && quota > 0;
}

// Share of the quota in use, 0–100, or null when the quota is unknown.
export function usagePercent(usage, quota) {
  if (!hasQuota(quota)) return null;
  return Math.round(((Number(usage) || 0) / quota) * 100);
}

export const NEAR_QUOTA_RATIO = 0.8;

export function isNearQuota(usage, quota) {
  if (!hasQuota(quota)) return false;
  return (Number(usage) || 0) / quota > NEAR_QUOTA_RATIO;
}
