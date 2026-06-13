export const formatDate = (date: ConstructorParameters<typeof Date>[0]) =>
  new Date(date)
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .toLowerCase();
