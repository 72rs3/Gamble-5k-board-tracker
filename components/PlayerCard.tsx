import React from 'react';
import { Player, Status } from '../types';
import { formatTimeLeft, formatLastPlayed } from '../utils/time';
import { useTimeUpdater } from '../hooks/useTimeUpdater';
import { ClockIcon, CheckCircleIcon, XCircleIcon, MoonIcon, PencilIcon } from './icons';

interface PlayerCardProps {
  player: Player;
  onMarkAsPlayed: (playerId: string) => void;
  onOpenOverrideModal: (player: Player) => void;
}

const statusConfig = {
  [Status.Eligible]: {
    bgColor: 'bg-emerald-900/60',
    borderColor: 'border-emerald-700',
    textColor: 'text-emerald-300',
    icon: <CheckCircleIcon className="w-5 h-5" />,
  },
  [Status.NotEligible]: {
    bgColor: 'bg-rose-900/60',
    borderColor: 'border-rose-700',
    textColor: 'text-rose-300',
    icon: <XCircleIcon className="w-5 h-5" />,
  },
  [Status.Inactive]: {
    bgColor: 'bg-gray-800/60',
    borderColor: 'border-gray-600',
    textColor: 'text-gray-400',
    icon: <MoonIcon className="w-5 h-5" />,
  },
};

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onMarkAsPlayed, onOpenOverrideModal }) => {
  useTimeUpdater(1000); // Re-render every second for live countdown
  const config = statusConfig[player.status];
  const isEligible = player.status === Status.Eligible;

  return (
    <div className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor} shadow-lg transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-sky-400 ${isEligible ? 'pulse-border-eligible' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
            <h3 className="text-xl font-bold text-gray-100">{player.name}</h3>
            <div className="text-xs text-gray-400 mt-1">
                Last Played: {formatLastPlayed(player.lastPlayed)}
            </div>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${config.bgColor} ${config.textColor}`}>
          {config.icon}
          {player.status}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {player.status === Status.Eligible && player.eligibilityExpiresAt && (
          <div className="flex items-center text-sky-300 font-medium">
            <ClockIcon className="w-4 h-4 mr-2" />
            <span>{formatTimeLeft(player.eligibilityExpiresAt)}</span>
          </div>
        )}
      </div>
      
      <div className="mt-5 pt-4 border-t border-gray-700/50 flex gap-2">
        <button
          onClick={() => onMarkAsPlayed(player.id)}
          className="flex-grow bg-sky-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-400 transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed"
          disabled={player.status === Status.Eligible}
          title={player.status === Status.Eligible ? "Player is already eligible" : "Mark as played and reset timer"}
        >
          {player.status === Status.Eligible ? 'Eligible' : 'Mark Played'}
        </button>
        <button
          onClick={() => onOpenOverrideModal(player)}
          className="flex-shrink-0 bg-gray-600 text-white font-bold p-2 rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-sky-400 transition-colors duration-200"
          title="Manually edit player status"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PlayerCard;