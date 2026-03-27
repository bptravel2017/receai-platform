type RoleBadgeProps = {
  role: string;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return <span className="role-badge">{role}</span>;
}
