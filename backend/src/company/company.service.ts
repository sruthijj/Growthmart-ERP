import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { Role, AuditAction, ReportingHead, NormalBalance } from '@prisma/client';

@Injectable()
export class CompanyService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  async create(userId: number, dto: any) {
    const existing = await this.prisma.company.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Company code already exists');
    }

    // Run creation and seeding inside a transaction to maintain integrity
    const company = await this.prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          code: dto.code,
          name: dto.name,
          gstNumber: dto.gstNumber,
          gstStateCode: dto.gstStateCode,
          booksBeginDate: new Date(dto.booksBeginDate),
          address: dto.address,
        },
      });

      // 1. Seed default 4 Accounting Groups (I/E/A/L)
      const groupsData = [
        { name: 'Income', code: 'I', reportingHead: ReportingHead.PL, normalBalance: NormalBalance.CR },
        { name: 'Expense', code: 'E', reportingHead: ReportingHead.PL, normalBalance: NormalBalance.DR },
        { name: 'Asset', code: 'A', reportingHead: ReportingHead.BS, normalBalance: NormalBalance.DR },
        { name: 'Liability', code: 'L', reportingHead: ReportingHead.BS, normalBalance: NormalBalance.CR },
      ];

      const groups: Record<string, any> = {};
      for (const group of groupsData) {
        const createdGroup = await tx.accountingGroup.create({
          data: {
            companyId: newCompany.id,
            name: group.name,
            code: group.code,
            reportingHead: group.reportingHead,
            normalBalance: group.normalBalance,
            isSystem: true,
          },
        });
        groups[group.code] = createdGroup;
      }

      // 2. Seed 15 predefined system ledgers
      const ledgersData = [
        { name: 'Purchase', code: 'E1', groupCode: 'E', openingBalance: 0 },
        { name: 'Discount Allowed', code: 'E2', groupCode: 'E', openingBalance: 0 },
        { name: 'Sales-Shop', code: 'I1', groupCode: 'I', openingBalance: 0 },
        { name: 'Discount Received', code: 'I2', groupCode: 'I', openingBalance: 0 },
        { name: 'Cash', code: 'A1', groupCode: 'A', openingBalance: 0 },
        { name: 'GPay', code: 'A2', groupCode: 'A', openingBalance: 0 },
        { name: 'Bank Account', code: 'A3', groupCode: 'A', openingBalance: 0 },
        { name: 'PhonePe', code: 'A4', groupCode: 'A', openingBalance: 0 },
        { name: 'Paytm', code: 'A5', groupCode: 'A', openingBalance: 0 },
        { name: 'Card', code: 'A6', groupCode: 'A', openingBalance: 0 },
        { name: 'Stock A/c', code: 'A7', groupCode: 'A', openingBalance: 0 },
        { name: 'CGST', code: 'L1', groupCode: 'L', openingBalance: 0 },
        { name: 'SGST', code: 'L2', groupCode: 'L', openingBalance: 0 },
        { name: 'IGST', code: 'L3', groupCode: 'L', openingBalance: 0 },
        { name: 'Profit & Loss A/c', code: 'L4', groupCode: 'L', openingBalance: 0 },
      ];

      for (const ledger of ledgersData) {
        const parentGroup = groups[ledger.groupCode];
        await tx.ledger.create({
          data: {
            companyId: newCompany.id,
            name: ledger.name,
            code: ledger.code,
            groupId: parentGroup.id,
            openingBalance: ledger.openingBalance,
            isSystem: true,
          },
        });
      }

      // 3. Seed default "Primary" Inventory Group
      await tx.inventoryGroup.create({
        data: {
          companyId: newCompany.id,
          name: 'Primary',
          isSystem: true,
        },
      });

      return newCompany;
    });

    // Write audit log
    await this.auditLog.log(
      userId,
      null, // Company log at root level
      AuditAction.CREATE,
      'Company',
      company.id,
      null,
      company,
    );

    return company;
  }

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async update(userId: number, id: number, dto: any) {
    const oldVal = await this.findOne(id);

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        gstNumber: dto.gstNumber,
        gstStateCode: dto.gstStateCode,
        booksBeginDate: dto.booksBeginDate ? new Date(dto.booksBeginDate) : undefined,
        address: dto.address,
      },
    });

    await this.auditLog.log(
      userId,
      null,
      AuditAction.UPDATE,
      'Company',
      id,
      oldVal,
      updated,
    );

    return updated;
  }

  async remove(userId: number, id: number) {
    const oldVal = await this.findOne(id);
    await this.prisma.company.delete({
      where: { id },
    });

    await this.auditLog.log(
      userId,
      null,
      AuditAction.DELETE,
      'Company',
      id,
      oldVal,
      null,
    );

    return { success: true };
  }
}
