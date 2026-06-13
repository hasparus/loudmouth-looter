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
                "shrink-0 aspect-square",
                isSmall ? "mt-[-3.5px] size-4" : "-mt-0.75 size-4.5"
              )}
              id={id}
              name={id}
              type="checkbox"
            />
          )}
          <h3
            className={`font-serif tracking-wide font-bold text-stone-800 dark:text-stone-100 ${
              isSmall ? "" : "text-xl [text-box-trim:trim-end]"
            }`}
            id={id ? `${id}-title` : undefined}
          >
            {title}
          </h3>
          {!!resources && (
            <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400 text-sm ml-auto">
              <span
                className={cn(
                  "tracking-wider [text-box-trim:trim-end] translate-y-px",
                  isSmall ? "text-xs" : ""
                )}
              >
                {resourceName}
              </span>
              <div className="flex gap-0.5 ml-1">
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
            <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400 text-sm ml-auto">
              <div className="flex gap-0.75 ml-1">
                {Array.from({ length: checkboxes }).map((_, i) => (
                  <input
                    className="size-3.5 aspect-square shrink-0"
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
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.75">
            (Requires {requirement})
          </p>
        )}
        <div
          className={cn(
            "text-stone-700 dark:text-stone-300 leading-relaxed",
            isSmall ? "text-sm mt-1" : "mt-2"
          )}
        >
          {children}
        </div>
      </div>
    </article>
  );
};
