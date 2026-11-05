import type { FactionId, PlayerView } from '@root/game-engine'

/**
 * RD-M05: what the seat has left, always shown on its own badge like Root Digital's bottom-left panel
 * (docs/07-ui/root-digital/marquise.md §2): warriors in supply, the faction's own token or building supply, cards in
 * hand. Read straight from the public faction board in `PlayerView`; nothing is counted by the client.
 */
export interface Resource { icon: string; label: string; value: number }

export function ownResources(v: PlayerView, f: FactionId): Resource[] {
  const hand = { icon: 'card', label: 'Lá trên tay', value: v.handCounts[f] ?? 0 }
  switch (f) {
    case 'marquise': {
      const m = v.factions.marquise
      return m ? [{ icon: 'marquise', label: 'Chiến binh trong kho', value: m.warriorSupply }, { icon: 'wood', label: 'Gỗ trong kho', value: m.woodSupply }, hand] : [hand]
    }
    case 'eyrie': {
      const e = v.factions.eyrie
      return e ? [{ icon: 'eyrie', label: 'Chiến binh trong kho', value: e.warriorSupply }, { icon: 'throne', label: 'Roost còn trên track', value: e.roostsOnTrack }, hand] : [hand]
    }
    case 'alliance': {
      const a = v.factions.alliance
      return a ? [{ icon: 'alliance', label: 'Chiến binh trong kho', value: a.warriorSupply }, { icon: 'flame', label: 'Sympathy còn trên track', value: a.sympathyOnTrack },
        { icon: 'shield', label: 'Supporter', value: v.supporterCount }, hand] : [hand]
    }
    case 'vagabond': return [hand]
  }
}
