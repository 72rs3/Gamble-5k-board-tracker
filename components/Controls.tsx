import React from 'react';
import { Status, StatusFilter, SortOption } from '../types';
import { UserAddIcon, RefreshIcon, TrashIcon, DocumentTextIcon } from './icons';

interface ControlsProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  onAddPlayer: () => void;
  onResetAll: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onCleanupInactive: () => void;
  onToggleHistory: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  searchText,
  onSearchChange,
  statusFilter,
  onFilterChange,
  sortOption,
  onSortChange,
  onAddPlayer,
  onResetAll,
  notificationsEnabled,
  onToggleNotifications,
  onCleanupInactive,
  onToggleHistory,
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 p-4 mb-6 rounded-b-lg border-b border-gray-700">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        {/* Search and Filter */}
        <div className="flex-grow w-full flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search players..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => onFilterChange(e.target.value as StatusFilter)}
            className="w-full sm:flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Statuses</option>
            <option value={Status.Eligible}>{Status.Eligible}</option>
            <option value={Status.NotEligible}>{Status.NotEligible}</option>
            <option value={Status.Inactive}>{Status.Inactive}</option>
          </select>
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full sm:flex-1 bg-gray-700 border border-gray-600 text-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="status">Sort by Status</option>
            <option value="name">Sort by Name (A-Z)</option>
            <option value="time">Sort by Time Left</option>
          </select>
        </div>

        {/* Admin Controls */}
        <div className="flex-shrink-0 w-full flex items-center justify-between md:w-auto md:justify-start gap-4">
          <label htmlFor="notif-toggle" className="flex items-center cursor-pointer" title="Toggle notifications">
            <span className="mr-2 text-sm text-gray-400">Alerts</span>
            <div className="relative">
              <input id="notif-toggle" type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={onToggleNotifications} />
              <div className="w-10 h-6 bg-gray-600 rounded-full peer-checked:bg-sky-500 transition-colors"></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-full"></div>
            </div>
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={onAddPlayer}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              title="Add a new player"
            >
              <UserAddIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Add</span>
            </button>
            <button
              onClick={onToggleHistory}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              title="Show/Hide History Log"
            >
              <DocumentTextIcon className="w-5 h-5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={onCleanupInactive}
              className="flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              title="Permanently remove inactive players"
            >
              <TrashIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Cleanup</span>
            </button>
            <button
              onClick={onResetAll}
              className="flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              title="Reset all player data"
            >
              <RefreshIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;