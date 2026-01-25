import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/app/actions/userActions';
import { getCalendarDashboardData } from '@/app/actions/calendarActions';
import { getFavoritesByBoardAction } from '@/app/actions/favoriteActions';
import DashboardCalendar from '@/components/DashboardCalendar';

const getInitials = (name?: string | null, email?: string | null) => {
  const safeName = name?.trim();
  if (safeName) {
    const parts = safeName.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');
    return initials || '?';
  }
  if (email && email.length > 0) {
    return email[0].toUpperCase();
  }
  return '?';
};

export default async function ProfileDashboardPage() {
  const profile = await getUserProfile();
  if (!profile) {
    redirect('/login');
  }

  const calendarData = await getCalendarDashboardData();
  const favoritesByBoard = await getFavoritesByBoardAction();
  const initials = getInitials(profile.name, profile.email);
  
  const favoriteItems = favoritesByBoard.flatMap(board => board.items.map(item => ({
    ...item,
    boardId: board.boardId,
    boardName: board.boardName,
  })));

  return (
    <div className="min-h-screen bg-neo-yellow text-black">
      <header className="sticky top-0 z-20 border-b-4 border-black bg-neo-yellow/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-display font-black text-lg border-2 border-black">
              P
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Dashboard</p>
              <p className="font-display font-black text-lg leading-none">Predi AI</p>
            </div>
          </div>
          <Link
            href="/"
            className="bg-white border-2 border-black shadow-neo-sm px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
          >
            Back to Workspace
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/profile"
            className="bg-white text-black border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-yellow transition-all"
          >
            Profile
          </Link>
          <Link
            href="/profile/dashboard"
            className="bg-black text-white border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest"
          >
            Dashboard
          </Link>
          <Link
            href="/profile/company"
            className="bg-white text-black border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-yellow transition-all"
          >
            Company
          </Link>
        </div>

        <section className="bg-white border-4 border-black shadow-neo p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-20 h-20 rounded-full border-4 border-black bg-neo-lime flex items-center justify-center font-display font-black text-2xl overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-display font-black">Marketing Dashboard</h1>
              <p className="text-sm font-bold text-gray-600 mt-1">{profile.email || 'Email not set'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="bg-neo-lime border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                  {profile.company || 'Add company'}
                </span>
                <span className="bg-neo-pink border-2 border-black px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                  {profile.jobTitle || 'Add role'}
                </span>
              </div>
            </div>
            <div className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest border-2 border-black">
              Dashboard Hub
            </div>
          </div>
        </section>

        <DashboardCalendar
          boards={calendarData.boards}
          calendarItems={calendarData.calendarItems}
        />

        <section className="bg-white border-4 border-black shadow-neo p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-black text-xl">Favorites</h2>
            <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
              {favoriteItems.length} Items
            </span>
          </div>
          {favoriteItems.length === 0 ? (
            <div className="mt-4 border-2 border-dashed border-black/30 p-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              No favorites yet
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {favoriteItems.map(item => (
                <div key={`${item.boardId}-${item.id}`} className="border-2 border-black bg-white overflow-hidden">
                  {item.previewUrl ? (
                    item.type === 'video' ? (
                      <video
                        src={item.previewUrl}
                        className="w-full h-24 object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img src={item.previewUrl} alt={item.title} className="w-full h-24 object-cover" />
                    )
                  ) : (
                    <div className="h-24 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      No preview
                    </div>
                  )}
                  <div className="border-t-2 border-black px-2 py-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest truncate">{item.title}</div>
                    <div className="text-[9px] uppercase tracking-widest text-gray-500 truncate">
                      {item.boardName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
