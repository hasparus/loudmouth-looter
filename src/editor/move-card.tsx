/** @jsxImportSource react */
import React from "react";

import { cn } from "./cn";

export interface MoveCardProps {
  checkboxes?: number;
  children: React.ReactNode;
  className?: string;
  id?: string;
  isBaseMove?: boolean;
  requirement?: string;
  resourceName?: string;
  resources?: number;
  size?: "sm";
  title: string;
}

export const MoveCard = ({
  id,
  checkboxes,
  children,
  className = "",
  isBaseMove = false,
  requirement,
  resourceName = "",
  resources,
  size,
  title,
}: MoveCardProps) => {
  const isSmall = size === "sm";
  id ||= title.toLowerCase().replaceAll(" ", "-");

  return (
    <article
      className={`group break-inside-avoid ${className} ${
        isSmall ? "space-y-2" : "py-4"
      }`}
    >
      <div className="flex-1">
        <div className={cn("flex items-center", isSmall ? "gap-2" : "gap-2.5")}>
          {!isBaseMove && (
            <input
              aria-describedby={`${id}-title`}
              className={cn(
                "aspect-square shrink-0",
                isSmall ? "mt-[-3.5px] size-4" : "-mt-0.75 size-4.5",
              )}
              id={id}
              name={id}
              type="checkbox"
            />
          )}
          <h3
            className={`font-serif font-bold tracking-wide text-neu-800 dark:text-neu-100 ${
              isSmall ? "" : "text-xl [text-box-trim:trim-end]"
            }`}
            id={id ? `${id}-title` : undefined}
          >
            {title}
          </h3>
          {!!resources && (
            <div className="ml-auto flex items-center gap-1 text-sm text-neu-500 dark:text-neu-400">
              <span
                className={cn(
                  "translate-y-px tracking-wider [text-box-trim:trim-end]",
                  isSmall ? "text-xs" : "",
                )}
              >
                {resourceName}
              </span>
              <div className="ml-1 flex gap-0.5">
                {Array.from({ length: resources }).map((_, i) => (
                  <input
                    className={
                      isSmall ? "size-3 rounded-full" : "size-4 rounded-full"
                    }
                    data-checkbox-marker="x"
                    key={i}
                    name={`${id}-r-${i}`}
                    type="checkbox"
                  />
                ))}
              </div>
            </div>
          )}
          {!!checkboxes && (
            <div className="ml-auto flex items-center gap-1 text-sm text-neu-500 dark:text-neu-400">
              <div className="ml-1 flex gap-0.75">
                {Array.from({ length: checkboxes }).map((_, i) => (
                  <input
                    className="aspect-square size-3.5 shrink-0"
                    key={i}
                    name={`${id}-c-${i}`}
                    type="checkbox"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {requirement && (
          <p className="mt-0.75 text-sm text-neu-500 dark:text-neu-400">
            (Requires {requirement})
          </p>
        )}
        <div
          className={cn(
            "leading-relaxed text-neu-700 dark:text-neu-300",
            isSmall ? "mt-1 text-sm" : "mt-2",
          )}
        >
          {children}
        </div>
      </div>
    </article>
  );
};
