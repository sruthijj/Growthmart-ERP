import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Seed default Super Admin if no users exist in the database
    const userCount = await this.prisma.user.count();
    if (userCount === 0) {
      const passwordHash = await this.hashPassword('superadmin123');
      await this.prisma.user.create({
        data: {
          name: 'System Super Admin',
          email: 'superadmin@growmart.com',
          passwordHash,
          role: Role.SUPER_ADMIN,
          backdateDays: 0,
        },
      });
      console.log('Seeded default Super Admin: superadmin@growmart.com / superadmin123');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async validateUser(email: string, pass: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'passwordHash'>) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async changeCompany(userId: number, companyId: number | null) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // If companyId is not null, verify user belongs to it (or is super admin)
    if (companyId !== null && user.role !== Role.SUPER_ADMIN) {
      if (user.companyId !== companyId) {
        throw new UnauthorizedException('You do not belong to this company');
      }
    }

    // Generate new token with updated companyId
    const updatedUser = { ...user, companyId };
    const { passwordHash, ...userResult } = updatedUser;
    return this.login(userResult);
  }
}
