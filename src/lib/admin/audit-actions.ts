/** Labels for audit log entries (shared by the log writer and the audit page). */
export const AUDIT_ACTIONS = {
  "student.suspend": "Suspended account",
  "student.restore": "Restored account",
  "student.signout": "Signed out of all devices",
  "student.delete": "Deleted account",
  "staff.create": "Added sub-admin",
  "staff.promote": "Made sub-admin",
  "staff.permissions": "Changed permissions",
  "staff.password": "Reset password",
  "staff.remove": "Removed staff access",
  "staff.suspend": "Suspended staff member",
  "staff.restore": "Restored staff member",
  "post.delete": "Removed doubt",
  "reply.delete": "Removed answer",
  "announcement.create": "Posted announcement",
  "announcement.hide": "Hid announcement",
  "announcement.show": "Re-published announcement",
  "announcement.delete": "Deleted announcement",
  "option.save": "Saved board / stream / exam",
  "option.delete": "Deleted board / stream / exam",
  "subject.save": "Saved subject",
  "subject.delete": "Deleted subject",
  "syllabus.save": "Saved chapter list",
  "syllabus.delete": "Deleted chapter list",
  "chapter.save": "Changed chapters",
  "course.create": "Created course",
  "course.update": "Updated course",
  "course.delete": "Deleted course",
  "course.subjects": "Changed course subjects",
  "question.save": "Saved question",
  "question.delete": "Deleted question",
  "question.import": "Imported questions",
  "question.generate": "Generated questions with AI",
  "question.approve": "Approved questions",
  "question.reject": "Rejected questions",
  "question.requeue": "Sent questions back to review",
  "question.check": "Double-checked answers with AI",
  "settings.save": "Changed settings",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export function auditLabel(action: string) {
  return AUDIT_ACTIONS[action as AuditAction] ?? action;
}
