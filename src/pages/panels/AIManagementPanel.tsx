import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Settings,
  Key,
  FileText,
  Users,
  BarChart3,
  Save,
  Trash2,
  Plus,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Zap,
  MessageSquare,
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const config = useQuery(api.aiManagement.getFullConfig);
  const prompts = useQuery(api.aiManagement.listPrompts);
  const conversations = useQuery(api.aiManagement.listConversations);
  const usage = useQuery(api.aiManagement.getUserUsage, {});
  const allUsage = useQuery(api.aiManagement.getAllUsageHistory);
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

  // Config form state
  const [provider, setProvider] = useState(config?.provider ?? "openai");
  const [model, setModel] = useState(config?.model ?? "gpt-4o");
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl ?? "https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [maxTokens, setMaxTokens] = useState(String(config?.maxTokensPerRequest ?? 2048));
  const [temperature, setTemperature] = useState(String(config?.temperature ?? 0.7));
  const [systemPrompt, setSystemPrompt] = useState(config?.systemPrompt ?? "");
  const [savingConfig, setSavingConfig] = useState(false);

  // Prompt form state
  const [promptName, setPromptName] = useState("");
  const [promptContent, setPromptContent] = useState("");
  const [promptCategory, setPromptCategory] = useState("general");
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // Quota form state
  const [quotaUserId, setQuotaUserId] = useState("");
  const [quotaLimit, setQuotaLimit] = useState("10");

  if (user?.role !== "admin" && user?.role !== "site_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
        await updatePrompt({
          promptId: editingPromptId as any,
          name: promptName,
          content: promptContent,
          category: promptCategory,
        });
        toast.success("پرامپت به‌روزرسانی شد");
        setEditingPromptId(null);
      } else {
        await createPrompt({
          name: promptName,
          content: promptContent,
          category: promptCategory,
        });
        toast.success("پرامپت جدید اضافه شد");
      }
      setPromptName("");
      setPromptContent("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const handleGrantTokens = async () => {
    if (!quotaUserId) {
      toast.error("کاربر را انتخاب کنید");
      return;
    }
    try {
      await grantTokens({
        userId: quotaUserId as any,
        dailyLimit: Number(quotaLimit),
      });
      toast.success("سقف پیام به‌روزرسانی شد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">مدیریت هوش مصنوعی</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              پیکربندی API، پرامپت‌ها، محدودیت پیام و نظارت بر استفاده
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            بازگشت به پنل مدیریت
          </Button>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="size-4" />
              تنظیمات API
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-2">
              <FileText className="size-4" />
              پرامپت‌ها
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="size-4" />
              آمار استفاده
            </TabsTrigger>
            <TabsTrigger value="quotas" className="gap-2">
              <Users className="size-4" />
              مدیریت سقف پیام
            </TabsTrigger>
          </TabsList>

          {/* ── API Config ──────────────────────────────────────────── */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="size-5" />
                  پیکربندی هوش مصنوعی
                </CardTitle>
                <CardDescription>
                  API key هرگز به کاربران نمایش داده نمی‌شود — فقط در سرور ذخیره می‌شود.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سرویس‌دهنده</label>
                    <Select value={provider} onValueChange={(v) => {
                      setProvider(v);
                      const p = PROVIDERS.find((p) => p.id === v);
                      if (p?.baseUrl) setBaseUrl(p.baseUrl);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">مدل</label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">آدرس API (Base URL)</label>
                  <Input
                    dir="ltr"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">کلید API</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        dir="ltr"
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={config?.apiKeyMasked ?? "sk-..."}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  {config?.hasApiKey && (
                    <p className="text-xs text-muted-foreground">
                      کلید فعلی: {config.apiKeyMasked}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">حداکثر توکن در هر درخواست</label>
                    <Input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">دما (Temperature)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">System Prompt (پرامپت پیش‌فرض)</label>
                  <Textarea
                    rows={4}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="شما یک دستیار تخصصی علوم زیستی هستید..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveConfig} disabled={savingConfig}>
                    {savingConfig ? (
                      <Loader2 className="ml-2 size-4 animate-spin" />
                    ) : (
                      <Save className="ml-2 size-4" />
                    )}
                    ذخیره تنظیمات
                  </Button>
                  {config && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (confirm("تنظیمات هوش مصنوعی حذف شود؟")) {
                          await deleteConfig();
                          toast.success("تنظیمات حذف شد");
                        }
                      }}
                    >
                      <Trash2 className="ml-2 size-4" />
                      حذف تنظیمات
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Prompts ────────────────────────────────────────────── */}
          <TabsContent value="prompts">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {editingPromptId ? "ویرایش پرامپت" : "افزودن پرامپت جدید"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="نام پرامپت"
                      value={promptName}
                      onChange={(e) => setPromptName(e.target.value)}
                    />
                    <Select value={promptCategory} onValueChange={setPromptCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="دسته‌بندی" />
                      </SelectTrigger>
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
                  <Textarea
                    rows={4}
                    placeholder="محتوای پرامپت..."
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSavePrompt}>
                      <Save className="ml-2 size-4" />
                      {editingPromptId ? "ذخیره تغییرات" : "افزودن"}
                    </Button>
                    {editingPromptId && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingPromptId(null);
                          setPromptName("");
                          setPromptContent("");
                        }}
                      >
                        لغو
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>نام</TableHead>
                        <TableHead>دسته‌بندی</TableHead>
                        <TableHead>محتوا</TableHead>
                        <TableHead>پیش‌فرض</TableHead>
                        <TableHead className="text-left">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prompts?.map((p) => (
                        <TableRow key={p._id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{p.category}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                            {p.content}
                          </TableCell>
                          <TableCell>
                            {p.isDefault ? (
                              <Badge variant="default">پیش‌فرض</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDefaultPrompt({ promptId: p._id as any })}
                              >
                                پیش‌فرض کردن
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPromptId(p._id);
                                  setPromptName(p.name);
                                  setPromptContent(p.content);
                                  setPromptCategory(p.category);
                                }}
                              >
                                ویرایش
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deletePrompt({ promptId: p._id as any })}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {prompts?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                            هنوز پرامپتی اضافه نشده است
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Usage Stats ─────────────────────────────────────────── */}
          <TabsContent value="usage">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">آمار استفاده امروز</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm("آمار امروز ریست شود؟")) {
                      await resetAllUsage();
                      toast.success("آمار امروز ریست شد");
                    }
                  }}
                >
                  ریست آمار امروز
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>تاریخ</TableHead>
                        <TableHead>پیام ارسالی</TableHead>
                        <TableHead>توکن مصرفی</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usage?.map((u) => (
                        <TableRow key={u._id}>
                          <TableCell className="font-mono">{u.date}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="size-3.5" />
                              {u.messagesSent}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <Zap className="size-3.5" />
                              {u.tokensUsed}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {usage?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                            هنوز استفاده‌ای ثبت نشده
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <h3 className="mt-6 text-lg font-bold">گفتگوهای فعال</h3>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>عنوان</TableHead>
                        <TableHead>کاربر</TableHead>
                        <TableHead>نقش</TableHead>
                        <TableHead>آخرین فعالیت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversations?.map((c) => (
                        <TableRow key={c._id}>
                          <TableCell className="font-medium max-w-xs truncate">{c.title}</TableCell>
                          <TableCell className="text-sm">{c.userName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{c.userRole}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(c.updatedAt).toLocaleDateString("fa-IR")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {conversations?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                            هنوز گفتگویی وجود ندارد
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Token Quotas ────────────────────────────────────────── */}
          <TabsContent value="quotas">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>تخصیص سقف پیام روزانه</CardTitle>
                  <CardDescription>
                    سقف پیام روزانه پیش‌فرض: دانشجو ۳ پیام، مدرس ۱۰ پیام. می‌توانید برای کاربر خاصی سقف را تغییر دهید.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="شناسه کاربر (ID)"
                      value={quotaUserId}
                      onChange={(e) => setQuotaUserId(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="سقف جدید (مثلاً 20)"
                      value={quotaLimit}
                      onChange={(e) => setQuotaLimit(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleGrantTokens}>
                    <CheckCircle2 className="ml-2 size-4" />
                    اعمال سقف جدید
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>کاربر</TableHead>
                        <TableHead>نقش</TableHead>
                        <TableHead>سقف روزانه</TableHead>
                        <TableHead>تاریخ تخصیص</TableHead>
                        <TableHead>یادداشت</TableHead>
                        <TableHead className="text-left">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotas?.map((q) => (
                        <TableRow key={q._id}>
                          <TableCell className="font-medium">{q.userName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{q.userRole}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{q.dailyLimit}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(q.grantedAt).toLocaleDateString("fa-IR")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {q.note ?? "—"}
                          </TableCell>
                          <TableCell className="text-left">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => revokeTokens({ userId: q.userId as any })}
                            >
                              لغو
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {quotas?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                            هنوز سقف خاصی تخصیص داده نشده
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
