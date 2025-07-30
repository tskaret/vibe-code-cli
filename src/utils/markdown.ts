import { marked } from 'marked';
// @ts-ignore - No types available for marked-terminal
import { markedTerminal } from 'marked-terminal';

// Configure marked with terminal renderer that strips ANSI codes for Ink
marked.use(markedTerminal());

// TODO: Markdown not working with Ink
export function renderMarkdown(content: string): string {
  const result = marked.parse(content);
  const output = typeof result === 'string' ? result : '';
  // Strip ANSI escape codes since Ink doesn't handle them
  return output.replace(/\x1b\[[0-9;]*m/g, '');
}