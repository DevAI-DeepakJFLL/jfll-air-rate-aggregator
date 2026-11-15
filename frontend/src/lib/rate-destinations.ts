import { DestinationItem } from "../types/rate";

export const RATE_SHEET_DESTINATIONS: DestinationItem[] = [
  // Middle East
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", region: "Middle East" },
  { code: "AUH", city: "Abu Dhabi", country: "United Arab Emirates", region: "Middle East" },
  { code: "DOH", city: "Doha", country: "Qatar", region: "Middle East" },
  { code: "MCT", city: "Muscat", country: "Oman", region: "Middle East" },
  { code: "KWI", city: "Kuwait City", country: "Kuwait", region: "Middle East" },
  { code: "BAH", city: "Bahrain", country: "Bahrain", region: "Middle East" },
  { code: "DMM", city: "Dammam", country: "Saudi Arabia", region: "Middle East" },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia", region: "Middle East" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", region: "Middle East" },
  { code: "MED", city: "Madinah", country: "Saudi Arabia", region: "Middle East" },
  { code: "AMM", city: "Amman", country: "Jordan", region: "Middle East" },
  { code: "BEY", city: "Beirut", country: "Lebanon", region: "Middle East" },
  { code: "SHJ", city: "Sharjah", country: "United Arab Emirates", region: "Middle East" },
  { code: "DWC", city: "Dubai World Central", country: "United Arab Emirates", region: "Middle East" },
  { code: "SLL", city: "Salalah", country: "Oman", region: "Middle East" },

  // Europe
  { code: "LHR", city: "London Heathrow", country: "United Kingdom", region: "Europe" },
  { code: "LGW", city: "London Gatwick", country: "United Kingdom", region: "Europe" },
  { code: "MAN", city: "Manchester", country: "United Kingdom", region: "Europe" },
  { code: "CDG", city: "Paris Charles de Gaulle", country: "France", region: "Europe" },
  { code: "FRA", city: "Frankfurt", country: "Germany", region: "Europe" },
  { code: "MUC", city: "Munich", country: "Germany", region: "Europe" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands", region: "Europe" },
  { code: "BRU", city: "Brussels", country: "Belgium", region: "Europe" },
  { code: "MXP", city: "Milan Malpensa", country: "Italy", region: "Europe" },
  { code: "FCO", city: "Rome Fiumicino", country: "Italy", region: "Europe" },
  { code: "MAD", city: "Madrid", country: "Spain", region: "Europe" },
  { code: "BCN", city: "Barcelona", country: "Spain", region: "Europe" },
  { code: "ZRH", city: "Zurich", country: "Switzerland", region: "Europe" },
  { code: "GVA", city: "Geneva", country: "Switzerland", region: "Europe" },
  { code: "VIE", city: "Vienna", country: "Austria", region: "Europe" },
  { code: "WAW", city: "Warsaw", country: "Poland", region: "Europe" },
  { code: "PRG", city: "Prague", country: "Czech Republic", region: "Europe" },
  { code: "BUD", city: "Budapest", country: "Hungary", region: "Europe" },
  { code: "CPH", city: "Copenhagen", country: "Denmark", region: "Europe" },
  { code: "ARN", city: "Stockholm", country: "Sweden", region: "Europe" },
  { code: "OSL", city: "Oslo", country: "Norway", region: "Europe" },
  { code: "HEL", city: "Helsinki", country: "Finland", region: "Europe" },
  { code: "IST", city: "Istanbul", country: "Turkey", region: "Europe" },
  { code: "ATH", city: "Athens", country: "Greece", region: "Europe" },
  { code: "DUB", city: "Dublin", country: "Ireland", region: "Europe" },
  { code: "LIS", city: "Lisbon", country: "Portugal", region: "Europe" },

  // North America
  { code: "JFK", city: "New York JFK", country: "United States", region: "North America" },
  { code: "EWR", city: "Newark", country: "United States", region: "North America" },
  { code: "ORD", city: "Chicago O'Hare", country: "United States", region: "North America" },
  { code: "LAX", city: "Los Angeles", country: "United States", region: "North America" },
  { code: "SFO", city: "San Francisco", country: "United States", region: "North America" },
  { code: "MIA", "city": "Miami", country: "United States", region: "North America" },
  { code: "ATL", city: "Atlanta", country: "United States", region: "North America" },
  { code: "DFW", city: "Dallas/Fort Worth", country: "United States", region: "North America" },
  { code: "BOS", city: "Boston", country: "United States", region: "North America" },
  { code: "IAH", city: "Houston", country: "United States", region: "North America" },
  { code: "IAD", city: "Washington Dulles", country: "United States", region: "North America" },
  { code: "SEA", city: "Seattle", country: "United States", region: "North America" },
  { code: "CLT", city: "Charlotte", country: "United States", region: "North America" },
  { code: "YYZ", city: "Toronto", country: "Canada", region: "North America" },
  { code: "YVR", city: "Vancouver", country: "Canada", region: "North America" },
  { code: "YUL", city: "Montreal", country: "Canada", region: "North America" },

  // Southeast Asia & Far East
  { code: "SIN", city: "Singapore", country: "Singapore", region: "Southeast Asia & Far East" },
  { code: "BKK", city: "Bangkok", country: "Thailand", region: "Southeast Asia & Far East" },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", region: "Southeast Asia & Far East" },
  { code: "PEN", city: "Penang", country: "Malaysia", region: "Southeast Asia & Far East" },
  { code: "CGK", city: "Jakarta", country: "Indonesia", region: "Southeast Asia & Far East" },
  { code: "DPS", city: "Bali Denpasar", country: "Indonesia", region: "Southeast Asia & Far East" },
  { code: "MNL", city: "Manila", country: "Philippines", region: "Southeast Asia & Far East" },
  { code: "SGN", city: "Ho Chi Minh City", country: "Vietnam", region: "Southeast Asia & Far East" },
  { code: "HAN", city: "Hanoi", country: "Vietnam", region: "Southeast Asia & Far East" },
  { code: "HKG", city: "Hong Kong", country: "Hong Kong", region: "Southeast Asia & Far East" },
  { code: "NRT", city: "Tokyo Narita", country: "Japan", region: "Southeast Asia & Far East" },
  { code: "HND", city: "Tokyo Haneda", country: "Japan", region: "Southeast Asia & Far East" },
  { code: "ICN", city: "Seoul Incheon", country: "South Korea", region: "Southeast Asia & Far East" },
  { code: "PVG", city: "Shanghai Pudong", country: "China", region: "Southeast Asia & Far East" },
  { code: "CAN", city: "Guangzhou", country: "China", region: "Southeast Asia & Far East" },
  { code: "PEK", city: "Beijing Capital", country: "China", region: "Southeast Asia & Far East" },
  { code: "BKI", city: "Kota Kinabalu", country: "Malaysia", region: "Southeast Asia & Far East" },
  { code: "KCH", city: "Kuching", country: "Malaysia", region: "Southeast Asia & Far East" },
  { code: "DAD", city: "Da Nang", country: "Vietnam", region: "Southeast Asia & Far East" },

  // South Asia
  { code: "CMB", city: "Colombo", country: "Sri Lanka", region: "South Asia" },
  { code: "DAC", city: "Dhaka", country: "Bangladesh", region: "South Asia" },
  { code: "MLE", city: "Malé", country: "Maldives", region: "South Asia" },

  // Australasia
  { code: "SYD", city: "Sydney", country: "Australia", region: "Australasia" },
  { code: "MEL", city: "Melbourne", country: "Australia", region: "Australasia" },
  { code: "BNE", city: "Brisbane", country: "Australia", region: "Australasia" },
  { code: "PER", city: "Perth", country: "Australia", region: "Australasia" },
  { code: "ADL", city: "Adelaide", country: "Australia", region: "Australasia" },
  { code: "AKL", city: "Auckland", country: "New Zealand", region: "Australasia" },

  // Africa
  { code: "JNB", city: "Johannesburg", country: "South Africa", region: "Africa" },
  { code: "CPT", city: "Cape Town", country: "South Africa", region: "Africa" },
  { code: "DUR", city: "Durban", country: "South Africa", region: "Africa" },
  { code: "NBO", city: "Nairobi", country: "Kenya", region: "Africa" },
  { code: "ADD", city: "Addis Ababa", country: "Ethiopia", region: "Africa" },
  { code: "CAI", city: "Cairo", country: "Egypt", region: "Africa" },
  { code: "EBB", city: "Entebbe", country: "Uganda", region: "Africa" },
  { code: "DAR", city: "Dar es Salaam", country: "Tanzania", region: "Africa" },
  { code: "ACC", city: "Accra", country: "Ghana", region: "Africa" },
  { code: "LOS", city: "Lagos", country: "Nigeria", region: "Africa" },
  { code: "MRU", city: "Mauritius", country: "Mauritius", region: "Africa" },

  // Latin America
  { code: "MEX", city: "Mexico City", country: "Mexico", region: "Latin America" },
  { code: "NLU", city: "Felipe Ángeles", country: "Mexico", region: "Latin America" },
  { code: "GRU", city: "São Paulo Guarulhos", country: "Brazil", region: "Latin America" },
];

export function getDestinationsByRegion(): Record<string, DestinationItem[]> {
  const groups: Record<string, DestinationItem[]> = {};
  for (const d of RATE_SHEET_DESTINATIONS) {
    if (!groups[d.region]) {
      groups[d.region] = [];
    }
    groups[d.region].push(d);
  }
  return groups;
}
