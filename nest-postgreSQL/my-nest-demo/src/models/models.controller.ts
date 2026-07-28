import { Body, Controller, Post, Res } from '@nestjs/common';
import { ModelsService } from './models.service';
import type { Response } from 'express';

@Controller('models')
export class ModelsController {
    constructor(private readonly modelsService: ModelsService) {}
    @Post('chat')
    baseChat(@Body() {message}:{message:string}) {
        return this.modelsService.baseChat(message);
    }

    @Post('chatSystem')
    chatSystem(@Body() {message}:{message:string}) {
        return this.modelsService.chatSystem(message);
    }

    @Post('chatStream')
    chatStream(@Body() {message}:{message:string}, @Res() res:Response) {
        return this.modelsService.chatStream(message, res);
    }
    
    @Post('chatWithParser')
    chatWithParser(@Body() {message}:{message:string}) {
        return this.modelsService.chatWithParser(message);
    }

    @Post('translate')
    translate(@Body() {message, language}:{message:string, language: string}) {
        return this.modelsService.translate(message,language);
    }

    @Post('generateBlogPost')
    generateBlogPost(@Body() {message}:{message:string}) {
        return this.modelsService.generateBlogPost(message);
    }

    @Post('chatWithFullChain')
    chatWithFullChain(@Body() {message,role}:{message:string, role:string}) {
        return this.modelsService.chatWithFullChain(message, role);

    }
}
