import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
    constructor(private readonly memoryService: MemoryService) {}

    @Post('chat')
    async chat(@Body() body: { sessionId: string, message: string }) {
        return this.memoryService.chat(body.sessionId, body.message);
    }

    @Post('chat-stream')
    chatStream(@Body() body: { sessionId: string; message: string }, @Res() res: Response) {
      return this.memoryService.chatStream(body.sessionId, body.message, res)
    }

    @Get('getHistory/:sessionId')
    getHistory(@Param('sessionId') sessionId: string) {
      return this.memoryService.getHistory(sessionId)
    }

    @Delete('clearSession/:sessionId')
    clearSession(@Param('sessionId') sessionId: string) {
      return this.memoryService.clearSession(sessionId)
    }

    @Get('listSessions')
    listSessions() {
      return this.memoryService.listSessions()
    }
}
