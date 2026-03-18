/**
 * Tier 2: NLP Extraction Engine
 * Regex + keyword matching for clinical note analysis
 */
const TAXONOMY = require('./keywords');

/**
 * Extract clinical signals from a note's text content
 */
function extractSignals(noteText) {
  if (!noteText) return { categories: [], signals: [], raw_matches: [] };

  const text = noteText.toLowerCase();
  const foundCategories = [];
  const rawMatches = [];

  for (const [category, config] of Object.entries(TAXONOMY)) {
    const matches = [];

    for (const keyword of config.keywords) {
      // Use word boundary matching
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          keyword,
          position: match.index,
          context: text.substring(Math.max(0, match.index - 40), Math.min(text.length, match.index + keyword.length + 40)).trim()
        });
      }
    }

    if (matches.length > 0) {
      foundCategories.push({
        category,
        label: config.label,
        weight_impact: config.weight_impact,
        severity: config.severity,
        match_count: matches.length,
        keywords_found: [...new Set(matches.map(m => m.keyword))]
      });
      rawMatches.push(...matches.map(m => ({ ...m, category })));
    }
  }

  // Extract numerical values near weight/height keywords
  const numericalFindings = extractNumericalContext(text);

  return {
    categories: foundCategories,
    signals: foundCategories.map(c => ({
      category: c.category,
      label: c.label,
      weight_impact: c.weight_impact,
      severity: c.severity,
      keywords: c.keywords_found
    })),
    raw_matches: rawMatches,
    numerical: numericalFindings,
    summary: generateSignalSummary(foundCategories)
  };
}

/**
 * Extract numerical values near clinical keywords
 */
function extractNumericalContext(text) {
  const findings = [];

  // Weight patterns: "weight 12.5 kg", "wt: 12.5", "12.5kg"
  const weightPattern = /(?:weight|wt|cân nặng|cn)[:\s]*(\d+\.?\d*)\s*(?:kg|lb|g)?/gi;
  let match;
  while ((match = weightPattern.exec(text)) !== null) {
    findings.push({ type: 'weight', value: parseFloat(match[1]), raw: match[0] });
  }

  // Height patterns
  const heightPattern = /(?:height|ht|length|chiều cao|cc)[:\s]*(\d+\.?\d*)\s*(?:cm|m|in)?/gi;
  while ((match = heightPattern.exec(text)) !== null) {
    findings.push({ type: 'height', value: parseFloat(match[1]), raw: match[0] });
  }

  // Intake percentage: "intake 50%", "po 30%"
  const intakePattern = /(?:intake|po|ăn được)[:\s]*(\d+)\s*%/gi;
  while ((match = intakePattern.exec(text)) !== null) {
    findings.push({ type: 'intake_percent', value: parseInt(match[1]), raw: match[0] });
  }

  return findings;
}

/**
 * Generate a human-readable summary of extracted signals
 */
function generateSignalSummary(categories) {
  if (categories.length === 0) return 'No clinically significant signals detected in this note.';

  const increasing = categories.filter(c => c.weight_impact === 'increase').map(c => c.label);
  const decreasing = categories.filter(c => c.weight_impact === 'decrease').map(c => c.label);

  let summary = '';
  if (increasing.length > 0) {
    summary += `Weight-increasing factors: ${increasing.join(', ')}. `;
  }
  if (decreasing.length > 0) {
    summary += `Weight-decreasing factors: ${decreasing.join(', ')}. `;
  }

  return summary.trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { extractSignals };
