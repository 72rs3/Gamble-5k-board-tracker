import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Player, Status, StatusFilter, HistoryEntry, ManualOverridePayload, SortOption } from './types';
import PlayerList from './components/PlayerList';
import Controls from './components/Controls';
import Notifications from './components/Notifications';
import HistoryLog from './components/HistoryLog';
import { AddPlayerModal, ConfirmationModal, OverrideModal } from './components/Modals';
import { ELIGIBILITY_HOURS, INACTIVITY_DAYS, getNotificationMessage } from './utils/time';
import { db } from './firebase';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
  writeBatch,
  getDocs,
} from 'firebase/firestore';


type ConfirmationState = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmButtonClass?: string;
};

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [historyLog, setHistoryLog] = useState<HistoryEntry[]>([]);
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

  useEffect(() => {
    const playersCollection = collection(db, 'players');
    const unsubscribePlayers = onSnapshot(playersCollection, (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Player[];
        setPlayers(playersData);
    });

    const historyCollection = collection(db, 'historyLog');
    const historyQuery = query(historyCollection, orderBy('timestamp', 'desc'), limit(100));
    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as HistoryEntry[];
        setHistoryLog(historyData);
    });

    return () => {
        unsubscribePlayers();
        unsubscribeHistory();
    };
  }, []);
  
  const updatePlayerStatus = useCallback(async () => {
    const now = new Date();
    const batch = writeBatch(db);
    let hasChanges = false;
    
    players.forEach(player => {
        let newStatus = player.status;
        let shouldUpdate = false;

        if (player.status === Status.Eligible && player.eligibilityExpiresAt && now > new Date(player.eligibilityExpiresAt)) {
            newStatus = Status.NotEligible;
            shouldUpdate = true;
        } else if (player.status === Status.NotEligible && player.eligibilityExpiresAt) {
            const expiryDate = new Date(player.eligibilityExpiresAt);
            const inactiveDate = new Date(expiryDate.getTime() + INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
            if (now > inactiveDate) {
                newStatus = Status.Inactive;
                shouldUpdate = true;
            }
        }

        if (shouldUpdate) {
            const playerDocRef = doc(db, 'players', player.id);
            batch.update(playerDocRef, { status: newStatus });
            hasChanges = true;
        }
    });

    if (hasChanges) {
        try {
            await batch.commit();
        } catch (error) {
            console.error("Error auto-updating player statuses: ", error);
        }
    }
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
      localStorage.setItem('showNotifications', JSON.stringify(showNotifications));
    } catch (error) {
      console.error("Failed to save notification preference to localStorage", error);
    }
  }, [showNotifications]);

  const addHistoryEntry = async (playerName: string, action: string) => {
    const newEntry: Omit<HistoryEntry, 'id'> = {
      playerName,
      action,
      timestamp: new Date().toISOString(),
    };
    try {
        await addDoc(collection(db, 'historyLog'), newEntry);
    } catch (error) {
        console.error("Error adding history entry: ", error);
    }
  };

  const handleMarkAsPlayed = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setConfirmationState({
      isOpen: true,
      title: 'Confirm Action',
      message: `Mark ${player.name} as played? This will reset their eligibility timer.`,
      confirmButtonClass: 'bg-sky-600 hover:bg-sky-500',
      onConfirm: async () => {
        const now = new Date();
        const expiryDate = new Date(now.getTime() + ELIGIBILITY_HOURS * 60 * 60 * 1000);
        const playerDocRef = doc(db, 'players', playerId);
        
        try {
            await updateDoc(playerDocRef, {
                lastPlayed: now.toISOString(),
                eligibilityExpiresAt: expiryDate.toISOString(),
                status: Status.Eligible,
            });
            await addHistoryEntry(player.name, 'marked as played');
            setConfirmationState({ ...confirmationState, isOpen: false });
        } catch (error) {
            console.error("Error updating player:", error);
        }
      },
    });
  };

  const handleAddPlayer = async (name: string) => {
    const trimmedName = name.trim();
    if (players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setAddPlayerError('Player with this name already exists.');
      return;
    }

    const newPlayer: Omit<Player, 'id'> = {
      name: trimmedName, lastPlayed: null, eligibilityExpiresAt: null, status: Status.NotEligible,
    };
    try {
        await addDoc(collection(db, 'players'), newPlayer);
        await addHistoryEntry(trimmedName, 'added to the tracker');
        setAddPlayerModalOpen(false);
    } catch (error) {
        console.error("Error adding player:", error);
        setAddPlayerError('Failed to add player. Please try again.');
    }
  };

  const handleResetAll = () => setConfirmationState({
    isOpen: true, title: 'Reset All Data', message: 'Are you sure you want to reset all player data? This cannot be undone.',
    onConfirm: async () => {
      const batch = writeBatch(db);
      try {
        const playersSnapshot = await getDocs(collection(db, 'players'));
        playersSnapshot.forEach(doc => batch.delete(doc.ref));

        const historySnapshot = await getDocs(collection(db, 'historyLog'));
        historySnapshot.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        await addHistoryEntry('Admin', 'cleared all player data');
        setConfirmationState({ ...confirmationState, isOpen: false });
      } catch (error) {
        console.error("Error resetting all data:", error);
      }
    },
  });
  
  const handleCleanupInactive = () => setConfirmationState({
    isOpen: true, title: 'Cleanup Inactive Players', message: 'Are you sure you want to permanently remove all inactive players?',
    onConfirm: async () => {
      const batch = writeBatch(db);
      players.filter(p => p.status === Status.Inactive).forEach(player => {
        batch.delete(doc(db, 'players', player.id));
      });

      try {
        await batch.commit();
        await addHistoryEntry('Admin', 'cleaned up inactive players');
        setConfirmationState({ ...confirmationState, isOpen: false });
      } catch (error) {
        console.error("Error cleaning up inactive players:", error);
      }
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
      onConfirm: async () => {
        const playerDocRef = doc(db, 'players', playerId);
        const updatePayload = {
            status: payload.status,
            eligibilityExpiresAt: payload.eligibilityExpiresAt,
            lastPlayed: payload.status === Status.NotEligible ? player.lastPlayed : new Date().toISOString(),
        };

        try {
            await updateDoc(playerDocRef, updatePayload);
            await addHistoryEntry(player.name, `status manually set to ${payload.status}`);
            setPlayerToEdit(null);
            setConfirmationState({ ...confirmationState, isOpen: false });
        } catch(error) {
            console.error("Error saving override:", error);
        }
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
