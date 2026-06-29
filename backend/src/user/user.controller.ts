import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser, ActiveUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  async create(@GetUser() creator: ActiveUser, @Body() dto: any) {
    return this.userService.create(creator, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get()
  async findAll(@GetUser() creator: ActiveUser, @Query('companyId') queryCompanyId?: string) {
    let companyId = creator.companyId;
    if (creator.role === Role.SUPER_ADMIN) {
      companyId = queryCompanyId ? parseInt(queryCompanyId, 10) : null;
    }
    return this.userService.findAll(companyId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get(':id')
  async findOne(
    @GetUser() creator: ActiveUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.findOne(id, creator.companyId, creator.role);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Put(':id')
  async update(
    @GetUser() creator: ActiveUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.userService.update(creator, id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  async remove(
    @GetUser() creator: ActiveUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.userService.remove(creator, id);
  }
}
