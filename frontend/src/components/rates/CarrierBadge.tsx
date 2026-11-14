"use client";

import React from "react";
import { AirlineLogo } from "./AirlineLogo";

interface CarrierBadgeProps {
  carrierCode: string;
  carrierName: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export function CarrierBadge({
  carrierCode,
  carrierName,
  className = "",
  size = "md",
}: CarrierBadgeProps) {
  return (
    <AirlineLogo
      carrierCode={carrierCode}
      carrierName={carrierName}
      size={size}
      className={className}
    />
  );
}
