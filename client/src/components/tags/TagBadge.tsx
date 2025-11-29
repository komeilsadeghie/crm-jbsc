interface TagBadgeProps {
  name: string;
  color?: string;
}

const TagBadge = ({ name, color }: TagBadgeProps) => (
  <span
    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full text-white"
    style={{ backgroundColor: color || '#0ea5e9' }}
  >
    {name}
  </span>
);

export default TagBadge;


