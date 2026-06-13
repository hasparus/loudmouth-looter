export const formatDate = (date: ConstructorParameters<typeof Date>[0]) =>
  new Date(date)
    .toLocaleDateString("ja-JP-u-ca-japanese", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .toLowerCase();
