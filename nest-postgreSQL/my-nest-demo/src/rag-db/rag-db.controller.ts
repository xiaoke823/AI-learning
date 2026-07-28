import { Body, Controller, Get, Post } from '@nestjs/common';
import { RagDbService } from './rag-db.service';

@Controller('rag-db')
export class RagDbController {
    constructor(private readonly ragDbService: RagDbService) {}

    @Post('load')
    loadDocuments(@Body() body: { document: {id: string, content: string; source?: string}[] }) {
      return this.ragDbService.loadDocuments(body.document)
    }

    @Get('status')
    async getStatus() {
      return this.ragDbService.getStatus()
    }

    //纯向量查询（不通过embeding模型）
    @Post('search')
    search(@Body() body: { query: string }) {
      return this.ragDbService.search(body.query)
    }

    //通过embeding模型查询
    @Post('search-embeding')
    searchEmbeding(@Body() body: { query: string }) {
      return this.ragDbService.searchEmbeding(body.query)
    }

    @Post('clear')
    async clearKnowledge() {
      return this.ragDbService.clearKnowledge()
    }   
}
