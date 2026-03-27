export function warnDeprecatedGroupNameUsage(args: {
  module: string;
  recordId: string;
  groupName: string | null;
  groupId: string | null;
}) {
  if (!args.groupName || args.groupId) {
    return;
  }

  console.warn(
    `[groups] Deprecated group_name fallback detected in ${args.module} for record ${args.recordId}. group_id is missing and group_name must not be used for logic.`,
  );
}
