import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { User, Company, LoginResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:3000/api';

  currentUser = signal<User | null>(null);
  currentCompany = signal<Company | null>(null);
  token = signal<string | null>(null);

  constructor() {
    this.loadToken();
  }

  private loadToken() {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedCompany = localStorage.getItem('company');

    if (savedToken && savedUser) {
      this.token.set(savedToken);
      this.currentUser.set(JSON.parse(savedUser));
      if (savedCompany) {
        this.currentCompany.set(JSON.parse(savedCompany));
      }
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          this.token.set(res.access_token);
          this.currentUser.set(res.user);
          localStorage.setItem('token', res.access_token);
          localStorage.setItem('user', JSON.stringify(res.user));

          // Fetch company details if user is not Super Admin and belongs to a company
          if (res.user.companyId) {
            this.fetchAndSetCompany(res.user.companyId);
          } else {
            this.currentCompany.set(null);
            localStorage.removeItem('company');
          }
        }),
      );
  }

  logout() {
    this.token.set(null);
    this.currentUser.set(null);
    this.currentCompany.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('company');
    this.router.navigate(['/login']);
  }

  switchCompany(companyId: number | null): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/auth/switch-company`,
        { companyId },
        {
          headers: { Authorization: `Bearer ${this.token()}` },
        },
      )
      .pipe(
        tap((res) => {
          this.token.set(res.access_token);
          this.currentUser.set(res.user);
          localStorage.setItem('token', res.access_token);
          localStorage.setItem('user', JSON.stringify(res.user));

          if (companyId) {
            this.fetchAndSetCompany(companyId);
          } else {
            this.currentCompany.set(null);
            localStorage.removeItem('company');
          }
        }),
      );
  }

  private fetchAndSetCompany(companyId: number) {
    this.http
      .get<Company>(`${this.apiUrl}/company/${companyId}`, {
        headers: { Authorization: `Bearer ${this.token()}` },
      })
      .subscribe({
        next: (company) => {
          this.currentCompany.set(company);
          localStorage.setItem('company', JSON.stringify(company));
        },
        error: (err) => {
          console.error('Failed to load company details', err);
        },
      });
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }

  hasRole(roles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role);
  }
}
