'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import {
  createCalendarItemAction,
  createCalendarItemsBatchAction,
  deleteCalendarItemsBatchAction,
  deleteCalendarItemAction,
  deleteCalendarItemsForDayAction,
  duplicateCalendarItemsToNextWeekAction,
  updateCalendarItemAction,
} from '@/app/actions/calendarActions';
import { useToast } from '@/components/Toast';

type CalendarBoardItem = {
  id: string;
  title: string;
  type: 'text' | 'image' | 'video' | 'carousel';
  previewUrl: string | null;
  createdAt: string;
};

type CalendarBoard = {
  id: string;
  name: string;
  items: CalendarBoardItem[];
};

type CalendarEntry = {
  id: string;
  boardId: string;
  boardName: string;
  itemId: string;
  itemTitle: string;
  itemType: 'text' | 'image' | 'video' | 'carousel';
  previewUrl: string | null;
  scheduledFor: string;
  note?: string | null;
};

type DashboardCalendarProps = {
  boards: CalendarBoard[];
  calendarItems: CalendarEntry[];
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLongDate = (date: Date) =>
  date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

const startOfWeek = (date: Date) => {
  const dayIndex = (date.getDay() + 6) % 7;
  const start = new Date(date);
  start.setDate(date.getDate() - dayIndex);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfWeek = (date: Date) => {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getMonthGrid = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - startOffset;
    const date = new Date(year, month, dayOffset + 1);
    return {
      date,
      inMonth: date.getMonth() === month,
    };
  });
};

const typeBadge = (type: CalendarEntry['itemType']) => {
  switch (type) {
    case 'video':
      return 'bg-amber-200';
    case 'carousel':
      return 'bg-sky-200';
    case 'image':
      return 'bg-emerald-200';
    default:
      return 'bg-gray-200';
  }
};

const renderPreview = (item: { previewUrl: string | null; itemType?: CalendarEntry['itemType']; type?: CalendarBoardItem['type'] }) => {
  const preview = item.previewUrl;
  if (!preview) {
    return (
      <div className="w-full h-20 rounded-lg bg-white/70 border border-white/70 flex items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        No preview
      </div>
    );
  }
  const type = item.itemType || item.type;
  if (type === 'video') {
    return (
      <video
        src={preview}
        className="w-full h-20 object-cover rounded-lg border border-white/70"
        muted
        playsInline
        preload="metadata"
      />
    );
  }
  return <img src={preview} alt="Preview" className="w-full h-20 object-cover rounded-lg border border-white/70" />;
};

const surfaceClass = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]';
const panelClass = 'rounded-2xl border border-white/60 bg-white/60 backdrop-blur-lg shadow-[0_10px_30px_rgba(0,0,0,0.1)]';
const softCardClass = 'rounded-xl border border-white/70 bg-white/70';
const pillClass = 'rounded-full bg-white/70 border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600';
const inputClass = 'w-full rounded-lg border border-black/10 bg-white/80 p-2 text-xs font-semibold text-gray-800 placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-black/10';
const buttonGhost = 'rounded-lg bg-white/70 border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 hover:bg-white transition-all';
const buttonPrimary = 'rounded-lg bg-black text-white border border-black px-4 py-3 text-xs font-semibold uppercase tracking-widest hover:bg-gray-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const buttonQuiet = 'rounded-lg bg-white/60 border border-white/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600 hover:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed';
const buttonSmall = 'rounded-md bg-black text-white border border-black px-3 py-1 text-[9px] font-semibold uppercase tracking-widest hover:bg-gray-900 transition-all';
const buttonSmallGhost = 'rounded-md bg-white/70 border border-black/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-gray-700 hover:bg-white transition-all';

const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ boards, calendarItems }) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedBoardId, setSelectedBoardId] = useState<string>(boards[0]?.id ?? '');
  const [selectedItemId, setSelectedItemId] = useState<string>(boards[0]?.items[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<CalendarEntry[]>(calendarItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState<string>(formatDateKey(new Date()));
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggedEntryId, setDraggedEntryId] = useState<string | null>(null);
  const [dragEnabled, setDragEnabled] = useState(true);
  const { showToast, showError, showSuccess } = useToast();

  const boardMap = useMemo(() => new Map(boards.map(board => [board.id, board])), [boards]);
  const selectedBoard = boardMap.get(selectedBoardId);
  const selectedItem = selectedBoard?.items.find(item => item.id === selectedItemId) || null;

  useEffect(() => {
    if (!selectedBoardId && boards.length > 0) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  useEffect(() => {
    if (!selectedBoard) {
      setSelectedItemId('');
      return;
    }
    if (!selectedItemId || !selectedBoard.items.some(item => item.id === selectedItemId)) {
      setSelectedItemId(selectedBoard.items[0]?.id ?? '');
    }
  }, [selectedBoard, selectedItemId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const media = window.matchMedia('(pointer: fine)');
    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setDragEnabled(event.matches);
    };
    update(media);
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const monthGrid = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = entry.scheduledFor.slice(0, 10);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(entry);
    }
    return map;
  }, [entries]);

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekStartKey = formatDateKey(weekStart);
  const weekEndKey = formatDateKey(weekEnd);
  const weekItems = entries.filter(entry => {
    const entryKey = entry.scheduledFor.slice(0, 10);
    return entryKey >= weekStartKey && entryKey <= weekEndKey;
  });
  const weeklyTotal = weekItems.length;
  const weeklyImages = weekItems.filter(item => item.itemType === 'image').length;
  const weeklyVideos = weekItems.filter(item => item.itemType === 'video').length;
  const weeklyCarousels = weekItems.filter(item => item.itemType === 'carousel').length;

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSchedule = () => {
    if (!selectedBoardId || !selectedItemId) {
      setError('Select a board and asset first.');
      showError('Select a board and asset first.');
      return;
    }
    setError(null);
    const scheduledFor = formatDateKey(selectedDate);
    startTransition(async () => {
      const result = await createCalendarItemAction({
        boardId: selectedBoardId,
        itemId: selectedItemId,
        scheduledFor,
        note: note.trim() || null,
      });
      if (!result?.success || !result.item) {
        setError(result?.error || 'Unable to schedule asset.');
        showError(result?.error || 'Unable to schedule asset.');
        return;
      }
      setEntries(prev => [result.item!, ...prev]);
      setNote('');
      showSuccess(`Scheduled asset for ${scheduledFor}.`);
    });
  };

  const handleMoveEntry = (calendarId: string, dayKey: string, noteOverride?: string | null) => {
    setError(null);
    const currentEntry = entries.find(entry => entry.id === calendarId);
    const previousDay = currentEntry?.scheduledFor.slice(0, 10) || null;
    const previousNote = currentEntry?.note ?? null;
    const nextNote = noteOverride !== undefined ? noteOverride : previousNote;
    startTransition(async () => {
      const result = await updateCalendarItemAction({
        calendarItemId: calendarId,
        scheduledFor: dayKey,
        note: nextNote,
      });
      if (!result?.success || !result.item) {
        setError(result?.error || 'Unable to move entry.');
        showError(result?.error || 'Unable to move entry.');
        return;
      }
      setEntries(prev => prev.map(entry => (entry.id === calendarId ? result.item! : entry)));
      setSelectedDate(new Date(`${dayKey}T12:00:00Z`));
      setEditingEntryId(null);
      const shouldOfferUndo = previousDay && (previousDay !== dayKey || previousNote !== nextNote);
      if (shouldOfferUndo && currentEntry) {
        showToast({
          message: `Moved "${currentEntry.itemTitle}" to ${dayKey}.`,
          type: 'info',
          duration: 8000,
          actionLabel: 'Undo',
          onAction: () => {
            startTransition(async () => {
              const undoResult = await updateCalendarItemAction({
                calendarItemId: calendarId,
                scheduledFor: previousDay,
                note: previousNote,
              });
              if (!undoResult?.success || !undoResult.item) {
                showError(undoResult?.error || 'Undo failed.');
                return;
              }
              setEntries(prev => prev.map(entry => (entry.id === calendarId ? undoResult.item! : entry)));
              setSelectedDate(new Date(`${previousDay}T12:00:00Z`));
            });
          },
        });
      } else if (currentEntry) {
        showSuccess(`Updated "${currentEntry.itemTitle}".`);
      }
    });
  };

  const handleRemove = (calendarId: string) => {
    setError(null);
    const removedEntry = entries.find(entry => entry.id === calendarId);
    startTransition(async () => {
      const result = await deleteCalendarItemAction(calendarId);
      if (!result?.success) {
        setError(result?.error || 'Unable to remove entry.');
        showError(result?.error || 'Unable to remove entry.');
        return;
      }
      setEntries(prev => prev.filter(entry => entry.id !== calendarId));
      if (removedEntry) {
        showToast({
          message: `Removed "${removedEntry.itemTitle}".`,
          type: 'warning',
          duration: 8000,
          actionLabel: 'Undo',
          onAction: () => {
            startTransition(async () => {
              const restore = await createCalendarItemsBatchAction({
                entries: [{
                  boardId: removedEntry.boardId,
                  itemId: removedEntry.itemId,
                  scheduledFor: removedEntry.scheduledFor.slice(0, 10),
                  note: removedEntry.note ?? null,
                }],
              });
              if (!restore?.success || !restore.items) {
                showError(restore?.error || 'Undo failed.');
                return;
              }
              setEntries(prev => [...restore.items!, ...prev]);
            });
          },
        });
      }
    });
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayItems = itemsByDate.get(selectedDateKey) || [];
  const todayKey = formatDateKey(new Date());
  const nextWeekKey = formatDateKey(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 7));

  const handleClearDay = () => {
    if (selectedDayItems.length === 0) {
      setError('No entries to clear.');
      showError('No entries to clear.');
      return;
    }
    const confirmed = window.confirm(`Clear ${selectedDayItems.length} scheduled asset(s) on ${formatLongDate(selectedDate)}?`);
    if (!confirmed) {
      return;
    }
    setError(null);
    const clearedEntries = [...selectedDayItems];
    startTransition(async () => {
      const result = await deleteCalendarItemsForDayAction({ day: selectedDateKey });
      if (!result?.success) {
        setError(result?.error || 'Unable to clear day.');
        showError(result?.error || 'Unable to clear day.');
        return;
      }
      setEntries(prev => prev.filter(entry => entry.scheduledFor.slice(0, 10) !== selectedDateKey));
      setEditingEntryId(null);
      showToast({
        message: `Cleared ${clearedEntries.length} asset(s) on ${selectedDateKey}.`,
        type: 'warning',
        duration: 9000,
        actionLabel: 'Undo',
        onAction: () => {
          startTransition(async () => {
            const restore = await createCalendarItemsBatchAction({
              entries: clearedEntries.map(entry => ({
                boardId: entry.boardId,
                itemId: entry.itemId,
                scheduledFor: entry.scheduledFor.slice(0, 10),
                note: entry.note ?? null,
              })),
            });
            if (!restore?.success || !restore.items) {
              showError(restore?.error || 'Undo failed.');
              return;
            }
            setEntries(prev => [...restore.items!, ...prev]);
          });
        },
      });
    });
  };

  const handleDuplicateDay = () => {
    if (selectedDayItems.length === 0) {
      setError('No entries to duplicate.');
      showError('No entries to duplicate.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await duplicateCalendarItemsToNextWeekAction({ day: selectedDateKey });
      if (!result?.success || !result.items) {
        setError(result?.error || 'Unable to duplicate day.');
        showError(result?.error || 'Unable to duplicate day.');
        return;
      }
      setEntries(prev => [...result.items!, ...prev]);
      const duplicatedIds = result.items.map(item => item.id);
      showToast({
        message: `Duplicated ${result.items.length} asset(s) to ${nextWeekKey}.`,
        type: 'info',
        duration: 9000,
        actionLabel: 'Undo',
        onAction: () => {
          startTransition(async () => {
            const undo = await deleteCalendarItemsBatchAction({ ids: duplicatedIds });
            if (!undo?.success) {
              showError(undo?.error || 'Undo failed.');
              return;
            }
            setEntries(prev => prev.filter(entry => !duplicatedIds.includes(entry.id)));
          });
        },
      });
    });
  };

  const handleStartEdit = (entry: CalendarEntry) => {
    setEditingEntryId(entry.id);
    setEditDate(entry.scheduledFor.slice(0, 10));
    setEditNote(entry.note || '');
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditNote('');
  };

  const handleSaveEdit = (entryId: string) => {
    if (!editDate) {
      setError('Pick a date to reschedule.');
      return;
    }
    handleMoveEntry(entryId, editDate, editNote.trim() || null);
  };

  const handleDragStart = (entryId: string) => (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/calendar-entry', entryId);
    event.dataTransfer.setData('text/plain', entryId);
    setDraggedEntryId(entryId);
  };

  const handleDragEnd = () => {
    setDraggedEntryId(null);
    setDragOverKey(null);
  };

  const handleDropOnDay = (dayKey: string) => (event: React.DragEvent<HTMLElement>) => {
    if (!dragEnabled) {
      return;
    }
    event.preventDefault();
    const entryId = event.dataTransfer.getData('text/calendar-entry') || event.dataTransfer.getData('text/plain');
    if (!entryId) {
      return;
    }
    setDragOverKey(null);
    handleMoveEntry(entryId, dayKey);
  };

  const handleDragOver = (dayKey: string) => (event: React.DragEvent<HTMLElement>) => {
    if (!dragEnabled) {
      return;
    }
    event.preventDefault();
    if (dragOverKey !== dayKey) {
      setDragOverKey(dayKey);
    }
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (dayKey: string) => () => {
    if (dragOverKey === dayKey) {
      setDragOverKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${surfaceClass} p-6`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Weekly Report</p>
            <h2 className="font-display font-black text-2xl">Week of {weekStart.toLocaleDateString()}</h2>
            <p className="text-sm text-gray-600">Track how your assets line up for the current week.</p>
          </div>
          <div className={pillClass}>
            {weeklyTotal} Scheduled Assets
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${softCardClass} p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Images</p>
            <p className="text-2xl font-black">{weeklyImages}</p>
          </div>
          <div className={`${softCardClass} p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Videos</p>
            <p className="text-2xl font-black">{weeklyVideos}</p>
          </div>
          <div className={`${softCardClass} p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Carousels</p>
            <p className="text-2xl font-black">{weeklyCarousels}</p>
          </div>
          <div className={`${softCardClass} p-4`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Focus Day</p>
            <p className="text-sm font-bold">
              {selectedDayItems.length > 0 ? `${selectedDayItems.length} assets on ${selectedDate.toLocaleDateString()}` : 'Pick a day'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`${surfaceClass} p-6`}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Calendar</p>
              <h3 className="font-display font-black text-xl">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className={buttonGhost}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className={buttonGhost}
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthGrid.map(({ date, inMonth }) => {
              const key = formatDateKey(date);
              const dayItems = itemsByDate.get(key) || [];
              const isToday = key === todayKey;
              const isSelected = key === selectedDateKey;
              const isDragOver = key === dragOverKey;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDate(new Date(date))}
                  onDragOver={handleDragOver(key)}
                  onDragLeave={handleDragLeave(key)}
                  onDrop={handleDropOnDay(key)}
                  className={`rounded-xl border border-white/70 p-2 text-left min-h-[110px] transition-all ${
                    inMonth ? 'bg-white/60' : 'bg-white/30 text-gray-400'
                  } ${isSelected ? 'ring-2 ring-black/10 bg-white/80' : ''} ${
                    isDragOver ? 'ring-2 ring-black/20 bg-white/80' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black ${isToday ? 'text-emerald-600' : ''}`}>
                      {date.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 2).map(item => (
                      <div key={item.id} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full border border-black/10 ${typeBadge(item.itemType)}`} />
                        <span className="text-[9px] font-bold uppercase tracking-widest truncate">
                          {item.itemTitle}
                        </span>
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
                        +{dayItems.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${panelClass} p-5 flex flex-col gap-4`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Schedule Panel</p>
            <h3 className="font-display font-black text-xl">{formatLongDate(selectedDate)}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
              {dragEnabled ? 'Drag cards to a new day on desktop.' : 'Drag is off on touch devices.'} Tap edit to move.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest">Board</label>
            <select
              value={selectedBoardId}
              onChange={event => setSelectedBoardId(event.target.value)}
              className={inputClass}
              disabled={boards.length === 0}
            >
              {boards.map(board => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
            {boards.length === 0 ? (
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Create a campaign board to start scheduling.
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest">Asset</label>
            <select
              value={selectedItemId}
              onChange={event => setSelectedItemId(event.target.value)}
              className={inputClass}
              disabled={!selectedBoard || selectedBoard.items.length === 0}
            >
              {(selectedBoard?.items || []).map(item => (
                <option key={item.id} value={item.id}>
                  [{item.type}] {item.title}
                </option>
              ))}
            </select>
            {!selectedBoard || selectedBoard.items.length === 0 ? (
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                No assets on this board yet.
              </p>
            ) : null}
          </div>

          {selectedItem && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Preview</p>
              {renderPreview({ previewUrl: selectedItem.previewUrl, type: selectedItem.type })}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest">Note (optional)</label>
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Add any reminder or caption goal..."
            />
          </div>

          <button
            type="button"
            onClick={handleSchedule}
            disabled={isPending || !selectedItemId || boards.length === 0}
            className={buttonPrimary}
          >
            {isPending ? 'Scheduling...' : 'Schedule Asset'}
          </button>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-rose-900">
              {error}
            </div>
          )}

          <div className="border-t border-white/70 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Scheduled for {formatLongDate(selectedDate)}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {selectedDayItems.length} assets
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDuplicateDay}
                disabled={selectedDayItems.length === 0 || isPending}
                className={buttonQuiet}
              >
                Duplicate to {nextWeekKey}
              </button>
              <button
                type="button"
                onClick={handleClearDay}
                disabled={selectedDayItems.length === 0 || isPending}
                className={buttonQuiet}
              >
                Clear Day
              </button>
            </div>
            {selectedDayItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-black/20 p-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Nothing scheduled yet.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayItems.map(item => (
                  <div
                    key={item.id}
                    draggable={dragEnabled}
                    onDragStart={handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                    aria-grabbed={draggedEntryId === item.id}
                    className={`rounded-xl border border-white/70 bg-white/70 p-2 transition-opacity ${
                      draggedEntryId === item.id ? 'opacity-60' : ''
                    } ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full border border-black/10 ${typeBadge(item.itemType)}`} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest">{item.itemTitle}</p>
                          <p className="text-[9px] uppercase tracking-widest text-gray-500">{item.boardName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="text-[9px] font-semibold uppercase tracking-widest text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          className="text-[9px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {editingEntryId === item.id ? (
                      <div className="mt-2 border-t border-white/70 pt-2 space-y-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Move to day</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={event => setEditDate(event.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Note</label>
                          <textarea
                            value={editNote}
                            onChange={event => setEditNote(event.target.value)}
                            rows={2}
                            className={inputClass}
                            placeholder="Add a reminder..."
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className={buttonSmall}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className={buttonSmallGhost}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      item.note && (
                        <p className="mt-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                          {item.note}
                        </p>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardCalendar;
