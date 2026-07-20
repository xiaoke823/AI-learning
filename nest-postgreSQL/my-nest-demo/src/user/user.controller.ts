import { Controller, Get, Post, Body, Param, Query, Put, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import {User} from './user'
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('getUser')
  getUser(): string {
    return 'this is user'
  }

  @Post('create')
  createUser(@Body() user:CreateUserDto){
    return this.userService.createUser(user)
  }

  @Get('searchUser/:id')
  getUserById(@Param('id') id:string){
    return this.userService.getUserById(id)
  }

  // @Get('list')
  // getList(
  //   @Query('pagenum') pagenum:number, 
  //   @Query('pagesize') pagesize:number){
  //     return this.userService.getList(pagenum, pagesize)
  // }

  @Put('update/:id')
  updateUserById(@Param('id') id:string, @Body() user:User){
    return this.userService.updateUserById(id, user)
  }

  @Delete('delete/:id')
  deleteUserById(@Param('id') id:string){
    return this.userService.deleteUserById(id)
  }

  @Get('list')
  searchUser(@Query() query: QueryUserDto){
    return this.userService.searchUser(query)
  }

  @Post('update')
  updateUser(@Body() updateUserDto: UpdateUserDto){
    return this.userService.updateUser(updateUserDto)
  }

  @Post('delete')
  deleteUser(@Body() deleteUserDto: DeleteUserDto){
    return this.userService.deleteUser(deleteUserDto)
  }

}