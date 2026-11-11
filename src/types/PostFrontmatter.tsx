import type { ReadTimeResults } from "reading-time";

export interface PostFrontmatter {
  /** Optional list of tags, surfaced on the index page. */
  tags?: string[];
  /**
   * Optional mark shown in the card's left margin — emoji, a short string, or
   * raw `<svg>` markup. Can also be provided as a named MDX export `sigil`.
   */
  sigil?: string;
  /**
   * Optional description for the post, visible in Open Graph cards.
   */
  description?: string;
  /** Header image, relative (`./header.png`) or absolute. Also the default OG card background. */
  img?: string;
  /** The social card. Without `image`, `/api/og` generates one. */
  og?: {
    /** A ready-made Open Graph image, served as is. */
    image?: string;
    /** Background of the generated card, if it shouldn't be `img`. */
    backgroundImage?: string;
    /** Looping mp4, with the OG image as its still frame. */
    video?: string;
  };
  /**
   * @computed by derivedTitleAndDatePlugin from file name
   *           if not given
   */
  title: string;
  /**
   * @computed by derivedTitleAndDatePlugin from git commit time
   *           if not given
   */
  date: string;
  /**
   * @computed by defaultLayoutPlugin
   */
  layout?: string;
  /**
   * @computed by urlOutsideOfPagesDirPlugin
   */
  path: string;
  /**
   * @computed by readingTimePlugin
   * @example
   * {
   *   text: '1 min read',
   *   minutes: 1,
   *   time: 60000,
   *   words: 200
   * }
   */
  readingTime: ReadTimeResults;
  /** Tune the listing teaser. */
  excerpt?: {
    /** Number of leading blocks shown. Defaults to 2. */
    blocks?: number;
  };
  /** Hidden in PROD, visible in dev. */
  draft?: boolean;
  /** Omitted from index, feeds, sitemap, and agent endpoints; still routable. */
  hidden?: boolean;
}
