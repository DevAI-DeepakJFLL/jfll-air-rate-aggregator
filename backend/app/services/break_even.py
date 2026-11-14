from typing import List, Dict, Tuple, Optional


def optimize_break_even_pivot(
    chargeable_weight: float,
    tiers: List[Dict[str, float]],
    min_charge: float = 0.0
) -> Tuple[float, float, str, bool, float]:
    """
    Evaluates IATA Break-Even Pivot Rule for air cargo tariffs.
    Checks whether declaring a higher weight slab costs less than the natural weight.
    Constraint: Only evaluates slabs up to +300 kg (Strictly <500kg Smalls).

    Args:
        chargeable_weight: Current calculated CW in kg (must be < 500.0).
        tiers: List of sorted active slabs, e.g. [{"min_weight": 0, "rate": 250, "label": "Normal"}, ...]
        min_charge: Absolute minimum charge floor for this carrier/commodity.

    Returns:
        Tuple of (effective_base_freight, effective_rate_per_kg, applied_slab_label, is_pivoted, savings_amount)
    """
    if not tiers:
        return (max(150.0 * chargeable_weight, min_charge), 150.0, "Standard", False, 0.0)

    # 1. Identify natural tier
    natural_idx = 0
    for idx, tier in enumerate(tiers):
        if chargeable_weight >= tier["min_weight"]:
            natural_idx = idx

    natural_tier = tiers[natural_idx]
    natural_rate = natural_tier["rate"]
    natural_freight = round(chargeable_weight * natural_rate)
    
    effective_freight = natural_freight
    effective_rate = natural_rate
    applied_label = natural_tier["label"]
    is_pivoted = False
    savings = 0.0

    # 2. Check higher slabs (capped at +300 kg for <500kg Smalls scope)
    for j in range(natural_idx + 1, len(tiers)):
        higher_tier = tiers[j]
        # Hard constraint: Do not pivot to 500kg or above
        if higher_tier["min_weight"] >= 500.0:
            continue

        higher_freight = round(higher_tier["min_weight"] * higher_tier["rate"])
        if higher_freight < effective_freight:
            savings = effective_freight - higher_freight
            effective_freight = higher_freight
            effective_rate = higher_tier["rate"]
            applied_label = f"Pivoted to {higher_tier['label']} ({higher_tier['min_weight']:.0f} kg)"
            is_pivoted = True

    # 3. Minimum charge floor check
    if min_charge > 0 and min_charge > effective_freight:
        effective_freight = min_charge

    return (effective_freight, effective_rate, applied_label, is_pivoted, savings)
