import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { Role, AuditAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async create(creator: { id: number; companyId: number | null; role: Role }, dto: any) {
    // 1. Resolve company context
    let targetCompanyId: number | null = null;
    if (creator.role === Role.SUPER_ADMIN) {
      targetCompanyId = dto.companyId ? parseInt(dto.companyId, 10) : null;
    } else {
      targetCompanyId = creator.companyId;
    }

    if (creator.role !== Role.SUPER_ADMIN && !targetCompanyId) {
      throw new ForbiddenException('Admins must be associated with a company to create users');
    }

    // 2. Prevent non-super-admins from creating a Super Admin user
    if (dto.role === Role.SUPER_ADMIN && creator.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can create other Super Admins');
    }

    // 3. Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await this.hashPassword(dto.password || 'password123');

    const newUser = await this.prisma.user.create({
      data: {
        companyId: targetCompanyId,
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
        backdateDays: dto.backdateDays ? parseInt(dto.backdateDays, 10) : 0,
      },
    });

    const { passwordHash: _, ...result } = newUser;

    // Log the action
    await this.auditLog.log(
      creator.id,
      targetCompanyId,
      AuditAction.CREATE,
      'User',
      newUser.id,
      null,
      result,
    );

    return result;
  }

  async findAll(companyId: number | null) {
    // If companyId is null, only Super Admin users or root users are returned (since prisma is scoped)
    return this.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyId: true,
        name: true,
        email: true,
        role: true,
        backdateDays: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: number, companyId: number | null, creatorRole: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Tenancy check
    if (creatorRole !== Role.SUPER_ADMIN && user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to user outside your company');
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(creator: { id: number; companyId: number | null; role: Role }, id: number, dto: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Tenancy check
    if (creator.role !== Role.SUPER_ADMIN && existingUser.companyId !== creator.companyId) {
      throw new ForbiddenException('Access denied to user outside your company');
    }

    // Role safety check
    if (dto.role === Role.SUPER_ADMIN && creator.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can promote a user to Super Admin');
    }

    const updateData: any = {
      name: dto.name,
      email: dto.email,
      role: dto.role,
      backdateDays: dto.backdateDays !== undefined ? parseInt(dto.backdateDays, 10) : undefined,
    };

    if (dto.password) {
      updateData.passwordHash = await this.hashPassword(dto.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { passwordHash: _, ...result } = updatedUser;
    const { passwordHash: __, ...oldResult } = existingUser;

    await this.auditLog.log(
      creator.id,
      existingUser.companyId,
      AuditAction.UPDATE,
      'User',
      id,
      oldResult,
      result,
    );

    return result;
  }

  async remove(creator: { id: number; companyId: number | null; role: Role }, id: number) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Tenancy check
    if (creator.role !== Role.SUPER_ADMIN && existingUser.companyId !== creator.companyId) {
      throw new ForbiddenException('Access denied to user outside your company');
    }

    // Cannot delete yourself
    if (existingUser.id === creator.id) {
      throw new ConflictException('You cannot delete your own user profile');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    const { passwordHash: _, ...oldResult } = existingUser;

    await this.auditLog.log(
      creator.id,
      existingUser.companyId,
      AuditAction.DELETE,
      'User',
      id,
      oldResult,
      null,
    );

    return { success: true };
  }
}
