import { ResetForm } from "../ResetForm";

export const dynamic = "force-dynamic";

export default function ForgotPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-6 py-20">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">
        Reset your password
      </h1>
      <p className="mb-5 text-sm text-muted">
        We will email you a link to set a new one.
      </p>
      <ResetForm mode="request" />
    </main>
  );
}
