// Common code file extensions
export const CODE_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.c', '.cpp', '.h',
  '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.sh', '.bash',
  '.sql', '.html', '.css', '.scss', '.vue', '.dart', '.lua', '.r'
]);

// Config and documentation files
export const CONFIG_EXTENSIONS = new Set([
  '.json', '.yaml', '.yml', '.toml', '.ini', '.xml', '.md', '.txt', '.dockerfile', '.env'
]);

// Files and directories to ignore
export const IGNORE_PATTERNS = new Set([
  'node_modules', '.git', '__pycache__', 'venv', '.venv', 'build', 'dist',
  '.idea', '.vscode', '.DS_Store', '*.pyc', '*.log', '*.tmp'
]);