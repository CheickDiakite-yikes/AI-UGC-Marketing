import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOnboardingStateAction, dismissOnboardingAction, resumeOnboardingAction, completeOnboardingAction, resetOnboardingAction } from '@/app/actions/boardActions';
import { logout } from '@/app/actions/authActions';
import { getUserProfile, updateUserPassword, updateUserProfile } from '@/app/actions/userActions';
import { getSubscriptionStateAction } from '@/app/actions/subscriptionActions';
import BillingControls from '@/components/BillingControls';

type ProfilePageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
  }>;
};

type Banner = {
  tone: 'success' | 'error';
  message: string;
} | null;

const getBanner = (searchParamsData?: { updated?: string; error?: string }): Banner => {
  const error = searchParamsData?.error;
  const updated = searchParamsData?.updated;

  const errorMessages: Record<string, string> = {
    missing_name: 'Please enter a name before saving your profile.',
    missing_password_fields: 'Please fill out all password fields.',
    password_mismatch: 'New password and confirmation do not match.',
    weak_password: 'New password must be at least 8 characters long.',
    invalid_current_password: 'Current password is incorrect.',
    missing_password: 'Password data is missing for this account.',
  };

  if (error) {
    return {
      tone: 'error',
      message: errorMessages[error] || 'Something went wrong. Please try again.',
    };
  }

  const updatedMessages: Record<string, string> = {
    profile: 'Profile updated successfully.',
    password: 'Password updated successfully.',
  };

  if (updated) {
    return {
      tone: 'success',
      message: updatedMessages[updated] || 'Changes saved.',
    };
  }

  return null;
};

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

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const profile = await getUserProfile();
  if (!profile) {
    redirect('/login');
  }

  const onboardingState = await getOnboardingStateAction();
  const subscriptionState = await getSubscriptionStateAction();

  const searchParamsData = searchParams ? await searchParams : undefined;
  const banner = getBanner(searchParamsData);
  const initials = getInitials(profile.name, profile.email);

  return (
    <div className="min-h-screen bg-neo-yellow text-black">
      <header className="sticky top-0 z-20 border-b-4 border-black bg-neo-yellow/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-display font-black text-lg border-2 border-black">
              P
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Profile</p>
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

      <main className="max-w-6xl mx-auto px-6 py-10">
        {banner && (
          <div
            className={`mb-6 border-2 border-black px-4 py-3 font-bold text-sm ${
              banner.tone === 'success' ? 'bg-neo-lime text-black' : 'bg-neo-pink text-black'
            }`}
          >
            {banner.message}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/profile"
            className="bg-black text-white border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest"
          >
            Profile
          </Link>
          <Link
            href="/profile/dashboard"
            className="bg-white text-black border-2 border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-neo-yellow transition-all"
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

        <section className="bg-white border-4 border-black shadow-neo p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-20 h-20 rounded-full border-4 border-black bg-neo-lime flex items-center justify-center font-display font-black text-2xl overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-display font-black">Account Profile</h1>
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
              Profile Hub
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="bg-white border-4 border-black shadow-neo p-6">
            <h2 className="font-display font-black text-xl mb-4">Account Details</h2>
            <form action={updateUserProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={profile.name || ''}
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Company</label>
                <input
                  type="text"
                  name="company"
                  defaultValue={profile.company || ''}
                  placeholder="Predi AI"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Role</label>
                <input
                  type="text"
                  name="jobTitle"
                  defaultValue={profile.jobTitle || ''}
                  placeholder="Marketing Lead"
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-pink/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Email (Read Only)</label>
                <input
                  type="email"
                  defaultValue={profile.email || ''}
                  disabled
                  className="w-full border-2 border-black p-3 font-bold bg-gray-100 text-gray-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white border-2 border-black py-3 font-bold uppercase tracking-widest hover:bg-neo-pink hover:text-black transition-all"
              >
                Update Profile
              </button>
            </form>
          </section>

          <section className="bg-white border-4 border-black shadow-neo p-6">
            <h2 className="font-display font-black text-xl mb-4">Security</h2>
            <form action={updateUserPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="w-full border-2 border-black p-3 font-bold bg-gray-50 focus:outline-none focus:bg-neo-cyan/10"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-black text-white border-2 border-black py-3 font-bold uppercase tracking-widest hover:bg-neo-cyan hover:text-black transition-all"
              >
                Update Password
              </button>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Use at least 8 characters.
              </p>
            </form>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-8">
          <section className="bg-white border-4 border-black shadow-neo p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-xl">Subscriptions and Billing</h2>
              <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                Live
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Manage plans, payment methods, and add-on credits.
            </p>
            <div className="mt-4 border-2 border-black p-4">
              <BillingControls
                planTier={subscriptionState.planTier}
                creditBalance={subscriptionState.creditBalance}
                subscriptionStatus={subscriptionState.subscriptionStatus}
              />
            </div>
          </section>

          <section className="bg-white border-4 border-black shadow-neo p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-black text-xl">Onboarding Tutorial</h2>
              <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                {onboardingState.completed ? 'Complete' : (onboardingState.dismissed ? 'Paused' : 'Active')}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Control the guided setup checklist. You can pause it or restart any time.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {!onboardingState.completed && !onboardingState.dismissed && (
                <>
                  <form action={dismissOnboardingAction}>
                    <button
                      type="submit"
                      className="bg-white border-2 border-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-all"
                    >
                      Later
                    </button>
                  </form>
                  <form action={completeOnboardingAction}>
                    <button
                      type="submit"
                      className="bg-neo-pink border-2 border-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                    >
                      Skip Tutorial
                    </button>
                  </form>
                </>
              )}
              {!onboardingState.completed && onboardingState.dismissed && (
                <form action={resumeOnboardingAction}>
                  <button
                    type="submit"
                    className="bg-neo-lime border-2 border-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                  >
                    Resume Tutorial
                  </button>
                </form>
              )}
              {onboardingState.completed && (
                <form action={resetOnboardingAction}>
                  <button
                    type="submit"
                    className="bg-neo-yellow border-2 border-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                  >
                    Restart Tutorial
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        <section className="bg-white border-4 border-black shadow-neo p-6 mt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-display font-black text-xl">Sign Out</h2>
              <p className="text-sm text-gray-600">Log out and return to the login screen.</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="bg-neo-pink border-2 border-black px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all"
              >
                Sign Out
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
