import { Suspense } from "react";
import AuthCard from "@/components/AuthCard";
import VerifyEmailChangeForm from "@/components/VerifyEmailChangeForm";

type Props = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default function VerifyEmailChangePage({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <AuthCard title="Confirm new email" subtitle="Preparing your confirmation link." showTerms={false}>
          <p className="text-center text-sm text-ink-500">Please wait…</p>
        </AuthCard>
      }
    >
      <VerifyEmailChangeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyEmailChangeContent({ searchParams }: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return <VerifyEmailChangeForm token={token} />;
}
