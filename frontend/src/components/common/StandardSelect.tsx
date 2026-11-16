"use client";

import React, { useState, useRef, useEffect, useId, useMemo } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface StandardSelectOption<T extends string | number = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface StandardSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: StandardSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  size?: "sm" | "md";
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  align?: "left" | "right";
  dropDirection?: "auto" | "down" | "up";
}

export function StandardSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  id,
  size = "md",
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  searchable = false,
  searchPlaceholder = "Type to search...",
  ariaLabel,
  ariaDescribedBy,
  align = "left",
  dropDirection = "auto",
}: StandardSelectProps<T>) {
  const generatedId = useId();
  const selectId = id || `standard-select-${generatedId}`;
  const listboxId = `${selectId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actualDirection, setActualDirection] = useState<"down" | "up">("down");

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filter options if searchable
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      const matchDesc = opt.description ? opt.description.toLowerCase().includes(q) : false;
      return matchLabel || matchBadge || matchDesc;
    });
  }, [options, searchable, searchQuery]);

  // Active keyboard cursor index
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Synchronize active index when dropdown opens or filter changes
  useEffect(() => {
    if (isOpen) {
      const selectedIdx = filteredOptions.findIndex((opt) => opt.value === value);
      setActiveIndex(selectedIdx >= 0 ? selectedIdx : filteredOptions.length > 0 ? 0 : null);

      if (searchable) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    } else {
      setSearchQuery("");
      setActiveIndex(null);
    }
  }, [isOpen, filteredOptions, value, searchable]);

  // Calculate open direction (up vs down)
  useEffect(() => {
    if (!isOpen) return;

    if (dropDirection === "up") {
      setActualDirection("up");
      return;
    }
    if (dropDirection === "down") {
      setActualDirection("down");
      return;
    }

    // Auto-detect available vertical space
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setActualDirection("up");
      } else {
        setActualDirection("down");
      }
    }
  }, [isOpen, dropDirection]);

  // Handle outside click and escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Auto-scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex !== null && filteredOptions[activeIndex]) {
      const optVal = String(filteredOptions[activeIndex].value);
      const el = document.getElementById(`${listboxId}-opt-${optVal}`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, filteredOptions, isOpen, listboxId]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleKeyboardNav = (e: React.KeyboardEvent) => {
    if (filteredOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev === null ? 0 : (prev + 1) % filteredOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev === null || prev === 0 ? filteredOptions.length - 1 : prev - 1
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filteredOptions.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex !== null && filteredOptions[activeIndex]) {
        const target = filteredOptions[activeIndex];
        if (!target.disabled) {
          handleSelect(target.value);
        }
      }
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const isSmall = size === "sm";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full min-w-0 font-sans ${className}`}
    >
      {/* Trigger Button */}
      <div
        ref={triggerRef}
        id={selectId}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        onKeyDown={isOpen ? handleKeyboardNav : handleTriggerKeyDown}
        className={`w-full bg-white border cursor-pointer flex items-center justify-between gap-2 select-none transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-1 ${
          isSmall
            ? "h-8.5 px-3 py-1.5 rounded-lg text-xs"
            : "h-11 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm"
        } ${
          disabled
            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed pointer-events-none opacity-60"
            : isOpen
            ? "border-obsidian-900 ring-2 ring-obsidian-900/10 shadow-sm"
            : "border-slate-300 hover:border-slate-400"
        } ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selectedOption ? (
            <>
              {selectedOption.badge && (
                <span
                  className={`font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    isSmall
                      ? "text-[10px] bg-slate-100 text-obsidian-900 border-slate-200"
                      : "text-xs bg-slate-100 text-obsidian-900 border-slate-200"
                  }`}
                >
                  {selectedOption.badge}
                </span>
              )}
              <span className="font-bold text-obsidian-900 truncate">
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="text-slate-500 font-medium truncate">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-obsidian-900" : ""
          } ${disabled ? "opacity-40" : ""}`}
        />
      </div>

      {/* Floating Dropdown Panel */}
      {isOpen && !disabled && (
        <div
          className={`absolute ${
            actualDirection === "up"
              ? "bottom-[calc(100%+4px)]"
              : "top-[calc(100%+4px)]"
          } ${
            align === "right" ? "right-0" : "left-0"
          } min-w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-[300px] animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
        >
          {/* Optional Search Bar */}
          {searchable && (
            <div className="p-2 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  role="searchbox"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyboardNav}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-7 text-xs font-semibold text-obsidian-900 placeholder:text-slate-500 bg-white border border-slate-200 rounded-full outline-none focus:border-obsidian-900 focus:ring-1 focus:ring-obsidian-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-0.5 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel || placeholder}
            className={`overflow-y-auto max-h-[240px] py-1 divide-y divide-slate-100/60 ${
              isSmall ? "text-xs" : "text-xs sm:text-sm"
            }`}
          >
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-600 font-medium">
                No matching options found.
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isActive = activeIndex === idx;
                const optVal = String(opt.value);

                return (
                  <div
                    key={optVal}
                    id={`${listboxId}-opt-${optVal}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) {
                        handleSelect(opt.value);
                      }
                    }}
                    className={`cursor-pointer flex items-center justify-between transition-colors ${
                      isSmall ? "px-3 py-1.5 min-h-[32px]" : "px-3.5 py-2 min-h-[38px]"
                    } ${
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                        : isActive
                        ? "bg-slate-100/90 ring-1 ring-inset ring-obsidian-900/40 text-obsidian-900"
                        : isSelected
                        ? "bg-slate-100 text-obsidian-900"
                        : "hover:bg-slate-50 text-slate-800"
                    } ${isSelected ? "font-bold" : ""}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.badge && (
                        <span
                          className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded shrink-0 transition-colors ${
                            isSelected
                              ? "bg-obsidian-900 text-amber-300 font-black"
                              : isActive
                              ? "bg-slate-200 text-obsidian-900 font-bold"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}

                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-xs truncate ${
                            isSelected
                              ? "font-bold text-obsidian-900"
                              : "font-medium text-slate-900"
                          }`}
                        >
                          {opt.label}
                        </span>
                        {opt.description && (
                          <span className="text-[11px] text-slate-500 font-normal truncate">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-obsidian-900 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
