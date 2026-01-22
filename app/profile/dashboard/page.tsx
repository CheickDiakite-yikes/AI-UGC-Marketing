import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/app/actions/userActions';
import { getCalendarDashboardData } from '@/app/actions/calendarActions';
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
  const initials = getInitials(profile.name, profile.email);
  const surfaceClass = 'rounded-2xl border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)]';
  const pillClass = 'rounded-full bg-white/70 border border-black/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600';

  return (
    <div className="min-h-screen bg-[#F7F6F0] text-gray-900 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 w-72 h-72 bg-amber-100/60 blur-3xl"></div>
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-rose-100/50 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-100/40 blur-3xl"></div>
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:36px_36px]"></div>
      </div>
      <header className="relative z-20 sticky top-0 border-b border-white/60 bg-white/70 backdrop-blur">
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
            className="rounded-full bg-white/80 border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:bg-white transition-all"
          >
            Back to Workspace
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Link
            href="/profile"
            className="rounded-full bg-white/80 text-gray-700 border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-white transition-all"
          >
            Profile
          </Link>
          <Link
            href="/profile/dashboard"
            className="rounded-full bg-black text-white border border-black px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          >
            Dashboard
          </Link>
        </div>

        <section className={`${surfaceClass} p-6 md:p-8`}>
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-20 h-20 rounded-full border border-white/80 bg-white/80 flex items-center justify-center font-display font-black text-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-display font-black">Marketing Dashboard</h1>
              <p className="text-sm font-semibold text-gray-600 mt-1">{profile.email || 'Email not set'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={pillClass}>
                  {profile.company || 'Add company'}
                </span>
                <span className={pillClass}>
                  {profile.jobTitle || 'Add role'}
                </span>
              </div>
            </div>
            <div className={pillClass}>
              Dashboard Hub
            </div>
          </div>
        </section>

        <DashboardCalendar
          boards={calendarData.boards}
          calendarItems={calendarData.calendarItems}
        />
      </main>
    </div>
  );
}
