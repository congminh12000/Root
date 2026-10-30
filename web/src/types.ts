export interface Card {
  id: number; name: string; suit: string; effect: string; cost: Record<string, number>;
  points: number; item: string | null;
}
export interface Item { id: number; kind: string; exhausted: boolean; damaged: boolean }
export interface Player {
  id: number; faction: string; name: string; color: string; score: number;
  hand?: number[]; hand_count?: number; supporters?: number[]; supporter_count?: number;
  reserve: number; officers: number; effects: number[]; crafted: string[]; items: Item[];
  position: number; leader: string; decree: Record<string, { id: number; suit: string }[]>;
  relationships: number[]; completed: number[]; dominance: number | null; coalition: number | null;
}
export interface Clearing {
  id: number; name: string; suit: string; slots: number; x: number; y: number;
  paths: number[]; warriors: number[]; buildings: { player: number; kind: string }[];
  wood: number; sympathy: boolean; keep: boolean; ruin: boolean | string | null;
}
export interface GameEvent { seq: number; turn: number; kind: string; text: string; loc?: number; player?: number }
export interface Snapshot {
  sequence: number; turn: number; current: number; actor: number; phase: string; remaining: number;
  seed: number; ruleset: string; status: string; winner: number | null; winners: number[];
  players: Player[]; clearings: Clearing[]; events: GameEvent[]; quests: number[];
  discard: number[]; items: Record<string, number>;
}
export interface Match {
  id: string; created: number; seed: number; status: string;
  meta: { agents: string[]; seating: string[]; ruleset: string };
  final: { winner: number | null; scores: number[]; turn: number } | null;
}
export interface Meta { name: string; ruleset: string; reference: string; cards: Card[]; differences: string[] }
