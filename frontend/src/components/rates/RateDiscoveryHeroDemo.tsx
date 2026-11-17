"use client";

import React, { useState } from "react";
import { Stage, Window, Bar, Roll, Badge, type Act } from "@/stageshow/kit";
import { ArrowRight, Sparkles, Check, RotateCcw } from "lucide-react";
import "./rate-walkthrough.css";

export type WalkthroughState = {
  stage: "idle" | "searching" | "results" | "breakdown" | "margin_adjusted";
  origin: string;
  destination: string;
  weight: number;
  selectedCarrier: "AI" | "EK" | "ET";
  targetMargin: number;
  searchClicked: boolean;
  satelliteOpen: boolean;
};

const initial: WalkthroughState = {
  stage: "idle",
  origin: "BOM",
  destination: "DXB",
  weight: 250,
  selectedCarrier: "AI",
  targetMargin: 10,
  searchClicked: false,
  satelliteOpen: false,
};

const POSTER: WalkthroughState = {
  stage: "breakdown",
  origin: "BOM",
  destination: "DXB",
  weight: 250,
  selectedCarrier: "AI",
  targetMargin: 15,
  searchClicked: true,
  satelliteOpen: true,
};

async function walkthroughScript(a: Act<WalkthroughState>) {
  await a.wait(700);

  // 1. Move to Search button
  await a.move("search-btn");
  await a.wait(350);
  await a.click();
  await a.set({ searchClicked: true, stage: "searching" });
  await a.wait(600);

  // 2. Reveal live results
  await a.set({ stage: "results" });
  await a.wait(900);

  // 3. Move cursor to Air India (AI-098) Inspect Breakdown button
  await a.move("inspect-ai-btn");
  await a.wait(400);
  await a.click();
  await a.set({ selectedCarrier: "AI", satelliteOpen: true, stage: "breakdown" });
  await a.wait(1000);

  // 4. Move to Margin chip to simulate real-time margin adjustments
  await a.move("margin-chip");
  await a.wait(350);
  await a.click();
  await a.set({ targetMargin: 15, stage: "margin_adjusted" });
  await a.wait(2600); // Payoff hold

  // 5. Clean reset loop
  await a.move("reset-zone");
  await a.wait(400);
  await a.set({ satelliteOpen: false, stage: "results", targetMargin: 10 });
  await a.wait(500);
  await a.set(initial);
  await a.wait(400);
}

interface RateDiscoveryHeroDemoProps {
  onRunSample?: () => void;
}

export function RateDiscoveryHeroDemo({ onRunSample }: RateDiscoveryHeroDemoProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return (
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-jfll-blue" />
          Interactive Rate Discovery walkthrough minimized.
        </span>
        <button
          onClick={() => setIsDismissed(false)}
          className="font-bold text-jfll-blue hover:underline"
        >
          Re-open Walkthrough
        </button>
      </div>
    );
  }

  return (
    <div className="rate-walkthrough-wrap">
      <div className="rate-walkthrough-header">
        <div className="flex items-center gap-2">
          <span className="rate-walkthrough-pill">
            <span className="rate-walkthrough-dot" />
            Live Platform Walkthrough
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Stageshow preview of real-time multi-carrier comparison and landed cost audits
          </span>
        </div>
        <div className="rate-walkthrough-actions">
          {onRunSample && (
            <button
              onClick={onRunSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-jfll-blue text-white text-xs font-bold hover:bg-sky-700 shadow-sm transition"
            >
              <span>Run Live Query (BOM → DXB, 250 kg)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsDismissed(true)}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            title="Hide preview"
          >
            Hide
          </button>
        </div>
      </div>

      <div className="rate-walkthrough-stage-box">
        <Stage
          width={720}
          height={380}
          initial={initial}
          poster={POSTER}
          script={walkthroughScript}
          cursor={{ at: { x: 360, y: 190 }, ripple: true }}
          compact={{ below: 640, width: 358, height: 380 }}
          accent="#0077b6"
        >
          {(s) => {
            const hasResults = s.stage !== "idle" && s.stage !== "searching";
            const quotedClientTotal = Math.round(49625 * (1 + s.targetMargin / 100));

            return (
              <div className="rw-window">
                <Window
                  url="rates.jetfreight.in/calculator"
                  chrome="native"
                  lights="color"
                  style={{ width: "100%", height: "100%" }}
                >
                  {/* Search Bar Row */}
                  <div className="rw-searchbar">
                    <div className="rw-search-pill">
                      <span className="rw-search-pill-label">Origin:</span>
                      <span>{s.origin} (Mumbai)</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <div className="rw-search-pill">
                      <span className="rw-search-pill-label">Dest:</span>
                      <span>{s.destination} (Dubai)</span>
                    </div>
                    <div className="rw-search-pill">
                      <span className="rw-search-pill-label">Weight:</span>
                      <span>{s.weight} kg</span>
                    </div>
                    <div className="ml-auto">
                      <button
                        className="rw-btn"
                        data-target="search-btn"
                        data-pressed={s.searchClicked ? "" : undefined}
                      >
                        {s.stage === "searching" ? "Calculating..." : "Search Landed Rates"}
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="rw-body">
                    {/* Carrier AI-098 */}
                    <div
                      className="rw-carrier-row"
                      data-target="carrier-row-ai"
                      data-selected={s.selectedCarrier === "AI" && hasResults}
                    >
                      <div className="rw-carrier-lead">
                        <div className="rw-carrier-badge rw-carrier-badge-ai">AI</div>
                        <div className="rw-carrier-info">
                          <div className="flex items-center gap-2">
                            <span className="rw-carrier-name">Air India Cargo</span>
                            {hasResults && (
                              <Badge tone="success" dot>
                                Best Buy Rate
                              </Badge>
                            )}
                          </div>
                          <span className="rw-carrier-details">
                            AI-098 • Direct Daily • Normal ₹250.00 • +100kg: ₹170.00
                          </span>
                        </div>
                      </div>
                      <div className="rw-carrier-pricing">
                        <div className="rw-carrier-rate">
                          {hasResults ? (
                            <>
                              <div className="rw-carrier-rate-val">₹49,625</div>
                              <div className="rw-carrier-rate-unit">₹198.50 / kg Landed</div>
                            </>
                          ) : (
                            <Bar w={70} h={12} tone={2} />
                          )}
                        </div>
                        <button
                          className="rw-inspect-btn"
                          data-target="inspect-ai-btn"
                        >
                          Audit Breakdown
                        </button>
                      </div>
                    </div>

                    {/* Carrier EK-176 */}
                    <div className="rw-carrier-row">
                      <div className="rw-carrier-lead">
                        <div className="rw-carrier-badge rw-carrier-badge-ek">EK</div>
                        <div className="rw-carrier-info">
                          <span className="rw-carrier-name">Emirates SkyCargo</span>
                          <span className="rw-carrier-details">
                            EK-176 • Direct Boeing 777F • +100kg: ₹185.00
                          </span>
                        </div>
                      </div>
                      <div className="rw-carrier-pricing">
                        <div className="rw-carrier-rate">
                          {hasResults ? (
                            <>
                              <div className="rw-carrier-rate-val">₹53,250</div>
                              <div className="rw-carrier-rate-unit">₹213.00 / kg Landed</div>
                            </>
                          ) : (
                            <Bar w={70} h={12} tone={2} />
                          )}
                        </div>
                        <span className="rw-inspect-btn opacity-60">View</span>
                      </div>
                    </div>

                    {/* Carrier ET-071 */}
                    <div className="rw-carrier-row">
                      <div className="rw-carrier-lead">
                        <div className="rw-carrier-badge rw-carrier-badge-et">ET</div>
                        <div className="rw-carrier-info">
                          <span className="rw-carrier-name">Ethiopian Cargo</span>
                          <span className="rw-carrier-details">
                            ET-071 • Hub Transfer • +100kg: ₹178.00
                          </span>
                        </div>
                      </div>
                      <div className="rw-carrier-pricing">
                        <div className="rw-carrier-rate">
                          {hasResults ? (
                            <>
                              <div className="rw-carrier-rate-val">₹51,500</div>
                              <div className="rw-carrier-rate-unit">₹206.00 / kg Landed</div>
                            </>
                          ) : (
                            <Bar w={70} h={12} tone={2} />
                          )}
                        </div>
                        <span className="rw-inspect-btn opacity-60">View</span>
                      </div>
                    </div>

                    {/* Placeholder row fading at bottom */}
                    <div className="flex items-center justify-between px-3 py-2 opacity-35">
                      <div className="flex items-center gap-3">
                        <Bar w={32} h={32} tone={1} />
                        <div className="space-y-1.5">
                          <Bar w={110} h={10} tone={2} />
                          <Bar w={170} h={8} tone={1} />
                        </div>
                      </div>
                      <Bar w={60} h={16} tone={2} />
                    </div>

                    {/* Hidden reset anchor */}
                    <span data-target="reset-zone" className="absolute bottom-2 left-2 w-1 h-1 pointer-events-none opacity-0" />

                    {/* Straddling Satellite Card (Cost Audit Breakdown) */}
                    {s.satelliteOpen && (
                      <div className="rw-satellite">
                        <div className="rw-sat-header">
                          <span className="rw-sat-title">AI-098 Cost Audit</span>
                          <span className="text-[10px] text-slate-400 font-bold">250 kg</span>
                        </div>
                        <div className="rw-sat-items">
                          <div className="rw-sat-item">
                            <span>Base Freight (@ ₹170.00):</span>
                            <strong>₹42,500</strong>
                          </div>
                          <div className="rw-sat-item">
                            <span>FSC Fuel (@ ₹20.00/kg):</span>
                            <strong>₹5,000</strong>
                          </div>
                          <div className="rw-sat-item">
                            <span>SSC Security (@ ₹3.50/kg):</span>
                            <strong>₹875</strong>
                          </div>
                          <div className="rw-sat-item">
                            <span>Origin Terminal & X-Ray:</span>
                            <strong>₹1,250</strong>
                          </div>
                        </div>
                        <div className="rw-sat-divider" />
                        <div className="rw-sat-total-row">
                          <span>Landed Buy Cost:</span>
                          <span className="rw-sat-total-val">₹49,625</span>
                        </div>

                        {/* Interactive Margin Adjustment */}
                        <div className="rw-sat-margin-bar">
                          <span
                            className="rw-sat-margin-chip"
                            data-target="margin-chip"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            Target Margin: +<Roll>{`${s.targetMargin}%`}</Roll>
                          </span>
                          <span className="rw-sat-quote-val">
                            ₹<Roll>{quotedClientTotal.toLocaleString("en-IN")}</Roll>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Window>
              </div>
            );
          }}
        </Stage>
      </div>
    </div>
  );
}
