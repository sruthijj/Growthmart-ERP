import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: number,
    companyId: number | null,
    action: AuditAction,
    entity: string,
    entityId: number,
    oldValue?: any,
    newValue?: any,
  ) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          companyId,
          userId,
          action,
          entity,
          entityId,
          oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
          newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
