import { updateStatusSchema, updateRoleSchema } from "../../src/validators/admin.validator";

describe("updateStatusSchema", () => {
  it("accepts ACTIVE and SUSPENDED", () => {
    expect(updateStatusSchema.safeParse({ status: "ACTIVE" }).success).toBe(true);
    expect(updateStatusSchema.safeParse({ status: "SUSPENDED" }).success).toBe(true);
  });

  it("rejects an invalid status", () => {
    expect(updateStatusSchema.safeParse({ status: "BANNED" }).success).toBe(false);
  });
});

describe("updateRoleSchema", () => {
  it("accepts USER and ADMIN", () => {
    expect(updateRoleSchema.safeParse({ role: "USER" }).success).toBe(true);
    expect(updateRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
  });

  it("rejects an invalid role", () => {
    expect(updateRoleSchema.safeParse({ role: "SUPERUSER" }).success).toBe(false);
  });
});
