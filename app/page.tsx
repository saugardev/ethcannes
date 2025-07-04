'use client';

import PageLayout from './components/page-layout';
import { useViewTransitionRouter } from './components/navigation';

function HomePage() {
  const { navigateWithTransition } = useViewTransitionRouter();

  const handleOptionsClick = (option: number) => {
    console.log(`Option ${option} clicked`);
    
    switch (option) {
      case 1:
        navigateWithTransition('/settings');
        break;
      case 2:
        navigateWithTransition('/profile');
        break;
      case 3:
        navigateWithTransition('/help');
        break;
    }
  };

  const openDemoSubpage = () => {
    navigateWithTransition('/demo');
  };

  return (
    <PageLayout 
      title="Buddy"
      onOptionsClick={handleOptionsClick}
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
        <div className="hero bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 rounded-2xl shadow-xl border border-base-300">
          <div className="hero-content text-center py-8 lg:py-12">
            <div className="max-w-md">
              <div className="text-5xl lg:text-6xl mb-4">💳</div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Welcome to Buddy
              </h1>
              <p className="py-4 lg:py-6 text-base lg:text-lg text-base-content/80">
                Simple and secure payment processing made easy with modern design
              </p>
              <button 
                onClick={openDemoSubpage}
                className="btn btn-primary btn-lg shadow-lg"
              >
                <span>✨</span>
                Explore Demo
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          <div className="card bg-gradient-to-br from-primary/10 to-primary/20 shadow-xl border border-base-300 hover:shadow-2xl transition-all duration-300">
            <div className="card-body p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="text-2xl lg:text-3xl">💰</div>
                <div>
                  <h3 className="card-title text-base lg:text-lg">Payments</h3>
                  <p className="text-sm text-base-content/70">Process secure payments</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card bg-gradient-to-br from-secondary/10 to-secondary/20 shadow-xl border border-base-300 hover:shadow-2xl transition-all duration-300">
            <div className="card-body p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="text-2xl lg:text-3xl">📊</div>
                <div>
                  <h3 className="card-title text-base lg:text-lg">Analytics</h3>
                  <p className="text-sm text-base-content/70">View detailed reports</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-200/50 shadow-xl border border-base-300">
          <div className="card-body p-4 lg:p-6">
            <h3 className="card-title text-lg lg:text-xl flex items-center gap-2">
              <span>📈</span>
              Recent Activity
            </h3>
            <div className="space-y-3 lg:space-y-4 mt-4">
              <div className="flex justify-between items-center p-3 lg:p-4 bg-base-100 rounded-lg border border-base-300">
                <div className="flex items-center gap-3">
                  <div className="badge badge-success badge-sm">✓</div>
                  <span className="text-sm lg:text-base">Payment received</span>
                </div>
                <span className="text-success font-bold text-sm lg:text-base">+$25.00</span>
              </div>
              <div className="flex justify-between items-center p-3 lg:p-4 bg-base-100 rounded-lg border border-base-300">
                <div className="flex items-center gap-3">
                  <div className="badge badge-warning badge-sm">⚠</div>
                  <span className="text-sm lg:text-base">Service fee</span>
                </div>
                <span className="text-warning font-bold text-sm lg:text-base">-$1.25</span>
              </div>
              <div className="flex justify-between items-center p-3 lg:p-4 bg-base-100 rounded-lg border border-base-300">
                <div className="flex items-center gap-3">
                  <div className="badge badge-info badge-sm">ℹ</div>
                  <span className="text-sm lg:text-base">Account verification</span>
                </div>
                <span className="text-info font-bold text-sm lg:text-base">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function Page() {
  return <HomePage />;
}