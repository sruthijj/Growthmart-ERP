import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from './tenant-context.service';
import { Role } from '@prisma/client';

/**
 * ============================================================================
 * TenantInterceptor
 * ============================================================================
 * 
 * Design Patterns:
 *   - Interceptor / Filter Pattern: Intercepts request workflows to append custom 
 *     context scope wrappers.
 * 
 * SOLID Compliance:
 *   - Single Responsibility Principle (SRP): Responsible solely for fetching 
 *     JWT credentials from request contexts and binding them to the TenantContext.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private tenantContext: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const companyId = user?.companyId || null;
    const bypass = user?.role === Role.SUPER_ADMIN;

    // Execute the controller action within the bounds of the AsyncLocalStorage
    return new Observable((subscriber) => {
      this.tenantContext.run({ companyId, bypass }, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
