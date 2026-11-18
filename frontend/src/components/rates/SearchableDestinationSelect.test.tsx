import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchableDestinationSelect } from "./SearchableDestinationSelect";
import { DestinationItem } from "../../types/rate";

const mockDestinations: DestinationItem[] = [
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", region: "Middle East" },
  { code: "LHR", city: "London Heathrow", country: "United Kingdom", region: "Europe" },
  { code: "SIN", city: "Singapore", country: "Singapore", region: "Southeast Asia" },
  { code: "JFK", city: "New York JFK", country: "United States", region: "North America" },
];

describe("SearchableDestinationSelect component", () => {
  it("renders with placeholder when no value is selected", () => {
    const handleChange = vi.fn();
    render(
      <SearchableDestinationSelect
        value=""
        onChange={handleChange}
        destinations={mockDestinations}
      />
    );

    expect(screen.getByText(/Select Destination/i)).toBeDefined();
  });

  it("displays currently selected destination code and city", () => {
    const handleChange = vi.fn();
    render(
      <SearchableDestinationSelect
        value="DXB"
        onChange={handleChange}
        destinations={mockDestinations}
      />
    );

    expect(screen.getByText("DXB")).toBeDefined();
    expect(screen.getAllByText(/Dubai/i).length).toBeGreaterThan(0);
  });

  it("opens dropdown and filters by city substring on typing", () => {
    const handleChange = vi.fn();
    render(
      <SearchableDestinationSelect
        value=""
        onChange={handleChange}
        destinations={mockDestinations}
      />
    );

    // Open dropdown
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Search input should be present
    const searchInput = screen.getByPlaceholderText(/Search by IATA/i);
    expect(searchInput).toBeDefined();

    // Type "London"
    fireEvent.change(searchInput, { target: { value: "London" } });

    // Should display LHR London
    expect(screen.getByText("LHR")).toBeDefined();
    // DXB should be filtered out
    expect(screen.queryByText("DXB")).toBeNull();
  });

  it("selects destination when clicked and calls onChange", () => {
    const handleChange = vi.fn();
    render(
      <SearchableDestinationSelect
        value=""
        onChange={handleChange}
        destinations={mockDestinations}
      />
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Click on Singapore (SIN)
    const option = screen.getByText("SIN");
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith("SIN");
  });
});
