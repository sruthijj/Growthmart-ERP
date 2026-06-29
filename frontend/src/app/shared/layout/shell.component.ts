import { Component, inject, signal, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { ThemeService } from '../../core/services/theme.service';
import { Company } from '../../core/models/user.model';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
})
export class ShellComponent implements OnInit, AfterViewChecked {
  authService = inject(AuthService);
  private companyService = inject(CompanyService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  companies = signal<Company[]>([]);
  isSidebarExpanded = signal<boolean>(true);
  isUserMenuOpen = signal<boolean>(false);

  ngOnInit() {
    if (this.authService.currentUser()?.role === 'SUPER_ADMIN') {
      this.companyService.getCompanies().subscribe({
        next: (list) => {
          this.companies.set(list);
        },
        error: (err) => console.error('Failed to load companies list', err),
      });
    }
  }

  ngAfterViewChecked() {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }

  onCompanyChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    const companyId = value === 'all' ? null : parseInt(value, 10);
    
    this.authService.switchCompany(companyId).subscribe({
      next: () => {
        const currentUrl = this.router.url;
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate([currentUrl]);
        });
      },
      error: (err) => console.error('Failed to switch company context', err),
    });
  }

  toggleSidebar() {
    this.isSidebarExpanded.update((val) => !val);
  }

  toggleUserMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isUserMenuOpen.update((val) => !val);
  }

  logout() {
    this.authService.logout();
  }

  // Close menus if clicked outside
  closeMenus() {
    this.isUserMenuOpen.set(false);
  }
}
