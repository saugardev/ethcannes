'use client';

import PageLayout from '../components/page-layout';
import { useViewTransitionRouter } from '../components/navigation';

export default function HelpPage() {
  const { goBack } = useViewTransitionRouter();

  return (
    <PageLayout 
      title="Help & Support"
      showBackButton={true}
      onBackClick={goBack}
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 lg:space-y-6">
        <div className="prose prose-sm lg:prose-base max-w-none">
          <div className="space-y-6">
            <div className="alert alert-info shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>Need help? We&apos;re here to assist you!</span>
            </div>
            <div className="card bg-base-200/50 shadow-lg border border-base-300">
              <div className="card-body">
                <h3 className="card-title">📚 FAQ</h3>
                <p>Frequently asked questions and common solutions</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-accent btn-sm">Browse FAQ</button>
                </div>
              </div>
            </div>
            <div className="card bg-base-200/50 shadow-lg border border-base-300">
              <div className="card-body">
                <h3 className="card-title">💬 Contact Support</h3>
                <p>Get personalized help from our support team</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary btn-sm">Contact Us</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 