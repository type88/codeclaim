import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SudoGrab - Promo Code Distribution for Developers",
  description:
    "Upload bulk promo codes, share one link, and let users grab the right code for their platform. Real-time tracking for app and game developers.",
  alternates: { canonical: "https://sudograb.com" },
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {/* Nav */}
      <header className="border-b border-gray-100 dark:border-gray-900">
        <nav
          className="max-w-5xl mx-auto px-4 sm:px-6 flex justify-between items-center h-14"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-gray-900 dark:text-white"
          >
            Sudo<span className="text-brand-600">Grab</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Log in
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
              Promo codes,
              <br />
              distributed.
            </h1>
            <p className="mt-5 text-lg text-gray-600 dark:text-gray-400 max-w-lg">
              Upload your app or game codes. Share a single link. Users pick
              their platform and grab a code&mdash;no spreadsheets, no DMs, no
              &ldquo;already used.&rdquo;
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg text-white bg-brand-600 hover:bg-brand-700 transition-colors"
              >
                Create your first project
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-gray-100 dark:border-gray-900"
          aria-labelledby="how-heading"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2
              id="how-heading"
              className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-10"
            >
              How it works
            </h2>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12 list-none p-0 m-0">
              <li>
                <div className="text-3xl font-bold text-gray-200 dark:text-gray-800 mb-3">
                  01
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Upload codes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Paste or upload a CSV of promo codes, organized by
                  platform&mdash;iOS, Android, Steam, or any other.
                </p>
              </li>
              <li>
                <div className="text-3xl font-bold text-gray-200 dark:text-gray-800 mb-3">
                  02
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Share your link
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Each project gets a unique URL. Post it on Twitter, Discord,
                  Reddit, your website&mdash;anywhere.
                </p>
              </li>
              <li>
                <div className="text-3xl font-bold text-gray-200 dark:text-gray-800 mb-3">
                  03
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Track in real time
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  See which codes have been grabbed, how many are left per
                  platform, and when they were claimed.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* Who it's for */}
        <section
          className="border-t border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-900/50"
          aria-labelledby="use-cases-heading"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2
              id="use-cases-heading"
              className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-10"
            >
              Built for
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <article className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  App launches
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Drop launch-day promo codes into one link for your Product
                  Hunt post, press kit, or social channels.
                </p>
              </article>
              <article className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Beta testing
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Hand out TestFlight or closed-beta access codes to your
                  community. Optionally require sign-in.
                </p>
              </article>
              <article className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Review copies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Send game or app keys to press and content creators. See who
                  redeemed and when.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-100 dark:border-gray-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Stop manually handing out codes.
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Set up a project in under a minute. Free to use.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-lg text-white bg-brand-600 hover:bg-brand-700 transition-colors"
            >
              Get started
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-900 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-500">
          <span>&copy; {new Date().getFullYear()} SudoGrab</span>
          <nav className="flex gap-6" aria-label="Footer">
            <Link
              href="/terms"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
