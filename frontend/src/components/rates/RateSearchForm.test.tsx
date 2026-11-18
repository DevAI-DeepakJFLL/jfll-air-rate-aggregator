import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RateSearchForm } from "./RateSearchForm";

describe("RateSearchForm flexible weight and dimensions entry", () => {
  it("keeps search button disabled when neither weight nor dimensions are entered", () => {
    const handleSearch = vi.fn();
    render(
      <RateSearchForm
        onSearch={handleSearch}
        loading={false}
        initialDestination="DXB"
      />
    );

    const submitBtn = screen.getByRole("button", { name: /Search Airline Buy Rates/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("enables search button when only scale weight is provided", () => {
    const handleSearch = vi.fn();
    render(
      <RateSearchForm
        onSearch={handleSearch}
        loading={false}
        initialDestination="DXB"
      />
    );

    const weightInput = screen.getByLabelText(/Gross Scale Weight/i);
    fireEvent.change(weightInput, { target: { value: "100" } });

    const submitBtn = screen.getByRole("button", { name: /Search Airline Buy Rates/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(submitBtn);
    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "DXB",
        actual_weight_kg: 100,
      })
    );
  });

  it("enables search button and submits when scale weight is omitted but dimensions are provided", () => {
    const handleSearch = vi.fn();
    render(
      <RateSearchForm
        onSearch={handleSearch}
        loading={false}
        initialDestination="DXB"
      />
    );

    // Toggle dimensions
    const checkbox = screen.getByLabelText(/Package Dimensions/i);
    fireEvent.click(checkbox);

    // Fill L, W, H
    const lengthInput = screen.getByPlaceholderText("Length");
    const widthInput = screen.getByPlaceholderText("Width");
    const heightInput = screen.getByPlaceholderText("Height");

    fireEvent.change(lengthInput, { target: { value: "60" } });
    fireEvent.change(widthInput, { target: { value: "50" } });
    fireEvent.change(heightInput, { target: { value: "40" } });

    // Weight input should be optional
    const weightInput = screen.getByLabelText(/Gross Scale Weight/i);
    expect(weightInput.hasAttribute("required")).toBe(false);

    // Submit button should now be enabled
    const submitBtn = screen.getByRole("button", { name: /Search Airline Buy Rates/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(submitBtn);
    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "DXB",
        actual_weight_kg: undefined,
        dimensions: [
          expect.objectContaining({
            length_cm: 60,
            width_cm: 50,
            height_cm: 40,
            pieces: 1,
          }),
        ],
      })
    );
  });

  it("disables submit and shows alert when weight exceeds 500 kg desk ceiling", () => {
    const handleSearch = vi.fn();
    render(
      <RateSearchForm
        onSearch={handleSearch}
        loading={false}
        initialDestination="DXB"
      />
    );

    const weightInput = screen.getByLabelText(/Gross Scale Weight/i);
    fireEvent.change(weightInput, { target: { value: "520" } });

    expect(screen.getByText(/Chargeable weight exceeds the 500 kg maximum limit/i)).toBeDefined();
    const submitBtn = screen.getByRole("button", { name: /Search Airline Buy Rates/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("allows submit when weight is exactly at the 500 kg limit", () => {
    const handleSearch = vi.fn();
    render(
      <RateSearchForm
        onSearch={handleSearch}
        loading={false}
        initialDestination="DXB"
      />
    );

    const weightInput = screen.getByLabelText(/Gross Scale Weight/i);
    fireEvent.change(weightInput, { target: { value: "500" } });

    expect(screen.queryByText(/Chargeable weight exceeds the 500 kg maximum limit/i)).toBeNull();
    const submitBtn = screen.getByRole("button", { name: /Search Airline Buy Rates/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);

    fireEvent.click(submitBtn);
    expect(handleSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "DXB",
        actual_weight_kg: 500,
      })
    );
  });
});
