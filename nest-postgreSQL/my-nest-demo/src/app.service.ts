import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!xiaoke';
  }
  getHellohello(): string {
    return '您好小可';
  }
}
