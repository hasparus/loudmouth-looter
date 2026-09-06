import { Deck as TalkDeck } from "../deck";

import { slides } from "./slides";

export function Deck() {
  return <TalkDeck slides={slides} series="otwarty stół / boss: kalendarz" />;
}
