import { Component, inject, signal, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements AfterViewChecked {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = signal<string>('superadmin@growmart.com');
  password = signal<string>('superadmin123');
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);

  ngAfterViewChecked() {
    if ((window as any).lucide) {
      (window as any).lucide.createIcons();
    }
  }

  onSubmit() {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email(), this.password()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.user.role === 'SUPER_ADMIN') {
          this.router.navigate(['/super-admin']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid email or password');
      },
    });
  }
}
