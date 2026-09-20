import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { projectsApi } from "../../api/projects";
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
import { Textarea } from "../ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => projectsApi.create({ name: name.trim(), description: description.trim() }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Project "${project.name}" created`);
      close();
    },
  });

  function close() {
    onOpenChange(false);
    setName("");
    setDescription("");
    create.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && !create.isPending) create.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              A project holds your collections and requests. You will be its owner.
            </DialogDescription>
          </DialogHeader>

          {create.isError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>Could not create the project</AlertTitle>
              <AlertDescription>{create.error.message}</AlertDescription>
            </Alert>
          )}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-description">Description (optional)</FieldLabel>
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending && <Spinner data-icon="inline-start" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
