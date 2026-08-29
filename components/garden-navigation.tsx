"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect } from "react";
import { sitePath } from "@/lib/site-path";

const HOME_SCROLL_PARAM = "gardenReturn";

type RememberGardenPositionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type GardenAnchorLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  targetId: string;
};

export function GardenAnchorLink({ targetId, ...props }: GardenAnchorLinkProps) {
  return (
    <a
      {...props}
      href={`#${targetId}`}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) return;

        const target = document.getElementById(targetId);
        if (!target) return;

        event.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 32;
        window.scrollTo({ top, behavior: "smooth" });
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${targetId}`);
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    />
  );
}

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
    const scrollTop = savedPosition === null ? Number.NaN : Number(savedPosition);
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const shouldResetAfterReload = navigation?.type === "reload" || window.location.hash.length > 0;
    const shouldRestoreSavedPosition = Number.isFinite(scrollTop);

    if (!shouldResetAfterReload && !shouldRestoreSavedPosition) return;

    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete(HOME_SCROLL_PARAM);
    if (shouldResetAfterReload) cleanUrl.hash = "";
    window.history.replaceState({}, "", cleanUrl);
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.scrollTo(0, shouldRestoreSavedPosition ? scrollTop : 0));
    });

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
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
