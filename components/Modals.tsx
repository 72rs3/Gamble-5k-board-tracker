import React, { useState, useEffect, useRef } from 'react';
import { UserAddIcon, PencilIcon } from './icons';
import { Player, Status, ManualOverridePayload } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 border border-gray-700 transform transition-all"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-sky-400">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddPlayer: (name: string) => void;
    error: string;
    onClearError: () => void;
}

export const AddPlayerModal: React.FC<AddPlayerModalProps> = ({ isOpen, onClose, onAddPlayer, error, onClearError }) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAddPlayer(name.trim());
        }
    };

    // On successful add, the modal closes and name is cleared via onClose in App.tsx
    useEffect(() => {
      if (!isOpen) {
        setName('');
      }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Player">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-1">
                        Player's Name
                    </label>
                    <input
                        ref={inputRef}
                        type="text"
                        id="playerName"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (error) onClearError();
                        }}
                        className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="e.g., John Doe"
                    />
                    {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="submit" className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!name.trim()}>
                        <UserAddIcon className="w-5 h-5" />
                        Add Player
                    </button>
                </div>
            </form>
        </Modal>
    );
};

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
    confirmButtonClass?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children, confirmButtonClass = 'bg-red-700 hover:bg-red-600' }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="text-gray-300">{children}</div>
            <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                    Cancel
                </button>
                <button onClick={onConfirm} className={`${confirmButtonClass} text-white font-semibold py-2 px-4 rounded-md transition-colors`}>
                    Confirm
                </button>
            </div>
        </Modal>
    );
};


interface OverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (playerId: string, payload: ManualOverridePayload) => void;
    player: Player | null;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({ isOpen, onClose, onSave, player }) => {
    const [status, setStatus] = useState<Status>(Status.NotEligible);
    const [expiry, setExpiry] = useState('');

    useEffect(() => {
        if (player) {
            setStatus(player.status);
            if (player.eligibilityExpiresAt) {
                // Format for datetime-local input: YYYY-MM-DDTHH:mm
                const d = new Date(player.eligibilityExpiresAt);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                setExpiry(`${year}-${month}-${day}T${hours}:${minutes}`);
            } else {
                setExpiry('');
            }
        }
    }, [player]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (player) {
            onSave(player.id, {
                status,
                eligibilityExpiresAt: status === Status.Eligible && expiry ? new Date(expiry).toISOString() : null,
            });
        }
    };
    
    if (!player) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit: ${player.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="playerStatus" className="block text-sm font-medium text-gray-300 mb-1">
                        Status
                    </label>
                    <select id="playerStatus" value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500">
                        <option value={Status.Eligible}>Eligible</option>
                        <option value={Status.NotEligible}>Not Eligible</option>
                        <option value={Status.Inactive}>Inactive</option>
                    </select>
                </div>

                {status === Status.Eligible && (
                    <div>
                        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-300 mb-1">
                            Eligibility Expires At (Optional)
                        </label>
                        <input
                            type="datetime-local"
                            id="expiryDate"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                    </div>
                )}
                
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                        Cancel
                    </button>
                    <button type="submit" className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-md transition-colors">
                        <PencilIcon className="w-5 h-5" />
                        Save Changes
                    </button>
                </div>
            </form>
        </Modal>
    );
};