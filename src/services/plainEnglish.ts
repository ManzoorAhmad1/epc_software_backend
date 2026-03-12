import type { EnergyFeature, EPCData, Improvement } from './epcParser';

/*
 * Rule-based plain English rewriter.
 * Each function takes a raw EPC value and returns a human-friendly explanation.
 * In a later phase this can be replaced with an OpenAI API call.
 */

export function explainRating(rating: string, score: number): string {
  const descriptions: Record<string, string> = {
    A: `Your home has an excellent energy rating of ${rating} (${score}). This is one of the most energy-efficient ratings possible, meaning your home costs very little to heat and produces very few carbon emissions.`,
    B: `Your home has a very good energy rating of ${rating} (${score}). This means it is well-insulated and efficient to run, with lower-than-average energy bills.`,
    C: `Your home has a good energy rating of ${rating} (${score}). This is above average and indicates your home is reasonably energy efficient with moderate running costs.`,
    D: `Your home has an average energy rating of ${rating} (${score}). Many homes in the UK fall into this band. There are likely some improvements that could make your home cheaper to run.`,
    E: `Your home has a below-average energy rating of ${rating} (${score}). This suggests your home may cost more to heat than average, and there are clear improvements that could reduce your bills.`,
    F: `Your home has a poor energy rating of ${rating} (${score}). Your home is likely expensive to heat and may benefit significantly from energy efficiency improvements.`,
    G: `Your home has the lowest energy rating of ${rating} (${score}). This means the home is very expensive to run. Carrying out improvements could make a significant difference to your comfort and bills.`,
  };
  return descriptions[rating.toUpperCase()] || `Your home has an energy rating of ${rating} (${score}).`;
}

export function explainImprovementPotential(
  currentRating: string,
  potentialRating: string,
  potentialScore: number
): string {
  if (currentRating === potentialRating) {
    return `With the recommended improvements, your home could score ${potentialScore} points within the ${potentialRating} band. Every improvement made adds up and can reduce your energy bills.`;
  }
  return `If all the recommended improvements are carried out, your home's rating could rise from ${currentRating} to ${potentialRating} (${potentialScore} points). This could make a real difference to your energy bills and comfort.`;
}

export function explainFeature(feature: EnergyFeature): string {
  const name = feature.name.toLowerCase();
  const desc = feature.description.toLowerCase();

  if (name.includes('wall')) {
    if (desc.includes('solid') && desc.includes('no insulation')) {
      return 'Your walls are solid with no insulation. Solid walls lose heat more quickly than insulated cavity walls, which can make your home more expensive to heat.';
    }
    if (desc.includes('cavity') && desc.includes('no insulation')) {
      return 'Your walls have a cavity (gap) but no insulation has been installed. Adding cavity wall insulation is usually straightforward and can significantly reduce heat loss.';
    }
    if (desc.includes('insulated') || desc.includes('insulation')) {
      return 'Your walls are insulated, which helps keep heat inside your home and reduces your heating bills.';
    }
    return `Your walls are described as: ${feature.description}. Wall insulation can have a significant impact on how much heat your home retains.`;
  }

  if (name.includes('roof') || name.includes('loft')) {
    if (desc.includes('no insulation') || desc.includes('uninsulated')) {
      return 'Your roof/loft currently has no insulation. A large amount of heat is lost through the roof, so adding insulation is one of the most cost-effective improvements you can make.';
    }
    if (desc.includes('100mm') || desc.includes('150mm')) {
      return 'Your loft has some insulation, but adding more (up to 270mm) could improve efficiency further and reduce heat loss.';
    }
    if (desc.includes('270mm') || desc.includes('250mm')) {
      return 'Your loft is well insulated to the recommended depth, helping to keep heat in your home.';
    }
    return `Your roof/loft: ${feature.description}. Good loft insulation is one of the most impactful energy efficiency measures.`;
  }

  if (name.includes('floor')) {
    if (desc.includes('no insulation')) {
      return 'Your ground floor is not insulated. Insulating suspended floors can help reduce draughts and heat loss.';
    }
    return `Floor type: ${feature.description}. Floor insulation can help reduce heat loss, particularly in older properties.`;
  }

  if (name.includes('window')) {
    if (desc.includes('single glazed') || desc.includes('single-glazed')) {
      return 'Your windows are single glazed. Single glazing loses heat much more quickly than double or triple glazing. Upgrading to double glazing would improve your home\'s energy efficiency and comfort.';
    }
    if (desc.includes('double glazed') || desc.includes('double-glazed')) {
      return 'Your windows are double glazed, which is good for reducing heat loss and noise. Triple glazing could improve this further.';
    }
    return `Windows: ${feature.description}. Better-insulated windows can help keep heat in and reduce draughts.`;
  }

  if (name.includes('heating') && !name.includes('hot water')) {
    if (desc.includes('gas')) {
      return `Your home is heated by a gas boiler. ${feature.description}. Gas central heating is currently one of the most common heating systems in the UK.`;
    }
    if (desc.includes('electric')) {
      return `Your home uses electric heating. ${feature.description}. Electric heating can be more expensive to run than gas, depending on your tariff.`;
    }
    if (desc.includes('heat pump')) {
      return `Your home uses a heat pump system: ${feature.description}. Heat pumps are very efficient and environmentally friendly.`;
    }
    return `Heating system: ${feature.description}.`;
  }

  if (name.includes('hot water')) {
    return `Hot water supply: ${feature.description}. How efficiently your hot water is generated can make a noticeable difference to your energy bills.`;
  }

  if (name.includes('lighting')) {
    if (desc.includes('no low') || desc.includes('none')) {
      return 'Your home does not currently use low-energy lighting throughout. Switching to LED bulbs is a simple and inexpensive way to reduce your electricity bills.';
    }
    if (desc.includes('low energy') || desc.includes('led')) {
      return 'Your home uses energy-efficient lighting, which helps keep your electricity bills lower.';
    }
    return `Lighting: ${feature.description}. Switching all bulbs to LEDs is one of the cheapest improvements you can make.`;
  }

  return `${feature.name}: ${feature.description}.`;
}

export function explainImprovement(improvement: Improvement): {
  plainTitle: string;
  plainDescription: string;
} {
  const desc = improvement.description.toLowerCase();

  const explanations: { match: string; title: string; explanation: string }[] = [
    {
      match: 'loft insulation',
      title: 'Loft Insulation',
      explanation:
        "Heat rises, and a significant amount escapes through an uninsulated loft. Adding insulation is one of the most cost-effective improvements you can make. It keeps heat in during winter and can also help keep your home cooler in summer.",
    },
    {
      match: 'cavity wall',
      title: 'Cavity Wall Insulation',
      explanation:
        "If your home has cavity walls (two layers of brick with a gap between them), insulating this gap with a foam or bead material can significantly reduce heat loss. This is usually a quick job and could reduce your heating bills noticeably.",
    },
    {
      match: 'solid wall',
      title: 'Solid Wall Insulation',
      explanation:
        "Solid walls lose more heat than cavity walls. Insulation can be added to the inside or outside of the walls. While it is a larger investment, the savings in energy bills can be substantial over time.",
    },
    {
      match: 'floor insulation',
      title: 'Floor Insulation',
      explanation:
        "Insulating the floor, particularly in older homes with suspended timber floors, can reduce draughts and heat loss. This can make your home feel warmer and reduce your heating bills.",
    },
    {
      match: 'draught',
      title: 'Draught Proofing',
      explanation:
        "Sealing gaps around doors, windows, and pipework stops cold air getting in and warm air escaping. It is a simple and low-cost improvement that can make your home feel much more comfortable.",
    },
    {
      match: 'low energy lighting',
      title: 'Low Energy Lighting',
      explanation:
        "Replacing all your old bulbs with LED lights uses up to 80% less electricity. The bulbs last much longer too, so you save money on replacement costs as well as your energy bill.",
    },
    {
      match: 'solar',
      title: 'Solar Panels (Photovoltaic)',
      explanation:
        "Solar panels generate free electricity from daylight. Any electricity you do not use can be exported to the grid. While the upfront cost is higher, solar panels can significantly reduce your electricity bills over the long term.",
    },
    {
      match: 'heat pump',
      title: 'Heat Pump',
      explanation:
        "A heat pump extracts heat from the air or ground outside your home and uses it to heat your home and water. They are very efficient and can reduce carbon emissions significantly compared to gas boilers.",
    },
    {
      match: 'boiler',
      title: 'Boiler Upgrade',
      explanation:
        "If your boiler is old or inefficient, an upgrade to a modern condensing boiler can significantly reduce the amount of gas needed to heat your home. New boilers are much more efficient than older models.",
    },
    {
      match: 'double glazing',
      title: 'Double Glazing',
      explanation:
        "Replacing single-glazed windows with double glazing creates a thermal barrier that reduces heat loss, cuts draughts, and can also reduce noise from outside.",
    },
    {
      match: 'smart controls',
      title: 'Smart Heating Controls',
      explanation:
        "Smart thermostats and heating controls let you manage your heating more precisely. You can schedule heating to only come on when needed and control it remotely, which can cut your heating bills without reducing comfort.",
    },
    {
      match: 'solar water',
      title: 'Solar Water Heating',
      explanation:
        "A solar thermal system uses energy from the sun to heat your hot water. It won't cover all your hot water needs, but it can reduce the amount of gas or electricity needed, lowering your bills.",
    },
  ];

  for (const item of explanations) {
    if (desc.includes(item.match)) {
      return { plainTitle: item.title, plainDescription: item.explanation };
    }
  }

  return {
    plainTitle: improvement.description,
    plainDescription: `Installing ${improvement.description} can improve the energy efficiency of your home and help reduce your bills.`,
  };
}

export function getBenefitsList(epcData: EPCData): string[] {
  const benefits: string[] = [];

  const hasImprovements = epcData.improvements.length > 0;

  if (hasImprovements) {
    benefits.push('Lower energy bills — less money spent on heating, hot water, and lighting.');
  }

  benefits.push('A warmer and more comfortable home throughout the year.');
  benefits.push('Reduced carbon emissions — helping the environment for future generations.');

  if (epcData.currentRating < epcData.potentialRating) {
    benefits.push(
      `A higher EPC rating — from ${epcData.currentRating} to ${epcData.potentialRating} — which can increase the value of your property.`
    );
  }

  benefits.push('Potential access to government grants or funding schemes for energy improvements.');
  benefits.push('Increased comfort with fewer draughts, more consistent temperatures, and less condensation.');

  return benefits;
}

export function getNextSteps(): string[] {
  return [
    'Review the recommended improvements above and decide which ones are most suitable for your home.',
    'Contact local certified installers to get quotes for the work. Always get at least three quotes.',
    'Check whether you are eligible for any government grants or funding schemes such as the Great British Insulation Scheme or ECO4.',
    'If you are a landlord, be aware of the Minimum Energy Efficiency Standards (MEES) that may apply to your property.',
    'Contact your assessor if you have any questions about your EPC or the recommended improvements.',
    'Keep your EPC — it is valid for 10 years and will be needed if you sell or rent the property.',
  ];
}
