export const getAssetUrl = (
  path?: string | null
) => {
  if (!path) {
    return null;
  }

  const cleanPath = path.trim();

  // Already a complete URL
  if (
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://")
  ) {
    return cleanPath;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    return cleanPath;
  }

  return `${baseUrl.replace(/\/$/, "")}/${cleanPath.replace(/^\//, "")}`;
};