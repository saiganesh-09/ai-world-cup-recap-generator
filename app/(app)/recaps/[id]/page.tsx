import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { recapRepo } from "@/repositories/recap-repo";
import { RecapView } from "@/components/recap/recap-view";
import { StatusTracker } from "@/components/recap/status-tracker";
import {
  ShareButton,
  GenerateButton,
  DeleteRecapButton,
} from "@/components/recap/actions";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, FileText } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const recap = await recapRepo.findById(id);
  return { title: recap?.title ?? "Recap" };
}

export default async function RecapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const recap = await recapRepo.findById(id);
  if (!recap || recap.userId !== user.id) notFound();

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      <ShareButton shareId={recap.shareId} />
      <DeleteRecapButton recapId={recap.id} />
    </div>
  );

  if (recap.status === "QUEUED" || recap.status === "PROCESSING") {
    return (
      <div className="mx-auto max-w-2xl">
        <StatusTracker recapId={recap.id} />
      </div>
    );
  }

  if (recap.status === "FAILED") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <AlertTriangle className="size-10 text-danger" aria-hidden />
          <h1 className="text-xl font-bold">Generation failed</h1>
          <p className="text-sm text-muted">
            {recap.error ?? "Something went wrong while building your recap."}
          </p>
          <GenerateButton recapId={recap.id} />
        </CardContent>
      </Card>
    );
  }

  if (recap.status === "DRAFT") {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <FileText className="size-10 text-accent" aria-hidden />
          <h1 className="text-xl font-bold">{recap.title}</h1>
          <p className="text-sm text-muted">
            This recap hasn&apos;t been generated yet.
          </p>
          <GenerateButton recapId={recap.id} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">{actions}</div>
      <RecapView recap={recap} />
    </div>
  );
}
