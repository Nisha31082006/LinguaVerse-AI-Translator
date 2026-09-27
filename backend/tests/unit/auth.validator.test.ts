import { registerSchema, loginSchema } from "../../src/validators/auth.validator";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      fullName: "Test User",
      username: "test_user",
      email: "test@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a weak password", () => {
    const result = registerSchema.safeParse({
      fullName: "Test User",
      username: "test_user",
      email: "test@example.com",
      password: "weak",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid username with special characters", () => {
    const result = registerSchema.safeParse({
      fullName: "Test User",
      username: "bad username!",
      email: "test@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      fullName: "Test User",
      username: "test_user",
      email: "not-an-email",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});
