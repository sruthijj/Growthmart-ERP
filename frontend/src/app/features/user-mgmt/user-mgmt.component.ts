import { Component, inject, signal, OnInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserMgmtService } from '../../core/services/user-mgmt.service';
import { AuthService } from '../../core/services/auth.service';
import { User, Role } from '../../core/models/user.model';

@Component({
  selector: 'app-user-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-mgmt.component.html',
  styleUrls: ['./user-mgmt.component.css'],
})
export class UserMgmtComponent implements OnInit, AfterViewChecked {
  private userMgmtService = inject(UserMgmtService);
  authService = inject(AuthService);

  users = signal<User[]>([]);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  // View toggling: 'list' | 'form'
  viewMode = signal<'list' | 'form'>('list');
  isEditing = signal<boolean>(false);

  // Form Fields
  id = signal<number | null>(null);
  name = signal<string>('');
  email = signal<string>('');
  password = signal<string>('');
  role = signal<Role>(Role.ACCOUNTANT);
  backdateDays = signal<number>(0);

  // Row selections
  selectedUserIds = signal<number[]>([]);
  isActionsDropdownOpen = signal<boolean>(false);

  rolesList = [
    { value: Role.ADMIN, label: 'Admin (Full Config & User CRUD)' },
    { value: Role.ACCOUNTANT, label: 'Accountant (Vouchers, Ledger Control)' },
    { value: Role.BILLING_STAFF, label: 'Billing Staff (Billing Operations)' },
  ];

  ngOnInit() {
    this.loadUsers();
  }

  ngAfterViewChecked() {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }

  loadUsers() {
    this.isLoading.set(true);
    const activeCompId = this.authService.currentUser()?.companyId;
    this.userMgmtService.getUsers(activeCompId || undefined).subscribe({
      next: (list) => {
        this.users.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to load company users');
        this.isLoading.set(false);
      },
    });
  }

  toggleSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedUserIds.set(this.users().map((u) => u.id));
    } else {
      this.selectedUserIds.set([]);
    }
  }

  toggleSelectUser(id: number, event: Event) {
    event.stopPropagation();
    const current = this.selectedUserIds();
    if (current.includes(id)) {
      this.selectedUserIds.set(current.filter((cId) => cId !== id));
    } else {
      this.selectedUserIds.set([...current, id]);
    }
  }

  showCreateForm() {
    this.resetForm();
    this.isEditing.set(false);
    this.viewMode.set('form');
  }

  showEditForm(usr: User) {
    this.id.set(usr.id);
    this.name.set(usr.name);
    this.email.set(usr.email);
    this.role.set(usr.role);
    this.backdateDays.set(usr.backdateDays);
    this.password.set('');
    this.isEditing.set(true);
    this.viewMode.set('form');
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  discardChanges() {
    this.resetForm();
    this.viewMode.set('list');
  }

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload: any = {
      name: this.name(),
      email: this.email(),
      role: this.role(),
      backdateDays: this.backdateDays(),
    };

    if (this.password()) {
      payload.password = this.password();
    }

    this.isLoading.set(true);

    if (this.isEditing() && this.id()) {
      this.userMgmtService.updateUser(this.id()!, payload).subscribe({
        next: (updated) => {
          this.successMessage.set(`User "${updated.name}" updated successfully.`);
          this.resetForm();
          this.viewMode.set('list');
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Failed to update user');
          this.isLoading.set(false);
        },
      });
    } else {
      if (!this.password()) {
        this.errorMessage.set('Password is required for new users');
        this.isLoading.set(false);
        return;
      }
      this.userMgmtService.createUser(payload).subscribe({
        next: (created) => {
          this.successMessage.set(`User "${created.name}" created successfully.`);
          this.resetForm();
          this.viewMode.set('list');
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Failed to create user');
          this.isLoading.set(false);
        },
      });
    }
  }

  toggleActionsDropdown(event: Event) {
    event.stopPropagation();
    this.isActionsDropdownOpen.update((v) => !v);
  }

  deleteActiveUser() {
    if (!this.id()) return;
    
    if (this.id() === this.authService.currentUser()?.id) {
      alert('You cannot delete your active session user profile.');
      return;
    }

    if (confirm(`Are you sure you want to delete user "${this.name()}"?`)) {
      this.userMgmtService.deleteUser(this.id()!).subscribe({
        next: () => {
          this.successMessage.set('User deleted successfully');
          this.resetForm();
          this.viewMode.set('list');
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage.set('Failed to delete user');
        },
      });
    }
  }

  resetForm() {
    this.id.set(null);
    this.name.set('');
    this.email.set('');
    this.password.set('');
    this.role.set(Role.ACCOUNTANT);
    this.backdateDays.set(0);
    this.isActionsDropdownOpen.set(false);
  }
}
