export function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] sm:max-w-[70%]">
        <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
