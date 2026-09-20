import { isClerkAPIResponseError } from "@clerk/backend/errors";
import type { CurrentUser } from "@restman/shared";
import type { FastifyBaseLogger } from "fastify";
import { clerkClient } from "../../auth/clerk.js";
import { prisma } from "../../db/client.js";
import { HttpError } from "../../errors.js";
import type { RegisterInput } from "./auth.schema.js";

/**
 * Turns a failed Clerk user creation into an error the client can act on. Clerk answers 422 for
 * problems with the submitted form data; any other failure (invalid API key, outage, rate limit)
 * is ours, not the caller's, so it is returned untouched and ends up as a generic error.
 */
function toRegistrationError(error: unknown): unknown {
  if (!isClerkAPIResponseError(error) || error.status !== 422) return error;

  if (error.errors.some((e) => e.code === "form_identifier_exists")) {
    return new HttpError(409, "An account with this email already exists. Sign in instead.");
  }
  // Clerk's validation messages (weak or breached password, bad email format) are meant for users.
  const message = error.errors[0]?.longMessage ?? error.errors[0]?.message;
  return new HttpError(422, message ?? "The account details were rejected");
}

export const authService = {
  /**
   * Registers a developer together with their company and team:
   * Clerk user -> Clerk Organization (the company, user is its admin) -> local Company/Team/User.
   * If any step fails, everything created so far is rolled back so the registration can be retried.
   */
  async register(input: RegisterInput, log: FastifyBaseLogger): Promise<CurrentUser> {
    let clerkUserId: string | undefined;
    let clerkOrgId: string | undefined;

    try {
      try {
        const clerkUser = await clerkClient.users.createUser({
          emailAddress: [input.email],
          // The email is not verified by us; don't claim it is. It can still be used to sign in.
          emailAddressIdentificationStatus: ["reserved"],
          password: input.password,
          firstName: input.firstName,
          lastName: input.lastName,
        });
        clerkUserId = clerkUser.id;
      } catch (error) {
        throw toRegistrationError(error);
      }

      const organization = await clerkClient.organizations.createOrganization({
        name: input.companyName,
        createdBy: clerkUserId,
      });
      clerkOrgId = organization.id;

      const { user, company, team } = await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { clerkOrgId: organization.id, name: input.companyName },
        });
        const team = await tx.team.create({ data: { companyId: company.id, name: input.teamName } });
        const user = await tx.user.create({
          data: {
            clerkUserId: clerkUserId!,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            role: "admin",
            companyId: company.id,
            teamId: team.id,
          },
        });
        return { user, company, team };
      });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        company: { id: company.id, name: company.name },
        team: { id: team.id, name: team.name },
      };
    } catch (error) {
      // Best-effort rollback of the Clerk side; the org goes first because the user created it.
      if (clerkOrgId) {
        await clerkClient.organizations
          .deleteOrganization(clerkOrgId)
          .catch((e) => log.error({ err: e, clerkOrgId }, "Could not roll back Clerk organization"));
      }
      if (clerkUserId) {
        await clerkClient.users
          .deleteUser(clerkUserId)
          .catch((e) => log.error({ err: e, clerkUserId }, "Could not roll back Clerk user"));
      }

      if (error instanceof HttpError) throw error;
      // Not something the caller can fix (Clerk outage, Organizations disabled, DB error): log it, keep the reply generic.
      log.error({ err: error }, "Registration failed");
      throw new HttpError(502, "Could not complete registration. Please try again later.");
    }
  },
};
