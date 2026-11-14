import heapq
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass


@dataclass(frozen=True)
class FlightLeg:
    origin: str
    destination: str
    carrier_code: str
    flight_number: str
    transit_minutes: int
    base_rate_per_kg: float

    def __repr__(self) -> str:
        return f"{self.carrier_code} {self.flight_number} ({self.origin}→{self.destination}, {self.transit_minutes}m, ₹{self.base_rate_per_kg}/kg)"


@dataclass
class RoutePath:
    origin: str
    destination: str
    legs: List[FlightLeg]
    total_transit_minutes: int
    total_rate_per_kg: float
    stops: int

    @property
    def is_direct(self) -> bool:
        return len(self.legs) == 1


class AirCargoRoutingGraph:
    """
    DSA Graph Representation for Air Cargo Transshipment Networks.
    Models Airports as Vertices V and Flight Legs as Directed Edges E.
    
    Provides:
    - O(V + E) Graph Construction
    - O((E + V) log V) Shortest Path via Dijkstra's Algorithm with Min-Heap
    - Optimal Transshipment Hub Discovery (e.g., BOM -> AUH -> ORD)
    """

    def __init__(self):
        # Adjacency list: Airport -> List of Outbound FlightLegs
        self._adj: Dict[str, List[FlightLeg]] = {}
        self._airports: Set[str] = set()

    def add_leg(
        self,
        origin: str,
        destination: str,
        carrier_code: str,
        flight_number: str,
        transit_minutes: int,
        base_rate_per_kg: float
    ) -> None:
        """Adds a directed edge in O(1) time."""
        orig = origin.upper().strip()
        dest = destination.upper().strip()
        leg = FlightLeg(
            origin=orig,
            destination=dest,
            carrier_code=carrier_code.upper().strip(),
            flight_number=flight_number.strip(),
            transit_minutes=transit_minutes,
            base_rate_per_kg=base_rate_per_kg
        )
        if orig not in self._adj:
            self._adj[orig] = []
        self._adj[orig].append(leg)
        self._airports.add(orig)
        self._airports.add(dest)

    def get_direct_legs(self, origin: str, destination: str) -> List[FlightLeg]:
        """O(deg(V)) lookup for direct non-stop flights."""
        orig = origin.upper().strip()
        dest = destination.upper().strip()
        return [leg for leg in self._adj.get(orig, []) if leg.destination == dest]

    def find_shortest_route(
        self,
        origin: str,
        destination: str,
        criterion: str = "fastest",
        max_stops: int = 2,
        layover_buffer_minutes: int = 150
    ) -> Optional[RoutePath]:
        """
        Dijkstra's Algorithm with Min-Heap Priority Queue.
        Finds the Pareto-optimal flight path minimizing total transit time or cost.
        
        Time Complexity: O((E + V) log V)
        Space Complexity: O(V) auxiliary memory
        """
        orig = origin.upper().strip()
        dest = destination.upper().strip()

        if orig not in self._airports or dest not in self._airports:
            return None

        # Min-heap priority queue entries: (accumulated_cost, counter, airport, path_legs, total_time, total_rate)
        # Priority key: transit_time if criterion == "fastest" else total_rate
        # Tie-breaker counter avoids comparison of dataclass instances in heap
        counter = 0
        pq: List[Tuple[float, int, str, List[FlightLeg], int, float]] = []
        heapq.heappush(pq, (0.0, counter, orig, [], 0, 0.0))

        # Best metric tracker for visited states: (airport, stops) -> min_score
        best_visited: Dict[Tuple[str, int], float] = {}

        while pq:
            score, _, current_airport, path_legs, total_time, total_rate = heapq.heappop(pq)

            if current_airport == dest and len(path_legs) > 0:
                return RoutePath(
                    origin=orig,
                    destination=dest,
                    legs=path_legs,
                    total_transit_minutes=total_time,
                    total_rate_per_kg=round(total_rate, 2),
                    stops=len(path_legs) - 1
                )

            stops = len(path_legs)
            if stops > max_stops:
                continue

            state_key = (current_airport, stops)
            if state_key in best_visited and best_visited[state_key] <= score:
                continue
            best_visited[state_key] = score

            # Explore neighbors in adjacency list
            for leg in self._adj.get(current_airport, []):
                next_airport = leg.destination
                # Avoid cycle in path
                if any(l.origin == next_airport for l in path_legs):
                    continue

                # Add connection layover time if connecting
                layover = layover_buffer_minutes if len(path_legs) > 0 else 0
                new_time = total_time + leg.transit_minutes + layover
                new_rate = total_rate + leg.base_rate_per_kg
                new_score = float(new_time) if criterion == "fastest" else new_rate

                counter += 1
                heapq.heappush(
                    pq,
                    (new_score, counter, next_airport, path_legs + [leg], new_time, new_rate)
                )

        return None


# Global network pre-populated with major BOM Hub airline cargo routes
GLOBAL_CARGO_GRAPH = AirCargoRoutingGraph()

# BOM Hub Direct & Connecting Network
# Direct Flights from BOM
GLOBAL_CARGO_GRAPH.add_leg("BOM", "DXB", "EK", "EK-505", 205, 132.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "DXB", "AI", "AI-995", 205, 130.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "DXB", "6E", "6E-1453", 200, 118.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "AUH", "EY", "EY-205", 215, 128.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "DOH", "QR", "QR-557", 230, 129.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "MCT", "WY", "WY-202", 175, 125.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "ADD", "ET", "ET-641", 330, 185.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "KUL", "MH", "MH-195", 310, 124.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "LHR", "AI", "AI-131", 570, 260.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "FRA", "LH", "LH-757", 560, 275.0)
GLOBAL_CARGO_GRAPH.add_leg("BOM", "SIN", "SQ", "SQ-421", 325, 160.0)

# Connecting Legs from Middle East Hubs to North America & Europe
GLOBAL_CARGO_GRAPH.add_leg("AUH", "ORD", "EY", "EY-151", 850, 462.0)
GLOBAL_CARGO_GRAPH.add_leg("AUH", "JFK", "EY", "EY-101", 860, 470.0)
GLOBAL_CARGO_GRAPH.add_leg("DXB", "ORD", "EK", "EK-235", 870, 480.0)
GLOBAL_CARGO_GRAPH.add_leg("DXB", "JFK", "EK", "EK-201", 860, 475.0)
GLOBAL_CARGO_GRAPH.add_leg("DOH", "ORD", "QR", "QR-725", 865, 465.0)
GLOBAL_CARGO_GRAPH.add_leg("DOH", "JFK", "QR", "QR-701", 855, 468.0)
GLOBAL_CARGO_GRAPH.add_leg("FRA", "ORD", "LH", "LH-430", 590, 310.0)
GLOBAL_CARGO_GRAPH.add_leg("LHR", "ORD", "BA", "BA-295", 560, 290.0)
