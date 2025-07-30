# Plugin System

This directory contains the plugin system for extending the CLI with custom commands and tools.

## Adding Custom Commands

Create a new file implementing the `CommandDefinition` interface:

```typescript
import { CommandDefinition } from '../commands/base.js';

export const myCustomCommand: CommandDefinition = {
  command: 'mycmd',
  description: 'My custom command description',
  handler: ({ addMessage }) => {
    addMessage({
      role: 'system',
      content: 'Custom command executed!'
    });
  }
};
```

## Adding Custom Tools

Create a new tool following the existing tool patterns in `../tools/builtin/`.

## Future Enhancements

- Auto-discovery of plugins in this directory
- Plugin configuration and lifecycle management
- Plugin API versioning