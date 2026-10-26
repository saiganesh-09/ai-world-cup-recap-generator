import type { Metadata } from "next";
import { CreateWizard } from "@/components/recap/create-wizard";
import { tournamentRepo } from "@/repositories/sports.repository";

export const metadata: Metadata = { title: "Create Recap" };

export default async function CreatePage() {
  const tournaments = await tournamentRepo.list();
  return <CreateWizard tournaments={tournaments} />;
}
