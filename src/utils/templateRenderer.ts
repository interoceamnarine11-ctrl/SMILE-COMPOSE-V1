/**
 * Template variable replacer for email bodies and subject lines
 */
export function replaceTemplateVariables(template: string, data: Record<string, string | number | undefined>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
    if (varName in data && data[varName] !== undefined && data[varName] !== null) {
      return String(data[varName]);
    }
    // Fallback aliases
    if (varName === 'name' && (data.name || data.firstName)) {
      return String(data.name || data.firstName);
    }
    return match;
  });
}
