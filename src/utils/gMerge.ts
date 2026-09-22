import { Recipient } from '../types';

export function resolveSpintax(text: string, seed: string = ''): string {
  // Replace {option1|option2|option3}
  const spintaxRegex = /\{([^{}]+)\}/g;
  return text.replace(spintaxRegex, (_, match) => {
    const choices = match.split('|');
    if (choices.length === 0) return '';
    // deterministic based on recipient seed or pseudo-random
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
    }
    const index = Math.abs(hash) % choices.length;
    return choices[index].trim();
  });
}

export function renderGMerge(template: string, recipient: Recipient, campaignId: string = 'cmp_demo'): string {
  let output = resolveSpintax(template, recipient.email || recipient.id);

  // 1. Process Conditionals: {{#if variable [== 'val']}}...{{else}}...{{/if}} or {{#if variable}}...{{/if}}
  const conditionalRegex = /\{\{#if\s+([a-zA-Z0-9_.]+)(?:\s*(==|!=)\s*['"]?([^'"}\s]+)['"]?)?\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
  
  output = output.replace(conditionalRegex, (_, varName, operator, compareVal, ifBlock, elseBlock) => {
    const actualVal = getNestedValue(recipient, varName);
    let conditionMet = false;

    if (!operator) {
      // Truthy check
      conditionMet = Boolean(actualVal && String(actualVal).trim() !== '');
    } else if (operator === '==') {
      conditionMet = String(actualVal).toLowerCase() === String(compareVal).toLowerCase();
    } else if (operator === '!=') {
      conditionMet = String(actualVal).toLowerCase() !== String(compareVal).toLowerCase();
    }

    return conditionMet ? ifBlock : (elseBlock || '');
  });

  // 2. Process Variables with fallback: {{variable | 'fallback'}}
  const variableFallbackRegex = /\{\{([a-zA-Z0-9_.]+)\s*\|\s*['"]([^'"]+)['"]\}\}/g;
  output = output.replace(variableFallbackRegex, (_, varName, fallback) => {
    const val = getNestedValue(recipient, varName);
    return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : fallback;
  });

  // 3. Process Standard Variables: {{variable}}
  const standardVariableRegex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
  output = output.replace(standardVariableRegex, (_, varName) => {
    if (varName === 'unsubscribe_url') {
      return `https://enterprisecloud.io/optout?email=${encodeURIComponent(recipient.email)}&cid=${campaignId}`;
    }
    if (varName === 'date') {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (varName === 'year') {
      return new Date().getFullYear().toString();
    }
    if (varName === 'message_id') {
      return `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@enterprisecloud.io>`;
    }

    const val = getNestedValue(recipient, varName);
    return val !== undefined && val !== null ? String(val) : `[MISSING: ${varName}]`;
  });

  return output;
}

function getNestedValue(recipient: Recipient, key: string): any {
  if (key in recipient) {
    return (recipient as any)[key];
  }
  if (recipient.customData && key in recipient.customData) {
    return recipient.customData[key];
  }
  // aliases
  if (key === 'name') {
    return `${recipient.firstName} ${recipient.lastName}`.trim();
  }
  return undefined;
}

export interface SpamAnalysis {
  score: number; // 0 - 100 (100 = cleanest, 0 = very spammy)
  flags: { word: string; severity: 'low' | 'medium' | 'high'; reason: string }[];
  recommendations: string[];
}

export function analyzeDeliverabilitySpamScore(subject: string, body: string): SpamAnalysis {
  const flags: { word: string; severity: 'low' | 'medium' | 'high'; reason: string }[] = [];
  const combined = `${subject} ${body}`.toLowerCase();

  const spamTriggers: { pattern: RegExp; word: string; severity: 'low' | 'medium' | 'high'; reason: string }[] = [
    { pattern: /\b(100% free|completely free|free gift)\b/i, word: '100% free', severity: 'high', reason: 'High-risk commercial trigger phrase' },
    { pattern: /\b(make money fast|guaranteed income|cash bonus)\b/i, word: 'financial claim', severity: 'high', reason: 'Aggressive financial spam filter trigger' },
    { pattern: /\b(act now|urgent response required|limited time only)\b/i, word: 'artificial urgency', severity: 'medium', reason: 'Common phishing/spam pressure tactic' },
    { pattern: /\b(winner|you have been selected|claim your prize)\b/i, word: 'lottery/prize phrasing', severity: 'high', reason: 'Heavy penalty by SpamAssassin and Gmail filters' },
    { pattern: /(!{3,}|\?{3,})/, word: 'excessive punctuation (!!!/???)', severity: 'medium', reason: 'Multiple exclamation marks trigger heuristics' },
    { pattern: /\b(buy direct|order now|cheap)\b/i, word: 'hard-sell words', severity: 'low', reason: 'Can affect promotional tab routing' },
    { pattern: /\b(no risk|risk-free)\b/i, word: 'risk-free', severity: 'medium', reason: 'Overused guarantee terminology' },
  ];

  for (const trigger of spamTriggers) {
    if (trigger.pattern.test(combined)) {
      flags.push({
        word: trigger.word,
        severity: trigger.severity,
        reason: trigger.reason,
      });
    }
  }

  // Check subject all-caps
  if (subject.length > 8 && subject === subject.toUpperCase() && /[A-Z]/.test(subject)) {
    flags.push({
      word: 'ALL CAPS SUBJECT',
      severity: 'high',
      reason: 'Subject lines with all-capital letters severely penalize inbox placement',
    });
  }

  // Calculate score
  let deduction = 0;
  flags.forEach(f => {
    if (f.severity === 'high') deduction += 25;
    if (f.severity === 'medium') deduction += 15;
    if (f.severity === 'low') deduction += 5;
  });

  const score = Math.max(10, 100 - deduction);

  const recommendations: string[] = [];
  if (score > 85) {
    recommendations.push('Excellent deliverability profile! Your message uses clean, conversational professional tone.');
  } else {
    recommendations.push('Replace flagged sales jargon with consultative or direct language.');
    recommendations.push('Ensure recipient company and name tags are properly mapped to boost personalization score.');
  }
  recommendations.push('Include a visible, direct one-click unsubscribe mechanism to comply with Gmail & Yahoo 2024+ sender guidelines.');

  return { score, flags, recommendations };
}
