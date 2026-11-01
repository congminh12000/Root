/** Room password kept in this browser only (multiplayer.md). */
export const roomKey = () => { try { return localStorage.getItem('root-room-key') ?? '' } catch { return '' } }
export const setRoomKey = (k: string) => { try { localStorage.setItem('root-room-key', k) } catch { /* private mode */ } }
export const api = (path: string, init: RequestInit = {}) => fetch(path, { ...init, headers: { ...(init.headers ?? {}), 'x-room-key': roomKey() } })
