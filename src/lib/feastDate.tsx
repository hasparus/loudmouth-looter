/* eslint-disable @typescript-eslint/no-unused-expressions */
const F: [number, string][] = `0101 Circumcisionis Domini
0106 Epiphaniae
0113 S. Hilarii
0125 Conversionis S. Pauli
0202 Purificationis B.M.V.
0214 S. Valentini
0224 S. Matthiae
0312 S. Gregorii
0325 Annuntiationis B.M.V.
0423 S. Georgii
0425 S. Marci
0501 SS. Philippi et Iacobi
0503 Inventionis S. Crucis
0611 S. Barnabae
0624 Nativitatis S. Iohannis Baptistae
0629 SS. Petri et Pauli
0722 S. Mariae Magdalenae
0725 S. Iacobi
0801 S. Petri ad Vincula
0810 S. Laurentii
0815 Assumptionis B.M.V.
0824 S. Bartholomaei
0901 S. Egidii
0908 Nativitatis B.M.V.
0914 Exaltationis S. Crucis
0921 S. Matthaei
0929 S. Michaelis
1018 S. Lucae
1028 SS. Simonis et Iudae
1101 Omnium Sanctorum
1111 S. Martini
1123 S. Clementis
1130 S. Andreae
1206 S. Nicolai
1213 S. Luciae
1221 S. Thomae
1225 Nativitatis Domini
1228 SS. Innocentium`
  .split("\n")
  .map((s) => [+s.slice(0, 4), s.slice(5)]);

const W = [
  "Dominica",
  "fer. ii",
  "fer. iii",
  "fer. iv",
  "fer. v",
  "fer. vi",
  "sabbatum",
];

const R = {
  ones: ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
  tens: ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"],
  hundreds: ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"],
};

const romanYear = (year: number) => {
  if (year < 1) return String(year);
  return `${"M".repeat(Math.floor(year / 1000))}${R.hundreds[Math.floor((year % 1000) / 100)]}${R.tens[Math.floor((year % 100) / 10)]}${R.ones[year % 10]}`;
};

export const feastDate = (date: string | number | Date) => {
  const t = new Date(date);
  t.setUTCHours(0, 0, 0, 0);
  const y = t.getUTCFullYear();
  let best,
    n = Infinity;
  for (const [md, la] of F)
    for (const yr of [y - 1, y, y + 1]) {
      const d = Math.round(
        (+t - +new Date(Date.UTC(yr, ((md / 100) | 0) - 1, md % 100))) / 864e5,
      );
      if (Math.abs(d) < Math.abs(n) || (Math.abs(d) === Math.abs(n) && d > n))
        ((n = d), (best = la));
    }
  let feast: string;
  if (n === 0) feast = `in festo ${best}`;
  else if (n === 1) feast = `crastino ${best}`;
  else if (n === -1) feast = `vigilia ${best}`;
  else feast = `${W[t.getUTCDay()]} ${n > 0 ? "post" : "ante"} f. ${best}`;
  return `${feast} ${romanYear(y)}`;
};
