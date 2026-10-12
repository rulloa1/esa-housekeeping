import type { ReactNode } from "react";

// Hotel photos for page banners (1600px crops of Rory's photos in public/banners/).
export const BANNERS = {
  exterior: "/banners/exterior.jpg",
  lobby: "/banners/lobby.jpg",
  suiteKing: "/banners/suite-king.jpg",
  kitchen: "/banners/kitchen.jpg",
  pool: "/banners/pool.jpg",
} as const;

type Props = {
  image: string;
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** Vertical focus of the photo, e.g. "40%". */
  focus?: string;
  /** Buttons or chips shown under the title. */
  children?: ReactNode;
  compact?: boolean;
};

// Photo banner used at the top of every staff page: green shade on the left
// for the title, the hotel photo showing through on the right.
export default function PageBanner({ image, title, eyebrow, subtitle, focus = "45%", children, compact }: Props) {
  return (
    <section
      className={compact ? "page-banner page-banner--compact" : "page-banner"}
      style={{ backgroundImage: `var(--page-banner-shade), url("${image}")`, backgroundPosition: `center, center ${focus}` }}
    >
      <div className="page-banner__text">
        {eyebrow && <div className="page-banner__eyebrow">{eyebrow}</div>}
        <h1 className="page-banner__title">{title}</h1>
        {subtitle && <p className="page-banner__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-banner__actions">{children}</div>}
    </section>
  );
}
