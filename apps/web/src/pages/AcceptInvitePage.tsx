import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon, MailCheckIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { invitationsApi } from "../api/invitations";
import { useCurrentUser } from "../components/Auth/CurrentUser";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Spinner } from "../components/ui/spinner";

const STATUS_MESSAGE: Record<string, string> = {
  expired: "It has expired.",
  accepted: "It has already been accepted.",
  revoked: "It was revoked by the project owner.",
};

/** Landing page for an invite link: /invites/:token. Reached only by a signed-in, registered user. */
export function AcceptInvitePage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();

  const preview = useQuery({
    queryKey: ["invite", token],
    queryFn: () => invitationsApi.preview(token),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => invitationsApi.accept(token),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${result.projectId}`);
    },
  });

  if (preview.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (preview.isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite not found</CardTitle>
            <CardDescription>{preview.error.message}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to projects
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const invite = preview.data;
  const wrongEmail = invite.email !== currentUser.email.toLowerCase();
  const unusable = invite.status !== "pending";

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="truncate">Join &ldquo;{invite.projectName}&rdquo;</CardTitle>
          <CardDescription>
            {invite.invitedBy} invited {invite.email} to this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {wrongEmail && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Signed in as a different account</AlertTitle>
              <AlertDescription>
                This invite was sent to {invite.email}, but you are signed in as {currentUser.email}.
                Sign out and sign in with the invited account to accept it.
              </AlertDescription>
            </Alert>
          )}
          {!wrongEmail && unusable && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>This invite can no longer be used</AlertTitle>
              <AlertDescription>{STATUS_MESSAGE[invite.status] ?? "It is no longer valid."}</AlertDescription>
            </Alert>
          )}
          {accept.isError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Could not accept the invite</AlertTitle>
              <AlertDescription>{accept.error.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button disabled={wrongEmail || unusable || accept.isPending} onClick={() => accept.mutate()}>
            {accept.isPending ? <Spinner data-icon="inline-start" /> : <MailCheckIcon data-icon="inline-start" />}
            Accept invite
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
