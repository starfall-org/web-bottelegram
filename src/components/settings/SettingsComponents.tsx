import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    ChevronRight,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
} from "lucide-react";

export type SettingsSection =
    | "connection"
    | "appearance"
    | "preferences"
    | "bots"
    | "about";

export interface StatusToast {
    message: string;
    type: "success" | "error" | "info" | "loading";
}

// Navigation item component
export function NavItem({
    icon: Icon,
    label,
    description,
    active,
    onClick,
    badge,
}: {
    icon: React.ElementType;
    label: string;
    description?: string;
    active: boolean;
    onClick: () => void;
    badge?: string | number;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                "hover:bg-accent/50 group",
                active && "bg-primary/10 text-primary shadow-sm",
            )}
        >
            <div
                className={cn(
                    "p-2 rounded-lg transition-colors duration-200",
                    active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted group-hover:bg-accent",
                )}
            >
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{label}</div>
                {description && (
                    <div className="text-xs text-muted-foreground truncate hidden lg:block">
                        {description}
                    </div>
                )}
            </div>
            {badge !== undefined && Number(badge) > 0 && (
                <Badge variant="secondary" className="text-xs">
                    {badge}
                </Badge>
            )}
            <ChevronRight
                className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200 hidden sm:block",
                    active && "text-primary translate-x-0.5",
                )}
            />
        </button>
    );
}

// Status toast component
export function StatusToastUI({
    toast,
    onClose,
}: {
    toast: StatusToast | null;
    onClose: () => void;
}) {
    if (!toast) return null;

    const icons = {
        success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        error: <XCircle className="h-4 w-4 text-destructive" />,
        info: <AlertCircle className="h-4 w-4 text-blue-500" />,
        loading: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    };

    const bgColors = {
        success: "bg-green-500/10 border-green-500/20",
        error: "bg-destructive/10 border-destructive/20",
        info: "bg-blue-500/10 border-blue-500/20",
        loading: "bg-primary/10 border-primary/20",
    };

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border animate-in slide-in-from-top-2 duration-300",
                bgColors[toast.type],
            )}
        >
            {icons[toast.type]}
            <span className="text-sm flex-1">{toast.message}</span>
            {toast.type !== "loading" && (
                <button
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <XCircle className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

// Setting item row component
export function SettingRow({
    icon: Icon,
    title,
    description,
    children,
    className,
}: {
    icon?: React.ElementType;
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn("flex items-center justify-between py-4", className)}
        >
            <div className="flex items-center gap-3 flex-1">
                {Icon && (
                    <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                )}
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">{title}</div>
                    {description && (
                        <div className="text-xs text-muted-foreground">
                            {description}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}

// Section header component
export function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}
