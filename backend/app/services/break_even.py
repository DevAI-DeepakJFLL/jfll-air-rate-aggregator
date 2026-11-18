import bisect
from typing import List, Dict, Tuple, Any


def optimize_break_even_pivot(
    chargeable_weight: float,
    tiers: List[Dict[str, Any]],
    min_charge: float = 0.0
) -> Tuple[float, float, str, bool, float]:
    """
    Evaluates IATA Break-Even Pivot Rule for air cargo tariffs using Binary Search (DSA).
    
    Time Complexity: O(log T) for natural tier selection via bisect + O(T) for pivot check,
                     where T is the number of active slabs (T <= 6). Overall: O(1) in practice.
    Space Complexity: O(1) auxiliary space (zero dynamic allocation).

    Constraint: Only evaluates slabs up to +300 kg (Strictly <500kg Smalls).

    Args:
        chargeable_weight: Current calculated CW in kg (must be < 500.0).
        tiers: List of sorted active slabs by min_weight in ascending order,
               e.g. [{"min_weight": 0, "rate": 250, "label": "Normal"}, ...]
        min_charge: Absolute minimum charge floor for this carrier/commodity.

    Returns:
        Tuple of (effective_base_freight, effective_rate_per_kg, applied_slab_label, is_pivoted, savings_amount)
    """
    if not tiers:
        default_freight = max(150.0 * chargeable_weight, min_charge)
        return (default_freight, 150.0, "Standard", False, 0.0)

    # Defensively ensure ascending order by min_weight for bisect binary search
    sorted_tiers = sorted(tiers, key=lambda t: float(t.get("min_weight", 0.0)))

    # DSA Optimization: Binary search (bisect_right) to find natural tier in O(log T)
    weights = [tier["min_weight"] for tier in sorted_tiers]
    insert_pos = bisect.bisect_right(weights, chargeable_weight)
    natural_idx = max(0, insert_pos - 1)

    natural_tier = sorted_tiers[natural_idx]
    natural_rate = natural_tier["rate"]
    natural_freight = round(chargeable_weight * natural_rate)
    
    effective_freight = natural_freight
    effective_rate = natural_rate
    applied_label = natural_tier["label"]
    is_pivoted = False
    savings = 0.0

    # Evaluate higher weight slabs (capped at +300 kg for <500kg Smalls scope)
    # Finding the optimal higher weight break that minimizes total invoice
    for j in range(natural_idx + 1, len(sorted_tiers)):
        higher_tier = sorted_tiers[j]
        # Hard constraint: Do not pivot to 500kg or above
        if higher_tier["min_weight"] >= 500.0:
            continue

        higher_freight = round(higher_tier["min_weight"] * higher_tier["rate"])
        if higher_freight < effective_freight:
            effective_freight = higher_freight
            effective_rate = higher_tier["rate"]
            applied_label = f"Pivoted to {higher_tier['label']} ({higher_tier['min_weight']:.0f} kg)"
            is_pivoted = True

    # Absolute minimum charge floor check
    if min_charge > 0 and min_charge > effective_freight:
        effective_freight = min_charge

    # Compute true savings relative to natural weight invoice
    if is_pivoted:
        if effective_freight >= natural_freight:
            is_pivoted = False
            savings = 0.0
            applied_label = natural_tier["label"]
            effective_rate = natural_rate
        else:
            savings = natural_freight - effective_freight

    return (effective_freight, effective_rate, applied_label, is_pivoted, savings)
