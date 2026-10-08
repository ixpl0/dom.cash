import { getBudgetMonthTool, getBudgetSummaryTool } from '~~/server/services/mcp/budget-tools'
import { listDocFoldersTool, searchDocumentsTool } from '~~/server/services/mcp/docs-tools'
import { listTasksTool } from '~~/server/services/mcp/todo-tools'
import type { McpTool } from '~~/server/services/mcp/tool-definition'
import type { McpScope } from '~~/shared/schemas/mcp'

const MCP_TOOLS: readonly McpTool[] = [
  getBudgetSummaryTool,
  getBudgetMonthTool,
  listTasksTool,
  listDocFoldersTool,
  searchDocumentsTool,
]

export const listMcpTools = (scopes: readonly McpScope[]): McpTool[] =>
  MCP_TOOLS.filter(tool => scopes.includes(tool.scope))

export const findMcpTool = (name: string, scopes: readonly McpScope[]): McpTool | undefined =>
  listMcpTools(scopes).find(tool => tool.name === name)
