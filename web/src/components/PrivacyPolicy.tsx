import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Database, Mail, Lock, UserCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-cream-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-cream-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 safe-area-top">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="p-2 -ml-2 rounded-lg hover:bg-cream-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-brown-600 dark:text-gray-300" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              <h1 className="text-lg font-semibold text-brown-800 dark:text-gray-100">
                Privacy Policy
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-cream-200 dark:border-gray-700 p-6 md:p-8">
          
          {/* Last Updated */}
          <p className="text-sm text-brown-500 dark:text-gray-400 mb-6">
            Last updated: August 18, 2026
          </p>

          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              Introduction
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
              HåfaGPT is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, and safeguard your information 
              when you use our Chamorro language learning application.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              Information We Collect
            </h2>
            <div className="space-y-4 text-brown-700 dark:text-gray-300">
              <div>
                <h3 className="font-medium text-brown-800 dark:text-gray-200 mb-1">Account Information</h3>
                <p className="leading-relaxed">
                  When you create an account, we collect your email address and name through our 
                  authentication provider (Clerk). This is used to identify you and save your learning progress.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-brown-800 dark:text-gray-200 mb-1">Learning Data</h3>
                <p className="leading-relaxed">
                  We store your quiz results, game scores, conversation history, and learning preferences 
                  to personalize your experience and track your progress.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-brown-800 dark:text-gray-200 mb-1">Usage Information</h3>
                <p className="leading-relaxed">
                  We collect limited product analytics, such as page visits and explicitly allowlisted
                  learning events, through PostHog. Session replay and automatic click capture are
                  disabled. We do not intentionally send chat text, answers, translations, uploaded
                  document contents, source passages, or form inputs as analytics events.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2 text-brown-700 dark:text-gray-300">
              <li>Provide and improve our Chamorro language learning services</li>
              <li>Personalize your learning experience based on your skill level</li>
              <li>Save and sync your progress across devices</li>
              <li>Process subscription payments (if applicable)</li>
              <li>Send important updates about the service</li>
              <li>Analyze usage patterns to improve the app</li>
            </ul>
          </section>

          {/* AI Chat & Conversations */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              AI Chat & Conversations
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
              Your prompts, relevant conversation context, and uploaded content are sent to the AI
              provider needed to answer your request. Conversations are stored so you can revisit
              them and continue learning. We do not use private family conversations to train a
              public model or add them to the Chamorro knowledge base. You can remove conversations
              from your account, and you may request permanent account-data deletion.
            </p>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              Data Security
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
              We use industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-brown-700 dark:text-gray-300 mt-2">
              <li>Encrypted data transmission (HTTPS)</li>
              <li>Secure authentication via Clerk</li>
              <li>Protected database with encryption at rest</li>
              <li>Regular security updates and monitoring</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3">
              Third-Party Services
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed mb-3">
              We use the following third-party services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-brown-700 dark:text-gray-300">
              <li><strong>Clerk</strong> - Authentication and user management</li>
              <li><strong>OpenRouter and selected model providers</strong> - AI-powered chat responses</li>
              <li><strong>OpenAI</strong> - Search embeddings and selected AI processing</li>
              <li><strong>ElevenLabs</strong> - Text-to-speech when that feature is used</li>
              <li><strong>Brave Search</strong> - Web-search grounding when that feature is used</li>
              <li><strong>Stripe</strong> - Payment processing (for premium subscriptions)</li>
              <li><strong>AWS S3</strong> - File storage (for uploaded images/documents)</li>
              <li><strong>Neon</strong> - Application database hosting</li>
              <li><strong>Render and Netlify</strong> - Backend and website hosting</li>
              <li><strong>PostHog</strong> - Limited product analytics; session replay is disabled</li>
              <li><strong>Sentry</strong> - Error and reliability monitoring</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3">
              Your Rights
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-brown-700 dark:text-gray-300 mt-2">
              <li>Access your personal data</li>
              <li>Request deletion of your account and data</li>
              <li>Request a copy of your learning data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed mt-3">
              We keep account and learning data while your account is active or as needed to operate
              the service, meet security obligations, and honor deletion requests. Contact us if you
              want a copy of your data or permanent deletion. Some limited records may remain briefly
              in encrypted backups before normal backup expiration.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3">
              Children's Privacy
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
              HåfaGPT is designed for families, but a parent or guardian should create and supervise
              accounts used by children under 13. Children should not upload documents containing
              sensitive personal information. We do not knowingly collect personal information from
              a child under 13 without verifiable parental consent. If you believe this has happened,
              contact us so we can investigate and delete it.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-4">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              Contact Us
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy or your data, please contact us at:
            </p>
            <a 
              href="mailto:support@shimizutechnology.com" 
              className="inline-block mt-2 text-coral-600 dark:text-ocean-400 hover:underline font-medium"
            >
              support@shimizutechnology.com
            </a>
          </section>

          {/* Changes */}
          <section className="pt-6 border-t border-cream-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-brown-800 dark:text-gray-100 mb-3">
              Changes to This Policy
            </h2>
            <p className="text-brown-700 dark:text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any 
              significant changes by posting a notice in the app or sending you an email.
            </p>
          </section>

        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-coral-600 dark:text-ocean-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
