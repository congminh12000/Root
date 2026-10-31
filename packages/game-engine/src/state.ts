/**
 * Authoritative game state for the Root base game (Marquise, Eyrie, Alliance, Vagabond on the Autumn map).
 * Only the engine reads or writes this shape; clients receive a PlayerView (view.ts) projected from it.
 * Comments cite the Law by section, e.g. §2.2.3, as published in the Leder Rules Library p16 (decisions/0005).
 */

import type { DecreeColumnId, EyrieLeaderId, ItemType, MarquiseBuildingType, Suit, VagabondCharacterId } from '@root/game-data'
export type { CardSuit, ItemType, Suit } from '@root/game-data'

// ── Identifiers ────────────────────────────────────────────────────────────────

export type FactionId = 'marquise' | 'eyrie' | 'alliance' | 'vagabond'
export type Phase = 'birdsong' | 'daylight' | 'evening' // §1.4.1

/** Index into the map's clearing list (0-based in code; docs number clearings from 1). */
export type ClearingId = number
/** Index into the map's forest list (§2.4). */
export type ForestId = number
/** One physical card in the shared deck: a game-data card id plus copy number, e.g. "tax-collector#2". */
export type CardId = string
/** A game-data quest id (§9.5.5), e.g. "repair-a-shed". */
export type QuestId = string

export type MarquiseBuilding = MarquiseBuildingType
export type BuildingType = MarquiseBuilding | 'roost' | 'base'
export type TokenType = 'wood' | 'keep' | 'sympathy'

// ── Board ──────────────────────────────────────────────────────────────────────

/** A filled building slot (§2.2.3). Ruins fill a slot until removed (§2.2.4, §9.5.3). */
export type SlotContent =
  | { kind: 'building'; faction: FactionId; type: BuildingType; suit?: Suit } // suit only for Alliance bases
  | { kind: 'ruin'; items: ItemType[] } // hidden items, shuffled under the ruin (§9.3.4)

export interface ClearingState {
  /** Length equals the printed slot count; null is an open slot. */
  slots: (SlotContent | null)[]
  warriors: Partial<Record<FactionId, number>>
  tokens: { faction: FactionId; type: TokenType }[]
}

export type PawnLocation = { kind: 'clearing'; id: ClearingId } | { kind: 'forest'; id: ForestId }

// ── Factions ───────────────────────────────────────────────────────────────────

interface FactionBase {
  /** Warriors not on the map (§1.5.1 limits pieces to the box contents). */
  warriorSupply: number
  /** Items in the Crafted Items box (§4.1.2). The Vagabond keeps items on his own board instead. */
  craftedItems: ItemType[]
}

/** §6. Track counts are the buildings still on the faction board, left to right uncovers points (§6.5.4.III). */
export interface MarquiseState extends FactionBase {
  woodSupply: number
  buildingsOnTrack: Record<MarquiseBuilding, number>
  keep: ClearingId | null // §6.2.2, cannot return once removed
  recruitedThisTurn: boolean // §6.5.3 once per turn
  actionsRemaining: number // §6.5 three plus one per bird spent
}

export type EyrieLeader = EyrieLeaderId // §7.8
export type DecreeColumn = DecreeColumnId // §7.5.2
/** A card on the Decree: a deck card or one of the two Loyal Viziers (bird, never discarded by Purge §7.7.2). */
export type DecreeCard = { kind: 'card'; id: CardId } | { kind: 'vizier'; index: 0 | 1 }

export interface EyrieState extends FactionBase {
  roostsOnTrack: number // §7.3.5, rightmost empty space gives Evening points (§7.6.1)
  leader: EyrieLeader | null // null until chosen in setup (§7.3.3)
  leadersFaceUp: EyrieLeader[] // §7.7.3.I refills when empty
  decree: Record<DecreeColumn, DecreeCard[]>
  /** Decree cards already resolved this Daylight, by column (§7.5.2 resolves left to right, any order inside a column). */
  resolved: Record<DecreeColumn, number>
}

export interface AllianceState extends FactionBase {
  /** Face down; only the Alliance sees them (§8.2.3). Capacity 5 without bases (§8.2.3.I). */
  supporters: CardId[]
  sympathyOnTrack: number // §8.2.5, 10 total
  basesOnBoard: Record<Suit, ClearingId | null> // one base per suit (§8.3.2)
  officers: number // §8.5.3
}

export type VagabondCharacter = VagabondCharacterId // §V.1–V.3
/** Indifferent is 0; 3 is Allied. Hostile is a separate box (§9.2.9); steps and points are in game-data VAGABOND. */
export type Relationship = 0 | 1 | 2 | 3 | 'hostile'

export interface VagabondItem { type: ItemType; exhausted: boolean }

export interface VagabondState extends FactionBase {
  character: VagabondCharacter | null // null until chosen in setup (§9.3.1)
  pawn: PawnLocation | null // null until placed in setup (§9.3.2)
  /** §9.2.5.II boots, swords, crossbows, torches and hammers, plus tea, coins and bags while face down. */
  satchel: VagabondItem[]
  /** §9.2.5.I face-up tea, coins and bags sit on their tracks, max 3 each. */
  tracks: Record<'tea' | 'coin' | 'bag', number>
  damaged: VagabondItem[] // §9.2.7
  relationships: Partial<Record<FactionId, Relationship>>
  /** Aid given this turn per faction, toward the next relationship step (§9.2.9.I.a). */
  aidThisTurn: Partial<Record<FactionId, number>>
  completedQuests: QuestId[]
  /** Faction the Vagabond formed a coalition with (§9.2.8), if any. */
  coalition: FactionId | null
}

export interface FactionStates {
  marquise?: MarquiseState
  eyrie?: EyrieState
  alliance?: AllianceState
  vagabond?: VagabondState
}

// ── Decisions that interrupt the active player ─────────────────────────────────

/**
 * A choice the engine is waiting on. The player who must answer can differ from the active player
 * (ambush, field hospitals, outrage, hit order). Resolution is a stack: the newest decision answers first.
 */
export type PendingDecision =
  | { kind: 'ambush'; player: FactionId; clearing: ClearingId; role: 'defender' | 'attacker' } // §4.3.1
  | { kind: 'battle-effects'; player: FactionId; clearing: ClearingId; timing: 'before-roll' | 'after-roll' } // §4.3.2, §4.3.4
  | { kind: 'take-hits'; player: FactionId; clearing: ClearingId; hits: number } // §4.3.6 defender orders removal
  | { kind: 'field-hospital'; player: 'marquise'; clearing: ClearingId; warriors: number } // §6.2.3
  | { kind: 'outrage'; player: FactionId; clearing: ClearingId } // §8.2.6 payer chooses the card
  | { kind: 'discard-down'; player: FactionId; to: number } // §6.6, §7.6.2, §8.6.2, §9.6.3
  /** One step of a faction's setup (§5.1.7). Steps without a choice run automatically when they reach the top. */
  | { kind: 'setup'; player: FactionId; step: string }

// ── Whole game ─────────────────────────────────────────────────────────────────

export interface Seat {
  faction: FactionId
  /** Id the server matches against GameCommand.playerId. */
  playerId: string
  /** Account id for a human seat, bot profile id for a bot. Never trusted from client payloads. */
  controller: { kind: 'human'; userId: string } | { kind: 'bot'; profile: string }
}

export interface GameState {
  meta: {
    gameId: string
    /** Rules source the game was played under, e.g. "rules-library-p16" (docs/00-governance/decisions/0005-rules-library-primary.md). */
    rulesVersion: string
    /** Version of packages/game-data used to build this game. */
    dataVersion: string
    /** Increments on every accepted command; commands carry expectedRevision. */
    revision: number
    /** Last accepted actionIds, so a command retried after reconnect is applied at most once. */
    recentActionIds: string[]
  }
  /** Factions are still setting up (§5.1.7) until every setup decision is answered. */
  stage: 'setup' | 'play'
  /** Clockwise seating order (§1.4.1); seats[0] is the starting player (§5.1.1). */
  seats: Seat[]
  turn: { seat: number; phase: Phase; step: string; number: number }

  map: { id: string; clearings: ClearingState[] }

  /** Draw pile, top first. Hidden from every player (§1.2.2). */
  deck: CardId[]
  discard: CardId[] // public, searchable
  /** Dominance cards discarded to the map, takeable by spending a matching card (§3.3.3–3.3.4). */
  availableDominance: CardId[]
  hands: Partial<Record<FactionId, CardId[]>> // count public (§1.2.1)
  /** Persistent effects, activated dominance and revealed cards (§2.1.4). */
  playAreas: Partial<Record<FactionId, CardId[]>>

  itemSupply: Partial<Record<ItemType, number>> // §5.1.5
  questDeck: QuestId[] // hidden order
  questsAvailable: QuestId[] // three face up (§9.3.3)

  factions: FactionStates
  /** null after activating dominance or joining a coalition: no longer scores (§3.3.1, §9.2.8). */
  score: Partial<Record<FactionId, number | null>>
  /** Crafting pieces already activated this turn (§4.1.1), as clearing ids or 'vagabond'. */
  craftingUsed: (ClearingId | 'vagabond')[]

  pending: PendingDecision[]
  winner: { factions: FactionId[]; reason: 'points' | 'dominance' | 'coalition' } | null
}
