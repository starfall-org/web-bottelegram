import { useState } from "react";
import { ArrowRight, Bot, Eye, EyeOff, KeyRound, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBotStore, type GatewayMode } from "@/store/botStore";

export function LoginScreen() {
    const gateway = useBotStore((state) => state.gateway);
    const token = useBotStore((state) => state.token);
    const mtproto = useBotStore((state) => state.mtproto);
    const setGateway = useBotStore((state) => state.setGateway);
    const setToken = useBotStore((state) => state.setToken);
    const setMtprotoSettings = useBotStore((state) => state.setMtprotoSettings);

    const [mode, setMode] = useState<GatewayMode>(gateway);
    const [tokenInput, setTokenInput] = useState(token);
    const [apiId, setApiId] = useState(String(mtproto.apiId || 4));
    const [apiHash, setApiHash] = useState(mtproto.apiHash || "");
    const [showToken, setShowToken] = useState(false);
    const [showApiHash, setShowApiHash] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = () => {
        const nextToken = tokenInput.trim();
        if (!nextToken) {
            setError("Hãy nhập Bot Token.");
            return;
        }

        const parsedApiId = apiId.trim() ? Number(apiId) : 4;
        if (mode === "mtproto") {
            if (!Number.isInteger(parsedApiId) || parsedApiId <= 0) {
                setError("API ID không hợp lệ.");
                return;
            }
            if (!apiHash.trim()) {
                setError("MTProto cần API Hash.");
                return;
            }
        }

        // Store the connection mode/config before the token. The token is the
        // final credential that unlocks the main UI and starts useBotConnection.
        setGateway(mode);
        setMtprotoSettings({
            apiId: mode === "mtproto" ? parsedApiId : mtproto.apiId || 4,
            apiHash: mode === "mtproto" ? apiHash.trim() : mtproto.apiHash,
        });
        localStorage.setItem("bot_token", nextToken);
        setToken(nextToken);
        setError(null);
    };

    return (
        <main className="relative flex min-h-screen w-full items-center justify-center overflow-auto bg-background px-4 py-8 text-foreground">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_42%)]" />

            <section className="relative w-full max-w-[520px] rounded-[30px] border border-border bg-card p-5 shadow-2xl sm:p-7">
                <div className="mb-7 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-primary/15 text-primary">
                        <Bot className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập Bottlegram</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Chọn loại kết nối và nhập thông tin đăng nhập để tiếp tục.
                        </p>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3">
                    {[
                        {
                            value: "bot" as GatewayMode,
                            title: "Bot API",
                            description: "Kết nối tiêu chuẩn",
                            icon: Bot,
                        },
                        {
                            value: "mtproto" as GatewayMode,
                            title: "MTProto",
                            description: "Kết nối trực tiếp",
                            icon: Shield,
                        },
                    ].map((option) => {
                        const selected = mode === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    setMode(option.value);
                                    setError(null);
                                }}
                                className={cn(
                                    "rounded-2xl border p-4 text-left transition-colors",
                                    selected
                                        ? "border-primary bg-primary/10"
                                        : "border-border bg-muted/30 hover:bg-muted/60",
                                )}
                            >
                                <option.icon
                                    className={cn(
                                        "mb-3 h-5 w-5",
                                        selected ? "text-primary" : "text-muted-foreground",
                                    )}
                                />
                                <div className="font-medium">{option.title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {option.description}
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="login-token">Bot Token</Label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="login-token"
                                type={showToken ? "text" : "password"}
                                value={tokenInput}
                                onChange={(event) => {
                                    setTokenInput(event.target.value);
                                    setError(null);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && mode === "bot") handleLogin();
                                }}
                                placeholder="123456:ABC..."
                                autoComplete="off"
                                autoFocus
                                className="h-12 pl-10 pr-11 font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => setShowToken((value) => !value)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                aria-label={showToken ? "Ẩn token" : "Hiện token"}
                            >
                                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {mode === "mtproto" && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="login-api-id">API ID</Label>
                                <Input
                                    id="login-api-id"
                                    inputMode="numeric"
                                    value={apiId}
                                    onChange={(event) => {
                                        setApiId(event.target.value.replace(/[^0-9]/g, ""));
                                        setError(null);
                                    }}
                                    placeholder="4"
                                    className="h-12 font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Để trống sẽ dùng mặc định: 4.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="login-api-hash">API Hash</Label>
                                <div className="relative">
                                    <Input
                                        id="login-api-hash"
                                        type={showApiHash ? "text" : "password"}
                                        value={apiHash}
                                        onChange={(event) => {
                                            setApiHash(event.target.value);
                                            setError(null);
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") handleLogin();
                                        }}
                                        placeholder="0123456789abcdef..."
                                        autoComplete="off"
                                        className="h-12 pr-11 font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiHash((value) => !value)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        aria-label={showApiHash ? "Ẩn API Hash" : "Hiện API Hash"}
                                    >
                                        {showApiHash ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <Button onClick={handleLogin} className="h-12 w-full rounded-2xl text-base">
                        Tiếp tục
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </section>
        </main>
    );
}
