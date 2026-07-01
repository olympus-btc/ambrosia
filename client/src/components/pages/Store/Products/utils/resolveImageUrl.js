export async function resolveImageUrl(imageFile, fallbackUrl, upload) {
  if (imageFile instanceof File) {
    const uploads = await upload([imageFile]);
    return uploads?.[0]?.url ?? uploads?.[0]?.path ?? null;
  }
  return fallbackUrl ?? null;
}
