import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
    sendEmail(email?: string) {
        if (email) {
            console.log(`发送邮件到${email}`)
        } else {
            console.log('没有邮箱地址，无法发送邮件')
        }
    }
}