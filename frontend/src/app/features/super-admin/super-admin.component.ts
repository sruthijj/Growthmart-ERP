import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { Company } from '../../core/models/user.model';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin.component.html',
  styleUrls: ['./super-admin.component.css'],
})
export class SuperAdminComponent implements OnInit {
  private companyService = inject(CompanyService);

  companies = signal<Company[]>([]);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  // View state: 'list' | 'form'
  viewMode = signal<'list' | 'form'>('list');
  isEditing = signal<boolean>(false);

  // Form Fields
  id = signal<number | null>(null);
  name = signal<string>('');
  code = signal<string>('');
  gstNumber = signal<string>('');
  gstStateCode = signal<string>('');
  booksBeginDate = signal<string>('');
  address = signal<string>('');

  // Table selection
  selectedCompanyIds = signal<number[]>([]);
  isActionsDropdownOpen = signal<boolean>(false);

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.companyService.getCompanies().subscribe({
      next: (list) => {
        this.companies.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to load companies registry');
        this.isLoading.set(false);
      },
    });
  }

  toggleSelectAll(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedCompanyIds.set(this.companies().map((c) => c.id));
    } else {
      this.selectedCompanyIds.set([]);
    }
  }

  toggleSelectCompany(id: number, event: Event) {
    event.stopPropagation(); // Prevent row click edit trigger
    const current = this.selectedCompanyIds();
    if (current.includes(id)) {
      this.selectedCompanyIds.set(current.filter((cId) => cId !== id));
    } else {
      this.selectedCompanyIds.set([...current, id]);
    }
  }

  showCreateForm() {
    this.resetForm();
    this.isEditing.set(false);
    this.viewMode.set('form');
  }

  showEditForm(comp: Company) {
    this.id.set(comp.id);
    this.name.set(comp.name);
    this.code.set(comp.code);
    this.gstNumber.set(comp.gstNumber);
    this.gstStateCode.set(comp.gstStateCode);
    
    const dateObj = new Date(comp.booksBeginDate);
    const dateFormatted = dateObj.toISOString().split('T')[0];
    this.booksBeginDate.set(dateFormatted);
    
    this.address.set(comp.address);
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

    if (this.code().length !== 5) {
      this.errorMessage.set('Company Code must be exactly 5 characters');
      return;
    }

    const payload: Partial<Company> = {
      name: this.name(),
      code: this.code().toUpperCase(),
      gstNumber: this.gstNumber(),
      gstStateCode: this.gstStateCode(),
      booksBeginDate: this.booksBeginDate(),
      address: this.address(),
    };

    this.isLoading.set(true);

    if (this.isEditing() && this.id()) {
      this.companyService.updateCompany(this.id()!, payload).subscribe({
        next: (updated) => {
          this.successMessage.set(`Company "${updated.name}" updated successfully.`);
          this.resetForm();
          this.viewMode.set('list');
          this.loadCompanies();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Failed to update company');
          this.isLoading.set(false);
        },
      });
    } else {
      this.companyService.createCompany(payload).subscribe({
        next: (created) => {
          this.successMessage.set(`Company "${created.name}" created with default seeds.`);
          this.resetForm();
          this.viewMode.set('list');
          this.loadCompanies();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Failed to create company');
          this.isLoading.set(false);
        },
      });
    }
  }

  toggleActionsDropdown(event: Event) {
    event.stopPropagation();
    this.isActionsDropdownOpen.update((v) => !v);
  }

  deleteActiveCompany() {
    if (!this.id()) return;
    
    if (confirm(`Are you sure you want to delete company "${this.name()}"? This operation is permanent.`)) {
      this.companyService.deleteCompany(this.id()!).subscribe({
        next: () => {
          this.successMessage.set('Company deleted successfully');
          this.resetForm();
          this.viewMode.set('list');
          this.loadCompanies();
        },
        error: (err) => {
          this.errorMessage.set('Failed to delete company');
        },
      });
    }
  }

  resetForm() {
    this.id.set(null);
    this.name.set('');
    this.code.set('');
    this.gstNumber.set('');
    this.gstStateCode.set('');
    this.booksBeginDate.set('');
    this.address.set('');
    this.isActionsDropdownOpen.set(false);
  }
}
