import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-xl font-bold text-brand-600">CodeClaim</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-brand-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-100/40 via-transparent to-transparent dark:from-brand-900/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
              Distribute promo codes
              <br />
              <span className="text-brand-600">without the hassle</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              Upload your codes once. Users automatically get the right code for
              their platform. Track everything in real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 transition-all"
              >
                Get Started Free
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center px-8 py-3.5 border border-gray-300 dark:border-gray-700 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof */}
      <div className="border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-gray-700 dark:text-gray-300">1,000+</span> codes distributed
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Trusted by <span className="font-medium text-gray-700 dark:text-gray-300">indie developers</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium text-gray-700 dark:text-gray-300">&lt;500ms</span> code delivery
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">How it works</h2>
          <p className="text-gray-600 dark:text-gray-400">Three steps. No complex setup required.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Upload Codes
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Bulk upload via CSV. Organize by platform (iOS, Android, Steam, etc.)
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Share Your Link
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get a unique link. Share it anywhere - Twitter, Discord, Reddit, your website.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Track in Real-Time
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              See codes distributed live. Know exactly how many are left per platform.
            </p>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Built for your workflow</h2>
            <p className="text-gray-600 dark:text-gray-400">Whether you&apos;re launching, testing, or promoting.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 mb-4 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">App Launches</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Distribute launch-day promo codes across platforms. One link for your Product Hunt post, Twitter thread, or press kit.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 mb-4 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Beta Testing</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Give TestFlight or closed beta access to your community. Optional sign-in requirement keeps bots away.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 mb-4 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Review Copies</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Send game or app review codes to press and content creators. Track who redeemed and when.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to stop manually distributing codes?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Set up your first project in under a minute. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 transition-all"
          >
            Get Started Free
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>Built for developers, by developers.</p>
        </div>
      </footer>
    </main>
  );
}
