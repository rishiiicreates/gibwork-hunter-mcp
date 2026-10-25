import dotenv from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGibworkMcpServer } from './server.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

// Ensure logger outputs to stderr in MCP mode to preserve clean JSON-RPC stdout stream
logger.setMcpMode(true);

async function main() {
  const server = createGibworkMcpServer();
  const transport = new StdioServerTransport();

  logger.info('Starting gibwork-hunter-mcp server on stdio transport...');

  await server.connect(transport);

  logger.info('gibwork-hunter-mcp server connected and listening for MCP JSON-RPC requests.');

  const shutdown = async () => {
    logger.info('Shutting down gibwork-hunter-mcp server...');
    try {
      await server.close();
    } catch {
      // Ignore closing errors
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(`Fatal error in MCP server: ${(err as Error).message}`, err);
  process.exit(1);
});
