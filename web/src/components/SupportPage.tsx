import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, BookOpen, HelpCircle, ExternalLink } from 'lucide-react';

export default function SupportPage() {
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
              <HelpCircle className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
              <h1 className="text-lg font-semibold text-brown-800 dark:text-gray-100">
                Support
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-coral-500 to-teal-500 dark:from-ocean-600 dark:to-teal-600 rounded-xl p-6 md:p-8 text-white mb-6">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            How can we help? 🌺
          </h2>
          <p className="text-white/90">
            We're here to help you on your Chamorro learning journey.
          </p>
        </div>

        {/* Contact Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-cream-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-brown-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
            Contact Us
          </h3>
          <p className="text-brown-700 dark:text-gray-300 mb-4">
            Have a question, found a bug, or want to suggest a feature? 
            We'd love to hear from you!
          </p>
          <a 
            href="mailto:support@shimizutechnology.com"
            className="inline-flex items-center gap-2 bg-coral-500 dark:bg-ocean-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-coral-600 dark:hover:bg-ocean-600 transition-colors"
          >
            <Mail className="w-4 h-4" />
            support@shimizutechnology.com
          </a>
        </div>

        {/* FAQ Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-cream-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-brown-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
            Frequently Asked Questions
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-brown-800 dark:text-gray-200 mb-1">
                Is HåfaGPT free to use?
              </h4>
              <p className="text-brown-600 dark:text-gray-400 text-sm">
                Yes! We're currently in beta and all features are free. 
                In the future, we'll have a freemium model with daily limits for free users 
                and unlimited access for premium subscribers.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-brown-800 dark:text-gray-200 mb-1">
                How accurate is the AI tutor?
              </h4>
              <p className="text-brown-600 dark:text-gray-400 text-sm">
                Our AI is trained on authentic Chamorro resources including dictionaries, 
                grammar guides, and educational materials. While it's very accurate, 
                we recommend also learning from native speakers when possible.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-brown-800 dark:text-gray-200 mb-1">
                Can I use HåfaGPT offline?
              </h4>
              <p className="text-brown-600 dark:text-gray-400 text-sm">
                The AI chat requires an internet connection, but flashcards and 
                stories can be accessed offline once loaded through the PWA.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-brown-800 dark:text-gray-200 mb-1">
                How do I delete my account?
              </h4>
              <p className="text-brown-600 dark:text-gray-400 text-sm">
                Email us at support@shimizutechnology.com and we'll process your 
                account deletion request within 48 hours.
              </p>
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-cream-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-brown-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-coral-500 dark:text-ocean-400" />
            Helpful Links
          </h3>
          
          <div className="space-y-3">
            <Link 
              to="/about" 
              className="flex items-center justify-between p-3 rounded-lg bg-cream-50 dark:bg-gray-700 hover:bg-cream-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-brown-700 dark:text-gray-300">About HåfaGPT</span>
              <ArrowLeft className="w-4 h-4 text-brown-500 dark:text-gray-400 rotate-180" />
            </Link>
            
            <Link 
              to="/privacy" 
              className="flex items-center justify-between p-3 rounded-lg bg-cream-50 dark:bg-gray-700 hover:bg-cream-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-brown-700 dark:text-gray-300">Privacy Policy</span>
              <ArrowLeft className="w-4 h-4 text-brown-500 dark:text-gray-400 rotate-180" />
            </Link>
            
            <a 
              href="https://shimizutechnology.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-cream-50 dark:bg-gray-700 hover:bg-cream-100 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-brown-700 dark:text-gray-300">Shimizu Technology</span>
              <ExternalLink className="w-4 h-4 text-brown-500 dark:text-gray-400" />
            </a>
          </div>
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

