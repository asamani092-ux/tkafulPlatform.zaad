import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Button from "./Button";

describe("Button (Design_system_f)", () => {
  it("renders primary variant with Design_system_f class", () => {
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
