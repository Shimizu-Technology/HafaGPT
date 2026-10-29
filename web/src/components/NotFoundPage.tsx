import { Link } from 'react-router-dom';
import { BookOpen, Compass, Home } from 'lucide-react';
import { PublicPage } from './PublicPage';

export function NotFoundPage() {
  return (
    <PublicPage title="Page not found" subtitle="This link doesn't lead anywhere yet" icon={Compass} maxWidthClassName="max-w-2xl">
      <section aria-labelledby="not-found-heading" className="space-y-4">
        <h2 id="not-found-heading" className="text-2xl font-bold text-brown-950 dark:text-white">
          We couldn't find that page.
        </h2>
        <p className="text-base text-brown-700 dark:text-gray-300">
          The link may be mistyped or out of date. Your progress and saved work are safe.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link to="/" className="action-button action-primary min-h-11">
            <Home className="h-4 w-4" aria-hidden="true" />
            Go to Today
          </Link>
          <Link to="/vocabulary" className="action-button action-secondary min-h-11">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Search the dictionary
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}
