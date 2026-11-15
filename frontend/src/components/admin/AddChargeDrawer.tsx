"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Save,
  Calculator,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Tag,
  MapPin,
  Package,
} from "lucide-react";
import {
  ChargeRule,
  ChargeRuleCreate,
  ChargeRuleUpdate,
  ChargeCategory,
  CalculationType,
  CorridorScope,
  CommodityScope,
  CarrierScope,
} from "@/types/charge";
import { createCharge, updateCharge } from "@/lib/api-client";
import { useAdminRole } from "@/context/AdminRoleContext";

interface AddChargeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chargeToEdit?: ChargeRule | null;
  onSuccess: (savedCharge: ChargeRule) => void;
}

const CATEGORY_OPTIONS: { label: string; value: ChargeCategory; desc: string }[] = [
  { label: "Terminal & Handling", value: "TERMINAL", desc: "MIAL terminal screening, carting, THC ex-BOM" },
  { label: "Commodity Specific", value: "COMMODITY", desc: "DGR checklist, CRT Cold Chain, Perishable fees" },
  { label: "Documentation", value: "DOCUMENTATION", desc: "Electronic AWB (CGC), ICEGATE EDI transmission" },
  { label: "Customs & Regulatory", value: "CUSTOMS", desc: "AMS advance filing, export customs inspection" },
  { label: "Statutory Tax", value: "STATUTORY_TAX", desc: "Indian Air Export GST (5%) or government levies" },
  { label: "Other Ancillary", value: "OTHER", desc: "Airline-specific and miscellaneous ancillary fees" },
];

const CALCULATION_TYPES: {
  id: CalculationType;
  title: string;
  badge: string;
  description: string;
}[] = [
  {
    id: "PER_KG_WITH_MIN",
    title: "Per Kg with Floor Min",
    badge: "₹ / kg + Floor",
    description: "Calculates CW × rate; falls back to minimum floor amount if higher.",
  },
  {
    id: "FLAT",
    title: "Fixed Flat Fee",
    badge: "Flat INR",
    description: "One-off fixed charge applied once per shipment AWB.",
  },
  {
    id: "PERCENTAGE",
    title: "Freight Percentage",
    badge: "% of Base",
    description: "Evaluated as percentage of pure base freight (e.g. 5% GST).",
  },
  {
    id: "PER_PIECE",
    title: "Per Package / Piece",
    badge: "₹ / Piece",
    description: "Multiplied by physical package piece count.",
  },
];

export default function AddChargeDrawer({
  isOpen,
  onClose,
  chargeToEdit,
  onSuccess,
}: AddChargeDrawerProps) {
  const { role, isPricingHead } = useAdminRole();

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ChargeCategory>("TERMINAL");
  const [calculationType, setCalculationType] = useState<CalculationType>("PER_KG_WITH_MIN");

  // Rates
  const [ratePerKg, setRatePerKg] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [flatAmount, setFlatAmount] = useState<string>("");
  const [percentageRate, setPercentageRate] = useState<string>("");
  const [ratePerPiece, setRatePerPiece] = useState<string>("");

  // Applicability
  const [corridorScope, setCorridorScope] = useState<CorridorScope>("GLOBAL");
  const [destinationCodesInput, setDestinationCodesInput] = useState("");
  const [commodityScope, setCommodityScope] = useState<CommodityScope>("ALL");
  const [commodityKeywordsInput, setCommodityKeywordsInput] = useState("");
  const [carrierScope, setCarrierScope] = useState<CarrierScope>("ALL");
  const [carrierCodesInput, setCarrierCodesInput] = useState("");
  const [minCwThreshold, setMinCwThreshold] = useState<string>("");

  // Metadata
  const [isActive, setIsActive] = useState(true);
  const [isStatutory, setIsStatutory] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<number>(10);

  // Live Simulator Test Inputs
  const [simWeight, setSimWeight] = useState<number>(150);
  const [simPieces, setSimPieces] = useState<number>(2);
  const [simFreight, setSimFreight] = useState<number>(45000);
  const [simCommodity, setSimCommodity] = useState<string>("GENERAL CARGO");
  const [simDestination, setSimDestination] = useState<string>("JFK");
  const [simCarrier, setSimCarrier] = useState<string>("EK");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(chargeToEdit);

  // Initialize form when opened or chargeToEdit changes
  useEffect(() => {
    if (!isOpen) {
      setFormError(null);
      return;
    }

    if (chargeToEdit) {
      setCode(chargeToEdit.code || "");
      setName(chargeToEdit.name || "");
      setDescription(chargeToEdit.description || "");
      setCategory(chargeToEdit.category || "TERMINAL");
      setCalculationType(chargeToEdit.calculation_type || "PER_KG_WITH_MIN");

      setRatePerKg(chargeToEdit.rate_per_kg != null ? String(chargeToEdit.rate_per_kg) : "");
      setMinAmount(chargeToEdit.min_amount != null ? String(chargeToEdit.min_amount) : "");
      setFlatAmount(chargeToEdit.flat_amount != null ? String(chargeToEdit.flat_amount) : "");
      setPercentageRate(
        chargeToEdit.percentage_rate != null ? String(chargeToEdit.percentage_rate) : ""
      );
      setRatePerPiece(
        chargeToEdit.rate_per_piece != null ? String(chargeToEdit.rate_per_piece) : ""
      );

      const app = chargeToEdit.applicability || {};
      setCorridorScope(app.corridor_scope || "GLOBAL");
      setDestinationCodesInput((app.destination_codes || []).join(", "));
      setCommodityScope(app.commodity_scope || "ALL");
      setCommodityKeywordsInput((app.commodity_keywords || []).join(", "));
      setCarrierScope(app.carrier_scope || "ALL");
      setCarrierCodesInput((app.carrier_codes || []).join(", "));
      setMinCwThreshold(
        app.min_chargeable_weight != null ? String(app.min_chargeable_weight) : ""
      );

      setIsActive(chargeToEdit.is_active ?? true);
      setIsStatutory(chargeToEdit.is_statutory ?? false);
      setDisplayOrder(chargeToEdit.display_order ?? 10);
    } else {
      // Create defaults
      setCode("");
      setName("");
      setDescription("");
      setCategory("TERMINAL");
      setCalculationType("PER_KG_WITH_MIN");
      setRatePerKg("3.50");
      setMinAmount("550");
      setFlatAmount("");
      setPercentageRate("");
      setRatePerPiece("");

      setCorridorScope("GLOBAL");
      setDestinationCodesInput("");
      setCommodityScope("ALL");
      setCommodityKeywordsInput("");
      setCarrierScope("ALL");
      setCarrierCodesInput("");
      setMinCwThreshold("");

      setIsActive(true);
      setIsStatutory(false);
      setDisplayOrder(10);
    }
    setFormError(null);
  }, [isOpen, chargeToEdit]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Parse comma/whitespace separated codes (e.g., airport IATA or carrier codes)
  const parseCodesList = (str: string): string[] => {
    return str
      .split(/[,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  };

  // Parse comma/semicolon separated keyword phrases (preserves multi-word phrases like "DGR - PAX" or "COLD CHAIN")
  const parseKeywordsList = (str: string): string[] => {
    return str
      .split(/[,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  };

  // Live Formula Simulator Evaluation
  const simulationResult = useMemo(() => {
    const parsedDestCodes = parseCodesList(destinationCodesInput);
    const parsedCommodityKeywords = parseKeywordsList(commodityKeywordsInput);
    const parsedCarrierCodes = parseCodesList(carrierCodesInput);
    const parsedMinCw = minCwThreshold !== "" ? parseFloat(minCwThreshold) : null;

    // 1. Check Corridor Scope Match
    let corridorMatch = true;
    let corridorReason = "Corridor applies";
    if (corridorScope !== "GLOBAL") {
      const destTarget = (simDestination || "").trim().toUpperCase();
      if (parsedDestCodes.length > 0 && !parsedDestCodes.includes(destTarget)) {
        corridorMatch = false;
        corridorReason = `Destination ${destTarget} not in [${parsedDestCodes.slice(0, 3).join(", ")}${
          parsedDestCodes.length > 3 ? "..." : ""
        }]`;
      }
    }

    // 2. Check Commodity Scope Match
    let commodityMatch = true;
    let commodityReason = "Commodity applies";
    if (commodityScope === "SPECIFIC_COMMODITIES") {
      const upperSimComm = (simCommodity || "").trim().toUpperCase();
      if (parsedCommodityKeywords.length > 0) {
        const matches = parsedCommodityKeywords.some((kw) => upperSimComm.includes(kw));
        if (!matches) {
          commodityMatch = false;
          commodityReason = `Commodity '${upperSimComm}' does not match keywords [${parsedCommodityKeywords.join(
            ", "
          )}]`;
        }
      }
    }

    // 3. Check Carrier Scope Match
    let carrierMatch = true;
    let carrierReason = "Carrier applies";
    if (carrierScope === "SPECIFIC_CARRIERS") {
      const carrierTarget = (simCarrier || "").trim().toUpperCase();
      if (parsedCarrierCodes.length > 0 && !parsedCarrierCodes.includes(carrierTarget)) {
        carrierMatch = false;
        carrierReason = `Carrier ${carrierTarget} not in [${parsedCarrierCodes.join(", ")}]`;
      }
    }

    // 4. Check Minimum CW Threshold
    let weightThresholdMatch = true;
    let weightReason = "Weight within range";
    if (parsedMinCw != null && !isNaN(parsedMinCw)) {
      if (simWeight < parsedMinCw) {
        weightThresholdMatch = false;
        weightReason = `CW (${simWeight} kg) < threshold (${parsedMinCw} kg)`;
      }
    }

    const isApplicable =
      corridorMatch && commodityMatch && carrierMatch && weightThresholdMatch;

    // Calculate Amount
    let calculatedAmount = 0;
    let formulaSteps = "";

    if (!isApplicable) {
      const reasons: string[] = [];
      if (!corridorMatch) reasons.push(corridorReason);
      if (!commodityMatch) reasons.push(commodityReason);
      if (!carrierMatch) reasons.push(carrierReason);
      if (!weightThresholdMatch) reasons.push(weightReason);
      formulaSteps = `Rule Excluded: ${reasons.join(" | ")}`;
      return {
        isApplicable: false,
        amount: 0,
        formulaSteps,
        ratePerKgDisplay: ratePerKg,
      };
    }

    switch (calculationType) {
      case "PER_KG_WITH_MIN": {
        const r = parseFloat(ratePerKg) || 0;
        const m = parseFloat(minAmount) || 0;
        const raw = simWeight * r;
        calculatedAmount = Math.max(raw, m);
        if (raw < m) {
          formulaSteps = `${simWeight} kg × ₹${r.toFixed(2)} = ₹${raw.toFixed(
            2
          )} < Min Floor (₹${m.toFixed(2)}) → Applied: ₹${m.toFixed(2)}`;
        } else {
          formulaSteps = `${simWeight} kg × ₹${r.toFixed(2)} = ₹${calculatedAmount.toFixed(2)}`;
        }
        break;
      }
      case "FLAT": {
        const flat = parseFloat(flatAmount) || 0;
        calculatedAmount = flat;
        formulaSteps = `Fixed Flat Fee: ₹${flat.toFixed(2)} per AWB`;
        break;
      }
      case "PERCENTAGE": {
        const pct = parseFloat(percentageRate) || 0;
        calculatedAmount = (simFreight * pct) / 100;
        formulaSteps = `${pct.toFixed(2)}% of Base Freight (₹${simFreight.toLocaleString(
          "en-IN"
        )}) = ₹${calculatedAmount.toFixed(2)}`;
        break;
      }
      case "PER_PIECE": {
        const rPiece = parseFloat(ratePerPiece) || 0;
        calculatedAmount = simPieces * rPiece;
        formulaSteps = `${simPieces} pieces × ₹${rPiece.toFixed(2)} = ₹${calculatedAmount.toFixed(2)}`;
        break;
      }
    }

    return {
      isApplicable: true,
      amount: calculatedAmount,
      formulaSteps,
      ratePerKgDisplay: ratePerKg,
    };
  }, [
    destinationCodesInput,
    commodityKeywordsInput,
    carrierCodesInput,
    minCwThreshold,
    corridorScope,
    commodityScope,
    carrierScope,
    simDestination,
    simCommodity,
    simCarrier,
    simWeight,
    simPieces,
    simFreight,
    calculationType,
    ratePerKg,
    minAmount,
    flatAmount,
    percentageRate,
    ratePerPiece,
  ]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPricingHead) return;

    setFormError(null);

    // Validation
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 10) {
      setFormError("AWB Charge Code must be between 2 and 10 alphanumeric characters (e.g. XBC, CTG).");
      return;
    }

    if (!name.trim()) {
      setFormError("Charge Name is required.");
      return;
    }

    // Rate validation per calculation type
    let parsedRatePerKg: number | null = null;
    let parsedMinAmount: number | null = null;
    let parsedFlatAmount: number | null = null;
    let parsedPercentageRate: number | null = null;
    let parsedRatePerPiece: number | null = null;

    if (calculationType === "PER_KG_WITH_MIN") {
      parsedRatePerKg = ratePerKg !== "" ? parseFloat(ratePerKg) : 0;
      parsedMinAmount = minAmount !== "" ? parseFloat(minAmount) : 0;
      if (isNaN(parsedRatePerKg) || parsedRatePerKg < 0) {
        setFormError("Rate per kg must be a non-negative number.");
        return;
      }
      if (isNaN(parsedMinAmount) || parsedMinAmount < 0) {
        setFormError("Minimum floor amount must be a non-negative number.");
        return;
      }
    } else if (calculationType === "FLAT") {
      parsedFlatAmount = flatAmount !== "" ? parseFloat(flatAmount) : 0;
      if (isNaN(parsedFlatAmount) || parsedFlatAmount < 0) {
        setFormError("Flat amount must be a non-negative number.");
        return;
      }
    } else if (calculationType === "PERCENTAGE") {
      parsedPercentageRate = percentageRate !== "" ? parseFloat(percentageRate) : 0;
      if (isNaN(parsedPercentageRate) || parsedPercentageRate < 0) {
        setFormError("Percentage rate must be a non-negative number.");
        return;
      }
    } else if (calculationType === "PER_PIECE") {
      parsedRatePerPiece = ratePerPiece !== "" ? parseFloat(ratePerPiece) : 0;
      if (isNaN(parsedRatePerPiece) || parsedRatePerPiece < 0) {
        setFormError("Rate per piece must be a non-negative number.");
        return;
      }
    }

    const payloadApplicability = {
      corridor_scope: corridorScope,
      destination_codes: corridorScope === "GLOBAL" ? [] : parseCodesList(destinationCodesInput),
      commodity_scope: commodityScope,
      commodity_keywords:
        commodityScope === "ALL" ? [] : parseKeywordsList(commodityKeywordsInput),
      carrier_scope: carrierScope,
      carrier_codes: carrierScope === "ALL" ? [] : parseCodesList(carrierCodesInput),
      min_chargeable_weight:
        minCwThreshold !== "" ? parseFloat(minCwThreshold) : null,
    };

    setIsSubmitting(true);
    try {
      if (isEditing && chargeToEdit) {
        const updatePayload: ChargeRuleUpdate = {
          code: cleanCode,
          name: name.trim(),
          description: description.trim() || null,
          category,
          calculation_type: calculationType,
          rate_per_kg: parsedRatePerKg,
          min_amount: parsedMinAmount,
          flat_amount: parsedFlatAmount,
          percentage_rate: parsedPercentageRate,
          rate_per_piece: parsedRatePerPiece,
          applicability: payloadApplicability,
          is_active: isActive,
          is_statutory: isStatutory,
          display_order: displayOrder,
        };

        const updated = await updateCharge(chargeToEdit.id, updatePayload, role);
        onSuccess(updated);
        onClose();
      } else {
        const createPayload: ChargeRuleCreate = {
          code: cleanCode,
          name: name.trim(),
          description: description.trim() || null,
          category,
          calculation_type: calculationType,
          rate_per_kg: parsedRatePerKg,
          min_amount: parsedMinAmount,
          flat_amount: parsedFlatAmount,
          percentage_rate: parsedPercentageRate,
          rate_per_piece: parsedRatePerPiece,
          applicability: payloadApplicability,
          is_active: isActive,
          is_statutory: isStatutory,
          display_order: displayOrder,
        };

        const created = await createCharge(createPayload, role);
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save charge rule.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? `Edit Charge Rule ${code}` : "Create New Charge Rule"}
          className="w-screen max-w-[530px] bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        >
          {/* Drawer Header */}
          <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                {isEditing ? <Sliders className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                  {isEditing ? "Edit Surcharge Rule" : "Configure Custom Surcharge"}
                  {isStatutory && (
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                      Statutory
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  {isEditing ? `Modifying ID: ${chargeToEdit?.id}` : "MIAL Gateway & Airline Pure Buy Engine"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close charge configuration drawer"
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Role Status Bar */}
          {!isPricingHead && (
            <div className="bg-sky-50 border-b border-sky-200 px-6 py-2.5 text-xs text-sky-900 flex items-center gap-2 shrink-0">
              <ShieldAlert className="h-4 w-4 text-sky-600 shrink-0" />
              <span>
                <strong>Read-Only Mode:</strong> You are viewing this charge as Pricing Coordinator. To save changes, switch to Pricing Team Head.
              </span>
            </div>
          )}

          {/* Drawer Scrollable Body */}
          <form id="charge-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Error saving charge: </span>
                  <span>{formError}</span>
                </div>
              </div>
            )}

            {/* Section 1: Identification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1.5">
                <Tag className="h-3.5 w-3.5 text-jfll-blue" />
                <span>1. Identification &amp; Category</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label htmlFor="charge-code" className="block text-xs font-bold text-slate-700 mb-1">
                    AWB Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="charge-code"
                    type="text"
                    disabled={!isPricingHead}
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. XBC"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none uppercase disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">2-10 letters</span>
                </div>

                <div className="col-span-2">
                  <label htmlFor="charge-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Charge Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="charge-name"
                    type="text"
                    disabled={!isPricingHead}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Airport X-Ray Screening"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Visible on rate card breakdown</span>
                </div>
              </div>

              <div>
                <label htmlFor="charge-category" className="block text-xs font-bold text-slate-700 mb-1">
                  Category Classification
                </label>
                <select
                  id="charge-category"
                  disabled={!isPricingHead}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ChargeCategory)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="charge-desc" className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Regulatory Notice
                </label>
                <textarea
                  id="charge-desc"
                  disabled={!isPricingHead}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. MIAL mandatory physical security screening ex-BOM under BCAS order..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none resize-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            {/* Section 2: Calculation Engine & Rates */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1.5">
                <Calculator className="h-3.5 w-3.5 text-amber-600" />
                <span>2. Calculation Formula &amp; Tariff Rates</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {CALCULATION_TYPES.map((type) => {
                  const isSelected = calculationType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      disabled={!isPricingHead}
                      onClick={() => setCalculationType(type.id)}
                      className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      } disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-extrabold ${isSelected ? "text-amber-950" : "text-slate-800"}`}>
                          {type.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected ? "bg-amber-200/70 text-amber-900 font-bold" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {type.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{type.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Rate Inputs depending on CalculationType */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                {calculationType === "PER_KG_WITH_MIN" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="rate-per-kg" className="block text-xs font-bold text-slate-700 mb-1">
                        Rate per Kg (₹ / kg) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono">
                          ₹
                        </span>
                        <input
                          id="rate-per-kg"
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isPricingHead}
                          value={ratePerKg}
                          onChange={(e) => setRatePerKg(e.target.value)}
                          placeholder="3.50"
                          className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 outline-none disabled:bg-slate-100"
                          required
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Multiplied by Chargeable Weight</span>
                    </div>

                    <div>
                      <label htmlFor="min-floor" className="block text-xs font-bold text-slate-700 mb-1">
                        Minimum Floor (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono">
                          ₹
                        </span>
                        <input
                          id="min-floor"
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!isPricingHead}
                          value={minAmount}
                          onChange={(e) => setMinAmount(e.target.value)}
                          placeholder="550.00"
                          className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 outline-none disabled:bg-slate-100"
                          required
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">Guaranteed minimum per AWB</span>
                    </div>
                  </div>
                )}

                {calculationType === "FLAT" && (
                  <div>
                    <label htmlFor="flat-fee" className="block text-xs font-bold text-slate-700 mb-1">
                      Fixed Flat Fee (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono">
                        ₹
                      </span>
                      <input
                        id="flat-fee"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isPricingHead}
                        value={flatAmount}
                        onChange={(e) => setFlatAmount(e.target.value)}
                        placeholder="800.00"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 outline-none disabled:bg-slate-100"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Fixed single fee per master AWB regardless of weight</span>
                  </div>
                )}

                {calculationType === "PERCENTAGE" && (
                  <div>
                    <label htmlFor="pct-rate" className="block text-xs font-bold text-slate-700 mb-1">
                      Percentage Rate (%) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="pct-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isPricingHead}
                        value={percentageRate}
                        onChange={(e) => setPercentageRate(e.target.value)}
                        placeholder="5.0"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-3 pr-7 py-2 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 outline-none disabled:bg-slate-100"
                        required
                      />
                      <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 font-mono">
                        %
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Applied to Net Base Freight (e.g. 5% GST Notification 04/2022)</span>
                  </div>
                )}

                {calculationType === "PER_PIECE" && (
                  <div>
                    <label htmlFor="piece-rate" className="block text-xs font-bold text-slate-700 mb-1">
                      Rate per Piece / Package (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-mono">
                        ₹
                      </span>
                      <input
                        id="piece-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!isPricingHead}
                        value={ratePerPiece}
                        onChange={(e) => setRatePerPiece(e.target.value)}
                        placeholder="150.00"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-sky-500 outline-none disabled:bg-slate-100"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Multiplied by total physical piece count</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Applicability & Targeting Criteria */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 pb-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>3. Applicability &amp; Targeting</span>
              </div>

              {/* Corridor Scope */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Corridor Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["GLOBAL", "SPECIFIC_PORTS", "SPECIFIC_COUNTRIES"] as CorridorScope[]).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      disabled={!isPricingHead}
                      onClick={() => setCorridorScope(scope)}
                      className={`text-center py-2 px-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                        corridorScope === scope
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      } disabled:cursor-not-allowed`}
                    >
                      {scope === "GLOBAL" ? "Global (All)" : scope === "SPECIFIC_PORTS" ? "Specific Ports" : "Specific Countries"}
                    </button>
                  ))}
                </div>

                {corridorScope !== "GLOBAL" && (
                  <div>
                    <label htmlFor="dest-codes" className="block text-[11px] font-bold text-slate-600 mb-1">
                      {corridorScope === "SPECIFIC_PORTS" ? "Target IATA Port Codes (comma-separated)" : "Target Country Codes / Ports (comma-separated)"}
                    </label>
                    <input
                      id="dest-codes"
                      type="text"
                      disabled={!isPricingHead}
                      value={destinationCodesInput}
                      onChange={(e) => setDestinationCodesInput(e.target.value.toUpperCase())}
                      placeholder="e.g. JFK, ORD, LAX, US, CA"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:border-sky-500 outline-none uppercase disabled:bg-slate-100"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Separated by commas (e.g. AMS applies only to US/CA destinations)</span>
                  </div>
                )}
              </div>

              {/* Commodity Scope */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Commodity Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["ALL", "SPECIFIC_COMMODITIES"] as CommodityScope[]).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      disabled={!isPricingHead}
                      onClick={() => setCommodityScope(scope)}
                      className={`text-center py-2 px-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                        commodityScope === scope
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      } disabled:cursor-not-allowed`}
                    >
                      {scope === "ALL" ? "All Commodities (General)" : "Specific Commodity Types"}
                    </button>
                  ))}
                </div>

                {commodityScope === "SPECIFIC_COMMODITIES" && (
                  <div>
                    <label htmlFor="commodity-keywords" className="block text-[11px] font-bold text-slate-600 mb-1">
                      Commodity Keywords (comma-separated)
                    </label>
                    <input
                      id="commodity-keywords"
                      type="text"
                      disabled={!isPricingHead}
                      value={commodityKeywordsInput}
                      onChange={(e) => setCommodityKeywordsInput(e.target.value.toUpperCase())}
                      placeholder="e.g. DGR, HAZARDOUS, PHARMA, COLD, CRT"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:border-sky-500 outline-none uppercase disabled:bg-slate-100"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Matched against coordinator cargo descriptions</span>
                  </div>
                )}
              </div>

              {/* Carrier Scope & Minimum CW */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="carrier-scope" className="block text-xs font-bold text-slate-700 mb-1">
                    Carrier Scope
                  </label>
                  <select
                    id="carrier-scope"
                    disabled={!isPricingHead}
                    value={carrierScope}
                    onChange={(e) => setCarrierScope(e.target.value as CarrierScope)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 outline-none disabled:bg-slate-100"
                  >
                    <option value="ALL">All Airlines (Global)</option>
                    <option value="SPECIFIC_CARRIERS">Specific Carriers Only</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="min-cw-thresh" className="block text-xs font-bold text-slate-700 mb-1">
                    Min CW Threshold (kg)
                  </label>
                  <input
                    id="min-cw-thresh"
                    type="number"
                    min="0"
                    disabled={!isPricingHead}
                    value={minCwThreshold}
                    onChange={(e) => setMinCwThreshold(e.target.value)}
                    placeholder="Optional (e.g. 100)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-sky-500 outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>

              {carrierScope === "SPECIFIC_CARRIERS" && (
                <div>
                  <label htmlFor="carrier-codes" className="block text-[11px] font-bold text-slate-600 mb-1">
                    Carrier Codes (2-letter IATA, comma-separated)
                  </label>
                  <input
                    id="carrier-codes"
                    type="text"
                    disabled={!isPricingHead}
                    value={carrierCodesInput}
                    onChange={(e) => setCarrierCodesInput(e.target.value.toUpperCase())}
                    placeholder="e.g. EY, EK, QR, AI"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:border-sky-500 outline-none uppercase disabled:bg-slate-100"
                  />
                </div>
              )}
            </div>

            {/* Section 4: Operational Status & Controls */}
            <div className="space-y-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Active Operational Status</span>
                  <p className="text-[11px] text-slate-500">Toggle whether this charge is dynamically evaluated on quotes</p>
                </div>
                <button
                  type="button"
                  disabled={!isPricingHead}
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? "bg-emerald-600" : "bg-slate-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900">Statutory / Mandatory Fee</span>
                  <p className="text-[11px] text-slate-500">
                    Flag as government / airport mandated (e.g. MIAL XBC, GST, AMS)
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={!isPricingHead}
                  checked={isStatutory}
                  onChange={(e) => setIsStatutory(e.target.checked)}
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                <div>
                  <label htmlFor="display-order" className="text-xs font-bold text-slate-900">Display Order</label>
                  <p className="text-[11px] text-slate-500">Sort ranking in cost breakdown modal</p>
                </div>
                <input
                  id="display-order"
                  type="number"
                  disabled={!isPricingHead}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 10)}
                  className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-center text-slate-900"
                />
              </div>
            </div>

            {/* Section 5: Real-Time Formula Sandbox Simulator */}
            <div className="rounded-2xl border-2 border-amber-300/80 bg-amber-50/40 p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950">
                    <Calculator className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                      Live Formula Simulator Sandbox
                    </h3>
                    <p className="text-[10px] text-amber-800">
                      Real-time verification of charge evaluation against mock cargo
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  Interactive Test
                </span>
              </div>

              {/* Sandbox Mock Parameters */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label htmlFor="sim-cw" className="block text-[10px] font-bold text-slate-600 mb-0.5">Test CW (kg)</label>
                  <input
                    id="sim-cw"
                    type="number"
                    min="1"
                    max="500"
                    value={simWeight}
                    onChange={(e) => setSimWeight(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label htmlFor="sim-dest" className="block text-[10px] font-bold text-slate-600 mb-0.5">Test Port</label>
                  <input
                    id="sim-dest"
                    type="text"
                    maxLength={3}
                    value={simDestination}
                    onChange={(e) => setSimDestination(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label htmlFor="sim-carrier" className="block text-[10px] font-bold text-slate-600 mb-0.5">Test Airline</label>
                  <input
                    id="sim-carrier"
                    type="text"
                    maxLength={2}
                    value={simCarrier}
                    onChange={(e) => setSimCarrier(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-800 uppercase"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="sim-comm" className="block text-[10px] font-bold text-slate-600 mb-0.5">Test Commodity</label>
                  <input
                    id="sim-comm"
                    type="text"
                    value={simCommodity}
                    onChange={(e) => setSimCommodity(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label htmlFor="sim-pieces" className="block text-[10px] font-bold text-slate-600 mb-0.5">Pieces (Pcs)</label>
                  <input
                    id="sim-pieces"
                    type="number"
                    min="1"
                    value={simPieces}
                    onChange={(e) => setSimPieces(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Simulation Result Box */}
              <div className="rounded-xl bg-white border border-amber-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    {simulationResult.isApplicable ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                    )}
                    <span>Simulation Status:</span>
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                      simulationResult.isApplicable
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {simulationResult.isApplicable ? "Applicable & Matched" : "Excluded / Not Triggered"}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                  {simulationResult.formulaSteps}
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Simulated Charge Amount:</span>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-amber-950">
                      ₹{simulationResult.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">INR</span>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Drawer Footer Actions */}
          <div className="p-4.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {isPricingHead ? (
              <button
                type="submit"
                form="charge-drawer-form"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 px-5 py-2 text-xs font-extrabold text-slate-950 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEditing ? "Update Charge Rule" : "Publish Charge Rule"}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
              >
                <ShieldAlert className="h-4 w-4 text-slate-400" />
                <span>Publish Locked (Read-Only)</span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
