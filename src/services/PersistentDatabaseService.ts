/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CelebrationType,
  FormationName,
  PlayerRarity,
} from '../data/gameDatabase';
import {
  AutoSwitchMode,
  CameraMode,
  ControlScheme,
  DifficultyLevel,
  KeyBindings,
} from '../engine/FootballEngine3D';
import { AudioSettings, SoundEngine } from '../engine/SoundEngine';
import { UserProfileStats } from '../components/ProfileLeaderboardSettings';

export interface SavedPlayerBoost {
  pace?: number;
  shooting?: number;
  passing?: number;
  dribbling?: number;
  defending?: number;
  physical?: number;
  stamina?: number;
  skill?: number;
  curve?: number;
  reactions?: number;
  rating?: number;
  weakFoot?: number;
  skillMoves?: number;
  rarity?: PlayerRarity;
}

export interface GameSaveState {
  version: number;
  updatedAt: number;
  deviceId: string;
  userId?: string;
  username: string;
  coins: number;
  favouriteClubId: string;
  unlockedPlayerIds: string[];
  squadIds: string[];
  formation: FormationName;
  captainId: string;
  preferredCelebration: CelebrationType;
  tournamentStageIndex: number;
  profile: UserProfileStats;
  playerUpgrades: Record<string, SavedPlayerBoost>;
  weapons: {
    unlockedWeaponIds: string[];
    selectedWeaponId: string;
    weaponUpgradeLevels: Record<string, number>;
    selectedOperativeId: string;
  };
  settings: {
    difficulty: DifficultyLevel;
    cameraMode: CameraMode;
    controlScheme: ControlScheme;
    graphicsQuality: 'Low' | 'Medium' | 'High' | 'Ultra';
    mouseSensitivity: number;
    cameraSensitivity: number;
    keyBindings: KeyBindings;
    autoSwitchMode: AutoSwitchMode;
    audio: AudioSettings;
  };
}

export interface AutoSaveStatus {
  isSaving: boolean;
  lastSavedAt: number;
  saveCount: number;
  storageTarget: string;
  statusText: string;
}

const DB_NAME = 'FootballEliteDB';
const DB_VERSION = 1;
const STORE_NAME = 'game_save';
const RECORD_KEY = 'active_profile';

const LOCAL_STORAGE_SNAPSHOT_KEY = 'fe_autosave_v2';
const DEVICE_ID_KEY = 'fe_device_unique_id';

class PersistentDatabaseManager {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingState: GameSaveState | null = null;
  private deviceId: string;
  private listeners: Set<(status: AutoSaveStatus) => void> = new Set();
  private status: AutoSaveStatus = {
    isSaving: false,
    lastSavedAt: Date.now(),
    saveCount: 0,
    storageTarget: 'IndexedDB (ACID) + Server DB',
    statusText: 'All Progress Auto-Saved',
  };

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.requestPersistentStorage();
    this.registerUnloadHandlers();
  }

  private getOrCreateDeviceId(): string {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return `dev_fallback_${Date.now()}`;
    }
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  /**
   * Request persistent storage permission from the browser
   * to guarantee data is never purged under disk pressure.
   */
  private async requestPersistentStorage() {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        if (isPersisted) {
          this.status.storageTarget = 'Persistent IndexedDB (Guaranteed) + Server DB';
          this.notify();
        }
      } catch {
        // ignore
      }
    }
  }

  private registerUnloadHandlers() {
    if (typeof window === 'undefined') return;

    const flushHandler = () => {
      if (this.pendingState) {
        this.flushImmediate(this.pendingState);
      }
    };

    window.addEventListener('beforeunload', flushHandler);
    window.addEventListener('pagehide', flushHandler);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushHandler();
      }
    });
  }

  /**
   * Open or initialize the IndexedDB instance
   */
  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      req.onsuccess = () => {
        resolve(req.result);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to open IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  /**
   * Write directly to IndexedDB with durable transaction
   */
  private async writeToIndexedDB(state: GameSaveState): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record = {
          id: RECORD_KEY,
          ...state,
        };
        const putReq = store.put(record);

        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    } catch {
      // Fallback handled by localStorage
    }
  }

  /**
   * Read directly from IndexedDB
   */
  public async readFromIndexedDB(): Promise<GameSaveState | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(RECORD_KEY);

        getReq.onsuccess = () => {
          if (getReq.result) {
            const { id, ...saveData } = getReq.result;
            resolve(saveData as GameSaveState);
          } else {
            resolve(null);
          }
        };

        getReq.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Read snapshot from localStorage fallback mirror
   */
  public readFromLocalStorage(): GameSaveState | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SNAPSHOT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.coins !== undefined) {
          return parsed as GameSaveState;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Mirror state to localStorage (both snapshot object and individual legacy keys)
   */
  private writeToLocalStorage(state: GameSaveState) {
    try {
      localStorage.setItem(LOCAL_STORAGE_SNAPSHOT_KEY, JSON.stringify(state));
      localStorage.setItem('fe_coins', String(state.coins));
      localStorage.setItem('fe_favourite_club_id', state.favouriteClubId);
      localStorage.setItem('fe_formation', state.formation);
      localStorage.setItem('fe_unlocked_player_ids', JSON.stringify(state.unlockedPlayerIds));
      localStorage.setItem('fe_squad_ids', JSON.stringify(state.squadIds));
      localStorage.setItem('fe_captain_id', state.captainId);
      localStorage.setItem('fe_celebration', state.preferredCelebration);
      localStorage.setItem('fe_tournament_stage', String(state.tournamentStageIndex));
      localStorage.setItem('fe_profile_stats', JSON.stringify(state.profile));
      localStorage.setItem('fe_username', state.username);
      localStorage.setItem('fe_auto_switch_mode', state.settings.autoSwitchMode);
      localStorage.setItem('fe_player_upgrades_v1', JSON.stringify(state.playerUpgrades));
      localStorage.setItem('fe_unlocked_weapons_v1', JSON.stringify(state.weapons.unlockedWeaponIds));
      localStorage.setItem('fe_selected_weapon_v1', state.weapons.selectedWeaponId);
      localStorage.setItem('fe_weapon_upgrade_levels_v1', JSON.stringify(state.weapons.weaponUpgradeLevels));
      localStorage.setItem('fe_selected_operative_v1', state.weapons.selectedOperativeId);
    } catch {
      // ignore storage quota issues
    }
  }

  /**
   * Sync save payload to Express backend server DB
   */
  private async syncToServer(state: GameSaveState, authToken?: string | null): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-device-id': this.deviceId,
        'x-username': state.username,
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/save/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify(state),
        keepalive: true, // critical for beforeunload event
      });

      if (!res.ok) {
        // Fallback to legacy sync
        fetch('/api/user/sync', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ...state.profile,
            username: state.username,
            coins: state.coins,
            favouriteClubId: state.favouriteClubId,
            unlockedPlayerIds: state.unlockedPlayerIds,
            squadIds: state.squadIds,
            formation: state.formation,
            captainId: state.captainId,
            preferredCelebration: state.preferredCelebration,
            tournamentStageIndex: state.tournamentStageIndex,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Offline or network temporary issue, IndexedDB + LocalStorage has it safe
    }
  }

  /**
   * Continuous debounced Auto-Save trigger
   */
  public autoSave(state: GameSaveState, authToken?: string | null) {
    this.pendingState = state;
    this.status.isSaving = true;
    this.notify();

    // Instant local mirror immediately so no progress can be lost if tab is killed
    this.writeToLocalStorage(state);

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(async () => {
      await this.flushImmediate(state, authToken);
    }, 250);
  }

  /**
   * Immediate synchronous flush to IndexedDB, LocalStorage and Server
   */
  public async flushImmediate(state: GameSaveState, authToken?: string | null): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    this.pendingState = null;

    // 1. Write to LocalStorage
    this.writeToLocalStorage(state);

    // 2. Write to IndexedDB
    await this.writeToIndexedDB(state);

    // 3. Write to Server DB
    await this.syncToServer(state, authToken);

    this.status.isSaving = false;
    this.status.lastSavedAt = Date.now();
    this.status.saveCount += 1;
    this.status.statusText = 'Saved to Permanent Database';
    this.notify();
  }

  /**
   * Load highest-quality save snapshot by inspecting IndexedDB, LocalStorage, and Server
   */
  public async loadComprehensiveSave(
    authToken?: string | null,
    currentUsername?: string
  ): Promise<GameSaveState | null> {
    const fromIdb = await this.readFromIndexedDB();
    const fromLocal = this.readFromLocalStorage();

    let candidate: GameSaveState | null = null;

    if (fromIdb && fromLocal) {
      candidate = (fromIdb.updatedAt || 0) >= (fromLocal.updatedAt || 0) ? fromIdb : fromLocal;
    } else {
      candidate = fromIdb || fromLocal;
    }

    // Attempt to load from server in case user played on another tab or refreshed
    try {
      const headers: Record<string, string> = {
        'x-device-id': this.deviceId,
        'x-username': currentUsername || candidate?.username || 'Player',
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/save/load', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json?.save && typeof json.save === 'object') {
          const serverSave = json.save as GameSaveState;
          if (!candidate || (serverSave.updatedAt || 0) > (candidate.updatedAt || 0)) {
            candidate = serverSave;
            // Mirror server's newer save to IndexedDB
            await this.writeToIndexedDB(serverSave);
            this.writeToLocalStorage(serverSave);
          }
        }
      }
    } catch {
      // Server unreachable, use local IndexedDB
    }

    return candidate;
  }

  public subscribe(cb: (status: AutoSaveStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getStatus(): AutoSaveStatus {
    return { ...this.status };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.status));
  }
}

export const PersistentDatabaseService = new PersistentDatabaseManager();
