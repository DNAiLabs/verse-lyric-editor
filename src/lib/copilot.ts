import type { ActiveMode } from './supabase';
import {
  type LineAnalysis,
  detectRhymeScheme,
  getAvgSyllablesPerBar,
  getFlowPace,
  getTotalBars,
} from './lyrics';

const PERSONA_TIPS: Record<string, string[]> = {
  'eminem': [
    'Layer internal rhymes within each bar — rhyme mid-line words, not just end rhymes.',
    'Stack multi-syllabic rhyme chains across 4+ bars for maximum density.',
    'Use sudden rhythmic shifts: slow down for punchlines, then accelerate.',
  ],
  'kendrick lamar': [
    'Vary your pocket — drift slightly off-beat, then snap back for emphasis.',
    'Modulate your tone between conversational and explosive within a verse.',
    'Build a narrative arc; let the story dictate the flow changes.',
  ],
  'j. cole': [
    'Stay in the pocket — let the boom-bap groove breathe with conversational pauses.',
    'Prioritize clarity and message over technical density.',
    'Use reflective, honest imagery; the flow should feel like a late-night conversation.',
  ],
  'lil wayne': [
    'Chain punchlines and metaphors — each bar should have a quotable.',
    'Experiment with slant rhymes and unexpected wordplay.',
    'Use ad-libs and syncopation to create a bouncy, off-the-dome feel.',
  ],
  'drake': [
    'Blend melody into your flow — find the half-time pocket for hooks.',
    'Let vulnerability drive the cadence; sing-song bars create contrast.',
    'Build toward a melodic hook section within the verse.',
  ],
  'joyner lucas': [
    'Deploy double-time and triplet bursts to create dramatic intensity shifts.',
    'Use cinematic storytelling — paint the scene before accelerating.',
    'Switch between characters or perspectives to add narrative depth.',
  ],
  'logic': [
    'Push for breathless double-time runs with tongue-twister bars.',
    'Weave pop-culture references into rapid-fire rhyme chains.',
    'Maintain technical precision even at high speeds — every syllable should land.',
  ],
  'chris webby': [
    'Pack each bar with dense multis and back-to-back punchlines.',
    'Draw from battle-rap structure — setup, then payoff, every two bars.',
    'Layer pop-culture references into your rhyme schemes for surprise factor.',
  ],
};

const DEFAULT_TIPS = [
  'Focus on consistent end-rhymes to establish your scheme.',
  'Vary your syllable count to create rhythmic interest.',
  'Build toward a payoff or punchline every 4 bars.',
];

export function generateLyricResponse(
  userMessage: string,
  lines: LineAnalysis[],
  mode: ActiveMode,
  bpm: number,
  history: { role: string; content: string }[]
): string {
  const msg = userMessage.toLowerCase();
  const nonEmpty = lines.filter((l) => !l.isEmpty && !l.isSection);
  const totalBars = getTotalBars(lines);
  const avgSyl = getAvgSyllablesPerBar(lines);
  const pace = getFlowPace(bpm, avgSyl);
  const { scheme, pairs } = detectRhymeScheme(lines);

  if (msg.includes('hook') || msg.includes('chorus')) {
    return "Let's sharpen that hook. A great hook should be the most memorable part of the track — short, repeatable, and emotionally resonant. Try distilling your hook down to 2-4 bars with a melodic cadence that sticks. What's the core emotion or message you want listeners to walk away with?";
  }

  if (msg.includes('flow') || msg.includes('cadence') || msg.includes('rhythm')) {
    let response = `Looking at your flow right now: you've got ${totalBars} bars averaging ${avgSyl} syllables per bar at ${bpm} BPM, which lands in a "${pace}" pocket. `;
    if (avgSyl > 16) {
      response += "That's pretty dense — you're packing a lot into each bar. Consider where you can let the beat breathe. Even the most technical rappers leave space for the groove to land.";
    } else if (avgSyl < 6 && nonEmpty.length >= 2) {
      response += "Your bars are feeling spacious right now. That can work for a laid-back vibe, but try adding internal rhymes or multi-syllabic words to fill the pocket more.";
    } else {
      response += "That's sitting in a solid groove. To add dynamics, try varying your bar lengths — drop a few short bars before a dense run to create contrast and keep the listener locked in.";
    }
    return response;
  }

  if (msg.includes('rhyme') || msg.includes('scheme') || msg.includes('slant')) {
    let response = `Your current rhyme scheme is ${scheme || 'not yet established'} with ${pairs} rhyming pair${pairs !== 1 ? 's' : ''}. `;
    if (pairs === 0 && nonEmpty.length >= 2) {
      response += "Right now your bars aren't sharing end rhymes. Try matching the last word of consecutive lines — even simple AABB or ABAB patterns will give the verse structure and momentum.";
    } else if (pairs > 0) {
      response += "That's a solid foundation. To level up, try stacking internal rhymes — rhyme words in the middle of your bars, not just the ends. That's where the real density comes from.";
    }
    return response;
  }

  if (msg.includes('rewrite') || msg.includes('re-write') || msg.includes('tweak') || msg.includes('fix')) {
    return "Drop the bars you want to rework and I'll help you reshape them. Tell me what you're going for — harder punchline? Better flow? More emotional weight? The more specific you are about the vibe, the better I can help you craft it.";
  }

  if (msg.includes('verse') || msg.includes('story') || msg.includes('narrative')) {
    return `Story is everything. Right now you've got ${totalBars} bars to work with. Think about the arc: where does the verse start emotionally, where does it end? Even a verse about flexing should have a beginning, middle, and payoff. Try opening with a vivid image, building tension in the middle bars, and landing your strongest line near the end.`;
  }

  if (msg.includes('feedback') || msg.includes('review') || msg.includes('thoughts') || msg.includes('analyze')) {
    let response = "Here's what I'm hearing from your bars:\n\n";
    if (totalBars === 0) {
      response += "You haven't written anything yet — start dropping some bars and I'll give you real-time feedback on your flow, rhyme scheme, and overall cadence.";
    } else {
      response += `You've got ${totalBars} bars on the page`;
      if (avgSyl > 0) response += ` averaging ${avgSyl} syllables each at ${bpm} BPM — that's a "${pace}" pocket`;
      response += `. `;
      if (pairs > 0) {
        response += `Your rhyme scheme (${scheme}) has ${pairs} rhyming pair${pairs !== 1 ? 's' : ''}, which gives the verse good structural cohesion. `;
      } else {
        response += "I'm not seeing end rhymes yet — getting those locked in will give the verse a lot more momentum. ";
      }
      if (mode.type === 'persona') {
        const tips = PERSONA_TIPS[mode.persona.name.toLowerCase()] ?? DEFAULT_TIPS;
        response += `\n\nChanneling ${mode.persona.name}'s energy: ${tips[nonEmpty.length % tips.length]}`;
      }
      response += "\n\nWhat specifically do you want to work on? Flow? Rhymes? The hook?";
    }
    return response;
  }

  if (msg.includes('brainstorm') || msg.includes('idea') || msg.includes('help me write')) {
    return "I'm here for it. Tell me the vibe — is this a hard street record, a reflective introspective track, a club banger? What's the emotion? Once I know the energy you're going for, I can help you brainstorm hooks, structure the verse, or punch up your bars.";
  }

  // Default: contextual response
  if (nonEmpty.length === 0) {
    return "Start writing some bars in the editor and I'll be able to give you feedback on your flow, rhyme scheme, and cadence. Or ask me to help brainstorm a hook, structure a verse, or channel a specific style.";
  }

  let response = `I see ${totalBars} bars on the page`;
  if (avgSyl > 0) response += ` at ${avgSyl} syllables/bar in a "${pace}" pocket`;
  response += `. `;
  if (mode.type === 'persona') {
    response += `You're channeling ${mode.persona.name} right now. `;
  }
  response += "What do you want to dig into? I can help with your flow, rhyme scheme, hook impact, or story progression.";
  return response;
}

export function generateSuggestions(
  lines: LineAnalysis[],
  mode: ActiveMode,
  bpm: number
): { title: string; body: string; severity: 'info' | 'warning' | 'success' }[] {
  const suggestions: { title: string; body: string; severity: 'info' | 'warning' | 'success' }[] = [];
  const nonEmpty = lines.filter((l) => !l.isEmpty && !l.isSection);

  if (mode.type === 'raw' || nonEmpty.length === 0) return suggestions;

  const { scheme, pairs } = detectRhymeScheme(lines);
  const avgSyl = getAvgSyllablesPerBar(lines);
  const pace = getFlowPace(bpm, avgSyl);

  if (pairs > 0) {
    suggestions.push({
      title: 'Rhyme Scheme Locked',
      body: `Scheme: ${scheme}. ${pairs} rhyming pair${pairs !== 1 ? 's' : ''} across ${nonEmpty.length} bars.`,
      severity: 'success',
    });
  } else if (nonEmpty.length >= 2) {
    suggestions.push({
      title: 'No End Rhymes Yet',
      body: 'Match the last word of consecutive lines to build a scheme.',
      severity: 'warning',
    });
  }

  if (avgSyl > 0) {
    if (avgSyl > 18) {
      suggestions.push({
        title: 'High Density',
        body: `${avgSyl} syl/bar at ${bpm} BPM — "${pace}". Make sure you can deliver these cleanly.`,
        severity: 'warning',
      });
    } else {
      suggestions.push({
        title: 'Flow Cadence',
        body: `${avgSyl} syl/bar at ${bpm} BPM — "${pace}" pocket.`,
        severity: 'success',
      });
    }
  }

  if (mode.type === 'persona') {
    const tips = PERSONA_TIPS[mode.persona.name.toLowerCase()] ?? DEFAULT_TIPS;
    suggestions.push({
      title: `${mode.persona.name} Style Tip`,
      body: tips[nonEmpty.length % tips.length],
      severity: 'info',
    });
  }

  return suggestions;
}
