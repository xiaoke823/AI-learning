import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// import { UserController } from './user/user.controller';
// import { UserService } from './user/user.service';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { PostModule } from './post/post.module';
import { ModelsController } from './models/models.controller';
import { ModelsService } from './models/models.service';
import { ModelsModule } from './models/models.module';
import { PromptsModule } from './prompts/prompts.module';
import { ChainsModule } from './chains/chains.module';
import { AgentsModule } from './agents/agents.module';
import { MemoryModule } from './memory/memory.module';
import { RagModule } from './rag/rag.module';
import { FunctionCallingModule } from './function-calling/function-calling.module';
import { RagDbModule } from './rag-db/rag-db.module';
import { McpClientModule } from './mcp-client/mcp-client.module';
import { McpAgentModule } from './mcp-agent/mcp-agent.module';

@Module({
  imports: [UserModule, OrderModule, PrismaModule, PostModule, ModelsModule, PromptsModule, ChainsModule, AgentsModule, MemoryModule, RagModule, FunctionCallingModule, RagDbModule, McpClientModule, McpAgentModule],
  controllers: [AppController, ModelsController],
  providers: [AppService, ModelsService],
})
export class AppModule {}
