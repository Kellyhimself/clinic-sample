export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="h-8 w-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  );
} 