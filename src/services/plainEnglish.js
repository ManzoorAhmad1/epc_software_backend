'use strict';

function explainRating(rating, score) {
  const explanations = {
    A: 'Excellent – this property is highly energy efficient, keeping energy bills very low and carbon emissions minimal.',
    B: 'Very good – the property performs well, with low running costs and good insulation standards.',
    C: 'Good – above average efficiency. A few upgrades could push this into the top band.',
    D: 'Average – typical of most UK homes. Targeted improvements would noticeably reduce bills.',
    E: 'Below average – the property loses heat faster than ideal. Improvements are recommended.',
    F: 'Poor – significant energy is being wasted. Upgrades could lead to major savings.',
    G: 'Very poor – the least efficient rating. Heating costs are high and the home is likely draughty.',
  };
  const base = explanations[rating.toUpperCase()] || 'Rating information unavailable.';
  return score ? `${base} This property scores ${score} points on the EPC scale.` : base;
}

function explainImprovementPotential(currentRating, potentialRating, potentialScore) {
  if (currentRating === potentialRating) {
    return `Your home is already performing at its best potential rating (${currentRating}). Well done — no major upgrades are needed to reach your maximum efficiency.`;
  }
  const scoreNote = potentialScore ? ` (${potentialScore} points)` : '';
  return `Your home is currently rated ${currentRating} but has the potential to reach ${potentialRating}${scoreNote} with the recommended improvements. Moving up even one band can lead to meaningful savings on your energy bills.`;
}

function explainFeature(feature) {
  const name = feature.name || '';
  const description = feature.description || '';
  const lowerDesc = description.toLowerCase();

  if (name.toLowerCase().includes('wall')) {
    if (lowerDesc.includes('insulated') || lowerDesc.includes('cavity filled')) {
      return `Your walls are well insulated. This significantly reduces heat loss and keeps your home warmer for longer.`;
    } else if (lowerDesc.includes('no insulation') || lowerDesc.includes('as built')) {
      const hasExtensionCavity = lowerDesc.includes('sandstone') && lowerDesc.includes('cavity wall');
      const base = `Your walls currently have no insulation. Adding cavity or solid wall insulation is one of the most effective ways to reduce heat loss and lower your heating bills.`;
      return hasExtensionCavity
        ? `${base} The extension is assumed to have cavity wall insulation.`
        : base;
    }
    return `Your walls are a key factor in your home's energy performance. The current setup is: ${description}.`;
  }

  if (name.toLowerCase().includes('roof') || name.toLowerCase().includes('loft')) {
    if (lowerDesc.includes('200mm') || lowerDesc.includes('270mm')) {
      return `Your loft has good insulation depth, helping to trap warmth and reduce heating bills significantly.`;
    } else if (lowerDesc.includes('50mm') || lowerDesc.includes('100mm') || lowerDesc.includes('no insulation')) {
      return `Your loft insulation could be improved. Topping it up to 270mm is one of the cheapest and most impactful energy improvements available.`;
    }
    // Dual roof types: extension loft + main loft (e.g. "Pitched, insulated (assumed) | Pitched, 300 mm loft insulation")
    const hasDualRoof = description.includes('|');
    const has300mm = lowerDesc.includes('300 mm') || lowerDesc.includes('300mm');
    if (hasDualRoof && has300mm) {
      return `Your roof setup is: ${description}. It will not benefit you to add any more insulation in the extension loft, the main loft should be insulated to 300 mm.`;
    }
    return `Your roof setup is: ${description}. Check with an assessor whether additional insulation would be beneficial.`;
  }

  if (name.toLowerCase().includes('window')) {
    if (lowerDesc.includes('double') || lowerDesc.includes('triple')) {
      return `Double (or triple) glazing is in place, which helps retain heat and reduce draughts — a real comfort benefit.`;
    } else if (lowerDesc.includes('single')) {
      return `Your windows are single glazed. Upgrading to double glazing would noticeably reduce heat loss and improve comfort throughout the year.`;
    }
    return `Your windows are described as: ${description}.`;
  }

  if (name.toLowerCase().includes('heating')) {
    if (lowerDesc.includes('gas')) {
      return `The property uses a gas heating system. Gas is currently one of the more cost-effective ways to heat a home, though upgrading to a modern condensing boiler can improve efficiency further. (If it is a condensing boiler it will be efficient.)`;
    } else if (lowerDesc.includes('electric')) {
      return `The home uses electric heating.`;
    }
    return `Your main heating system is: ${description}.`;
  }

  if (name.toLowerCase().includes('lighting')) {
    if (lowerDesc.includes('low energy') || lowerDesc.includes('led')) {
      return `Low energy or LED lighting is already in use — great for reducing your electricity bill.`;
    } else if (lowerDesc.includes('no low energy') || lowerDesc.includes('standard')) {
      return `Switching to LED bulbs throughout the home is a quick and cheap way to cut your electricity use.`;
    }
    return `Your lighting setup: ${description}, ensure all your lights are low energy.`;
  }

  return `${name}: ${description}`;
}

function explainImprovement(improvement) {
  const description = improvement.description || '';
  const typicalCostRange = improvement.typicalCostRange || 'Contact installer for quote';
  const hasSaving = improvement.typicalAnnualSaving && improvement.typicalAnnualSaving !== 'See EPC for details';
  const savingText = hasSaving ? ` and could save around ${improvement.typicalAnnualSaving}` : '';  return {
    plainTitle: description,
    plainDescription: `This improvement typically costs ${typicalCostRange}${savingText}. It is a recommended measure to improve your home's energy efficiency and reduce your bills.`,
  };
}

function getBenefitsList(epcData) {
  const benefits = [];
  const current = epcData.currentRating?.toUpperCase();
  const potential = epcData.potentialRating?.toUpperCase();

  benefits.push('Lower energy bills every month');
  benefits.push('Improved comfort — warmer in winter, cooler in summer');
  benefits.push('Reduced carbon footprint');

  if (current && potential && current !== potential) {
    benefits.push(`Potential to move from rating ${current} to ${potential}`);
  }

  if (['E', 'F', 'G'].includes(current)) {
    benefits.push('Bringing the property into compliance with minimum energy efficiency standards');
  }

  benefits.push('Increased property value and appeal to buyers or tenants');
  benefits.push('Eligibility for government schemes such as the Great British Insulation Scheme');

  return benefits;
}

function getNextSteps(epcData) {
  const steps = [];
  const current = epcData?.currentRating?.toUpperCase();
  const improvements = epcData?.improvements || [];

  if (['F', 'G'].includes(current)) {
    steps.push('Contact your local council about energy efficiency funding — your rating may qualify you for grants.');
  }

  if (improvements.length > 0) {
    const firstImprovement = improvements[0].description;
    steps.push(`Start with the highest-impact measure: ${firstImprovement}.`);
  }

  steps.push('Request quotes from at least three certified installers for any major work.');
  steps.push('Check the Government\'s Simple Energy Advice website (simpleenergyadvice.org.uk) for up-to-date guidance and schemes, or your assessor may have contacts in the energy efficiency industry and can guide you with your application.');
  steps.push('Consider commissioning a home energy survey for a tailored improvement plan.');
  steps.push('Once initial improvements are complete, revisit the remaining recommendations to maximise savings.');

  return steps.length > 0 ? steps : [
    'Request quotes from certified installers for the recommended improvements.',
    'Check the Government\'s Simple Energy Advice website for grants and schemes.',
    'Consider a home energy survey for a fully tailored improvement plan.',
  ];
}

async function enhanceWithAI(epcData) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return epcData;

  try {
    const { OpenAI } = require('openai');
    const client = new OpenAI({ apiKey });

    const prompt = `You are an energy efficiency expert. Enhance the following EPC data with plain English explanations. Keep responses concise and homeowner-friendly.

Property: ${epcData.propertyAddress}
Current Rating: ${epcData.currentRating} (${epcData.currentScore})
Potential Rating: ${epcData.potentialRating} (${epcData.potentialScore})
Key Features: ${epcData.features?.slice(0, 3).map((f) => `${f.name}: ${f.description}`).join(', ')}
Top Improvements: ${epcData.improvements?.slice(0, 3).map((i) => i.description).join(', ')}

Please provide:
1. A brief (2-3 sentence) summary of this property's energy performance
2. The single most impactful improvement recommendation

Respond in JSON format: {"summary": "...", "topRecommendation": "..."}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      epcData.aiSummary = parsed.summary;
      epcData.aiTopRecommendation = parsed.topRecommendation;
    }
  } catch (err) {
    console.warn('AI enhancement skipped:', err.message);
  }

  return epcData;
}

module.exports = {
  explainRating,
  explainImprovementPotential,
  explainFeature,
  explainImprovement,
  getBenefitsList,
  getNextSteps,
  enhanceWithAI,
};
