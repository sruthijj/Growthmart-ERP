import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser, ActiveUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Roles(Role.SUPER_ADMIN)
  @Post()
  async create(@GetUser() user: ActiveUser, @Body() dto: any) {
    return this.companyService.create(user.id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Get()
  async findAll() {
    return this.companyService.findAll();
  }

  @Get(':id')
  async findOne(@GetUser() user: ActiveUser, @Param('id', ParseIntPipe) id: number) {
    if (user.role !== Role.SUPER_ADMIN && user.companyId !== id) {
      throw new ForbiddenException('Access denied to this company');
    }
    return this.companyService.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN)
  @Put(':id')
  async update(
    @GetUser() user: ActiveUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.companyService.update(user.id, id, dto);
  }

  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async remove(@GetUser() user: ActiveUser, @Param('id', ParseIntPipe) id: number) {
    return this.companyService.remove(user.id, id);
  }
}
