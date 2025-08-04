/**
 * Tool schemas for Groq function calling API.
 * These define the available tools that the LLM can call.
 */

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// File Operation Tools

export const READ_FILE_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'read_file',
    description: 'Read the contents of a file, optionally specifying line range',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to read (relative or absolute)'
        },
        start_line: {
          type: 'integer',
          description: 'Starting line number (1-indexed, optional)',
          minimum: 1
        },
        end_line: {
          type: 'integer',
          description: 'Ending line number (1-indexed, optional)',
          minimum: 1
        }
      },
      required: ['file_path']
    }
  }
};

export const CREATE_FILE_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'create_file',
    description: 'Create a new file or directory with specified content',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path for the new file or directory'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file (empty string for directories)'
        },
        file_type: {
          type: 'string',
          enum: ['file', 'directory'],
          description: 'Whether to create a file or directory',
          default: 'file'
        },
        overwrite: {
          type: 'boolean',
          description: 'Whether to overwrite if file exists',
          default: false
        }
      },
      required: ['file_path', 'content']
    }
  }
};

export const EDIT_FILE_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'edit_file',
    description: 'Edit a file by replacing exact text strings. Must read file first.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to edit'
        },
        old_text: {
          type: 'string',
          description: 'Exact text to find and replace (must match exactly including whitespace)'
        },
        new_text: {
          type: 'string',
          description: 'New text to replace the old text with'
        },
        replace_all: {
          type: 'boolean',
          description: 'Whether to replace all occurrences (default: false - replace first match only)',
          default: false
        }
      },
      required: ['file_path', 'old_text', 'new_text']
    }
  }
};

export const DELETE_FILE_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'delete_file',
    description: 'Delete a file or directory',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file or directory to delete'
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to delete directories recursively',
          default: false
        }
      },
      required: ['file_path']
    }
  }
};

// Code Execution Tools

export const EXECUTE_COMMAND_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'execute_command',
    description: 'Execute a shell command or run code',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute'
        },
        command_type: {
          type: 'string',
          enum: ['bash', 'python', 'setup', 'run'],
          description: 'Type of command - setup commands auto-execute, run commands require approval'
        },
        working_directory: {
          type: 'string',
          description: 'Working directory to execute command in (optional)'
        },
        timeout: {
          type: 'integer',
          description: 'Timeout in seconds (optional)',
          minimum: 1,
          maximum: 300
        }
      },
      required: ['command', 'command_type']
    }
  }
};

// Information Tools

export const SEARCH_FILES_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_files',
    description: 'Search for text patterns in files with advanced filtering and matching options',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Text pattern to search for'
        },
        file_pattern: {
          type: 'string',
          description: 'File pattern to limit search (e.g., \'*.py\', \'*.js\')',
          default: '*'
        },
        directory: {
          type: 'string',
          description: 'Directory to search in',
          default: '.'
        },
        case_sensitive: {
          type: 'boolean',
          description: 'Whether search should be case sensitive',
          default: false
        },
        pattern_type: {
          type: 'string',
          enum: ['substring', 'regex', 'exact', 'fuzzy'],
          description: 'Type of pattern matching to use',
          default: 'substring'
        },
        file_types: {
          type: 'array',
          items: { type: 'string' },
          description: 'File extensions to include (e.g., [\'py\', \'js\', \'ts\'])'
        },
        exclude_dirs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Directory names to exclude (e.g., [\'node_modules\', \'.git\'])'
        },
        exclude_files: {
          type: 'array',
          items: { type: 'string' },
          description: 'File patterns to exclude (e.g., [\'*.pyc\', \'*.log\'])'
        },
        max_results: {
          type: 'integer',
          description: 'Maximum number of results to return',
          default: 100,
          minimum: 1,
          maximum: 1000
        },
        context_lines: {
          type: 'integer',
          description: 'Number of lines to show before and after each match',
          default: 0,
          minimum: 0,
          maximum: 10
        },
        group_by_file: {
          type: 'boolean',
          description: 'Whether to group results by file',
          default: false
        }
      },
      required: ['pattern']
    }
  }
};

export const LIST_FILES_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'list_files',
    description: 'List files and directories in a path',
    parameters: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'Directory to list',
          default: '.'
        },
        pattern: {
          type: 'string',
          description: 'File pattern to filter by (e.g., \'*.py\')',
          default: '*'
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to list files recursively',
          default: false
        },
        show_hidden: {
          type: 'boolean',
          description: 'Whether to show hidden files',
          default: false
        }
      },
      required: []
    }
  }
};


// Task Management Tools

export const CREATE_TASKS_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'create_tasks',
    description: 'Create a task list of subtasks to complete the user\'s request',
    parameters: {
      type: 'object',
      properties: {
        user_query: {
          type: 'string',
          description: 'The original user request or query'
        },
        tasks: {
          type: 'array',
          description: 'List of subtasks to complete the request',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique identifier for the task'
              },
              description: {
                type: 'string',
                description: 'Description of the task to be completed'
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed'],
                description: 'Current status of the task',
                default: 'pending'
              }
            },
            required: ['id', 'description']
          }
        }
      },
      required: ['user_query', 'tasks']
    }
  }
};

export const UPDATE_TASKS_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'update_tasks',
    description: 'Update the status of one or more tasks in the task list',
    parameters: {
      type: 'object',
      properties: {
        task_updates: {
          type: 'array',
          description: 'List of task updates',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the task to update'
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed'],
                description: 'New status for the task'
              },
              notes: {
                type: 'string',
                description: 'Optional notes about the task update'
              }
            },
            required: ['id', 'status']
          }
        }
      },
      required: ['task_updates']
    }
  }
};

// Tool Collections

// Core file operations; always available
export const CORE_TOOLS = [
  READ_FILE_SCHEMA,
  CREATE_FILE_SCHEMA,
  EDIT_FILE_SCHEMA,
  DELETE_FILE_SCHEMA
];

// Information gathering tools
export const INFO_TOOLS = [
  SEARCH_FILES_SCHEMA,
  LIST_FILES_SCHEMA
];

// Task management tools
export const TASK_TOOLS = [
  CREATE_TASKS_SCHEMA,
  UPDATE_TASKS_SCHEMA
];

// Execution tools
export const EXECUTION_TOOLS = [
  EXECUTE_COMMAND_SCHEMA
];

// All tools combined
export const ALL_TOOLS = [...CORE_TOOLS, ...INFO_TOOLS, ...TASK_TOOLS, ...EXECUTION_TOOLS];

// Safe tools that can be auto-executed without approval
export const SAFE_TOOLS = [
  'read_file',
  'list_files',
  'search_files',
  'create_tasks',
  'update_tasks'
];

// Tools that require approval, unless auto-approval is enabled
export const APPROVAL_REQUIRED_TOOLS = [
  'create_file',
  'edit_file',
];

// Dangerous tools that always require approval
export const DANGEROUS_TOOLS = [
  'delete_file',
  'execute_command'
];