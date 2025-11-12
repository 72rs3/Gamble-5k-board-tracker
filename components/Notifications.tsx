
import React from 'react';
import { BellIcon } from './icons';

interface NotificationsProps {
  messages: string[];
}

const Notifications: React.FC<NotificationsProps> = ({ messages }) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-amber-300 flex items-center">
        <BellIcon className="w-6 h-6 mr-2" />
        Alerts
      </h2>
      <div className="bg-amber-900/50 border border-amber-700 rounded-lg p-4 space-y-2">
        {messages.map((msg, index) => (
          <p key={index} className="text-amber-200 text-sm">{msg}</p>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
