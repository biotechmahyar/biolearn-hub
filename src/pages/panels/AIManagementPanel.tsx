import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Key,
  FileText,
  Users,
  BarChart3,
  Save,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Zap,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

const AI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "gapgpt-qwen-3.5", name: "GapGPT Qwen 3.5" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "gemini-pro", name: "Gemini Pro" },
];

const PROVIDERS = [
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { id: "gapgpt", name: "GapGPT", baseUrl: "https://api.gapgpt.app/v1" },
  { id: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com" },
  { id: "google", name: "Google AI", baseUrl: "https://generativelanguage.googleapis.com" },
  { id: "custom", name: "Custom", baseUrl: "" },
];

export default function AIManagementPanel() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const config = useQuery(api.aiManagement.getFullConfig);
  const prompts = useQuery(api.aiManagement.listPrompts);
  const conversations = useQuery(api.aiManagement.listConversations);
  const usage = useQuery(api.aiManagement.getUserUsage, {});
  const quotas = useQuery(api.aiManagement.listTokenQuotas);

  const saveConfig = useMutation(api.aiManagement.saveConfig);
  const deleteConfig = useMutation(api.aiManagement.deleteConfig);
  const createPrompt = useMutation(api.aiManagement.createPrompt);
  const updatePrompt = useMutation(api.aiManagement.updatePrompt);
  const deletePrompt = useMutation(api.aiManagement.deletePrompt);
  const setDefaultPrompt = useMutation(api.aiManagement.setDefaultPrompt);
  const grantTokens = useMutation(api.aiManagement.grantTokens);
  const revokeTokens = useMutation(api.aiManagement.revokeTokens);
  const resetAllUsage = useMutation(api.aiManagement.resetAllUsage);

  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [maxTokens, setMaxTokens] = useState("2048");
  const [temperature, setTemperature] = useState("0.7");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const [promptName, setPromptName] = useState("");
  const [promptContent, setPromptContent] = useState("");
  const [promptCategory, setPromptCategory] = useState("general");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  const [quotaUserId, setQuotaUserId] = useState("");
  const [quotaLimit, setQuotaLimit] = useState("10");

  // Sync form state when config loads (only if config changes from undefined to a value)
  useEffect(() => {
    if (config) {
      setProvider(config.provider ?? "openai");
      setModel(config.model ?? "gpt-4o");
      setBaseUrl(config.baseUrl ?? "https://api.openai.com/v1");
      setMaxTokens(String(config.maxTokensPerRequest ?? 2048));
      setTemperature(String(config.temperature ?? 0.7));
      setSystemPrompt(config.systemPrompt ?? "");
    }
  }, [config]);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // Access check — safe because we already handled loading above
  if (!user || (user.role !== "admin" && user.role !== "site_admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted-foreground">دسترسی غیرمجاز</p>
      </div>
    );
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await saveConfig({
        provider,
        model,
        baseUrl,
        apiKey: apiKey || "",
        maxTokensPerRequest: Number(maxTokens),
        temperature: Number(temperature),
        systemPrompt,
      });
      toast.success("تنظیمات هوش مصنوعی ذخیره شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!promptName.trim() || !promptContent.trim()) {
      toast.error("نام و محتوای پرامپت لازم است");
      return;
    }
    try {
      if (editingPromptId) {
        await updatePrompt({ promptId: editingPromptId as any, name: promptName, content: promptContent, category: promptCategory });
        toast.success("پرامپت به‌روزرسانی شد");
        setEditingPromptId(null);
      } else {
        await createPrompt({ name: promptName, content: promptContent, category: promptCategory });
        toast.success("پرامپت جدید اضافه شد");
      }
      setPromptName("");
      setPromptContent("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const handleGrantTokens = async () => {
    if (!quotaUserId) { toast.error("کاربر را انتخاب کنید"); return; }
    try {
      await grantTokens({ userId: quotaUserId as any, dailyLimit: Number(quotaLimit) });
      toast.success("سقف پیام به‌روزرسانی شد");
    } catch (e) { toast.error(e instanceof Error ? e.message : "خطا"); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">مدیریت هوش مصنوعی</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              پیکربندی API، پرامپت‌ها و نظارت بر استفاده
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="ml-1 size-4" />
            بازگشت
          </Button>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          {/* Scrollable tabs on mobile */}
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm">
                <Settings className="size-3.5" />
                <span className="hidden sm:inline">تنظیمات</span>
                <span className="sm:hidden">API</span>
              </TabsTrigger>
              <TabsTrigger value="prompts" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="size-3.5" />
                پرامپت‌ها
              </TabsTrigger>
              <TabsTrigger value="usage" className="gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="size-3.5" />
                <span className="hidden sm:inline">آمار استفاده</span>
                <span className="sm:hidden">آمار</span>
              </TabsTrigger>
              <TabsTrigger value="quotas" className="gap-1.5 text-xs sm:text-sm">
                <Users className="size-3.5" />
                <span className="hidden sm:inline">سقف پیام</span>
                <span className="sm:hidden">سقف</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── API Config ──────────────────────────────── */}
          <TabsContent value="config">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="size-5" />
                  پیکربندی هوش مصنوعی
                </CardTitle>
                <CardDescription className="text-xs">
                  API key فقط در سرور ذخیره می‌شود.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">سرویس‌دهنده</label>
                    <Select value={provider} onValueChange={(v) => {
                      setProvider(v);
                      const p = PROVIDERS.find((p) => p.id === v);
                      if (p?.baseUrl) setBaseUrl(p.baseUrl);
                    }}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">مدل</label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">آدرس API</label>
                  <Input dir="ltr" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="h-9 text-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">کلید API</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input dir="ltr" type={showApiKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={config?.apiKeyMasked ?? "sk-..."} className="h-9 pr-10 text-sm" />
                      <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                        {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  {config?.hasApiKey && <p className="text-[11px] text-muted-foreground">کلید فعلی: {config.apiKeyMasked}</p>}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">حداکثر توکن</label>
                    <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">دما</label>
                    <Input type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">System Prompt</label>
                  <Textarea rows={3} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="text-sm" placeholder="شما یک دستیار تخصصی علوم زیستی هستید..." />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveConfig} disabled={savingConfig} size="sm">
                    {savingConfig ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : <Save className="ml-1.5 size-3.5" />}
                    ذخیره
                  </Button>
                  {config && (
                    <Button variant="destructive" size="sm" onClick={async () => {
                      if (confirm("حذف شود؟")) { await deleteConfig(); toast.success("حذف شد"); }
                    }}>
                      <Trash2 className="ml-1.5 size-3.5" />
                      حذف
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Prompts ──────────────────────────────────── */}
          <TabsContent value="prompts">
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{editingPromptId ? "ویرایش پرامپت" : "پرامپت جدید"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="نام پرامپت" value={promptName} onChange={(e) => setPromptName(e.target.value)} className="h-9 text-sm" />
                    <Select value={promptCategory} onValueChange={setPromptCategory}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="دسته‌بندی" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">عمومی</SelectItem>
                        <SelectItem value="biology">زیست‌شناسی</SelectItem>
                        <SelectItem value="microbiology">میکروبیولوژی</SelectItem>
                        <SelectItem value="biotechnology">بیوتکنولوژی</SelectItem>
                        <SelectItem value="exam">آزمون</SelectItem>
                        <SelectItem value="tutoring">تدریس</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea rows={3} placeholder="محتوای پرامپت..." value={promptContent} onChange={(e) => setPromptContent(e.target.value)} className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSavePrompt}>
                      <Save className="ml-1.5 size-3.5" />{editingPromptId ? "ذخیره" : "افزودن"}
                    </Button>
                    {editingPromptId && <Button size="sm" variant="ghost" onClick={() => { setEditingPromptId(null); setPromptName(""); setPromptContent(""); }}>لغو</Button>}
                  </div>
                </CardContent>
              </Card>

              {/* Prompt list - card-based for mobile */}
              {prompts === undefined && (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {prompts?.map((p) => (
                <Card key={p._id}>
                  <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.content}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                        {p.isDefault && <Badge className="text-[10px]">پیش‌فرض</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!p.isDefault && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDefaultPrompt({ promptId: p._id as any })}>پیش‌فرض</Button>}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingPromptId(p._id); setPromptName(p.name); setPromptContent(p.content); setPromptCategory(p.category); }}>ویرایش</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deletePrompt({ promptId: p._id as any })}><Trash2 className="size-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {prompts?.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">هنوز پرامپتی نیست</p>}
            </div>
          </TabsContent>

          {/* ── Usage Stats ───────────────────────────────── */}
          <TabsContent value="usage">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">آمار امروز</h3>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={async () => {
                  if (confirm("ریست شود؟")) { await resetAllUsage(); toast.success("ریست شد"); }
                }}>ریست</Button>
              </div>

              {usage === undefined && (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {usage?.map((u) => (
                <Card key={u._id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-sm"><MessageSquare className="size-3.5" />{u.messagesSent} پیام</span>
                      <span className="flex items-center gap-1.5 text-sm"><Zap className="size-3.5" />{u.tokensUsed} توکن</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{u.date}</span>
                  </CardContent>
                </Card>
              ))}
              {usage?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">هنوز استفاده‌ای نیست</p>}

              <h3 className="mt-4 text-sm font-bold">گفتگوها</h3>
              {conversations === undefined && (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {conversations?.map((c) => (
                <Card key={c._id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.userName}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{c.userRole}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(c.updatedAt).toLocaleDateString("fa-IR")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {conversations?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">هنوز گفتگویی نیست</p>}
            </div>
          </TabsContent>

          {/* ── Token Quotas ──────────────────────────────── */}
          <TabsContent value="quotas">
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">سقف پیام روزانه</CardTitle>
                  <CardDescription className="text-xs">پیش‌فرض: دانشجو ۳، مدرس ۱۰. برای کاربر خاص تغییر دهید.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input placeholder="شناسه کاربر" value={quotaUserId} onChange={(e) => setQuotaUserId(e.target.value)} className="h-9 text-sm" />
                    <Input type="number" placeholder="سقف جدید" value={quotaLimit} onChange={(e) => setQuotaLimit(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <Button size="sm" onClick={handleGrantTokens}>
                    <CheckCircle2 className="ml-1.5 size-3.5" />اعمال
                  </Button>
                </CardContent>
              </Card>

              {quotas === undefined && (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {quotas?.map((q) => (
                <Card key={q._id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{q.userName}</p>
                      <p className="text-[11px] text-muted-foreground">{q.note ?? "—"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{q.userRole}</Badge>
                      <span className="font-mono text-sm font-bold">{q.dailyLimit}</span>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => revokeTokens({ userId: q.userId as any })}>لغو</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {quotas?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">هنوز سقفی تخصیص نشده</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
