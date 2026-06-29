import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../auth/tenant-context.service';

/**
 * ============================================================================
 * PrismaService
 * ============================================================================
 * 
 * Design Patterns:
 *   - Service/Repository Pattern: Handles direct queries to the DB engine.
 *   - Middleware/Interceptor Pattern: Hooks into database operations to append filters.
 * 
 * SOLID Compliance:
 *   - Single Responsibility Principle (SRP): Responsible solely for managing the 
 *     database connection lifecycle and enforcing query isolation.
 *   - Liskov Substitution Principle (LSP): Extends PrismaClient and can be 
 *     substituted anywhere PrismaClient is expected without breaking functionality.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private tenantContext: TenantContext) {
    super();

    // Register multi-tenancy middleware
    // This intercepts every database call and injects the request-scoped companyId
    this.$use(async (params, next) => {
      const modelsToIsolate = [
        'User',
        'AuditLog',
        'AccountingGroup',
        'Ledger',
        'Voucher',
        'LedgerEntry',
        'Unit',
        'GSTRate',
        'InventoryGroup',
        'InventoryItem',
        'StockLot',
      ];

      if (params.model && modelsToIsolate.includes(params.model)) {
        const companyId = this.tenantContext.getCompanyId();
        const bypass = this.tenantContext.isBypassed();

        if (companyId !== null && !bypass) {
          // Injection for read/query actions (findFirst, findMany, etc.)
          if (
            [
              'findFirst',
              'findMany',
              'findUnique',
              'count',
              'aggregate',
              'groupBy',
            ].includes(params.action)
          ) {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            params.args.where.companyId = companyId;
          }
          // Injection for update and delete actions
          else if (
            ['update', 'updateMany', 'delete', 'deleteMany'].includes(
              params.action,
            )
          ) {
            params.args = params.args || {};
            params.args.where = params.args.where || {};
            params.args.where.companyId = companyId;
          }
          // Injection for creation actions (create, createMany)
          else if (params.action === 'create') {
            params.args = params.args || {};
            params.args.data = params.args.data || {};
            params.args.data.companyId = companyId;
          } else if (params.action === 'createMany') {
            params.args = params.args || {};
            if (Array.isArray(params.args.data)) {
              params.args.data = params.args.data.map((item) => ({
                ...item,
                companyId,
              }));
            } else {
              params.args.data = params.args.data || {};
              params.args.data.companyId = companyId;
            }
          }
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
