import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { botService } from '@/services/botService';

interface CallbackEvent {
    callbackId: string;
    callbackData: string;
    chatId: string;
    messageId: number;
    from: any;
    timestamp: number;
}

export function CallbackNotification() {
    const [notifications, setNotifications] = useState<CallbackEvent[]>([]);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);
    const [responseText, setResponseText] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const handleCallback = (event: CustomEvent<CallbackEvent>) => {
            const newNotification = event.detail;
            setNotifications(prev => [newNotification, ...prev].slice(0, 5)); // Keep last 5

            // Auto remove after 30 seconds (increased for manual response)
            setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.callbackId !== newNotification.callbackId));
            }, 30000);
        };

        window.addEventListener('telegram-callback-query' as any, handleCallback);

        return () => {
            window.removeEventListener('telegram-callback-query' as any, handleCallback);
        };
    }, []);

    const handleRespond = async (notification: CallbackEvent) => {
        if (!responseText.trim()) return;
        
        setIsSending(true);
        try {
            const result = await botService.answerCallbackQuery(notification.callbackId, {
                text: responseText,
                show_alert: showAlert,
            });

            if (result.ok) {
                // Remove notification after successful response
                setNotifications(prev => prev.filter(n => n.callbackId !== notification.callbackId));
                setRespondingTo(null);
                setResponseText('');
                setShowAlert(false);
            } else {
                alert(`Lỗi: ${result.description}`);
            }
        } catch (error: any) {
            alert(`Lỗi: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleQuickResponse = async (notification: CallbackEvent, text: string, alert: boolean = false) => {
        setIsSending(true);
        try {
            const result = await botService.answerCallbackQuery(notification.callbackId, {
                text,
                show_alert: alert,
            });

            if (result.ok) {
                setNotifications(prev => prev.filter(n => n.callbackId !== notification.callbackId));
            }
        } catch (error) {
            console.error('Failed to answer callback:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
            {notifications.map((notification) => (
                <div
                    key={notification.callbackId}
                    className={cn(
                        "bg-card border shadow-lg rounded-lg p-4 animate-in slide-in-from-right-5",
                        "flex flex-col gap-3"
                    )}
                >
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xl">🔔</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold">Callback nhận được</h4>
                                <button
                                    onClick={() => {
                                        setNotifications(prev => 
                                            prev.filter(n => n.callbackId !== notification.callbackId)
                                        );
                                    }}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                                <p>
                                    <span className="font-medium">Từ:</span>{' '}
                                    {notification.from?.first_name || 'Unknown'}
                                    {notification.from?.username && ` (@${notification.from.username})`}
                                </p>
                                <p>
                                    <span className="font-medium">Data:</span>{' '}
                                    <code className="px-1 py-0.5 bg-muted rounded text-xs">
                                        {notification.callbackData}
                                    </code>
                                </p>
                                <p>
                                    <span className="font-medium">Chat:</span> {notification.chatId}
                                </p>
                                <p className="text-[10px]">
                                    {new Date(notification.timestamp).toLocaleTimeString('vi-VN')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Response Section */}
                    {respondingTo === notification.callbackId ? (
                        <div className="space-y-2 border-t pt-3">
                            <Input
                                placeholder="Nhập câu trả lời..."
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleRespond(notification);
                                    }
                                }}
                                disabled={isSending}
                                className="text-sm"
                            />
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showAlert}
                                        onChange={(e) => setShowAlert(e.target.checked)}
                                        className="rounded"
                                    />
                                    <span>Hiện popup</span>
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleRespond(notification)}
                                    disabled={!responseText.trim() || isSending}
                                    className="flex-1"
                                >
                                    {isSending ? 'Đang gửi...' : 'Gửi'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setRespondingTo(null);
                                        setResponseText('');
                                        setShowAlert(false);
                                    }}
                                    disabled={isSending}
                                >
                                    Hủy
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 border-t pt-3">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickResponse(notification, '✓ OK', false)}
                                disabled={isSending}
                                className="flex-1 text-xs"
                            >
                                ✓ OK
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickResponse(notification, '✓ Đã xử lý', false)}
                                disabled={isSending}
                                className="flex-1 text-xs"
                            >
                                Đã xử lý
                            </Button>
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                    setRespondingTo(notification.callbackId);
                                    setResponseText('');
                                    setShowAlert(false);
                                }}
                                disabled={isSending}
                                className="flex-1 text-xs"
                            >
                                Tùy chỉnh
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
