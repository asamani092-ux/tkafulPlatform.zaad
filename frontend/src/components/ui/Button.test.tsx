import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Button from "./Button";

describe("Button (design-system)", () => {
  it("renders primary variant with design-system class", () => {
    render(<Button>حفظ</Button>);
    const btn = screen.getByRole("button", { name: "حفظ" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("btn-primary");
  });

  it("renders secondary variant", () => {
    render(<Button variant="secondary">إلغاء</Button>);
    expect(screen.getByRole("button", { name: "إلغاء" }).className).toContain("btn-secondary");
  });
});
