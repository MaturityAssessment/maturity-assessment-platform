const SPINNER_SIZES = {
  default: "h-12 w-12 border-b-2",
  lg: "h-16 w-16 border-b-[3px]",
} as const;

type PageLoadingProps = {
  message?: string;
  size?: keyof typeof SPINNER_SIZES;
};

export function PageLoading({
  message = "Loading...",
  size = "default",
}: PageLoadingProps) {
  const spinner = SPINNER_SIZES[size];
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div
          className={`mx-auto animate-spin rounded-full border-blue-600 ${spinner}`}
          aria-hidden
        />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}
