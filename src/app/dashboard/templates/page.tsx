import { MessageTemplatesSection } from "../settings/MessageTemplatesSection";

export default function DashboardTemplatesPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Templates de message</h1>
        <p className="mt-1 text-sm text-slate-500">
          Définissez des modèles pour vos messages LinkedIn (invitation, relance, etc.)
        </p>
      </div>
      <MessageTemplatesSection />
    </div>
  );
}
