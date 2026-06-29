import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { UserMgmtService } from '../../core/services/user-mgmt.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container">
      <!-- Breadcrumb Action Row -->
      <div class="breadcrumb-action-bar page-card">
        <div class="breadcrumb-chain">
          <span class="active-segment">Dashboard</span>
        </div>
        <div class="action-buttons">
          <div class="date-selector">
            This Month <i data-lucide="chevron-down" style="width: 12px; height: 12px; margin-left: 2px;"></i>
          </div>
        </div>
      </div>

      <!-- Stat Cards Grid -->
      <div class="stats-row">
        <!-- Card 1: Companies (Super Admin Only) -->
        @if (authService.currentUser()?.role === 'SUPER_ADMIN') {
          <div class="stat-card page-card">
            <div class="card-metric-label">Total Companies</div>
            <div class="card-metric-value">{{ companyCount() }}</div>
            <div class="card-trend text-success">
              <i data-lucide="arrow-up-right" class="trend-icon"></i> 100% active
            </div>
            <i data-lucide="building-2" class="card-icon"></i>
          </div>
        } @else {
          <div class="stat-card page-card">
            <div class="card-metric-label">Active Company Scope</div>
            <div class="card-metric-value" style="font-size: 18px; margin-top: 10px; line-height: 1.2;">
              {{ authService.currentCompany()?.name || 'All Scopes' }}
            </div>
            <div class="card-trend">
              Code: {{ authService.currentCompany()?.code || 'GLB' }}
            </div>
            <i data-lucide="building-2" class="card-icon"></i>
          </div>
        }

        <!-- Card 2: Users -->
        <div class="stat-card page-card">
          <div class="card-metric-label">Total Users</div>
          <div class="card-metric-value">{{ userCount() }}</div>
          <div class="card-trend text-success">
            <i data-lucide="arrow-up-right" class="trend-icon"></i> Active team size
          </div>
          <i data-lucide="users" class="card-icon"></i>
        </div>

        <!-- Card 3: Active Sessions -->
        <div class="stat-card page-card">
          <div class="card-metric-label">Active Sessions</div>
          <div class="card-metric-value">—</div>
          <div class="card-trend text-muted">Placeholder</div>
          <i data-lucide="activity" class="card-icon"></i>
        </div>

        <!-- Card 4: System Health -->
        <div class="stat-card page-card">
          <div class="card-metric-label">System Health</div>
          <div class="card-metric-value text-success" style="font-family: var(--font-primary);">OK</div>
          <div class="card-trend text-success">All services operational</div>
          <i data-lucide="heart-pulse" class="card-icon"></i>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions-row">
        @if (authService.currentUser()?.role === 'SUPER_ADMIN') {
          <a routerLink="/super-admin" class="btn btn-secondary">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i> New Company
          </a>
        }
        @if (authService.currentUser()?.role === 'SUPER_ADMIN' || authService.currentUser()?.role === 'ADMIN') {
          <a routerLink="/user-mgmt" class="btn btn-secondary">
            <i data-lucide="plus" style="width: 14px; height: 14px;"></i> New User
          </a>
        }
        <button class="btn btn-secondary" disabled>
          <i data-lucide="file-spreadsheet" style="width: 14px; height: 14px;"></i> View Reports
        </button>
      </div>

      <!-- Recent Activity Section -->
      <div class="activity-section page-card">
        <div class="section-header">
          <h3>Recent Operations Activity</h3>
        </div>
        <div class="activity-list">
          <div class="activity-row">
            <i data-lucide="check-circle" class="activity-icon text-success"></i>
            <span class="activity-text">Database schema baseline migrated successfully</span>
            <span class="activity-time">Just now</span>
          </div>
          <div class="activity-row">
            <i data-lucide="plus-circle" class="activity-icon text-info"></i>
            <span class="activity-text">Default System Super Admin credentials initialized</span>
            <span class="activity-time">1 hour ago</span>
          </div>
          <div class="activity-row">
            <i data-lucide="info" class="activity-icon text-muted"></i>
            <span class="activity-text">Application multi-tenant context bound to server request loop</span>
            <span class="activity-time">2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Action bar */
    .breadcrumb-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding: 0 15px;
    }

    .breadcrumb-chain {
      font-size: var(--text-base);
      font-weight: 500;
      color: var(--text-primary);
    }

    .date-selector {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
    }

    /* Stats layout */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .stat-card {
      padding: 20px;
      position: relative;
    }

    .card-metric-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary);
      letter-spacing: 0.05em;
    }

    .card-metric-value {
      font-family: var(--font-primary);
      font-size: 28px;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 5px;
    }

    .card-trend {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .trend-icon {
      width: 12px;
      height: 12px;
    }

    .card-icon {
      position: absolute;
      top: 20px;
      right: 20px;
      color: var(--text-muted);
      width: 16px;
      height: 16px;
    }

    /* Actions row */
    .quick-actions-row {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Activity table styling */
    .activity-section {
      padding: 20px;
    }

    .section-header h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 15px;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 8px;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
    }

    .activity-row {
      display: flex;
      align-items: center;
      height: 40px;
      border-bottom: 1px solid var(--border-light);
      font-size: var(--text-sm);
      gap: 12px;
    }

    .activity-row:last-child {
      border-bottom: none;
    }

    .activity-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .activity-text {
      flex: 1;
      color: var(--text-primary);
    }

    .activity-time {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Utility text colors */
    .text-success { color: var(--color-success); }
    .text-info { color: var(--color-info); }
    .text-muted { color: var(--text-muted); }
  `]
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private companyService = inject(CompanyService);
  private userMgmtService = inject(UserMgmtService);

  companyCount = signal<number>(0);
  userCount = signal<number>(0);

  ngOnInit() {
    // Fetch metrics
    if (this.authService.currentUser()?.role === 'SUPER_ADMIN') {
      this.companyService.getCompanies().subscribe({
        next: (list) => this.companyCount.set(list.length),
        error: (err) => console.error(err),
      });
    }

    const activeCompanyId = this.authService.currentUser()?.companyId;
    this.userMgmtService.getUsers(activeCompanyId || undefined).subscribe({
      next: (list) => this.userCount.set(list.length),
      error: (err) => console.error(err),
    });
  }
}
