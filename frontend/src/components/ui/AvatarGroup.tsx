interface AvatarPerson {
  name: string;
  image?: string;
}

interface AvatarGroupProps {
  people: AvatarPerson[];
  max?: number;
}

/** مجموعة صور متراكبة — عقد AssigneeAvatar/AvatarGroup. */
export default function AvatarGroup({ people, max = 4 }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="zad-avatar-group" role="list" aria-label="المسند إليهم">
      {rest > 0 && (
        <span className="zad-avatar zad-avatar--more" role="listitem" aria-label={`و${rest} آخرون`}>
          +{rest}
        </span>
      )}
      {[...shown].reverse().map((p) => (
        <span
          key={p.name}
          className="zad-avatar"
          role="listitem"
          title={p.name}
          aria-label={p.name}
          style={p.image ? { backgroundImage: `url(${p.image})`, backgroundSize: "cover" } : undefined}
        >
          {!p.image && p.name.trim().charAt(0)}
        </span>
      ))}
    </div>
  );
}
