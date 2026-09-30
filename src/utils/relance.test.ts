import { describe, expect, it } from 'vitest';
import {
  buildCampaignPayload,
  campaignFilter,
  creditsNeeded,
  dayLabel,
  defaultCampaignName,
  deriveRelanceState,
  filleulsCovered,
  frenchError,
  journeyBuckets,
  nextMessageLabel,
  periodToRange,
  type CampaignDraft,
} from './relance';

const base = { enabled: true, sendingPaused: false, emailBalance: 100, smsBalance: 0, messagesSentToday: 0, maxMessagesPerDay: 500 };

describe('deriveRelanceState — is anything being sent right now?', () => {
  it('is running with credits and room left today', () => {
    expect(deriveRelanceState(base)).toBe('running');
  });

  it('is paused when the parrain switched it off, whatever the credits', () => {
    expect(deriveRelanceState({ ...base, enabled: false })).toBe('paused');
    expect(deriveRelanceState({ ...base, enabled: false, emailBalance: 0 })).toBe('paused');
  });

  it('treats the old global pause as paused — accounts that used it still carry it', () => {
    expect(deriveRelanceState({ ...base, sendingPaused: true })).toBe('paused');
  });

  it('is out of credits when both balances are empty', () => {
    expect(deriveRelanceState({ ...base, emailBalance: 0, smsBalance: 0 })).toBe('no_credits');
  });

  it('is not out of credits while SMS credits remain', () => {
    expect(deriveRelanceState({ ...base, emailBalance: 0, smsBalance: 10 })).toBe('running');
  });

  it('has reached today\'s limit exactly at the limit', () => {
    expect(deriveRelanceState({ ...base, messagesSentToday: 499 })).toBe('running');
    expect(deriveRelanceState({ ...base, messagesSentToday: 500 })).toBe('daily_limit');
  });

  it('falls back to the server default limit when none is known', () => {
    expect(deriveRelanceState({ ...base, maxMessagesPerDay: undefined, messagesSentToday: 500 })).toBe('daily_limit');
  });
});

describe('credits in filleuls', () => {
  it('counts a filleul as 7 emails', () => {
    expect(filleulsCovered(3000)).toBe(428);
    expect(filleulsCovered(6)).toBe(0);
    expect(filleulsCovered(-5)).toBe(0);
    expect(creditsNeeded(142)).toBe(994);
  });
});

describe('journeyBuckets', () => {
  it('puts active filleuls not on any day into "waiting for the first message"', () => {
    const b = journeyBuckets({
      activeTargets: 100,
      dayProgression: [{ day: 1, count: 20 }, { day: 3, count: 5 }, { day: 7, count: 1 }],
      targetsConverted: 4,
      completedRelance: 9,
    });
    expect(b.waiting).toBe(74);
    expect(b.days).toEqual([20, 0, 5, 0, 0, 0, 1]);
    expect(b.paid).toBe(4);
    expect(b.finished).toBe(9);
    expect(b.inProgress).toBe(100);
  });

  it('never shows a negative waiting count when the numbers disagree', () => {
    const b = journeyBuckets({ activeTargets: 3, dayProgression: [{ day: 2, count: 5 }] });
    expect(b.waiting).toBe(0);
    expect(b.inProgress).toBe(5);
  });

  it('copes with missing stats', () => {
    expect(journeyBuckets({ activeTargets: 0 })).toEqual({ waiting: 0, days: [0, 0, 0, 0, 0, 0, 0], paid: 0, finished: 0, inProgress: 0 });
  });
});

describe('wording', () => {
  it('names the day, including day 0', () => {
    expect(dayLabel(0)).toBe('Premier message bientôt');
    expect(dayLabel(3)).toBe('Jour 3 sur 7');
    expect(dayLabel(9)).toBe('Jour 7 sur 7');
  });

  it('says when the next message goes', () => {
    const now = new Date(2026, 8, 30, 10, 0);
    expect(nextMessageLabel(new Date(2026, 8, 30, 9, 0).toISOString(), now)).toBe('Envoi en cours');
    expect(nextMessageLabel(new Date(2026, 8, 30, 14, 30).toISOString(), now)).toBe("Aujourd'hui à 14h30");
    expect(nextMessageLabel(new Date(2026, 9, 1, 9, 5).toISOString(), now)).toBe('Demain à 09h05');
    expect(nextMessageLabel(new Date(2026, 9, 3, 8, 0).toISOString(), now)).toBe('Samedi à 08h00');
    expect(nextMessageLabel(undefined, now)).toBe('');
  });

  it('keeps French server messages and replaces English ones', () => {
    expect(frenchError("Vous n'avez plus de crédits de relance.", 'x')).toBe("Vous n'avez plus de crédits de relance.");
    expect(frenchError('Campaign not found', 'x')).toBe('Campagne introuvable.');
    expect(frenchError('Something failed in the pipeline', 'Réessayez.')).toBe('Réessayez.');
    expect(frenchError(undefined, 'Réessayez.')).toBe('Réessayez.');
  });
});

describe('campaigns', () => {
  const now = new Date('2026-09-30T12:00:00Z');
  const draft: CampaignDraft = { name: '', period: '3m', countries: [], skipAlreadyInRelance: true };

  it('turns a period into a registration window', () => {
    expect(periodToRange('30d', now)).toEqual({ registrationDateFrom: '2026-08-31' });
    expect(periodToRange('all', now)).toEqual({});
    expect(periodToRange('custom', now, { from: '2026-01-01', to: '2026-03-31' }))
      .toEqual({ registrationDateFrom: '2026-01-01', registrationDateTo: '2026-03-31T23:59:59.999Z' });
    expect(periodToRange('custom', now, { from: '2026-01-01' })).toEqual({ registrationDateFrom: '2026-01-01' });
  });

  it('only ever targets filleuls who have not paid', () => {
    expect(campaignFilter(draft, now).subscriptionStatus).toBe('non-subscribed');
  });

  it('leaves countries out unless some are chosen', () => {
    expect(campaignFilter(draft, now)).not.toHaveProperty('countries');
    expect(campaignFilter({ ...draft, countries: ['CM', 'CI'] }, now).countries).toEqual(['CM', 'CI']);
  });

  it('names the campaign by date when the parrain leaves the name empty', () => {
    expect(buildCampaignPayload(draft, now).name).toBe(defaultCampaignName(now));
    expect(buildCampaignPayload({ ...draft, name: '  Mes anciens  ' }, now).name).toBe('Mes anciens');
  });

  it('sends no custom messages when the parrain keeps SBC\'s', () => {
    expect(buildCampaignPayload(draft, now)).not.toHaveProperty('customMessages');
  });

  it('sends only the days written, using the French text for English too', () => {
    const p = buildCampaignPayload({
      ...draft,
      ownMessages: { 1: { subject: ' Salut ', text: ' Bonjour {{name}} ' }, 2: { subject: 'x', text: '   ' }, 5: { subject: '', text: 'Dernière chance' } },
    }, now);
    expect(p.customMessages).toEqual([
      { dayNumber: 1, subject: 'Salut', messageTemplate: { fr: 'Bonjour {{name}}', en: 'Bonjour {{name}}' } },
      { dayNumber: 5, messageTemplate: { fr: 'Dernière chance', en: 'Dernière chance' } },
    ]);
  });
});

describe('SMS credits in filleuls', () => {
  it('counts a filleul as 8 SMS — day 0 plus the 7 days', async () => {
    const { filleulsCoveredBySms } = await import('./relance');
    expect(filleulsCoveredBySms(250)).toBe(31);
  });
});
