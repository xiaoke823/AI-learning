import { Body, Controller, Get, Post } from '@nestjs/common';
import { RagService } from './rag.service';

@Controller('rag')
export class RagController {
    constructor(private readonly ragService: RagService) {}

    @Post('load')
    loadDocuments(@Body() body: { document: {id: string, content: string; source?: string}[] }) {
      return this.ragService.loadDocuments(body.document)
    }

    @Get('status')
    getStatus() {
      return this.ragService.getStatus()
    }

    //纯向量查询（不通过embeding模型）
    @Post('search')
    search(@Body() body: { query: string }) {
      return this.ragService.search(body.query)
    }

    //通过embeding模型查询
    @Post('search-embeding')
    searchEmbeding(@Body() body: { query: string }) {
      return this.ragService.searchEmbeding(body.query)
    }

    @Post('clear')
    clearKnowledge() {
      return this.ragService.clearKnowledge()
    }
}
