import { type JSX, splitProps } from "solid-js";

export interface LinkProps extends JSX.AnchorHTMLAttributes<HTMLAnchorElement> {
  noUnderline?: boolean;
}

export function Link(props: LinkProps) {
  const [own, rest] = splitProps(props, ["classList", "noUnderline"]);

  const childIsImg = isChildAnImage(rest.children);

  return (
    <a
      classList={{
        ...own.classList,
        "underline underline-offset-4 decoration-stone-300 dark:decoration-stone-600 hover:decoration-transparent dark:hover:decoration-transparent focus:decoration-transparent dark:focus:decoration-transparent":
          !own.noUnderline,
        "no-underline": !!own.noUnderline,
        "p-2 -mx-2 rounded-sm transition-colors relative": true,
        "zaduma-image-box": childIsImg,
      }}
      {...rest}
    />
  );
}

function isChildAnImage(children: JSX.Element) {
  if (!children || typeof children !== "object") return false;

  // A child can be a JSX element or an stringified Astro slot.
  if ("type" in children) return children.type === "img";
  if ("t" in children) {
    let t = children.t as string;
    if (t.startsWith("<astro-")) {
      t = t.slice(t.indexOf(">") + 1, -1);
      t = t.trim();
    }
    return t.startsWith(`<img `) || t.startsWith(`<span zaduma-image`);
  }

  return false;
}
