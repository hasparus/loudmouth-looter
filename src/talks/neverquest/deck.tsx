import { Deck as TalkDeck } from "../deck";

import { slides } from "./slides";

export function Deck() {
  return <TalkDeck slides={slides} series="questoza / prep bez scenariusza" />;
}
