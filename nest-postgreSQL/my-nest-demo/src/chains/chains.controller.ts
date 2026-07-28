import { Body, Controller, Post } from '@nestjs/common';
import { ChainsService } from './chains.service';

@Controller('chains')
export class ChainsController {
    constructor(private readonly chainsService: ChainsService){}

    @Post('publish')
    publish(@Body() body : {message: string}){
        return this.chainsService.publish(body.message);
    }

    @Post('blog')
    generateBlog(@Body() body: { keywords: string; style: string }) {
      return this.chainsService.generateBlog(body.keywords, body.style)
    }

    @Post('router')
    smartRouter(@Body() body: { question: string }) {
      return this.chainsService.smartRouter(body.question)
    }
}
