'use client';

import PageLayout from '../components/page-layout';
import { useViewTransitionRouter } from '../components/navigation';

export default function ProfilePage() {
  const { goBack } = useViewTransitionRouter();

  return (
    <PageLayout 
      title="Profile"
      showBackButton={true}
      onBackClick={goBack}
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 lg:space-y-6">
        <div className="prose prose-sm lg:prose-base max-w-none">
          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-xl border border-base-300">
              <div className="card-body text-center">
                <div className="avatar placeholder mx-auto">
                  <div className="bg-primary text-primary-content rounded-full w-24 shadow-lg">
                    <span className="text-3xl">👤</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold mt-4">User Name</h3>
                <p className="text-base-content/60 text-lg">user@example.com</p>
                <div className="badge badge-accent badge-lg mt-2">Premium User</div>
              </div>
            </div>
            <div className="stats shadow-lg border border-base-300">
              <div className="stat">
                <div className="stat-title">Total Payments</div>
                <div className="stat-value text-primary">147</div>
                <div className="stat-desc">↗︎ 12 this month</div>
              </div>
              <div className="stat">
                <div className="stat-title">Revenue</div>
                <div className="stat-value text-secondary">$12.4K</div>
                <div className="stat-desc">↗︎ 8% increase</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 