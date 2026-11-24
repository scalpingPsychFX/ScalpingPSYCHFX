import React, { useEffect } from 'react';
import { ExternalLink, Pencil, X } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import type {
  Announcement,
  GoldAnalysis,
  Meeting,
  PortalNote,
  StrategyUpdate,
} from '../types';

export type DetailItem =
  | { kind: 'gold'; item: GoldAnalysis }
  | { kind: 'strategy'; item: StrategyUpdate }
  | { kind: 'meeting'; item: Meeting }
  | { kind: 'announcement'; item: Announcement }
  | { kind: 'note'; item: PortalNote };

interface DetailModalProps {
  detail: DetailItem | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (detail: DetailItem) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  detail,
  isAdmin,
  onClose,
  onEdit,
}) => {
  useEffect(() => {
    if (!detail) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums mb-1.5">
              {detail.kind === 'gold' && (
                <>
                  <span className="font-semibold text-amber-800">
                    {detail.item.pair}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{detail.item.date}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      detail.item.bias === 'Bullish'
                        ? 'text-emerald-700 font-medium'
                        : detail.item.bias === 'Bearish'
                          ? 'text-red-700 font-medium'
                          : 'text-slate-700 font-medium'
                    }
                  >
                    {detail.item.bias} Bias
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{detail.item.timeframe}</span>
                </>
              )}
              {detail.kind === 'strategy' && (
                <>
                  <span className="text-amber-800 font-medium">
                    {detail.item.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{detail.item.date}</span>
                </>
              )}
              {detail.kind === 'meeting' && (
                <>
                  <span className="text-slate-800 font-medium">
                    {detail.item.status === 'upcoming'
                      ? 'Upcoming Session'
                      : 'Completed Session'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{detail.item.date}</span>
                  <span aria-hidden="true">·</span>
                  <span>{detail.item.time}</span>
                </>
              )}
              {detail.kind === 'announcement' && (
                <>
                  <span
                    className={
                      detail.item.priority === 'Urgent'
                        ? 'text-red-700 font-medium'
                        : detail.item.priority === 'Important'
                          ? 'text-amber-800 font-medium'
                          : 'text-slate-700'
                    }
                  >
                    {detail.item.priority}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{detail.item.date}</span>
                </>
              )}
              {detail.kind === 'note' && (
                <>
                  <span className="text-amber-800 font-medium">
                    {detail.item.noteType === 'profile'
                      ? 'Desk Profile'
                      : 'Important Note'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{detail.item.date}</span>
                </>
              )}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 leading-snug">
              {detail.item.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(detail);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close detail view"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {detail.kind === 'gold' && (
            <>
              {(detail.item.entryZone ||
                detail.item.invalidation ||
                detail.item.targets) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-[#F8F8F6] border border-slate-200">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Entry Zone</div>
                    <div className="text-sm font-mono tabular-nums font-medium text-slate-900">
                      {detail.item.entryZone || 'See notes'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Invalidation</div>
                    <div className="text-sm font-mono tabular-nums font-medium text-red-700">
                      {detail.item.invalidation || 'See notes'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Targets</div>
                    <div className="text-sm font-mono tabular-nums font-medium text-emerald-700">
                      {detail.item.targets || 'See notes'}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">
                  Trade Strategy Notes
                </h3>
                <MarkdownContent content={detail.item.strategyNotes} />
              </div>
            </>
          )}

          {detail.kind === 'strategy' && (
            <>
              <div className="p-4 rounded-lg bg-[#F8F8F6] border border-slate-200 text-sm text-slate-800 font-medium">
                {detail.item.summary}
              </div>
              <MarkdownContent content={detail.item.details} />
            </>
          )}

          {detail.kind === 'meeting' && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                {detail.item.link && (
                  <a
                    href={detail.item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Join Meeting Link
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {detail.item.recordingLink && (
                  <a
                    href={detail.item.recordingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Watch Replay
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {detail.item.agendaOrRecap ? (
                <MarkdownContent content={detail.item.agendaOrRecap} />
              ) : (
                <p className="text-sm text-slate-500">
                  No additional agenda or recap notes provided.
                </p>
              )}
            </>
          )}

          {detail.kind === 'announcement' && (
            <MarkdownContent content={detail.item.body} />
          )}

          {detail.kind === 'note' && (
            <MarkdownContent content={detail.item.content} />
          )}
        </div>
      </div>
    </div>
  );
};
