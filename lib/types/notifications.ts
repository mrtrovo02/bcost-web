/**
 * bCost Engine - Notification Domain Types
 * Compatível com Prisma Schema v1.0.0
 */
export enum NotificationSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum NotificationType {
  TAX_READY = 'TAX_READY',
  FACTOR_R_ALERT = 'FACTOR_R_ALERT',
  COMPLIANCE_ISSUE = 'COMPLIANCE_ISSUE',
  CERT_EXPIRATION = 'CERT_EXPIRATION',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
