import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface AdminRowActionsProps {
  onEdit: () => void;
  onDelete: () => Promise<void>;
  itemLabel?: string;
}

export const AdminRowActions: React.FC<AdminRowActionsProps> = ({
  onEdit,
  onDelete,
  itemLabel = 'item',
}) => {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="inline-flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleConfirmDelete}
          disabled={deleting}
          className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60 transition-colors whitespace-nowrap"
        >
          {deleting ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${itemLabel}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${itemLabel}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-white border border-slate-200 rounded-md hover:bg-red-50 hover:border-red-200 transition-colors whitespace-nowrap"
      >
        <Trash2 className="w-3 h-3" />
        Delete
      </button>
    </div>
  );
};
