import { type Slide } from "../deck";
import {
  Aside,
  BoxedText,
  Bullets,
  Card,
  Columns,
  Cover,
  FullImage,
  Hero,
  Impressions,
  Quote,
  Title,
} from "../ui";
import dragonSheet from "./images/dragon-sheet.png";
import stonetopThreats from "./images/stonetop-threats.png";
import stonetopWiderWorld from "./images/stonetop-wider-world.png";
import { Bio, Pipeline, Systems, Triangle } from "./layout";

const links = [
  ["lol.haspar.us", "https://lol.haspar.us"],
  ["hasparus.itch.io", "https://hasparus.itch.io"],
  ["zagrajmy.net", "https://zagrajmy.net"],
] as const;

export const slides: Slide[] = [
  {
    dark: true,
    notes:
      "Tawerna, gość z robotą, briefing, dungeon, nagroda. Pipeline jest podejrzanym, nie karczma.",
    content: () => (
      <Cover
        title="Jak jeszcze raz usłyszę questgiver…"
        hero="wyrzucę za burtę"
        tags={["sandbox", "threats", "frakcje", "pytania", "impressions"]}
        flourish="!"
      />
    ),
  },
  {
    notes:
      "Powiedz jednym zdaniem kim jesteś. Slajd ma tylko pokazać własną grę.",
    content: () => (
      <Bio
        image={dragonSheet.src}
        name="Piotr Monwid-Olechnowicz"
        links={links}
      />
    ),
  },
  {
    notes:
      "To jest przewaga medium. Questowy model sprowadza arbitralny input do menu.",
    content: () => (
      <>
        <Title>RPG nie jest wolnym MMO</Title>
        <Hero>Gracze mogą zrobić coś, czego nikt nie zaprojektował.</Hero>
        <Bullets
          items={[
            "bez invisible walls",
            "bez drzewka dialogowego",
            "bez canonical path",
          ]}
        />
      </>
    ),
  },
  {
    notes:
      "Jedna prośba NPC nie zabija gry. Pipeline jako domyślny interfejs zabija sprawczość.",
    content: () => (
      <>
        <Title>Questgiver robi z gry backlog</Title>
        <Pipeline
          steps={["questgiver", "briefing", "objective", "reward", "repeat"]}
        />
        <Aside>Gracze wybierają jak. Rzadziej co.</Aside>
      </>
    ),
  },
  {
    notes:
      "Ten format produkuje zachowania. Gracz czeka aż gra pokaże, gdzie jest zabawa.",
    content: () => (
      <>
        <Title>Czego to uczy</Title>
        <Bullets
          items={[
            "czekaj na sygnał",
            "pytaj: co teraz?",
            "NPC to interfejs",
            "świat to content",
            "MG dowozi następny level",
          ]}
        />
      </>
    ),
  },
  {
    dark: true,
    notes:
      "Jeśli to wraca, PC nie mają napędu albo świat nie daje im realnych kierunków.",
    content: () => (
      <Quote title="Najgorsze pytanie przy stole">„No dobra. Co teraz?”</Quote>
    ),
  },
  {
    notes: "Sandbox daje kierunki. Postacie dają paliwo. To się składa.",
    content: () => (
      <>
        <Title>Dwie ucieczki</Title>
        <Columns>
          <Card
            title="Sandbox"
            items={[
              "gracze wybierają problem",
              "świat istnieje poza nimi",
              "prep = mapa możliwości",
            ]}
          />
          <Card
            title="Character-driven"
            items={[
              "cele PC generują grę",
              "relacje robią napięcie",
              "prep = nacisk na to, co boli",
            ]}
          />
        </Columns>
      </>
    ),
  },
  {
    notes: "Sandbox ma prep, tylko prep nie wybiera za drużynę kawałka świata.",
    content: () => (
      <>
        <Title>Sandbox</Title>
        <Hero>przestrzeń wyboru</Hero>
        <Bullets
          compact
          items={[
            "mapa",
            "lokacje",
            "pogłoski",
            "zasoby",
            "konflikty",
            "rzeczy, które można olać",
          ]}
        />
        <Aside>Dużo potencjału. Zero trasy.</Aside>
      </>
    ),
  },
  {
    notes: "Przygotowujesz ruch świata, nie ruch drużyny.",
    content: () => (
      <>
        <Title>Threats / fronts</Title>
        <Hero>co świat zrobi bez PC?</Hero>
        <Bullets
          items={[
            "threat: aktywny problem",
            "grim portents: kolejne oznaki",
            "impending doom: dokąd to płynie",
          ]}
        />
      </>
    ),
  },
  {
    bare: true,
    notes: "Pokaż listę eskalacji i doom. Świat ma trajektorię, gracze nie.",
    content: () => (
      <FullImage
        src={stonetopThreats.src}
        alt="Stonetop: Conquering army, Invasion i Impending doom"
      />
    ),
  },
  {
    notes:
      "NPC ma własną trajektorię. Quest może z niej wyniknąć, ale NPC nie istnieje tylko po to.",
    content: () => (
      <>
        <Title>Frakcje</Title>
        <Hero>NPC nie stoi pod znakiem !</Hero>
        <Bullets
          compact
          items={[
            "czegoś chce",
            "ma zasoby",
            "ma wrogów",
            "robi ruch poza kadrem",
            "reaguje na PC",
          ]}
        />
        <Aside>Blades: cele i zegary.</Aside>
      </>
    ),
  },
  {
    notes: "Moduł zostawia dziury. Odpowiedź może powstać przez grę.",
    content: () => (
      <>
        <Title>Wider World</Title>
        <Bullets
          items={[
            "miejsce",
            "sytuacja",
            "napięcia",
            "otwarte pytania",
            "NPC i ich motywacje",
          ]}
        />
        <Aside>Czasem MG nie zna prawdy o świecie.</Aside>
      </>
    ),
  },
  {
    notes: "Dobre pytanie ma stawkę. To nie lore-trivia.",
    content: () => (
      <>
        <Title>Pytania gryzą</Title>
        <Bullets
          items={[
            "Kto zabił Ostatniego Króla?",
            "Czemu ciało nie gnije?",
            "Kto ukrywa prawdę?",
            "Co obudzi odpowiedź?",
            "Który PC już jest w to wplątany?",
          ]}
        />
      </>
    ),
  },
  {
    bare: true,
    notes:
      "Wider World w praktyce. Zwróć uwagę, ile pytań autor zostawia stołowi.",
    content: () => (
      <FullImage
        src={stonetopWiderWorld.src}
        alt="Stonetop Wider World: Aratis, Themes, Questions i Hooks"
      />
    ),
  },
  {
    notes: "Konflikt przecina relacje PC. Wtedy wystarczy nacisk.",
    content: () => (
      <>
        <Title>Character pressure</Title>
        <Triangle
          nodes={[
            // todo: do wymiany
            "Kapłan potrzebuje Huntera",
            "Hunter ufa wiedźmie",
            "Wiedźma chce śmierci kapłana",
          ]}
        />
        <Aside>Relacje same produkują sceny.</Aside>
      </>
    ),
  },
  {
    dark: true,
    notes:
      "Boxed text zakłada kamerę, tempo i kolejność. Impressions składasz na żywo.",
    content: () => (
      <>
        <Title>Impressions zamiast boxed textu</Title>
        <Hero>nie pisz cutscenki</Hero>
        <Bullets
          items={[
            "obrazy",
            "zmysły",
            "detale do wrzucenia kiedy pasują",
            "materiał do mówienia",
          ]}
        />
      </>
    ),
  },
  {
    notes:
      "Boxed text czytasz. Impressions wybierasz, mieszasz i dorzucasz w odpowiedzi na graczy.",
    content: () => (
      <>
        <Title>Ta sama świątynia</Title>
        <Columns split>
          <BoxedText label="boxed text">
            Drzwi świątyni otwierają się z przeciągłym skrzypieniem. Wewnątrz
            panuje półmrok, a kamienne figury świętych patrzą na was ze ścian…
          </BoxedText>
          <Impressions
            items={[
              "Drip drip drip of snow melting from roofs, collecting in jugs and puddles",
              "Petrichor smell on a southerly breeze",
              "Hopeful green poking through dead-brown grass and soil",
              "Bare skin reveling in the still-chilly sun; cheerful voices; smiles and songs",
              "Tall thin trees (aspen, pines, firs) in the lower slopes and valleys; windswept junipers higher up",
            ]}
          />
        </Columns>
      </>
    ),
  },
  {
    notes: "Slajd do zdjęcia. Jeśli masz tylko tyle, masz z czego prowadzić.",
    content: () => (
      <>
        <Title>10 minut prepu</Title>
        <Bullets
          items={[
            "3 frakcje",
            "3 rzeczy, których chcą",
            "3 pogłoski",
            "2 threaty",
            "3–5 portents na threat",
            "1 doom na threat",
            "2–3 otwarte pytania",
            "1 punkt nacisku na każdego PC",
          ]}
        />
      </>
    ),
  },
  {
    notes: "Czy gra żyje po odrzuceniu haczyka?",
    content: () => (
      <>
        <Title>Czy mogą obrać inny kurs?</Title>
        <Bullets
          items={[
            "nie → scenariusz trzyma ster",
            "tak, ale gra umiera → kolejka atrakcji",
            "tak i świat płynie dalej → kampania",
          ]}
        />
      </>
    ),
  },
  {
    notes: "Praktyczna bibliografia. Jedna technika z każdego źródła.",
    content: () => (
      <>
        <Title>Kradnij techniki</Title>
        <Systems
          rows={[
            ["Apocalypse World", "triangles / threats"],
            ["Dungeon World", "dangers / portents / doom"],
            ["Blades in the Dark", "frakcje / clocks"],
            ["Stonetop", "Wider World / pytania"],
            ["Trophy", "impressions / modular prep"],
            ["MÖRK BORG", "tables / generators / instant trouble"],
            ["The Alexandrian", "Don't Prep Plots / node-based design"],
          ]}
        />
      </>
    ),
  },
  {
    dark: true,
    notes:
      "Tajemniczy typ w tawernie może istnieć. Kampania nie może od niego zależeć.",
    content: () => (
      <>
        <Title>Nie zakładaj działań graczy</Title>
        <Bullets
          items={["świat", "ludzi", "napięcia", "konsekwencje", "pytania"]}
        />
        <Aside>Potem zobacz, co zrobią.</Aside>
      </>
    ),
  },
];
