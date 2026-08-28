"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { sitePath } from "@/lib/site-path";

const HOME_SCROLL_PARAM = "gardenReturn";

type RememberGardenPositionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function RememberGardenPositionLink({ onClick, href, ...props }: RememberGardenPositionLinkProps) {
  return (
    <a
      {...props}
      href={sitePath(href)}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey
        ) {
          event.preventDefault();
          const separator = href.includes("?") ? "&" : "?";
          window.location.assign(sitePath(`${href}${separator}${HOME_SCROLL_PARAM}=${Math.round(window.scrollY)}`));
        }
      }}
    />
  );
}

export function HomeScrollRestorer() {
  useEffect(() => {
    const savedPosition = new URLSearchParams(window.location.search).get(HOME_SCROLL_PARAM);
    if (savedPosition === null) return;

    const scrollTop = Number(savedPosition);
    if (!Number.isFinite(scrollTop)) return;

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete(HOME_SCROLL_PARAM);
    window.history.replaceState({}, "", cleanUrl);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.scrollTo(0, scrollTop));
    });
  }, []);

  return null;
}

export function ReturnToGardenLink({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <a
      href={sitePath("/")}
      className={className}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) return;

        event.preventDefault();
        const currentPosition = new URLSearchParams(window.location.search).get(HOME_SCROLL_PARAM);
        window.location.assign(sitePath(currentPosition === null ? "/" : `/?${HOME_SCROLL_PARAM}=${currentPosition}`));
      }}
    >
      {children}
    </a>
  );
}
