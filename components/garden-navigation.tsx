"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { useEffect } from "react";

const HOME_SCROLL_PARAM = "gardenReturn";

type RememberGardenPositionLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function RememberGardenPositionLink({ onClick, ...props }: RememberGardenPositionLinkProps) {
  const router = useRouter();

  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          event.preventDefault();
          const separator = props.href.includes("?") ? "&" : "?";
          router.push(`${props.href}${separator}${HOME_SCROLL_PARAM}=${Math.round(window.scrollY)}`);
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
  const router = useRouter();

  return (
    <Link
      href="/"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        const currentPosition = new URLSearchParams(window.location.search).get(HOME_SCROLL_PARAM);
        router.push(currentPosition === null ? "/" : `/?${HOME_SCROLL_PARAM}=${currentPosition}`);
      }}
    >
      {children}
    </Link>
  );
}
