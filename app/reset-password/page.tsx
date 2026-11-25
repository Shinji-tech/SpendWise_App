import { Suspense } from "react";
import AuthCard from "@/components/AuthCard";
import ResetPasswordForm from "@/components/ResetPasswordForm";

type Props = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default function ResetPasswordPage({ searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <AuthCard title="Reset your password" subtitle="Preparing your secure reset link." showTerms={false}>
          <p className="text-center text-sm text-ink-500">Please wait…</p>
        </AuthCard>
      }
    >
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: Props) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return <ResetPasswordForm token={token} />;
}
