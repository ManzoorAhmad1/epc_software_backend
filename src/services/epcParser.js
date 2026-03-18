'use strict';
const fs = require('fs');

// ─── Parser ──────────────────────────────────────────────────────────────────

function extractBetween(text, start, end) {
  const startIdx = text.indexOf(start);
  if (startIdx === -1) return '';
  const from = startIdx + start.length;
  const endIdx = text.indexOf(end, from);
  return endIdx === -1 ? text.slice(from).trim() : text.slice(from, endIdx).trim();
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

function extractAddress(text) {
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i;
  const postcodeMatch = text.match(postcodeRegex);
  const postcode = postcodeMatch ? postcodeMatch[1].toUpperCase() : '';

  let address = '';

  // Strategy 1: Gov.uk EPC — address appears on separate lines right after the header
  // e.g. "Energy performance certificate (EPC)\n22 Lawrence Avenue\nABERDARE\nCF44 9EW"
  const epcHeaderIdx = text.search(/Energy performance certificate\s*\(EPC\)/i);
  if (epcHeaderIdx !== -1 && postcode) {
    const afterHeader = text.slice(epcHeaderIdx);
    const lines = afterHeader.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    // lines[0] is the header itself; collect subsequent lines until we hit the postcode
    const addrLines = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Stop when we reach the postcode line
      if (line.replace(/\s/g, '').toUpperCase() === postcode.replace(/\s/g, '')) break;
      // Stop if line is clearly page content, not an address
      if (/^(Energy|EPC|Improve|What Your|Estimated|Key Features|Environmental|Assessor|Page\s*\d)/i.test(line)) break;
      if (line.length > 60) break; // address lines are short
      addrLines.push(line);
      if (addrLines.length >= 4) break;
    }
    if (addrLines.length > 0) {
      address = [...addrLines, postcode].join(', ');
    }
  }

  // Strategy 2: Our generated report — address on the SAME line as the EPC header
  // e.g. "Energy performance certificate (EPC), 10 Heol Gwynno, Llantrisant, PONTYCLUN, CF72 8DD"
  if (!address) {
    const sameLineMatch = text.match(/Energy performance certificate\s*\(EPC\)[,\s]+([^\n]+)/i);
    if (sameLineMatch) {
      let rawAddr = sameLineMatch[1].trim();
      rawAddr = rawAddr.replace(/,?\s*\b[A-Z]{1,2}\d{1,2}[A-Z]?\s+\d[A-Z]{2}\s*$/i, '').trim();
      rawAddr = rawAddr.replace(/,\s*$/, '').trim();
      address = postcode ? rawAddr + ', ' + postcode : rawAddr;
    }
  }

  if (!address) {
    address = matchFirst(text, [
      /Address[:\s]+([^\n]+)/i,
      /Property address[:\s]+([^\n]+)/i,
    ]);
  }

  return { address, postcode };
}

// Returns valid score range [min, max] for a rating letter
function getScoreRangeForRating(letter) {
  const ranges = { A:[92,100], B:[81,91], C:[69,80], D:[55,68], E:[39,54], F:[21,38], G:[1,20] };
  return ranges[String(letter).toUpperCase()] || [1, 100];
}

function extractRatings(text) {
  // gov.uk EPC: "This property's energy rating is B"
  // Our generated report: "currently rated G"
  const currentRating = matchFirst(text, [
    /currently\s+rated\s+([A-G])\b/i,
    /energy\s+rating\s+is\s+([A-G])\b/i,
    /Current energy rating\s+([A-G])/i,
    /current energy efficiency rating[:\s]+([A-G])/i,
    /Energy efficiency rating[:\s]+([A-G])/i,
  ]);

  const currentScore = matchFirst(text, [
    /(?:This property\s+)?scores?\s+(\d+)\s*points?\s+on(?:\s+the\s+EPC)?/i,
    /Current energy rating\s+[A-G]\s*\((\d+)\)/i,
    /energy efficiency rating[:\s]+[A-G]\s+(\d+)/i,
    /\bCurrent\b.*?(\d{2,3})\s*(?:kWh|points)/i,
  ]);

  // gov.uk EPC: "potential to be A"
  const potentialRating = matchFirst(text, [
    /potential to reach\s+([A-G])\b/i,
    /potential to be\s+([A-G])\b/i,
    /Potential energy rating\s+([A-G])/i,
    /potential energy efficiency rating[:\s]+([A-G])/i,
  ]);

  const potentialScore = matchFirst(text, [
    /reach\s+[A-G]\s+\((\d+)\s*points?\)/i,
    /Potential energy rating\s+[A-G]\s*\((\d+)\)/i,
    /potential energy efficiency rating[:\s]+[A-G]\s+(\d+)/i,
  ]);

  // Scan both letter-first (our format: "G 92") and number-first (gov.uk: "91 B") pairs
  const letterFirstPattern = /\b([A-G])\s+(\d{2,3})\b/g;
  const numberFirstPattern = /\b(\d{2,3})\s+([A-G])\b/g;

  const letterFirstMatches = [...text.matchAll(letterFirstPattern)]
    .map((m) => ({ rating: m[1], score: parseInt(m[2]) }));
  const numberFirstMatches = [...text.matchAll(numberFirstPattern)]
    .map((m) => ({ rating: m[2], score: parseInt(m[1]) }));

  // Combine and deduplicate, prefer number-first (gov.uk format) as more reliable
  const allPairs = [...numberFirstMatches, ...letterFirstMatches];

  let cur = currentRating;
  let curScore = parseInt(currentScore) || 0;
  let pot = potentialRating;
  let potScore = parseInt(potentialScore) || 0;

  // If no rating found via specific patterns, try to find from rating+score pairs
  if (!cur) {
    // Pick the first valid pair whose score is in range for any band
    const candidates = allPairs.filter(({ rating, score }) => {
      const [min, max] = getScoreRangeForRating(rating);
      return score >= min && score <= max;
    });
    if (candidates.length >= 1) cur = candidates[0].rating;
    if (!pot && candidates.length >= 2) pot = candidates[1].rating;
  }
  if (!pot && cur) {
    // Second distinct rating in the pairs list is usually potential
    const others = allPairs.filter(({ rating, score }) => {
      if (rating === cur) return false;
      const [min, max] = getScoreRangeForRating(rating);
      return score >= min && score <= max;
    });
    if (others.length >= 1) pot = others[0].rating;
  }

  // Validate/fill scores against known band ranges
  if (cur) {
    const [min, max] = getScoreRangeForRating(cur);
    if (!curScore || curScore < min || curScore > max) {
      const validPair = allPairs.find(
        ({ rating, score }) =>
          rating.toUpperCase() === cur.toUpperCase() && score >= min && score <= max
      );
      curScore = validPair ? validPair.score : Math.round((min + max) / 2);
    }
  }
  if (pot) {
    const [min, max] = getScoreRangeForRating(pot);
    if (!potScore || potScore < min || potScore > max) {
      const validPair = allPairs.find(
        ({ rating, score }) =>
          rating.toUpperCase() === pot.toUpperCase() && score >= min && score <= max
      );
      potScore = validPair ? validPair.score : Math.round((min + max) / 2);
    }
  }

  return {
    currentRating: cur || 'D',
    currentScore: curScore || 63,
    potentialRating: pot || 'C',
    potentialScore: potScore || 75,
  };
}

function extractEnergyCosts(text) {
  const extract = (label) =>
    matchFirst(text, [
      new RegExp(`${label}[^\\n]*?£\\s*([\\d,]+)`, 'i'),
      new RegExp(`${label}\\s+([\\d,]+)\\s+per year`, 'i'),
    ]);

  // Gov.uk EPC: "An average household would need to spend £840 per year on heating, hot water and lighting"
  const govTotal = matchFirst(text, [
    /spend\s*£([\d,]+)\s*per year/i,
    /total estimated[^£]*£\s*([\d,]+)/i,
    /total[^£\n]*£\s*([\d,]+)\s*per year/i,
  ]);

  return {
    heating: extract('Heating') ? `£${extract('Heating')}` : '£750–£900',
    hotWater: extract('Hot water') ? `£${extract('Hot water')}` : '£120–£150',
    lighting: extract('Lighting') ? `£${extract('Lighting')}` : '£60–£80',
    total: govTotal ? `£${govTotal}` : '£930–£1,130',
  };
}

function extractCO2(text) {
  // Gov.uk EPC: "This property produces1.8 tonnes of CO2"
  // Also: "This property's potential production\n1.6 tonnes of CO2"
  const currentCO2 = matchFirst(text, [
    /This property produces(\d+(?:\.\d+)?)\s*tonnes/i,
    /current.*?(\d+(?:\.\d+)?)\s*tonnes? of CO2/i,
    /CO2.*?current.*?(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*tonnes?\s*(?:of\s*)?CO2\s*per year/i,
  ]);

  const potentialCO2 = matchFirst(text, [
    /potential\s*production[^\n]*\n(\d+(?:\.\d+)?)\s*tonnes/i,
    /potential.*?(\d+(?:\.\d+)?)\s*tonnes? of CO2/i,
    /CO2.*?potential.*?(\d+(?:\.\d+)?)/i,
  ]);

  // Gov.uk EPC: environmental impact rating is listed separately
  // "This property's environmental impact rating is B. It has the potential to be B."
  const envCurrent = matchFirst(text, [
    /environmental impact rating is ([A-G])\b/i,
    /Environmental impact.*?current.*?([A-G])/i,
    /environmental impact \(CO2\)[^\n]*([A-G])\s*\d/i,
  ]);

  const envPotential = matchFirst(text, [
    /potential to be ([A-G])\b.*carbon|carbon.*potential to be ([A-G])\b/i,
    /Environmental impact.*?potential.*?([A-G])/i,
  ]);

  return {
    currentCO2: currentCO2 ? `${currentCO2} tonnes per year` : '3.5 tonnes per year',
    potentialCO2: potentialCO2 ? `${potentialCO2} tonnes per year` : '2.5 tonnes per year',
    environmentalRatingCurrent: envCurrent || 'D',
    environmentalRatingPotential: envPotential || 'C',
  };
}

function extractFeatures(text) {
  // Include singular gov.uk EPC labels alongside plural forms used in our generated reports.
  // IMPORTANT: singular ('Wall') must come BEFORE plural ('Walls') so the dedup check
  // prevents 'Walls' from accidentally matching "WallSandstone" case-insensitively.
  const featureLabels = [
    'Wall', 'Walls',
    'Roof',
    'Floor',
    'Window', 'Windows',
    'Main heating',
    'Main heating control', 'Main heating controls',
    'Secondary heating',
    'Hot water',
    'Lighting',
  ];

  // Canonical display names for singular gov.uk labels
  const labelAlias = {
    'Wall': 'Walls',
    'Window': 'Windows',
    'Main heating control': 'Main heating controls',
  };

  // Strip trailing quality words that EPC appends to descriptions (Good/Average/Poor/N/A)
  function cleanDesc(d) {
    return d
      .replace(/\s*(Very good|Very poor|Good|Average|Poor|N\/A)\s*$/i, '')
      // Remove "area" prefix that gov EPC uses before floor area numbers
      .replace(/^area\s*/i, '')
      // Remove leading floor area e.g. "79 square metres | " left after stripping "area"
      .replace(/^\d+\s*square\s*metres?\s*\|\s*/i, '')
      // Remove "control" keyword prefix that belongs to heating controls row
      .replace(/^control\S*\s*/i, '')
      // Strip trailing pipe separators
      .replace(/\s*\|\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Junk patterns to exclude from feature descriptions
  const junkPatterns = [
    /^in this property\.?$/i,
    /^per year$/i,
    /^\d+\s*square\s*metres?$/i,  // bare floor area without context
    /^[A-Z\/\s]{1,5}$/,          // just quality rating chars like "N/A"
    /^insulation$/i,              // leftover from "Floor insulation" improvement
    /^setup\b/i,                  // "setup is: ..." or "setup: ..." paragraph prefix
    /^currently\b/i,              // "currently have no insulation..."
    /^the\s+property\b/i,         // "the property uses..."
    /^check\b/i,                  // "Check with an assessor..."
    /^adding\b/i,                 // "Adding cavity wall..."
    /^your\b/i,                   // "Your roof setup..."
    /^this\s/i,                   // "This is..."
  ];

  const features = [];
  for (const label of featureLabels) {
    // Use ^ anchor with multiline flag so the label only matches at the start of a line.
    // This prevents matching the label word when it appears inside paragraph text
    // (e.g. "walls" in "Your walls currently have no insulation...").
    // Plural labels ('Walls','Windows') must only match if followed by whitespace/punctuation,
    // NOT a letter (otherwise 'Walls' case-insensitively matches "WallSandstone").
    const pluralLabels = ['Walls', 'Windows', 'Main heating controls'];
    const labelSuffix = pluralLabels.includes(label)
      ? '(?=[\\s:\\-]|$)'   // require separator after plural label
      : '\\s*[:\\-]?\\s*';  // normal: optional separator

    const capturePattern = label === 'Main heating'
      // Negative lookahead (?!\s*control) prevents matching "Main heating control" lines
      ? `^Main heating(?!\\s*control)${labelSuffix}([^\\n]{5,120}?)(?=(?:\\s*[|,]\\s*)?control|\\s+(?:Good|Average|Poor)|\\n|$)`
      : `^${label}${labelSuffix}([^\\n]{5,120})`;

    const pattern = new RegExp(capturePattern, 'gim'); // 'i'=case-insensitive, 'm'=^ matches line start
    const allMatches = [...text.matchAll(pattern)];
    if (allMatches.length === 0) continue;

    // Split each raw match on ' | ' (the EPC PDF embeds pipe separators within a single line)
    // then clean and filter each segment individually, then deduplicate
    const cleaned = [
      ...new Set(
        allMatches
          .flatMap((m) => m[1].trim().split(/\s*\|\s*/))
          .map((d) => cleanDesc(d))
          .filter((d) =>
            d.length >= 5 &&
            !d.includes('£') &&
            !junkPatterns.some((p) => p.test(d))
          )
      ),
    ];
    if (cleaned.length === 0) continue;

    const description = cleaned.join(' | ');

    const canonicalName = labelAlias[label] || label;

    // Skip Secondary heating if it has no value (None / N/A)
    if (canonicalName === 'Secondary heating' && /^(none|n\/a)/i.test(description)) continue;
    // Skip Hot water if it's just "from main system" (implicit)
    if (canonicalName === 'Hot water' && /from main system/i.test(description)) continue;

    // Skip if a feature with this canonical name was already added (singular after plural)
    if (features.some((f) => f.name === canonicalName)) continue;

    features.push({ name: canonicalName, description });
  }

  // Fix known wall/roof materials where EPC PDF drops the first letter
  // e.g. "andstone" → "Sandstone", "rabite" → "Grabite"
  const firstLetterFixes = [
    [/^andstone/i, 'Sandstone'],
    [/^ystem/i, 'System'],
    [/^rabite/i, 'Grabite'],
    [/^alvanised/i, 'Galvanised'],
    [/^oncrete/i, 'Concrete'],
    [/^laster/i, 'Plaster'],
    [/^rick/i, 'Brick'],
    [/^imber/i, 'Timber'],
  ];

  for (const feat of features) {
    for (const [re, replacement] of firstLetterFixes) {
      if (re.test(feat.description)) {
        feat.description = feat.description.replace(re, replacement);
        break;
      }
    }
  }

  if (features.length === 0) {
    return [
      { name: 'Walls', description: 'Solid brick, as built, no insulation (assumed)' },
      { name: 'Roof', description: 'Pitched, 100mm loft insulation' },
      { name: 'Windows', description: 'Single glazed' },
      { name: 'Main heating', description: 'Boiler and radiators, mains gas' },
      { name: 'Lighting', description: 'No low energy lighting' },
    ];
  }

  return features;
}

function extractImprovements(text) {
  const improvements = [];

  // ── Strategy 1: gov.uk "Steps you could take to save energy" table ──────────
  // Format per line: "1. Cavity wall insulation£900 - £1,500£52"
  // or multiline:    "1. Loft insulation\n£300 - £500\n£56"
  const stepsSection = text.match(/Steps you could take[^]*?(?=Advice on|Who to contact|$)/i);
  if (stepsSection) {
    const stepText = stepsSection[0];
    // Each step: number, description, cost range, yearly saving (all run together by pdf-parse)
    const stepRegex = /\d+\.\s+([A-Za-z][^\n\xa3]{3,80}?)\s*\xa3\s*([\d,]+)\s*[-\u2013]\s*\xa3?\s*([\d,]+)\s*\xa3\s*([\d,]+)/g;
    let m;
    while ((m = stepRegex.exec(stepText)) !== null) {
      const desc = m[1].trim().replace(/\s+/g, ' ');
      improvements.push({
        description: desc,
        typicalCostRange: `\xa3${m[2]} \u2013 \xa3${m[3]}`,
        typicalAnnualSaving: `\xa3${m[4]} per year`,
        ratingAfterImprovement: null,
      });
    }
    // Fallback within steps section — cost only, no saving on same line
    if (improvements.length === 0) {
      const stepRegex2 = /\d+\.\s+([A-Za-z][^\n\xa3]{3,80}?)\s*\xa3\s*([\d,]+)\s*[-\u2013]\s*\xa3?\s*([\d,]+)/g;
      while ((m = stepRegex2.exec(stepText)) !== null) {
        const desc = m[1].trim().replace(/\s+/g, ' ');
        // Try to find saving nearby
        const savingM = stepText.slice(m.index, m.index + 200).match(/£\s*(\d+)\s*(?:per year)?$/m);
        improvements.push({
          description: desc,
          typicalCostRange: `£${m[2]} – £${m[3]}`,
          typicalAnnualSaving: savingM ? `£${savingM[1]} per year` : null,
          ratingAfterImprovement: null,
        });
      }
    }
  }

  // ── Strategy 2: keyword scan for formats not in steps table ─────────────────
  if (improvements.length === 0) {
    const improvementKeywords = [
      'Loft insulation', 'Cavity wall insulation', 'Floor insulation',
      'Draught proofing', 'Low energy lighting', 'Solar water heating',
      'Solar panels', 'Heat pump', 'Boiler upgrade',
      'Smart controls', 'Double glazing', 'Solid wall insulation',
      'Internal wall insulation',
    ];
    for (const keyword of improvementKeywords) {
      const regex = new RegExp(`${keyword}[^]*?(?:£|cost|saving)[^\\n]{0,200}`, 'i');
      const match = text.match(regex);
      if (match) {
        const snippet = match[0];
        const costMatch = snippet.match(/£\s*([\d,]+)\s*[–\-]\s*£?\s*([\d,]+)/i);
        const savingMatch = snippet.match(/saving[^£]*£\s*([\d,]+)/i);
        const ratingMatch = snippet.match(/(?:SAP|EPC|indicative|rating after)[^A-G]*([A-G])\s*\(?\s*(\d{1,3})\s*\)?/i);
        improvements.push({
          description: keyword,
          typicalCostRange: costMatch ? `£${costMatch[1]} – £${costMatch[2]}` : 'Contact installer for quote',
          typicalAnnualSaving: savingMatch ? `£${savingMatch[1]} per year` : null,
          ratingAfterImprovement: ratingMatch ? `${ratingMatch[1].toUpperCase()} (${ratingMatch[2]})` : null,
        });
      }
    }
  }

  if (improvements.length === 0) {
    improvements.push(
      { description: 'Loft insulation (top up to 270mm)', typicalCostRange: '£300 – £500', typicalAnnualSaving: '£150 per year', ratingAfterImprovement: null },
      { description: 'Draught proofing', typicalCostRange: '£80 – £120', typicalAnnualSaving: '£60 per year', ratingAfterImprovement: null },
      { description: 'Low energy lighting (all fixed)', typicalCostRange: '£50 – £100', typicalAnnualSaving: '£35 per year', ratingAfterImprovement: null },
    );
  }

  return improvements.slice(0, 8);
}

function extractAssessorDetails(text) {
  // Gov.uk EPC format: "Assessor's nameAnthony Davies" (no space/colon separator)
  // Our generated report uses: "Assessor's name: Anthony Davies" (with colon+space)
  const assessorName = matchFirst(text, [
    /Assessor[\u2019']?s\s*name[:\s]*([\w][^\n]+)/i,
    /Assessor name[:\s]*([\w][^\n]+)/i,
    /Assessed by[:\s]*([^\n]+)/i,
  ]);

  // Prefer "Date of assessment" over "Valid until" date (which is in the future)
  const assessmentDate = matchFirst(text, [
    /Date of assessment[:\s]*(\d{1,2}\s+\w+\s+\d{4})/i,
    /Date of certificate[:\s]*(\d{1,2}\s+\w+\s+\d{4})/i,
    /Assessment date[:\s]*(\d{1,2}\s+\w+\s+\d{4})/i,
  ]);

  const rawCompanyName = matchFirst(text, [
    /Company[:\s]+([\w][^\n]+)/i,
    /Assessor[\u2019']?s\s*company[:\s]*([\w][^\n]+)/i,
    /Organisation[:\s]+([\w][^\n]+)/i,
    /Trading as[:\s]+([\w][^\n]+)/i,
  ]);
  // Reject if extracted value looks like a URL or government obligation text
  const companyName =
    rawCompanyName && !/www\.|gov\.uk|obligation|http/i.test(rawCompanyName)
      ? rawCompanyName.trim()
      : '';

  const assessorContact = matchFirst(text, [
    /(?:Telephone|Phone|Tel)[:\s]*(\d[\d\s]+)/i,
    /Email[:\s]*([\w.+-]+@[\w.-]+)/i,
  ]);

  return {
    assessorName: assessorName || 'EPC Assessor',
    assessmentDate: assessmentDate || new Date().toLocaleDateString('en-GB'),
    companyName: companyName || 'DOC Surveying Limited',
    assessorContact: assessorContact || '',
  };
}

async function parseEPCFromBuffer(buffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const rawText = data.text;

  // Try GPT-based extraction first (most accurate)
  try {
    const result = await parseEPCWithGPT(rawText);
    return result;
  } catch (gptError) {
    console.warn('[EPC Parser] GPT extraction failed, falling back to regex:', gptError.message);
    return parseEPCFromText(rawText);
  }
}

async function parseEPCWithGPT(rawText) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You are an expert at reading UK Energy Performance Certificate (EPC) documents.
Extract the following information from the EPC text below and return it as valid JSON ONLY, with no extra text.

Required JSON structure:
{
  "propertyAddress": "full address including town and postcode",
  "postcode": "postcode only e.g. CF44 9EW",
  "currentRating": "single letter A-G",
  "currentScore": number,
  "potentialRating": "single letter A-G",
  "potentialScore": number,
  "energyCosts": {
    "heating": "e.g. £840",
    "hotWater": "e.g. £120",
    "lighting": "e.g. £60",
    "total": "e.g. £840"
  },
  "currentCO2": "e.g. 1.8 tonnes per year",
  "potentialCO2": "e.g. 1.6 tonnes per year",
  "environmentalRatingCurrent": "single letter A-G",
  "environmentalRatingPotential": "single letter A-G",
  "features": [
    { "name": "Walls", "description": "description without quality rating word" },
    { "name": "Roof", "description": "..." },
    { "name": "Floor", "description": "..." },
    { "name": "Windows", "description": "..." },
    { "name": "Main heating", "description": "boiler type only, NOT controls" },
    { "name": "Main heating controls", "description": "controls description" },
    { "name": "Lighting", "description": "..." }
  ],
  "improvements": [
    { "description": "improvement name", "typicalCostRange": "e.g. £300 - £500", "typicalAnnualSaving": "e.g. £150 per year" }
  ],
  "assessorName": "assessor's full name",
  "assessmentDate": "date of assessment e.g. 1 March 2026",
  "companyName": "accreditation scheme or assessor company name",
  "assessorContact": "phone number or email"
}

Rules:
- features: EXCLUDE "Secondary heating" if it is "None". EXCLUDE "Hot water" if it says "From main system". 
- features: Remove quality rating words (Good/Average/Poor/Very good/Very poor/N/A) from descriptions.
- features: "Main heating" description should be ONLY the boiler/heating system (e.g. "Boiler and radiators, mains gas"), NOT the controls.
- features: "Main heating controls" should be the controls ONLY (e.g. "Programmer, room thermostat and TRVs").
- energyCosts: If individual breakdown not available, use the total annual spend figure for "total". Use "£750–£900" style fallbacks for heating/hotWater/lighting if not present.
- currentCO2 / potentialCO2: extract from "This property produces X tonnes" section.
- assessmentDate: use "Date of assessment" NOT "Valid until" date.
- companyName: use the accreditation scheme name (e.g. "Elmhurst Energy Systems Ltd") if no company name is given.
- If a field is not found, use empty string "" for strings and 0 for numbers.

EPC TEXT:
${rawText.slice(0, 6000)}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  // Ensure required fields have safe defaults
  return {
    propertyAddress: parsed.propertyAddress || '',
    postcode: parsed.postcode || '',
    currentRating: parsed.currentRating || 'D',
    currentScore: Number(parsed.currentScore) || 63,
    potentialRating: parsed.potentialRating || 'C',
    potentialScore: Number(parsed.potentialScore) || 75,
    energyCosts: {
      heating: parsed.energyCosts?.heating || '£750–£900',
      hotWater: parsed.energyCosts?.hotWater || '£120–£150',
      lighting: parsed.energyCosts?.lighting || '£60–£80',
      total: parsed.energyCosts?.total || '£930–£1,130',
    },
    currentCO2: parsed.currentCO2 || '3.5 tonnes per year',
    potentialCO2: parsed.potentialCO2 || '2.5 tonnes per year',
    environmentalRatingCurrent: parsed.environmentalRatingCurrent || 'D',
    environmentalRatingPotential: parsed.environmentalRatingPotential || 'C',
    features: Array.isArray(parsed.features) ? parsed.features : [],
    improvements: Array.isArray(parsed.improvements)
      ? parsed.improvements.map((imp) => ({
          description: imp.description || '',
          typicalCostRange: imp.typicalCostRange || 'Contact installer for quote',
          typicalAnnualSaving: imp.typicalAnnualSaving || 'See EPC for details',
          ratingAfterImprovement: imp.ratingAfterImprovement || null,
        }))
      : [],
    assessorName: parsed.assessorName || 'EPC Assessor',
    assessmentDate: parsed.assessmentDate || new Date().toLocaleDateString('en-GB'),
    companyName: parsed.companyName || 'DOC Surveying Limited',
    assessorContact: parsed.assessorContact || '',
    rawText,
  };
}

function parseEPCFromText(text) {
  const { address, postcode } = extractAddress(text);
  const { currentRating, currentScore, potentialRating, potentialScore } = extractRatings(text);
  const energyCosts = extractEnergyCosts(text);
  const co2Data = extractCO2(text);
  const features = extractFeatures(text);
  const improvements = extractImprovements(text);
  const assessorDetails = extractAssessorDetails(text);

  return {
    propertyAddress: address,
    postcode,
    currentRating,
    currentScore,
    potentialRating,
    potentialScore,
    energyCosts,
    ...co2Data,
    features,
    improvements,
    ...assessorDetails,
    rawText: text,
  };
}

async function parseEPCFromPath(filePath) {
  const buffer = fs.readFileSync(filePath);
  return parseEPCFromBuffer(buffer);
}

module.exports = { parseEPCFromBuffer, parseEPCFromPath, parseEPCFromText };
