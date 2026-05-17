export const CATEGORY_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
  { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
];

export function CategoryBadge({ name, colorIndex }: { name: string; colorIndex: number }) {
  const color = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
  return (
    <span
      style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border"
    >
      {name}
    </span>
  );
}
