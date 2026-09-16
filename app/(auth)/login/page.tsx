import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Controle de Locação de Utensílios
        </h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">
          Acesso restrito. Entre com suas credenciais.
        </p>
        <LoginForm redirectTo={redirectTo ?? "/"} />
      </div>
    </main>
  );
}
