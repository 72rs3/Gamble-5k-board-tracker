import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Player, Status, StatusFilter, HistoryEntry, ManualOverridePayload, SortOption } from './types';
import PlayerList from './components/PlayerList';
import Controls from './components/Controls';
import Notifications from './components/Notifications';
import HistoryLog from './components/HistoryLog';
import { AddPlayerModal, ConfirmationModal, OverrideModal } from './components/Modals';
import { ELIGIBILITY_HOURS, INACTIVITY_DAYS, getNotificationMessage } from './utils/time';

type ConfirmationState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmButtonClass?: string;
};

// Helper functions for state serialization/deserialization
const encodeStateToHash = (state: { players: Player[]; historyLog: HistoryEntry[] }): string => {
  try {
    const jsonString = JSON.stringify(state);
    // Use the trick to handle UTF-8 characters correctly
    const base64 = btoa(unescape(encodeURIComponent(jsonString)));
    return base64;
  } catch (e) {
    console.error("Failed to encode state:", e);
    return '';
  }
};

const decodeStateFromHash = (hash: string): { players: Player[]; historyLog: HistoryEntry[] } | null => {
  if (!hash || hash.length < 2) return null;
  try {
    const base64 = hash.substring(1); // remove #
    const jsonString = decodeURIComponent(escape(atob(base64)));
    const decoded = JSON.parse(jsonString);
    // Basic validation to ensure it's the expected shape
    if (Array.isArray(decoded.players) && Array.isArray(decoded.historyLog)) {
        return decoded;
    }
    return null;
  } catch (e) {
    console.error("Failed to decode state from hash:", e);
    return null;
  }
};

// Helper to get initial state from URL hash or fallback to localStorage
const getInitialState = (): { players: Player[]; historyLog: HistoryEntry[] } => {
    const hashData = decodeStateFromHash(window.location.hash);
    if (hashData) {
        return { players: hashData.players, historyLog: hashData.historyLog };
    }

    try {
        const savedPlayers = localStorage.getItem('players');
        const savedHistory = localStorage.getItem('historyLog');
        const players = savedPlayers ? JSON.parse(savedPlayers) : [];
        const historyLog = savedHistory ? JSON.parse(savedHistory) : [];
        return { players, historyLog };
    } catch (error) {
        console.error("Failed to parse from localStorage", error);
        return { players: [], historyLog: [] };
    }
};

const App: React.FC = () => {
  const [initialState] = useState(getInitialState);

  const [players, setPlayers] = useState<Player[]>(initialState.players);
  const [historyLog, setHistoryLog] = useState<HistoryEntry[]>(initialState.historyLog);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('status');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [notifiedPlayerIds, setNotifiedPlayerIds] = useState(new Set<string>());
  const [isHistoryVisible, setHistoryVisible] = useState(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(() => {
    const saved = localStorage.getItem('showNotifications');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Modal states
  const [isAddPlayerModalOpen, setAddPlayerModalOpen] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState('');
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>({
    isOpen: false, title: '', message: '', onConfirm: () => {},
  });
  
  const updatePlayerStatus = useCallback(() => {
    const now = new Date();
    let hasChanged = false;

    const updatedPlayers = players.map(player => {
      let newStatus = player.status;
      if (player.status === Status.Eligible && player.eligibilityExpiresAt && now > new Date(player.eligibilityExpiresAt)) {
        newStatus = Status.NotEligible;
        hasChanged = true;
      } else if (player.status === Status.NotEligible && player.eligibilityExpiresAt) {
        const expiryDate = new Date(player.eligibilityExpiresAt);
        const inactiveDate = new Date(expiryDate.getTime() + INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
        if (now > inactiveDate) {
          newStatus = Status.Inactive;
          hasChanged = true;
        }
      }
      return newStatus !== player.status ? { ...player, status: newStatus } : player;
    });

    if (hasChanged) setPlayers(updatedPlayers);
  }, [players]);

  const generateNotifications = useCallback(() => {
    if (!showNotifications) {
      if (notifications.length > 0) setNotifications([]);
      return;
    }
    const newNotifications: string[] = [];
    players.forEach(player => {
        const msg = getNotificationMessage(player);
        if (msg) {
            newNotifications.push(msg);
            if (Notification.permission === 'granted' && !notifiedPlayerIds.has(player.id)) {
                new Notification('Player Eligibility Alert', { body: msg, tag: player.id });
                setNotifiedPlayerIds(prev => new Set(prev).add(player.id));
            }
        } else if (notifiedPlayerIds.has(player.id)) {
            setNotifiedPlayerIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(player.id);
                return newSet;
            });
        }
    });
    setNotifications(newNotifications);
  }, [players, showNotifications, notifications.length, notifiedPlayerIds]);

  useEffect(() => {
    if (showNotifications && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, [showNotifications]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      updatePlayerStatus();
      generateNotifications();
    }, 60 * 1000); 
    updatePlayerStatus();
    generateNotifications();
    return () => clearInterval(intervalId);
  }, [updatePlayerStatus, generateNotifications]);

  useEffect(() => {
    try {
      // Persist user-specific settings to localStorage only
      localStorage.setItem('showNotifications', JSON.stringify(showNotifications));
    } catch (error) {
      console.error("Failed to save notification preference to localStorage", error);
    }
  }, [showNotifications]);

  useEffect(() => {
    try {
      // Persist shared state to localStorage AND URL hash
      const stateToSave = { players, historyLog };
      localStorage.setItem('players', JSON.stringify(players));
      localStorage.setItem('historyLog', JSON.stringify(historyLog));

      const newHash = encodeStateToHash(stateToSave);
      const currentHash = window.location.hash.substring(1);

      if (players.length > 0 || historyLog.length > 0) {
        if (newHash && newHash !== currentHash) {
          window.history.replaceState(null, '', '#' + newHash);
        }
      } else if (currentHash) {
        // Clear hash if there's no data
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch (error) {
      console.error("Failed to save state to localStorage or URL", error);
    }
  }, [players, historyLog]);


  const addHistoryEntry = (playerName: string, action: string) => {
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      playerName,
      action,
      timestamp: new Date().toISOString(),
    };
    setHistoryLog(prev => [newEntry, ...prev].slice(0, 100)); // Keep last 100 entries
  };

  const handleMarkAsPlayed = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setConfirmationState({
      isOpen: true,
      title: 'Confirm Action',
      message: `Mark ${player.name} as played? This will reset their eligibility timer.`,
      confirmButtonClass: 'bg-sky-600 hover:bg-sky-500',
      onConfirm: () => {
        let playerName = '';
        const updatedPlayers = players.map(p => {
          if (p.id === playerId) {
            playerName = p.name;
            const now = new Date();
            const expiryDate = new Date(now.getTime() + ELIGIBILITY_HOURS * 60 * 60 * 1000);
            return {
              ...p,
              lastPlayed: now.toISOString(),
              eligibilityExpiresAt: expiryDate.toISOString(),
              status: Status.Eligible,
            };
          }
          return p;
        });
        setPlayers(updatedPlayers);
        if(playerName) addHistoryEntry(playerName, 'marked as played');
        setConfirmationState({ ...confirmationState, isOpen: false });
      },
    });
  };

  const handleAddPlayer = (name: string) => {
    const trimmedName = name.trim();
    if (players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setAddPlayerError('Player with this name already exists.');
      return;
    }

    const newPlayer: Player = {
      id: crypto.randomUUID(), name: trimmedName, lastPlayed: null, eligibilityExpiresAt: null, status: Status.NotEligible,
    };
    setPlayers(prev => [...prev, newPlayer]);
    addHistoryEntry(trimmedName, 'added to the tracker');
    setAddPlayerModalOpen(false);
  };

  const handleResetAll = () => setConfirmationState({
    isOpen: true, title: 'Reset All Data', message: 'Are you sure you want to reset all player data? This cannot be undone.',
    onConfirm: () => {
      setPlayers([]);
      setHistoryLog([]);
      setConfirmationState({ ...confirmationState, isOpen: false });
      addHistoryEntry('Admin', 'cleared all player data');
    },
  });
  
  const handleCleanupInactive = () => setConfirmationState({
    isOpen: true, title: 'Cleanup Inactive Players', message: 'Are you sure you want to permanently remove all inactive players?',
    onConfirm: () => {
      setPlayers(prev => prev.filter(p => p.status !== Status.Inactive));
      setConfirmationState({ ...confirmationState, isOpen: false });
      addHistoryEntry('Admin', 'cleaned up inactive players');
    },
  });

  const handleToggleNotifications = () => setShowNotifications(prev => !prev);

  const handleOpenOverrideModal = (player: Player) => setPlayerToEdit(player);

  const handleSaveOverride = (playerId: string, payload: ManualOverridePayload) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setConfirmationState({
      isOpen: true,
      title: 'Confirm Manual Override',
      message: `Are you sure you want to apply these changes to ${player.name}?`,
      confirmButtonClass: 'bg-sky-600 hover:bg-sky-500',
      onConfirm: () => {
        let playerName = '';
        const updatedPlayers = players.map(p => {
          if (p.id === playerId) {
            playerName = p.name;
            return {
                ...p,
                status: payload.status,
                eligibilityExpiresAt: payload.eligibilityExpiresAt,
                // If made not eligible, last played should not change, but if made eligible without expiry, clear it.
                lastPlayed: payload.status === Status.NotEligible ? p.lastPlayed : new Date().toISOString(),
            };
          }
          return p;
        });
        setPlayers(updatedPlayers);
        addHistoryEntry(playerName, `status manually set to ${payload.status}`);
        setPlayerToEdit(null);
        setConfirmationState({ ...confirmationState, isOpen: false });
      },
    });
  };
  
  const headerText = useMemo(() => {
    const eligibleCount = players.filter(p => p.status === Status.Eligible).length;
    return `Eligibility Tracker (${eligibleCount} / ${players.length} total)`;
  }, [players]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800 p-4 shadow-md">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-sky-400">{headerText}</h1>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <Controls
          searchText={searchText} onSearchChange={setSearchText} statusFilter={statusFilter}
          onFilterChange={setStatusFilter} sortOption={sortOption} onSortChange={setSortOption}
          onAddPlayer={() => {
            setAddPlayerError('');
            setAddPlayerModalOpen(true);
          }}
          onResetAll={handleResetAll} notificationsEnabled={showNotifications}
          onToggleNotifications={handleToggleNotifications} onCleanupInactive={handleCleanupInactive}
          onToggleHistory={() => setHistoryVisible(prev => !prev)}
        />
        {showNotifications && <Notifications messages={notifications} />}
        
        {isHistoryVisible && <HistoryLog history={historyLog} />}

        <PlayerList
          players={players} searchText={searchText} statusFilter={statusFilter} sortOption={sortOption}
          onMarkAsPlayed={handleMarkAsPlayed} onOpenOverrideModal={handleOpenOverrideModal}
        />
      </main>

      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => {
          setAddPlayerModalOpen(false);
          setAddPlayerError('');
        }}
        onAddPlayer={handleAddPlayer}
        error={addPlayerError}
        onClearError={() => setAddPlayerError('')}
      />
      <ConfirmationModal
        isOpen={confirmationState.isOpen} onClose={() => setConfirmationState({ ...confirmationState, isOpen: false })}
        onConfirm={confirmationState.onConfirm} title={confirmationState.title}
        confirmButtonClass={confirmationState.confirmButtonClass}
      >
        <p>{confirmationState.message}</p>
      </ConfirmationModal>
      <OverrideModal 
        isOpen={playerToEdit !== null}
        onClose={() => setPlayerToEdit(null)}
        onSave={handleSaveOverride}
        player={playerToEdit}
      />
    </div>
  );
};

export default App;
