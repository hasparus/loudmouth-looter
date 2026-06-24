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
  /**
   * Optional URL to a picture or a dict of URLs to pictures.
   * */
  img?:
    | string
    | {
        /** Image for the Open Graph social card. */
        og?: string;
        /** Image for the post header.` */
        src?: string;
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
  /** Routable for e2e, excluded from index, feeds, sitemap, and agent endpoints. */
  fixture?: boolean;
  /** Never rendered, including in dev. */
  hidden?: boolean;
}
