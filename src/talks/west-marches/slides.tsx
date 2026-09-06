import { type Slide } from "../deck";
import { Systems } from "../neverquest/layout";
import { Aside, Bullets, Cover, FullImage, Hero, Title } from "../ui";
import bearFitScreenshot from "./images/bear-fit.png";
import vahidLetter from "./images/vahid-letter.png";
import westMarches from "./images/west-marches.png";
import writingLoveLetters from "./images/writing-love-letters.png";

export const slides: Slide[] = [
  {
    dark: true,
    notes:
      "Idę o zakład, że większość waszych kampanii nie skończyła się, bo skończyła się historia, ani nawet bo inny gracz był wkurzający i przynosił zbyt ostre czipsy. Zderzenie z dorosłym życiem, priorytety, i boss rodem z Elden Ringa: Kalendarz.",
    content: () => (
      <Cover
        title="West Marches"
        hero="jak prowadzić kampanie, których nie zabija kalendarz"
        tags={[
          "otwarty stół",
          "upływ czasu",
          "bear-fit",
          "love letters",
          "just-in-time",
        ]}
      />
    ),
  },
  {
    dark: true,
    bare: true,
    notes:
      "West Marches: nie ma stałego terminu, stałej drużyny, stałego plotu. Gracze składają stół. To otwarty stół, nie weekly obligatory session.",
    content: () => (
      <FullImage
        src={westMarches.src}
        alt="ars ludi: Grand Experiments: West Marches"
        href="https://arsludi.lamemage.com/index.php/78/grand-experiments-west-marches/"
      />
    ),
  },
  {
    notes:
      "Kampanie umierają na dorosłość. Kalendarz wygrywa, jeśli sesja zależy od tego, że wszyscy przyjdą w ten sam wtorek.",
    content: () => (
      <>
        <Hero>Kalendarz.</Hero>
        <Bullets
          items={[
            "zderzenie z dorosłym życiem",
            "deadline",
            "już nie mogę we wtorek",
            "w czwartek jest trening",
            "a weekend to się wyjeżdża",
          ]}
        />
      </>
    ),
  },
  {
    notes:
      "Z kampanii kolegi, która przeżyła tylko sesję zero, wyrzeźbiłem kampanię na 10 osób. Prowadziłem przez ponad rok, aż do finału.",
    content: () => (
      <>
        <Title>Nie wystartowała nam kampania Blades in the Dark</Title>
        <Hero>Zrecyklingowałem ją.</Hero>
      </>
    ),
  },
  {
    content: () => <Hero>Bez scenariusza.</Hero>,
  },
  {
    content: () => <Hero>Bez questów.</Hero>,
  },
  {
    content: () => <Hero>Bez stałego terminu.</Hero>,
  },
  {
    content: () => <Hero>Otwarty stół. Gracze inicjują.</Hero>,
  },
  {
    content: () => (
      <Hero>Upływ czasu 1-1 z rzeczywistością pomiędzy sesjami.</Hero>
    ),
  },
  {
    notes:
      "Love letters to jednorazowe custom moves do konkretnego PC. Piszesz w prepie, oddajesz na starcie sesji. Downtime, solo, nieobecność, momentum.",
    content: () => (
      <>
        <Title>Love Letters</Title>
        <div class="mt-[4%] grid min-h-0 flex-1 grid-cols-2 items-stretch gap-[4%]">
          <img
            class="size-full min-h-0 object-contain object-top"
            src={writingLoveLetters.src}
            alt="Stonetop: Writing love letters"
          />
          <img
            class="size-full min-h-0 object-contain object-top"
            src={vahidLetter.src}
            alt="Przykładowy love letter do Vahida"
          />
        </div>
      </>
    ),
  },
  {
    notes:
      "Scheduling online",
    content: () => (
      <>
        <Title>Scheduling online</Title>
        <div class="mt-[4%] grid min-h-0 flex-1 grid-cols-2 items-stretch gap-[4%]">
          <img
            class="size-full min-h-0 object-contain"
            src={bearFitScreenshot.src}
            alt="bear-fit: kalendarz Lodowiec, heatmap dostępności"
          />
        </div>
      </>
    ),
  },
  {
    notes: "",
    content: () => (
      <>
        <Title>Mechanizmy zamiast scenariuszy</Title>
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
    notes:
      "Otwarty stół, upływ czasu, najprostsza apka do ustalania terminów, Love Letters i worldbuilding just-in-time.",
    content: () => (
      <>
        <Title>Jak wygrałem z kalendarzem</Title>
        <Bullets
          items={[
            "otwarty stół",
            "upływ czasu",
            <a
              class="hover:text-accent-800 focus-visible:text-accent-800 focus-visible:outline-accent-600 underline decoration-1 underline-offset-[0.2em] focus-visible:outline-2 focus-visible:outline-offset-3"
              href="https://bear-fit.haspar.us"
              target="_blank"
              rel="noreferrer"
            >
              bear-fit.haspar.us
            </a>,
            "Love Letters",
            "worldbuilding just-in-time",
          ]}
        />
      </>
    ),
  },
];
  