import React from 'react';
import { HistoryEntry } from '../types';
import { formatRelativeTime } from '../utils/time';
import { DocumentTextIcon } from './icons';

interface HistoryLogProps {
  history: HistoryEntry[];
}

const HistoryLog: React.FC<HistoryLogProps> = ({ history }) => {
  return (
    <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 text-indigo-300 flex items-center">
        <DocumentTextIcon className="w-6 h-6 mr-2" />
        Activity Log
      </h2>
      {history.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No activity has been recorded yet.</p>
      ) : (
        <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {history.map((entry) => (
            <li key={entry.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-gray-700/50">
              <div>
                <span className="font-semibold text-sky-300">{entry.playerName}</span>
                <span className="text-gray-300 ml-2">{entry.action}</span>
              </div>
              <span className="text-gray-400 text-xs flex-shrink-0 ml-4">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryLog;
