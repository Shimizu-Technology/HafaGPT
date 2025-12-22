import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Lightbulb, Rocket, Users, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function AboutPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-cream-200 dark:border-slate-700 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between safe-area-top">
          <Link to="/" className="flex items-center gap-2 text-brown-600 dark:text-gray-400 hover:text-coral-500 dark:hover:text-ocean-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </Link>
          <h1 className="text-lg font-bold text-brown-800 dark:text-white">Our Story</h1>
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-xl bg-cream-100 dark:bg-slate-700 hover:bg-cream-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-brown-600" />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero with Family Photo */}
        <div className="text-center">
          {/* Family Photo */}
          <div className="mb-6">
            <img 
              src="/stassie-kami-leon-japan.JPG" 
              alt="Leon, Kami, and Stassie in Japan"
              className="w-48 h-48 sm:w-56 sm:h-56 object-cover rounded-2xl mx-auto shadow-xl border-4 border-white dark:border-slate-700"
            />
          </div>
          <h2 className="text-3xl font-bold text-brown-800 dark:text-white mb-2">
            Why I Built HåfaGPT
          </h2>
          <p className="text-brown-600 dark:text-gray-400">
            A family's journey to learn Chamorro together
          </p>
        </div>

        {/* The Problem */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-brown-800 dark:text-white">The Problem</h3>
          </div>
          <div className="space-y-4 text-brown-700 dark:text-gray-300 leading-relaxed">
            <p>
              I was born and raised in Guam, but I'll be honest — I never really learned Chamorro. 
              It just wasn't something I prioritized. Like many Chamorros my age, I grew up speaking 
              English at home, and the language slowly faded into the background.
            </p>
            <p>
              That all changed when my daughter <strong className="text-coral-600 dark:text-ocean-400">Stassie</strong> (her 
              Chamorro name is <strong className="text-coral-600 dark:text-ocean-400">Tasi</strong>) started at{' '}
              <strong>Hurao Academy</strong>, one of Guam's only Chamorro immersion schools.
            </p>
            <p>
              Suddenly, everything was in Chamorro — homework assignments, school announcements, 
              parent group chats. And to be honest, I had no idea what almost any of it was saying.
            </p>
            <p className="bg-cream-50 dark:bg-slate-700/50 p-4 rounded-xl italic border-l-4 border-coral-400 dark:border-ocean-400">
              "At first, I started using ChatGPT and Google Translate to help, but the translations 
              weren't always accurate — sometimes they were just wrong. That's when I started thinking: 
              as a software engineer, maybe I could build something better for us."
            </p>
          </div>
        </section>

        {/* The Spark */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Lightbulb className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold text-brown-800 dark:text-white">The Spark</h3>
          </div>
          <div className="space-y-4 text-brown-700 dark:text-gray-300 leading-relaxed">
            <p>
              I'm a software engineer, and I also teach software engineering at{' '}
              <a 
                href="https://codeschoolofguam.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-coral-600 dark:text-ocean-400 hover:underline font-medium"
              >
                Code School of Guam
              </a>. 
              That's when I started looking into how I could integrate AI tools into software — 
              not just for this project, but because I want to teach my students how to use these 
              tools too.
            </p>
            <p>
              So I started experimenting. First, I built a simple command-line tool with a basic AI model. 
              It was okay, but not great. Then I discovered <strong>RAG (Retrieval-Augmented Generation)</strong> — 
              a way to give AI access to real Chamorro dictionaries, grammar guides, and educational materials.
            </p>
            <p className="font-medium text-coral-600 dark:text-ocean-400">
              That's when everything clicked.
            </p>
          </div>
        </section>

        {/* The Evolution */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-cream-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Rocket className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-brown-800 dark:text-white">The Evolution</h3>
          </div>
          <div className="space-y-4 text-brown-700 dark:text-gray-300 leading-relaxed">
            <p>
              I gathered Chamorro dictionaries, grammar guides, and educational resources from across the internet 
              and fed them into my AI system. The translations got <em>so much better</em>.
            </p>
            
            <p className="text-sm text-brown-500 dark:text-gray-400 italic">
              Special thanks to{' '}
              <a href="https://www.guampedia.com" target="_blank" rel="noopener noreferrer" className="text-coral-600 dark:text-ocean-400 hover:underline">Guampedia</a>,{' '}
              <a href="https://lengguahita.com" target="_blank" rel="noopener noreferrer" className="text-coral-600 dark:text-ocean-400 hover:underline">Lengguahi-ta</a>,{' '}
              <a href="https://www.guampdn.com" target="_blank" rel="noopener noreferrer" className="text-coral-600 dark:text-ocean-400 hover:underline">Pacific Daily News</a>,{' '}
              <a href="http://www.chamoru.info" target="_blank" rel="noopener noreferrer" className="text-coral-600 dark:text-ocean-400 hover:underline">Chamoru.info</a>,{' '}
              <a href="https://natibunmarianas.org/chamorro-dictionary/" target="_blank" rel="noopener noreferrer" className="text-coral-600 dark:text-ocean-400 hover:underline">IKNM/KAM Dictionary</a>,{' '}
              Dr. Sandra Chung's Grammar and Orthography research, and Topping's Dictionary for making this possible.
            </p>
            
            <p>
              What started as a simple translator quickly became something bigger. 
              I added a web interface. Then flashcards. Then quizzes. Then games. 
              Stories with tap-to-translate. Conversation practice scenarios.
            </p>
            <p>
              I wanted to build something that would help Stassie, my girlfriend Kami, and me learn{' '}
              <em>together</em> — not just a translator, but a real learning platform for our whole family.
            </p>
            
            {/* Feature evolution visual */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {[
                { icon: '💬', label: 'AI Chat' },
                { icon: '🎴', label: 'Flashcards' },
                { icon: '📝', label: 'Quizzes' },
                { icon: '🎮', label: 'Games' },
                { icon: '📖', label: 'Stories' },
                { icon: '🗣️', label: 'Practice' },
                { icon: '📚', label: 'Dictionary' },
                { icon: '📊', label: 'Progress' },
              ].map((item) => (
                <div 
                  key={item.label}
                  className="bg-cream-50 dark:bg-slate-700/50 rounded-xl p-3 text-center"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-xs font-medium mt-1 text-brown-600 dark:text-gray-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Heart */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-coral-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-coral-100 dark:bg-coral-900/30">
              <Users className="w-5 h-5 text-coral-500" />
            </div>
            <h3 className="text-xl font-bold text-brown-800 dark:text-white">Built for Everyone</h3>
          </div>
          <div className="space-y-4 text-brown-700 dark:text-gray-300 leading-relaxed">
            <p>
              When I showed Stassie and Kami what I built, they loved it. Stassie's favorite parts? 
              The chatbot and the quizzes. Now we can all sit together and practice, and it's become 
              something we can do together as a family.
            </p>
            <p>
              HåfaGPT isn't just for us — it's for <em>anyone</em> who wants to learn more about 
              the Chamorro language, the people, Guam, and its history. Whether you're a kid, a teen, 
              a student, an adult, a parent trying to reconnect with the language, or even a tourist 
              curious about our culture — this is for you.
            </p>
            <p className="text-lg font-semibold text-coral-600 dark:text-ocean-400 text-center pt-4">
              Si Yu'os Ma'åse' for being here. 🙏
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center space-y-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-coral-500 to-coral-600 dark:from-ocean-500 dark:to-ocean-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <span>Start Learning Together</span>
            <span className="text-xl">→</span>
          </Link>
          <p className="text-sm text-brown-500 dark:text-gray-500">
            Free to try • No credit card required
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-cream-200/50 dark:border-slate-700/50">
          <p className="text-xs text-brown-500 dark:text-gray-500">
            Built with ❤️ by{' '}
            <a 
              href="https://shimizu-technology.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-coral-600 dark:text-ocean-400 hover:underline font-medium"
            >
              Shimizu Technology
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default AboutPage;
