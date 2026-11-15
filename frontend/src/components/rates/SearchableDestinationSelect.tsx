"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, X, Check, Globe } from "lucide-react";
import { DestinationItem } from "../../types/rate";

interface SearchableDestinationSelectProps {
  value: string;
  onChange: (code: string) => void;
  destinations: DestinationItem[];
  id?: string;
}

export function SearchableDestinationSelect({
  value,
  onChange,
  destinations,
  id = "destination-select",
}: SearchableDestinationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected destination
  const selectedDest = useMemo(() => {
    return destinations.find((d) => d.code === value) || null;
  }, [destinations, value]);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter destinations by code, city, country, or region
  const filteredDestinations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return destinations;
    return destinations.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q)
    );
  }, [destinations, searchQuery]);

  // Group filtered results by region
  const groupedDestinations = useMemo(() => {
    const groups: Record<string, DestinationItem[]> = {};
    for (const d of filteredDestinations) {
      if (!groups[d.region]) {
        groups[d.region] = [];
      }
      groups[d.region].push(d);
    }
    return groups;
  }, [filteredDestinations]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0 font-sans">
      {/* 1. Select Trigger (Styled to match Air Cargo Pricing Engine) */}
      <div
        id={id}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm cursor-pointer flex items-center justify-between gap-2 select-none transition-all duration-150 outline-none ${
          isOpen
            ? "border-obsidian-900 ring-2 ring-obsidian-900/10 shadow-sm"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selectedDest ? (
            <>
              <span className="font-mono font-black text-xs bg-slate-100 text-obsidian-900 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                {selectedDest.code}
              </span>
              <span className="font-bold text-obsidian-900 truncate">
                {selectedDest.city},{" "}
                <span className="text-slate-500 font-semibold">{selectedDest.country}</span>
              </span>
            </>
          ) : (
            <span className="text-slate-400 font-medium">Select destination airport...</span>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-obsidian-900" : ""
          }`}
        />
      </div>

      {/* 2. Floating Dropdown Panel with Search & Grouped Options */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-[300px] animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Bar (Sticky) */}
          <div className="p-2 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredDestinations.length > 0) {
                      handleSelect(filteredDestinations[0].code);
                    }
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setIsOpen(false);
                  }
                }}
                placeholder="Search by IATA code, city, or country..."
                className="w-full h-8 pl-8 pr-7 text-xs font-semibold text-obsidian-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-full outline-none focus:border-obsidian-900 focus:ring-1 focus:ring-obsidian-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div
            role="listbox"
            className="overflow-y-auto max-h-[240px] py-1 text-xs divide-y divide-slate-100/60"
          >
            {filteredDestinations.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                No destination found matching &ldquo;{searchQuery}&rdquo; in verified rate sheets.
              </div>
            ) : (
              Object.entries(groupedDestinations).map(([region, dests]) => (
                <div key={region} className="py-1">
                  {/* Region Header */}
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/60 flex items-center justify-between">
                    <span>{region}</span>
                    <span className="font-mono text-[9px] font-bold text-slate-500">
                      {dests.length} ports
                    </span>
                  </div>

                  {/* Destination Items */}
                  {dests.map((item) => {
                    const isSelected = item.code === value;
                    return (
                      <div
                        key={item.code}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(item.code)}
                        className={`px-3.5 py-2 cursor-pointer flex items-center justify-between transition-colors min-h-[38px] ${
                          isSelected
                            ? "bg-slate-100 font-bold text-obsidian-900"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                              isSelected
                                ? "bg-obsidian-900 text-amber-300 font-black"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.code}
                          </span>
                          <span className="truncate text-xs">
                            <strong className="text-obsidian-900">{item.city}</strong>,{" "}
                            <span className="text-slate-500">{item.country}</span>
                          </span>
                        </div>

                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-obsidian-900 shrink-0 ml-2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. Active Destination Geographic Metadata */}
      {selectedDest && (
        <div className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 truncate">
          <Globe className="h-3 w-3 text-slate-400 shrink-0" />
          <span>
            {selectedDest.city}, {selectedDest.country}
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-aero-teal font-bold">{selectedDest.region}</span>
        </div>
      )}
    </div>
  );
}
