import React, { useMemo } from 'react';
import { Player, Status, StatusFilter, SortOption } from '../types';
import PlayerCard from './PlayerCard';

interface PlayerListProps {
  players: Player[];
  searchText: string;
  statusFilter: StatusFilter;
  sortOption: SortOption;
  onMarkAsPlayed: (playerId: string) => void;
  onOpenOverrideModal: (player: Player) => void;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, searchText, statusFilter, sortOption, onMarkAsPlayed, onOpenOverrideModal }) => {

  const filteredAndSortedPlayers = useMemo(() => {
    return players
      .filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchText.toLowerCase());
        const matchesFilter = statusFilter === 'All' || player.status === statusFilter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'time':
            const timeA = a.status === Status.Eligible && a.eligibilityExpiresAt ? new Date(a.eligibilityExpiresAt).getTime() : Infinity;
            const timeB = b.status === Status.Eligible && b.eligibilityExpiresAt ? new Date(b.eligibilityExpiresAt).getTime() : Infinity;
            if (timeA !== timeB) return timeA - timeB;
            return a.name.localeCompare(b.name); // Fallback sort
          case 'status':
          default:
            const statusOrder = { [Status.Eligible]: 1, [Status.NotEligible]: 2, [Status.Inactive]: 3 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
              return statusOrder[a.status] - statusOrder[b.status];
            }
            return a.name.localeCompare(b.name); // Fallback sort
        }
      });
  }, [players, searchText, statusFilter, sortOption]);

  if (filteredAndSortedPlayers.length === 0) {
    return <p className="text-center text-gray-500 mt-10">No players match the current filters.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAndSortedPlayers.map(player => (
        <PlayerCard 
          key={player.id} 
          player={player} 
          onMarkAsPlayed={onMarkAsPlayed} 
          onOpenOverrideModal={onOpenOverrideModal} 
        />
      ))}
    </div>
  );
};

export default PlayerList;