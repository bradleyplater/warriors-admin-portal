export function stampCreate(): { createdAt: Date; updatedAt: Date } {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
}

export function stampUpdate(): { updatedAt: Date } {
  return { updatedAt: new Date() };
}
