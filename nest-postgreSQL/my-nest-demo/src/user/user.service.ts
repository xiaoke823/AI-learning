import { Injectable } from '@nestjs/common';
import { User } from './user'
import { EmailService } from './email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryUserDto } from './dto/query-user.dto';
import { contain } from 'supertest/lib/cookies';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly emailService: EmailService,
    private readonly prismaService: PrismaService
  ) { }
  //具体的业务逻辑

  private users: User[] = [
    {
      id: 1,
      name: 'John Doe',
      age: 30,
      email: ''
    },
    {
      id: 2,
      name: 'Jane Smith',
      age: 25,
      email: 'jane.smith@example.com'
    }
  ];

  getUser(): string {
    return 'this is user service'
  }
  async createUser(createUserDto: CreateUserDto) {
    try {
      const user = await this.prismaService.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          password: createUserDto.password,
          role: createUserDto.role ?? 'user'
        }
      })
      return {
        success: true,
        message: 'User created successfully',
        data: user
      }
    } catch (e) {
      return this.handlePrismaError(e, '创建用户')
    }
  }
  // createUser(user: CreateUserDto) {
  //   this.emailService.sendEmail(user.email);
  //   return {
  //     success: true,
  //     message: `用户${user.name}创建成功`,
  //     data: {
  //       id: Date.now(),
  //       name: user.name,
  //       age: user.age,
  //       email: user.email
  //     }
  //   }
  // }
  getUserById(id: string) {
    return {
      success: true,
      message: `找到用户${id}`,
      data: {
        id: id,
        name: 'John Doe',
        age: 30,
        email: 'john.doe@example.com'
      }
    }
  }

  getList(pagenum: number, pagesize: number) {
    const total = 100;
    return {
      success: true,
      message: '获取用户列表成功',
      data: this.users
    }
  }
  updateUserById(id: string, user: User) {
    const index = this.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) {
      return {
        success: false,
        message: `用户${id}不存在`,
        data: null
      }
    }
    return {
      success: true,
      message: `用户${id}更新成功`,
      data: this.users[index] = { ...this.users[index], ...user }
    }
  }
  deleteUserById(id: string) {
    const index = this.users.findIndex(u => u.id === parseInt(id));
    if (index === -1) {
      return {
        success: false,
        message: `用户${id}不存在`,
        data: null
      }
    }
    this.users.splice(index, 1);
    return {
      success: true,
      message: `用户${id}删除成功`,
      data: null
    }
  }

  async searchUser(query: QueryUserDto) {
    const { page = '1', pageSize = '10', name, role } = query;
    // 计算分页参数
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where: any = {};
    if ( name) {
      where.name = { contains: name, mode:'insensitive'};
    }
    if ( role) {
      where.role = role;
    }

    try {
      const [total, users] = await this.prismaService.$transaction([
        this.prismaService.user.count({where}), // 获取总记录数

        this.prismaService.user.findMany({
          where,
          skip,
          take,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,

          },
          orderBy: { createdAt: 'desc' }
        })
      ])
      // 计算总页数 向上取整
      const totalPage = Math.ceil(total / take);

      return {
        success: true,
        message: '用户查询成功',
        pagination:{
          total, // 查询到的用户数量
          totalPage, // 总页数
          current: parseInt(page), // 当前页码
          pageSize: parseInt(pageSize), // 每页显示的数量
          hasNextPage: totalPage > parseInt(page),
          hasPrevious: parseInt(page) > 1, // 是否有上一页

        },
        data: users // 查询到的用户数据
      };
    } catch (e) {
      return this.handlePrismaError(e, '查询用户')
    }
  }
  async searchUser1(query: QueryUserDto) {
    const { page = '1', pageSize = '10', name, role } = query;
    // 计算分页参数
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);
    try {
      const users = await this.prismaService.user.findMany({
        where: {
          name: name ? { contains: name } : undefined,
          role: role || undefined
        },
        skip,
        take,
        orderBy: {
          createdAt: 'desc'
        }
      })
      return {
        success: true,
        message: '用户查询成功',
        total: users.length,
        data: users
      }
    } catch (e) {
      return this.handlePrismaError(e, '查询用户')
    }
  }

  async updateUser(updateUserDto: UpdateUserDto){
    const { id, name, email, password, role } = updateUserDto;
    try {
      const user = await this.prismaService.user.update({
        where: { id },
        data: {
          name,
          email,
          password,
          role,
        },
      });
      return {
        success: true,
        message: 'User updated successfully',
        data: user,
      };
    } catch (e) {
      return this.handlePrismaError(e, `更新用户${id}`)
    }
  }

  async deleteUser(deleteUserDto: DeleteUserDto){
    const { id } = deleteUserDto;
    try {
      await this.prismaService.user.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'User deleted successfully',
        data: null,
      };
    } catch (e) {
      return this.handlePrismaError(e, `删除用户${id}`)
    }
  }

  // 统一处理 Prisma 异常,转成业务返回结构
  private handlePrismaError(
    error: unknown,
    action: string,
  ): { success: false; message: string; data: null } {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          // 唯一约束冲突(如 email 重复)
          const target =
            (error.meta?.target as string[] | undefined)?.join(', ') ?? '字段';
          return { success: false, message: `${action}失败:${target} 已存在`, data: null };
        }
        case 'P2025': // 记录不存在(update/delete 找不到目标)
          return { success: false, message: `${action}失败:用户不存在`, data: null };
        case 'P2003': // 外键约束
          return { success: false, message: `${action}失败:存在关联数据约束`, data: null };
        default:
          return { success: false, message: `${action}失败:数据库错误(${error.code})`, data: null };
      }
    }
    // 非 Prisma 已知错误(连接失败、参数错误等)
    return { success: false, message: `${action}失败,请稍后重试`, data: null };
  }

}