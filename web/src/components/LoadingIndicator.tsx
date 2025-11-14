export function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-xs sm:text-sm shadow-sm">
            🤖
          </div>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assistant</span>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-md px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Thinking</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-ocean-500 dark:bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-ocean-500 dark:bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-ocean-500 dark:bg-ocean-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
