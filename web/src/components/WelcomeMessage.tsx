export function WelcomeMessage() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-2xl">
        <div className="text-6xl mb-4">🌺</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Håfa Adai!</h1>
        <p className="text-xl text-gray-700 mb-6">I'm your Chamorro language tutor.</p>
        <div className="text-left bg-gray-50 rounded-lg p-6 space-y-3">
          <p className="text-gray-700">
            Ask me about Chamorro words, phrases, grammar, or culture!
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <span><strong>English mode:</strong> Get responses in English</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">🇬🇺</span>
              <span><strong>Chamorro mode:</strong> Practice with Chamorro-only responses</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <span><strong>Learn mode:</strong> Get detailed explanations and cultural context</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
