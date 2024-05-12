import { Body, Controller, Get, Param, Post, Req, Request, UseGuards, ValidationPipe } from '@nestjs/common'; import { AuthService } from './auth.service';
import { UserService } from 'src/db/user/user.service';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDTO } from 'src/db/user/dtos/create-user.dto';
import { LoginDTO } from './dtos/login.dto';
import { UserCalendarService } from 'src/db/user_calendar/userCalendar.service';
import { PayloadResponse } from './dtos/payload-response';
import { JwtAuthGuard } from './strategy/jwt.guard';
import { getPayload } from './getPayload.decorator';
import { RefreshStrategy } from './strategy/refresh.strategy';
import { RefreshAuthGuard } from './strategy/refresh.guard';
import { ApiOperation } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';

@ApiTags("auth")
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private userCalendarService: UserCalendarService,
    private eventEmitter: EventEmitter2,
  ) { }

  @ApiResponse({
    status: 201,
    description: '성공 시 해당 response 반환',
    type: CreateUserDTO
  })
  @Post('signup')
  async signUp(@Body(ValidationPipe) userDTO: CreateUserDTO): Promise<PayloadResponse> {
    try {
      const user = await this.userService.signUp(userDTO);
      const userCalendar = await this.userCalendarService.userCalendarCreate(user);
      return {
        useremail: user.useremail,
        nickname: user.nickname,
        userCalendarId: userCalendar.userCalendarId
      };
    } catch (e) {
      throw e;
    }
  }

  @ApiResponse({ status: 201, description: 'Successfully logged in', type: LoginDTO })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('login')
  async login(
    @Body(ValidationPipe) loginDTO: LoginDTO,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.eventEmitter.emit('login', { userEmail: loginDTO.useremail, message: 'login'});
    return this.authService.login(loginDTO);
  }

  @ApiResponse({ status: 201, description: 'Successfully logged in', type: LoginDTO })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('login/v2')
  async login2(
    @Body(ValidationPipe) loginDTO: LoginDTO,
  ): Promise<any> {
    return this.authService.login2(loginDTO);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Successfully retrieved user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('all')
  @UseGuards(JwtAuthGuard)
  GetAllByToken(
    @getPayload() payload: PayloadResponse
  ): Promise<any> {
    return this.authService.GetAllByToken(payload);
  }

  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Successfully retrieved user calendar data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Get('all/:userCalendarId')
  @UseGuards(JwtAuthGuard)
  GetAllByUCId(
    @Param('userCalendarId') userCalendarId: string
  ): Promise<any> {
    return this.authService.GetAllByUserCalendarId(userCalendarId);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('token-test')
  @UseGuards(JwtAuthGuard)
  // @UseGuards(RefreshAuthGuard)
  tokenTest(
    @getPayload() payload: PayloadResponse,
  ): any {
    return payload;
  }
}
