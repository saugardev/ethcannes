'use client';

import PageLayout from '../components/page-layout';
import { useViewTransitionRouter } from '../components/navigation';

export default function DemoPage() {
  const { goBack } = useViewTransitionRouter();

  return (
    <PageLayout 
      title="Demo Page"
      showBackButton={true}
      onBackClick={goBack}
    >
      <div className="p-4 sm:p-6 lg:p-8 space-y-4 lg:space-y-6">
        <div className="prose prose-sm lg:prose-base max-w-none">
          <div className="space-y-6">
            <div className="alert alert-success shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>This is a demo subpage with enhanced Daisy UI styling!</span>
            </div>
            
            <div className="card bg-gradient-to-br from-base-200 to-base-300 shadow-xl">
              <div className="card-body">
                <h3 className="card-title text-xl">✨ Enhanced Card Component</h3>
                <p className="text-base-content/80">This demonstrates the improved subpage content with modern Daisy UI styling</p>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary">Primary Action</button>
                  <button className="btn btn-ghost">Secondary</button>
                </div>
              </div>
            </div>

            <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full">
              <div className="stat bg-gradient-to-br from-primary/10 to-primary/20">
                <div className="stat-figure text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path></svg>
                </div>
                <div className="stat-title">Total Revenue</div>
                <div className="stat-value text-primary">$1,234</div>
                <div className="stat-desc">Jan 1st - Feb 1st</div>
              </div>
              
              <div className="stat bg-gradient-to-br from-secondary/10 to-secondary/20">
                <div className="stat-figure text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <div className="stat-title">Today&apos;s Sales</div>
                <div className="stat-value text-secondary">$56</div>
                <div className="stat-desc">↗︎ 400 (22%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 