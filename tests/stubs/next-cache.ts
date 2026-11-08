/** Test stand-ins for next/cache: caching is a no-op outside Next.js. */
export const cacheTag = (...tags: string[]): void => void tags;
export const cacheLife = (profile: unknown): void => void profile;
export const revalidatedTags: string[] = [];
export const revalidateTag = (tag: string, profile: unknown): void => {
  void profile;
  revalidatedTags.push(tag);
};
