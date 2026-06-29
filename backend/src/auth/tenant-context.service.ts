import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  companyId: number | null;
  bypass: boolean;
}

/**
 * ============================================================================
 * TenantContext
 * ============================================================================
 * 
 * Design Patterns:
 *   - Ambient Context Pattern: Uses Node's AsyncLocalStorage to store request-scoped 
 *     tenant states across asynchronous callback chains.
 * 
 * SOLID Compliance:
 *   - Single Responsibility Principle (SRP): Responsible solely for isolating, 
 *     storing, and retrieving the request's tenant parameters.
 */
@Injectable()
export class TenantContext {
  // Store is request-scoped and maintained across all async invocations
  private static readonly asyncLocalStorage = new AsyncLocalStorage<TenantStore>();

  /**
   * Run a callback within the context of a specific tenant.
   */
  run(store: TenantStore, callback: () => any) {
    return TenantContext.asyncLocalStorage.run(store, callback);
  }

  /**
   * Get the active scoped company ID. Returns null if global or unauthenticated.
   */
  getCompanyId(): number | null {
    const store = TenantContext.asyncLocalStorage.getStore();
    return store ? store.companyId : null;
  }

  /**
   * Check if multi-tenancy query filters should be bypassed (e.g. for Super Admin).
   */
  isBypassed(): boolean {
    const store = TenantContext.asyncLocalStorage.getStore();
    return store ? store.bypass : false;
  }
}
