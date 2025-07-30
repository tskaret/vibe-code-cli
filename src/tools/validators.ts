/**
 * Centralized validation system for tools requiring approval.
 * Provides extensible validation framework for any tool.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ToolValidator {
  validateArgs(args: Record<string, any>): Promise<ValidationResult>;
}

/**
 * Track which files have been read in the current session
 * This is imported from tools.ts to maintain consistency
 */
let readFiles: Set<string> | null = null;

/**
 * Set the read files tracking from tools.ts
 */
export function setReadFilesTracker(tracker: Set<string>) {
  readFiles = tracker;
}

/**
 * Validator for edit_file tool
 */
export class EditFileValidator implements ToolValidator {
  async validateArgs(args: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required parameters
    if (!args.file_path || typeof args.file_path !== 'string') {
      errors.push('file_path is required and must be a string');
    }

    if (!args.old_text || typeof args.old_text !== 'string') {
      errors.push('old_text is required and must be a string');
    }

    if (args.new_text === undefined || typeof args.new_text !== 'string') {
      errors.push('new_text is required and must be a string');
    }

    // Early return if basic validation fails
    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    const filePath = args.file_path;
    const oldText = args.old_text;
    const replaceAll = args.replace_all || false;

    try {
      const resolvedPath = path.resolve(filePath);

      // Check if file exists
      try {
        await fs.promises.access(resolvedPath);
      } catch {
        errors.push('File not found');
        return { isValid: false, errors, warnings };
      }

      const stats = await fs.promises.stat(resolvedPath);
      if (!stats.isFile()) {
        errors.push('Path is not a file');
        return { isValid: false, errors, warnings };
      }

      // Check if file was read first
      if (readFiles && !readFiles.has(resolvedPath)) {
        errors.push(`File must be read before editing. Use read_file tool first: ${filePath}`);
        return { isValid: false, errors, warnings };
      }

      // Read and validate file content
      const originalContent = await fs.promises.readFile(resolvedPath, 'utf-8');

      // Check if old_text exists in file
      if (!originalContent.includes(oldText)) {
        errors.push('The specified old_text was not found in the file');
        return { isValid: false, errors, warnings };
      }

      // Check for ambiguous matches if not replacing all
      if (!replaceAll) {
        const matches = originalContent.split(oldText).length - 1;
        if (matches > 1) {
          errors.push(`Found ${matches} matches for old_text. Use replace_all=true or provide more specific text to ensure unique match`);
          return { isValid: false, errors, warnings };
        }
      }

      // All validations passed
      return { isValid: true, errors: [], warnings };

    } catch (error) {
      errors.push(`Validation error: ${error}`);
      return { isValid: false, errors, warnings };
    }
  }
}

/**
 * Registry of tool validators
 * Easy to extend by adding new validators
 */
const TOOL_VALIDATORS: Record<string, ToolValidator> = {
  edit_file: new EditFileValidator(),
  // Future validators can be added here:
  // create_file: new CreateFileValidator(),
  // delete_file: new DeleteFileValidator(),
};

/**
 * Validate tool arguments using the appropriate validator
 * @param toolName Name of the tool to validate
 * @param args Arguments to validate
 * @returns ValidationResult with validation status and any errors
 */
export async function validateToolArgs(toolName: string, args: Record<string, any>): Promise<ValidationResult> {
  const validator = TOOL_VALIDATORS[toolName];
  
  if (!validator) {
    // Tool doesn't have a validator - consider it valid
    return { isValid: true, errors: [] };
  }

  return await validator.validateArgs(args);
}

/**
 * Check if a tool has validation configured
 * @param toolName Name of the tool to check
 * @returns True if the tool has a validator
 */
export function hasValidator(toolName: string): boolean {
  return toolName in TOOL_VALIDATORS;
}

/**
 * Register a new validator for a tool
 * @param toolName Name of the tool
 * @param validator Validator instance
 */
export function registerValidator(toolName: string, validator: ToolValidator): void {
  TOOL_VALIDATORS[toolName] = validator;
}