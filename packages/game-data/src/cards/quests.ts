import type { QuestDef } from '../types.ts'

/** The 15 base-game quests (Law §C.1.4, §9.5.5), read from the Leder Card Library images (SRC-005). */
export const BASE_QUESTS: QuestDef[] = [
  { id: 'errand-rabbit', name: 'Errand', suit: 'rabbit', items: ['tea', 'boots'], libraryId: 'ROOT-31' },
  { id: 'errand-fox', name: 'Errand', suit: 'fox', items: ['tea', 'boots'], libraryId: 'ROOT-32' },
  { id: 'escort', name: 'Escort', suit: 'mouse', items: ['boots', 'boots'], libraryId: 'ROOT-33' },
  { id: 'expel-bandits-rabbit', name: 'Expel Bandits', suit: 'rabbit', items: ['sword', 'sword'], libraryId: 'ROOT-34' },
  { id: 'expel-bandits-mouse', name: 'Expel Bandits', suit: 'mouse', items: ['sword', 'sword'], libraryId: 'ROOT-35' },
  { id: 'fend-off-a-bear-rabbit', name: 'Fend off a Bear', suit: 'rabbit', items: ['torch', 'crossbow'], libraryId: 'ROOT-36' },
  { id: 'fend-off-a-bear-mouse', name: 'Fend off a Bear', suit: 'mouse', items: ['torch', 'crossbow'], libraryId: 'ROOT-37' },
  { id: 'fundraising', name: 'Fundraising', suit: 'fox', items: ['tea', 'coin'], libraryId: 'ROOT-38' },
  { id: 'give-a-speech-rabbit', name: 'Give a Speech', suit: 'rabbit', items: ['torch', 'tea'], libraryId: 'ROOT-39' },
  { id: 'give-a-speech-fox', name: 'Give a Speech', suit: 'fox', items: ['torch', 'tea'], libraryId: 'ROOT-40' },
  { id: 'guard-duty-rabbit', name: 'Guard Duty', suit: 'rabbit', items: ['torch', 'sword'], libraryId: 'ROOT-41' },
  { id: 'guard-duty-mouse', name: 'Guard Duty', suit: 'mouse', items: ['torch', 'sword'], libraryId: 'ROOT-42' },
  { id: 'logistics-help-fox', name: 'Logistics Help', suit: 'fox', items: ['boots', 'bag'], libraryId: 'ROOT-43' },
  { id: 'logistics-help-mouse', name: 'Logistics Help', suit: 'mouse', items: ['boots', 'bag'], libraryId: 'ROOT-44' },
  { id: 'repair-a-shed', name: 'Repair a Shed', suit: 'fox', items: ['torch', 'hammer'], libraryId: 'ROOT-45' },
]
