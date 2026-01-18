'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { createCalendarItemAction, deleteCalendarItemAction } from '@/app/actions/calendarActions';

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
      return 'bg-neo-pink';
    case 'carousel':
      return 'bg-neo-cyan';
    case 'image':
      return 'bg-neo-lime';
    default:
      return 'bg-gray-200';
  }
};

const renderPreview = (item: { previewUrl: string | null; itemType?: CalendarEntry['itemType']; type?: CalendarBoardItem['type'] }) => {
  const preview = item.previewUrl;
  if (!preview) {
    return (
      <div className="w-full h-20 bg-gray-100 border-2 border-black flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
        No preview
      </div>
    );
  }
  const type = item.itemType || item.type;
  if (type === 'video') {
    return (
      <video
        src={preview}
        className="w-full h-20 object-cover border-2 border-black"
        muted
        playsInline
        preload="metadata"
      />
    );
  }
  return <img src={preview} alt="Preview" className="w-full h-20 object-cover border-2 border-black" />;
};

const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ boards, calendarItems }) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedBoardId, setSelectedBoardId] = useState<string>(boards[0]?.id ?? '');
  const [selectedItemId, setSelectedItemId] = useState<string>(boards[0]?.items[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<CalendarEntry[]>(calendarItems);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        return;
      }
      setEntries(prev => [result.item!, ...prev]);
      setNote('');
    });
  };

  const handleRemove = (calendarId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await deleteCalendarItemAction(calendarId);
      if (!result?.success) {
        setError(result?.error || 'Unable to remove entry.');
        return;
      }
      setEntries(prev => prev.filter(entry => entry.id !== calendarId));
    });
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayItems = itemsByDate.get(selectedDateKey) || [];
  const todayKey = formatDateKey(new Date());

  return (
    <div className="space-y-6">
      <section className="bg-white border-4 border-black shadow-neo p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Weekly Report</p>
            <h2 className="font-display font-black text-2xl">Week of {weekStart.toLocaleDateString()}</h2>
            <p className="text-sm text-gray-600">Track how your assets line up for the current week.</p>
          </div>
          <div className="bg-neo-yellow border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest">
            {weeklyTotal} Scheduled Assets
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border-2 border-black bg-gray-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Images</p>
            <p className="text-2xl font-black">{weeklyImages}</p>
          </div>
          <div className="border-2 border-black bg-gray-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Videos</p>
            <p className="text-2xl font-black">{weeklyVideos}</p>
          </div>
          <div className="border-2 border-black bg-gray-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Carousels</p>
            <p className="text-2xl font-black">{weeklyCarousels}</p>
          </div>
          <div className="border-2 border-black bg-gray-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Focus Day</p>
            <p className="text-sm font-bold">
              {selectedDayItems.length > 0 ? `${selectedDayItems.length} assets on ${selectedDate.toLocaleDateString()}` : 'Pick a day'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="bg-white border-4 border-black shadow-neo p-6">
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
                className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-cyan transition-all"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-pink transition-all"
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
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDate(new Date(date))}
                  className={`border-2 border-black p-2 text-left min-h-[110px] transition-all ${
                    inMonth ? 'bg-white' : 'bg-gray-100 text-gray-400'
                  } ${isSelected ? 'shadow-neo-sm bg-neo-yellow/30' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-black ${isToday ? 'text-neo-pink' : ''}`}>
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
                        <span className={`w-2 h-2 border border-black ${typeBadge(item.itemType)}`} />
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

        <div className="bg-white border-4 border-black shadow-neo p-5 flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Schedule Panel</p>
            <h3 className="font-display font-black text-xl">{formatLongDate(selectedDate)}</h3>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest">Board</label>
            <select
              value={selectedBoardId}
              onChange={event => setSelectedBoardId(event.target.value)}
              className="w-full border-2 border-black p-2 text-xs font-bold bg-gray-50"
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
              className="w-full border-2 border-black p-2 text-xs font-bold bg-gray-50"
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
              className="w-full border-2 border-black p-2 text-xs font-bold bg-gray-50"
              placeholder="Add any reminder or caption goal..."
            />
          </div>

          <button
            type="button"
            onClick={handleSchedule}
            disabled={isPending || !selectedItemId || boards.length === 0}
            className="bg-black text-white border-2 border-black px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neo-lime hover:text-black transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? 'Scheduling...' : 'Schedule Asset'}
          </button>

          {error && (
            <div className="border-2 border-black bg-neo-pink px-3 py-2 text-[10px] font-bold uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="border-t-2 border-black pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Scheduled for {formatLongDate(selectedDate)}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {selectedDayItems.length} assets
              </span>
            </div>
            {selectedDayItems.length === 0 ? (
              <div className="border-2 border-dashed border-black/30 p-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Nothing scheduled yet.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayItems.map(item => (
                  <div key={item.id} className="border-2 border-black bg-gray-50 p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 border border-black ${typeBadge(item.itemType)}`} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest">{item.itemTitle}</p>
                          <p className="text-[9px] uppercase tracking-widest text-gray-500">{item.boardName}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-[9px] font-bold uppercase tracking-widest text-red-600 hover:text-black"
                      >
                        Remove
                      </button>
                    </div>
                    {item.note && (
                      <p className="mt-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        {item.note}
                      </p>
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
