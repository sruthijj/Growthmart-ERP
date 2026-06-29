export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  ACCOUNTANT = 'ACCOUNTANT',
  BILLING_STAFF = 'BILLING_STAFF'
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  companyId: number | null;
  backdateDays: number;
}

export interface Company {
  id: number;
  code: string;
  name: string;
  gstNumber: string;
  gstStateCode: string;
  booksBeginDate: string;
  address: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}
