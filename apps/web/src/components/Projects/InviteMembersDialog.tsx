import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, CopyIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { invitationsApi } from "../../api/invitations";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Field, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function inviteLink(token: string) {
  return `${window.location.origin}/invites/${token}`;
}

async function copyLink(token: string) {
  try {
    await navigator.clipboard.writeText(inviteLink(token));
    return true;
  } catch {
    // Clipboard access can be denied (e.g. insecure context); the link is still visible below.
    return false;
  }
}

export function InviteMembersDialog({ projectId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const invites = useQuery({
    queryKey: ["invites", projectId],
    queryFn: () => invitationsApi.list(projectId),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => invitationsApi.create(projectId, { email: email.trim() }),
    onSuccess: async (invite) => {
      queryClient.invalidateQueries({ queryKey: ["invites", projectId] });
      setEmail("");
      const copied = await copyLink(invite.token);
      toast.success(
        copied ? `Invite link for ${invite.email} copied to clipboard` : `Invite created for ${invite.email}`,
      );
    },
  });

  const revoke = useMutation({
    mutationFn: (inviteId: string) => invitationsApi.revoke(projectId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", projectId] });
      toast.success("Invite revoked");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a developer</DialogTitle>
          <DialogDescription>
            They need a Restman account already. Creating an invite copies its link to your clipboard —
            send it to them yourself.
          </DialogDescription>
        </DialogHeader>

        {create.isError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not create the invite</AlertTitle>
            <AlertDescription>{create.error.message}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim() && !create.isPending) create.mutate();
          }}
          className="flex items-end gap-2"
        >
          <FieldGroup className="flex-1">
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                autoFocus
                required
              />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={!email.trim() || create.isPending}>
            {create.isPending && <Spinner data-icon="inline-start" />}
            Create invite
          </Button>
        </form>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Pending invites</span>

          {invites.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading…
            </div>
          )}

          {invites.data && invites.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          )}

          {invites.data?.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{invite.email}</span>
                <span className="text-xs text-muted-foreground">
                  Expires{" "}
                  {new Date(invite.expiresAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={async () => {
                    const copied = await copyLink(invite.token);
                    toast[copied ? "success" : "error"](
                      copied ? "Invite link copied" : "Could not access the clipboard",
                    );
                  }}
                  title="Copy invite link"
                >
                  <CopyIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(invite.id)}
                  title="Revoke invite"
                >
                  <XIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
