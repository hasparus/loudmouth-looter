export const formatDate = (date: ConstructorParameters<typeof Date>[0]) =>
  new Date(date)
    .toLocaleDateString("en-GB", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      era: "short",
    })
    .toLowerCase();
