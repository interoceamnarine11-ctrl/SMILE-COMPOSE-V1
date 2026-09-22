/**
 * Template variable replacer for email bodies and subject lines.
 * Supports standard syntax {{variable}} and filter fallback syntax {{variable | 'Default'}}.
 */
export function replaceTemplateVariables(template: string, data: Record<string, string | number | undefined>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*['"]?([^'"}]+)['"]?)?\s*\}\}/g, (match, rawVarName, fallback) => {
    const varName = rawVarName.toLowerCase();
    
    // Normalization map
    const candidates: Record<string, any> = {
      ...data,
      first_name: data.firstName || data.first_name || data.name,
      firstname: data.firstName || data.first_name || data.name,
      last_name: data.lastName || data.last_name,
      lastname: data.lastName || data.last_name,
      name: data.name || data.firstName || data.first_name,
      full_name: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName),
      fullname: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName),
      email: data.email,
      company: data.company,
      country: data.country,
      targetlanguage: data.targetLanguage,
      phone: data.phone,
    };

    const val = candidates[varName] !== undefined && candidates[varName] !== null ? candidates[varName] : data[rawVarName];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val);
    }

    if (fallback !== undefined && fallback !== null) {
      return fallback.trim();
    }

    return match;
  });
}
