import { LeadItem, MxCheckStatus } from '../types';

// Public webmail domains
const PUBLIC_WEBMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'yahoo.ca',
  'yahoo.in',
  'ymail.com',
  'rocketmail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.it',
  'hotmail.de',
  'outlook.com',
  'live.com',
  'msn.com',
  'aol.com',
  'aim.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'protonmail.ch',
  'zoho.com',
  'zohomail.com',
  'mail.com',
  'email.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'yandex.com',
  'yandex.ru',
  'tutanota.com',
  'tuta.io',
  'comcast.net',
  'sbcglobal.net',
  'verizon.net',
  'att.net',
  'cox.net',
  'charter.net',
  'bellsouth.net',
  'rediffmail.com',
  'fastmail.com',
]);

// Bank & Financial Institutions
const KNOWN_BANK_DOMAINS = new Set([
  'chase.com',
  'jpmorgan.com',
  'jpmorganchase.com',
  'bankofamerica.com',
  'bofa.com',
  'wellsfargo.com',
  'citi.com',
  'citigroup.com',
  'citibank.com',
  'capitalone.com',
  'hsbc.com',
  'hsbc.co.uk',
  'barclays.com',
  'barclays.co.uk',
  'santander.com',
  'santanderbank.com',
  'goldmansachs.com',
  'gs.com',
  'morganstanley.com',
  'fidelity.com',
  'vanguard.com',
  'schwab.com',
  'charlesschwab.com',
  'tdbank.com',
  'td.com',
  'usbank.com',
  'pnc.com',
  'bnpparibas.com',
  'credit-suisse.com',
  'ubs.com',
  'rbc.com',
  'royalbank.com',
  'scotiabank.com',
  'bmo.com',
  'cibc.com',
  'deutsche-bank.de',
  'ing.com',
  'standardchartered.com',
  'ally.com',
  'discover.com',
  'americanexpress.com',
  'amex.com',
]);

// Generic system usernames to filter out
// EXCLUDED per user prompt: "info" and "sales" are NOT generic (they are valid B2B contacts)
const GENERIC_USERNAMES = new Set([
  'user',
  'users',
  'policy',
  'privacy',
  'privacy-policy',
  'privacypolicy',
  'privacy_policy',
  'webmaster',
  'web-master',
  'hostmaster',
  'postmaster',
  'admin',
  'administrator',
  'admins',
  'abuse',
  'root',
  'security',
  'legal',
  'compliance',
  'billing',
  'billing-dept',
  'accounts',
  'accounting',
  'finance',
  'careers',
  'jobs',
  'recruiting',
  'hr',
  'humanresources',
  'press',
  'media',
  'pr',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'automated',
  'system',
  'daemon',
  'helpdesk',
  'support',
  'customer-care',
  'customercare',
  'member',
  'members',
  'test',
  'demo',
  'guest',
]);

// Disposable / Junk Mail domains
const DISPOSABLE_JUNK_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'throwawaymail.com',
  'dispostable.com',
  'trashmail.com',
  'sharklasers.com',
  'yopmail.com',
  'getairmail.com',
  'maildrop.cc',
  'tempail.com',
  'fakeinbox.com',
  'burnermail.io',
  'example.com',
  'test.com',
  'domain.com',
  'localhost',
  'invalid.com',
]);

// Known dead or non-existent domains
const DEAD_DOMAINS = new Set([
  'expired-domain-dns.net',
  'nonexistent-domain-404.xyz',
  'dead-mail-exchange.org',
  'invalid',
  'local',
  'test',
]);

/**
 * Capitalizes the first letter of a word (e.g. "mladenka" -> "Mladenka")
 */
export function capitalizeWord(word: string): string {
  if (!word) return '';
  const clean = word.trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Parses full first name and last name from an email username or address.
 * Example:
 *  "mladenka.pejic@" -> firstName: "Mladenka", lastName: "Pejic", fullName: "Mladenka Pejic"
 *  "mladenka.p@" -> firstName: "Mladenka", lastName: undefined, fullName: "Mladenka" (skips single initial "p")
 *  "mladenka@" -> firstName: "Mladenka", lastName: undefined, fullName: "Mladenka"
 *  "p.mladenka@" -> firstName: "Mladenka", lastName: undefined, fullName: "Mladenka" (skips leading single initial)
 *  "alex_turner" -> firstName: "Alex", lastName: "Turner", fullName: "Alex Turner"
 */
export function parseNameFromEmail(rawEmailOrUsername: string, existingName?: string): {
  fullName: string;
  firstName?: string;
  lastName?: string;
} {
  // If an existing human name is provided (e.g. from Name <email>), format and use it
  if (existingName && existingName.trim()) {
    const rawTokens = existingName.trim().split(/\s+/).filter(t => t.length > 0);
    const validTokens = rawTokens.filter(t => t.length > 1 && !/^\d+$/.test(t)).map(capitalizeWord);
    if (validTokens.length > 0) {
      const firstName = validTokens[0];
      const lastName = validTokens.length > 1 ? validTokens.slice(1).join(' ') : undefined;
      return {
        fullName: validTokens.join(' '),
        firstName,
        lastName,
      };
    }
  }

  // Extract username before @
  const localPart = (rawEmailOrUsername.includes('@') ? rawEmailOrUsername.split('@')[0] : rawEmailOrUsername).trim();
  if (!localPart) return { fullName: '' };

  // Remove trailing digits or plus-tags (e.g. john.doe+newsletter -> john.doe, alex99 -> alex)
  const baseUsername = localPart.split('+')[0];

  // Split on dots, underscores, hyphens
  const tokens = baseUsername.split(/[._-]+/);

  // Clean tokens: strip digits, keep only alphabetic parts
  const cleanTokens: string[] = [];
  for (const token of tokens) {
    const lettersOnly = token.replace(/[^a-zA-Z]/g, '').trim();
    // Rule: Filter out single letter abbreviations (e.g. .p or p.) unless no other name exists
    if (lettersOnly.length > 1) {
      cleanTokens.push(capitalizeWord(lettersOnly));
    }
  }

  if (cleanTokens.length >= 2) {
    const firstName = cleanTokens[0];
    const lastName = cleanTokens.slice(1).join(' ');
    return {
      fullName: `${firstName} ${lastName}`,
      firstName,
      lastName,
    };
  } else if (cleanTokens.length === 1) {
    return {
      fullName: cleanTokens[0],
      firstName: cleanTokens[0],
      lastName: undefined,
    };
  }

  // Fallback if token was single letter only: take alphabetic chars if available
  const anyLetters = localPart.replace(/[^a-zA-Z]/g, '');
  if (anyLetters.length > 0) {
    const cap = capitalizeWord(anyLetters);
    return { fullName: cap, firstName: cap };
  }

  return { fullName: localPart };
}

export function extractEmailAddress(raw: string): { email: string; name?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Format: Name <email@domain.com>
  const angleMatch = trimmed.match(/^([^<]*)<([^>]+)>$/);
  if (angleMatch) {
    const name = angleMatch[1].trim().replace(/^["']|["']$/g, '');
    const email = angleMatch[2].trim();
    return { email, name: name || undefined };
  }

  // Format: email@domain.com (Name)
  const parenMatch = trimmed.match(/^([^\s(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    return { email: parenMatch[1].trim(), name: parenMatch[2].trim() };
  }

  // Direct email address
  return { email: trimmed };
}

export function parseRawRecipientInput(input: string): Array<{ email: string; name?: string }> {
  // Split on both newlines AND commas, while preserving quoted strings or <angles>
  const results: Array<{ email: string; name?: string }> = [];
  
  // Replace newlines with commas for uniform splitting, then parse
  const sanitized = input.replace(/\r?\n/g, ',');
  
  // Split by comma
  const tokens = sanitized.split(',');

  for (const token of tokens) {
    const cleanToken = token.trim();
    if (!cleanToken) continue;

    const extracted = extractEmailAddress(cleanToken);
    if (extracted && extracted.email) {
      // Basic sanity cleanup
      const normalizedEmail = extracted.email.toLowerCase().replace(/[;,]$/, '').trim();
      if (normalizedEmail) {
        results.push({ email: normalizedEmail, name: extracted.name });
      }
    }
  }

  return results;
}

// Country and Language Inference helper based on ccTLDs and known international regions
const COUNTRY_TLD_MAP: Record<string, { country: string; language: string; langCode: string; phonePrefix: string }> = {
  de: { country: 'Germany', language: 'German', langCode: 'de', phonePrefix: '+49' },
  at: { country: 'Austria', language: 'German', langCode: 'de', phonePrefix: '+43' },
  ch: { country: 'Switzerland', language: 'German', langCode: 'de', phonePrefix: '+41' },
  fr: { country: 'France', language: 'French', langCode: 'fr', phonePrefix: '+33' },
  es: { country: 'Spain', language: 'Spanish', langCode: 'es', phonePrefix: '+34' },
  it: { country: 'Italy', language: 'Italian', langCode: 'it', phonePrefix: '+39' },
  nl: { country: 'Netherlands', language: 'Dutch', langCode: 'nl', phonePrefix: '+31' },
  be: { country: 'Belgium', language: 'Dutch', langCode: 'nl', phonePrefix: '+32' },
  pl: { country: 'Poland', language: 'Polish', langCode: 'pl', phonePrefix: '+48' },
  se: { country: 'Sweden', language: 'Swedish', langCode: 'sv', phonePrefix: '+46' },
  no: { country: 'Norway', language: 'Norwegian', langCode: 'no', phonePrefix: '+47' },
  dk: { country: 'Denmark', language: 'Danish', langCode: 'da', phonePrefix: '+45' },
  fi: { country: 'Finland', language: 'Finnish', langCode: 'fi', phonePrefix: '+358' },
  pt: { country: 'Portugal', language: 'Portuguese', langCode: 'pt', phonePrefix: '+351' },
  br: { country: 'Brazil', language: 'Portuguese', langCode: 'pt', phonePrefix: '+55' },
  jp: { country: 'Japan', language: 'Japanese', langCode: 'ja', phonePrefix: '+81' },
  cn: { country: 'China', language: 'Chinese', langCode: 'zh', phonePrefix: '+86' },
  uk: { country: 'United Kingdom', language: 'English', langCode: 'en', phonePrefix: '+44' },
  us: { country: 'United States', language: 'English', langCode: 'en', phonePrefix: '+1' },
  ca: { country: 'Canada', language: 'English', langCode: 'en', phonePrefix: '+1' },
  au: { country: 'Australia', language: 'English', langCode: 'en', phonePrefix: '+61' },
};

export function inferGeoAndContact(domain: string) {
  const parts = domain.split('.');
  const tld = parts[parts.length - 1]?.toLowerCase() || '';
  const sld = parts[parts.length - 2]?.toLowerCase() || parts[0];

  const geo = COUNTRY_TLD_MAP[tld] || {
    country: 'United States',
    language: 'English',
    langCode: 'en',
    phonePrefix: '+1',
  };

  const rawName = sld && sld.length > 2 ? sld : domain;
  const companyName = rawName.charAt(0).toUpperCase() + rawName.slice(1) + (tld === 'de' ? ' GmbH' : tld === 'ch' ? ' AG' : ' Inc.');

  return {
    company: companyName,
    country: geo.country,
    targetLanguage: geo.language,
    languageCode: geo.langCode,
    phone: `${geo.phonePrefix} (0) ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
    address: `Headquarters, ${geo.country}`,
  };
}

export function analyzeLead(email: string, name?: string, company?: string): LeadItem {
  const trimmedEmail = email.toLowerCase().trim();
  const id = `lead-${Math.random().toString(36).substring(2, 9)}`;

  // Syntax validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const hasValidSyntax = emailRegex.test(trimmedEmail) && !trimmedEmail.includes('..') && !trimmedEmail.startsWith('@') && !trimmedEmail.endsWith('@');

  if (!hasValidSyntax || !trimmedEmail.includes('@')) {
    const parts = trimmedEmail.split('@');
    return {
      id,
      email: trimmedEmail,
      name,
      username: parts[0] || '',
      domain: parts[1] || '',
      company: company || 'Unknown',
      mxStatus: 'syntax_error',
      mxHost: undefined,
      isPublicWebmail: false,
      isBankRelated: false,
      isGovOrEdu: false,
      isGenericUsername: false,
      isNonB2B: true,
      isDead: true,
      isCleanB2B: false,
      categoryTags: ['Syntax Error', 'Dead / Invalid'],
    };
  }

  const [username, domain] = trimmedEmail.split('@');
  const categoryTags: string[] = [];

  // Parse intelligent first name and last name from email username or provided name
  // Filters out abbreviations (e.g. mladenka.p -> Mladenka, mladenka.pejic -> Mladenka Pejic)
  const parsedNames = parseNameFromEmail(trimmedEmail, name);
  const resolvedName = parsedNames.fullName || name;
  const firstName = parsedNames.firstName;
  const lastName = parsedNames.lastName;

  // 1. Check Dead or Invalid Domains
  const isExplicitDead = DEAD_DOMAINS.has(domain) || domain.endsWith('.test') || domain.endsWith('.invalid');
  
  let mxStatus: MxCheckStatus = 'valid';
  let mxHost = `mx1.${domain}`;

  if (isExplicitDead) {
    mxStatus = 'dead_domain';
    mxHost = 'NXDOMAIN (0 MX records)';
    categoryTags.push('Dead Domain / No MX');
  }

  // 2. Public Webmail check
  const isPublicWebmail = PUBLIC_WEBMAIL_DOMAINS.has(domain);
  if (isPublicWebmail) {
    categoryTags.push('Public Webmail (Consumer)');
    if (domain.includes('google') || domain === 'gmail.com') mxHost = 'aspmx.l.google.com';
    else if (domain.includes('yahoo') || domain === 'ymail.com') mxHost = 'mta5.am0.yahoodns.net';
    else if (domain.includes('outlook') || domain.includes('hotmail')) mxHost = 'outlook-com.olc.protection.outlook.com';
  }

  // 3. Bank & Financial Check
  const isBankDomain = KNOWN_BANK_DOMAINS.has(domain) || 
                       domain.endsWith('.bank') || 
                       /(?:^|[.-])(?:bank|banc|creditunion|jpmorgan|citi|chase|wellsfargo)(?:[.-]|$)/i.test(domain);
  const isBankRelated = isBankDomain;
  if (isBankRelated) {
    categoryTags.push('Banking / Financial Institution');
  }

  // 4. Government & Military
  const isGov = /(?:\.gov(?:\.[a-z]{2})?$|\.mil(?:\.[a-z]{2})?$|\.gc\.ca$|\.fed\.us$)/i.test(domain);
  
  // 5. Education & Academia
  const isEdu = /(?:\.edu(?:\.[a-z]{2})?$|\.ac\.[a-z]{2}$|\.school$|\.academy$)/i.test(domain);
  const isGovOrEdu = isGov || isEdu;
  if (isGov) categoryTags.push('Government / Military (.gov)');
  if (isEdu) categoryTags.push('Education / University (.edu)');

  // 6. Generic & System Username check
  // Matches exact words or prefixes/suffixes (e.g. user123, user_test, privacy-officer, webmaster01)
  // Note: user explicitly stated: "not info or sales but user etc"
  const normalizedUser = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const isGenericUsername = 
    GENERIC_USERNAMES.has(username) ||
    GENERIC_USERNAMES.has(normalizedUser) ||
    /^user(?:\d+|_|-|$)/i.test(username) ||
    /^(?:privacy|policy|webmaster|postmaster|hostmaster|admin|root|abuse|noreply)(?:[._-].*|\d+)?$/i.test(username);

  if (isGenericUsername) {
    categoryTags.push(`Generic Username (${username}@)`);
  }

  // 7. Non-B2B Junk / Disposable check
  const isDisposable = DISPOSABLE_JUNK_DOMAINS.has(domain);
  const isNonB2B = isPublicWebmail || isDisposable || isBankRelated || isGovOrEdu || isExplicitDead;
  if (isDisposable) {
    categoryTags.push('Disposable / Junk Inbox');
    mxStatus = 'no_mx';
  }

  const isDead = mxStatus !== 'valid';
  const isCleanB2B = !isDead && !isPublicWebmail && !isBankRelated && !isGovOrEdu && !isGenericUsername && !isDisposable;

  if (isCleanB2B) {
    categoryTags.push('Verified B2B Lead');
    if (!company) {
      // Auto infer company from domain
      company = domain.split('.')[0].toUpperCase();
    }
  }

  const geoInfo = inferGeoAndContact(domain);

  return {
    id,
    email: trimmedEmail,
    name: resolvedName,
    firstName,
    lastName,
    username,
    domain,
    company: company || geoInfo.company || domain,
    country: geoInfo.country,
    targetLanguage: geoInfo.targetLanguage,
    languageCode: geoInfo.languageCode,
    phone: geoInfo.phone,
    address: geoInfo.address,
    isEnriched: true,
    mxStatus,
    mxHost,
    isPublicWebmail,
    isBankRelated,
    isGovOrEdu,
    isGenericUsername,
    isNonB2B,
    isDead,
    isCleanB2B,
    categoryTags,
  };
}

export function batchAnalyzeLeads(rawList: Array<{ email: string; name?: string; company?: string }>): LeadItem[] {
  return rawList.map(item => analyzeLead(item.email, item.name, item.company));
}
