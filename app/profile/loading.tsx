export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-neo-yellow text-black">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6 animate-pulse">
        <div className="h-10 w-56 border-2 border-black bg-white" />
        <div className="h-44 w-full border-4 border-black bg-white" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-80 border-4 border-black bg-white" />
          <div className="h-80 border-4 border-black bg-white" />
        </div>
      </div>
    </div>
  );
}
