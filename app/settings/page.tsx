'use client';

import PageLayout from '../components/page-layout';
import { useViewTransitionRouter } from '../components/navigation';

export default function SettingsPage() {
  const { goBack } = useViewTransitionRouter();

  return (
    <PageLayout 
      title="Settings"
      showBackButton={true}
      onBackClick={goBack}
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 lg:space-y-6">
        <div className="prose prose-sm lg:prose-base max-w-none">
          <div className="space-y-6">
            <div className="card bg-base-200/50 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="badge badge-primary badge-lg">⚙️</div>
                  <div>
                    <h3 className="card-title text-lg">Account Settings</h3>
                    <p className="text-base-content/70">Manage your account preferences</p>
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary btn-sm">Configure</button>
                </div>
              </div>
            </div>
            <div className="card bg-base-200/50 shadow-lg">
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="badge badge-secondary badge-lg">🔒</div>
                  <div>
                    <h3 className="card-title text-lg">Privacy</h3>
                    <p className="text-base-content/70">Control your privacy settings</p>
                  </div>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-secondary btn-sm">Manage</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 