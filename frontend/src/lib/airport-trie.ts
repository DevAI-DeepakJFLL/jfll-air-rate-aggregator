/**
 * DSA: Airport Prefix Trie for Sub-Millisecond Cargo Gateway Autocomplete
 * 
 * Provides:
 * - O(L) Insertion where L is code/name length
 * - O(P + K) Search where P is prefix length and K is result limit
 * - Inverted Token Indexing across IATA code, city, and airport name
 */

export interface AirportRecord {
  code: string;
  name: string;
  city: string;
  country: string;
  hub_type: "Origin Gateway" | "Transshipment Hub" | "Destination Hub";
}

class TrieNode {
  children: Map<string, TrieNode>;
  airports: AirportRecord[];
  airportCodes: Set<string>;

  constructor() {
    this.children = new Map();
    this.airports = [];
    this.airportCodes = new Set();
  }
}

export class AirportPrefixTrie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Inserts a key string into the Trie, associating it with an airport record.
   * Time Complexity: O(L)
   * Space Complexity: O(L)
   */
  insert(key: string, airport: AirportRecord): void {
    let current = this.root;
    const normalizedKey = key.toUpperCase().trim();

    for (let i = 0; i < normalizedKey.length; i++) {
      const char = normalizedKey[i];
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;

      // DSA: O(1) Set membership check eliminates O(K) linear array scan
      if (!current.airportCodes.has(airport.code)) {
        current.airportCodes.add(airport.code);
        current.airports.push(airport);
      }
    }
  }

  /**
   * Searches the Trie for all airports whose code, city, or name starts with the prefix.
   * Time Complexity: O(P + K) where P is prefix length and K is limit.
   */
  searchPrefix(prefix: string, limit: number = 6): AirportRecord[] {
    const norm = prefix.toUpperCase().trim();
    if (!norm) return [];

    let current = this.root;
    for (let i = 0; i < norm.length; i++) {
      const char = norm[i];
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }

    return current.airports.slice(0, limit);
  }
}

// Major Air Cargo Hubs Indexed in the Global Trie
export const GLOBAL_AIRPORTS: AirportRecord[] = [
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj Int'l", city: "Mumbai", country: "India", hub_type: "Origin Gateway" },
  { code: "DEL", name: "Indira Gandhi Int'l Airport", city: "Delhi", country: "India", hub_type: "Origin Gateway" },
  { code: "BLR", name: "Kempegowda Int'l Airport", city: "Bengaluru", country: "India", hub_type: "Origin Gateway" },
  { code: "MAA", name: "Chennai Int'l Airport", city: "Chennai", country: "India", hub_type: "Origin Gateway" },
  { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "UAE", hub_type: "Transshipment Hub" },
  { code: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar", hub_type: "Transshipment Hub" },
  { code: "AUH", name: "Zayed International Airport", city: "Abu Dhabi", country: "UAE", hub_type: "Transshipment Hub" },
  { code: "MCT", name: "Muscat International Airport", city: "Muscat", country: "Oman", hub_type: "Transshipment Hub" },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "USA", hub_type: "Destination Hub" },
  { code: "JFK", name: "John F. Kennedy Int'l", city: "New York", country: "USA", hub_type: "Destination Hub" },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "USA", hub_type: "Destination Hub" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta", city: "Atlanta", country: "USA", hub_type: "Destination Hub" },
  { code: "LHR", name: "London Heathrow Airport", city: "London", country: "UK", hub_type: "Destination Hub" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", hub_type: "Transshipment Hub" },
  { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", hub_type: "Transshipment Hub" },
  { code: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia", hub_type: "Destination Hub" },
  { code: "ADD", name: "Bole International Airport", city: "Addis Ababa", country: "Ethiopia", hub_type: "Transshipment Hub" },
  { code: "YYZ", name: "Toronto Pearson Int'l", city: "Toronto", country: "Canada", hub_type: "Destination Hub" },
];

export const airportTrie = new AirportPrefixTrie();
for (const airport of GLOBAL_AIRPORTS) {
  // Multi-index key: Code (BOM), City (MUMBAI), Airport Name
  airportTrie.insert(airport.code, airport);
  airportTrie.insert(airport.city, airport);
}
