import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Configure AgriForge platform settings" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voice Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#6B7280]">
            <p>Agent configuration is managed via environment variables (.env).</p>
            <Separator />
            <div className="space-y-1">
              <span className="font-medium text-[#111827]">LLM Provider</span>
              <p>Groq / OpenAI (LLM_PROVIDER env var)</p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-[#111827]">TTS Provider</span>
              <p>OpenAI TTS HD / Sarvam (TTS_PROVIDER env var)</p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-[#111827]">STT Provider</span>
              <p>Deepgram Nova-3 (DEEPGRAM_STT_LANGUAGE env var)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#6B7280]">
            <div className="space-y-1">
              <span className="font-medium text-[#111827]">Current Backend</span>
              <p>SQLite (DB_BACKEND=sqlite) or MongoDB (DB_BACKEND=mongodb)</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <span className="font-medium text-[#111827]">MongoDB URI</span>
              <p>mongodb://localhost:27017</p>
            </div>
            <div className="space-y-1">
              <span className="font-medium text-[#111827]">Database Name</span>
              <p>agriforge_voice</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SIP Trunking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#6B7280]">
            <div className="space-y-1">
              <span className="font-medium text-[#111827]">SIP Domain</span>
              <p>Configured via SIP_DOMAIN env var</p>
            </div>
            <Separator />
            <p>SIP configuration is managed by Vobiz trunking and LiveKit SIP integration.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
