import { useState, useEffect } from 'react'
import { useBotStore, type BotCommand, type BotData, type Chat } from '@/store/botStore'
import { useTheme } from '@/components/ThemeProvider'
import { useTranslation } from '@/i18n/useTranslation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Bot,
  Wifi,
  WifiOff,
  Shield,
  Palette,
  Bell,
  User,
  Info,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react'
import { botService } from '@/services/botService'

export function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [proxyInput, setProxyInput] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('connection')

  // Quick switch + Bot profile states
  const [selectedBotToken, setSelectedBotToken] = useState('')
  const [botName, setBotName] = useState('')
  const [botUsernameInput, setBotUsernameInput] = useState('')
  const [botDescription, setBotDescription] = useState('')
  const [botShortDescription, setBotShortDescription] = useState('')
  
  const {
    token,
    setToken,
    getCurrentBotInfo,
    setBotInfo,
    botDataMap,
    clearBotData,
    isConnected,
    isPolling,
    preferences,
    updatePreferences,
    clearAllData
  } = useBotStore()
  
  const botInfo = getCurrentBotInfo()
  
  const { theme, setTheme } = useTheme()
  const { t, language, changeLanguage } = useTranslation()

  useEffect(() => {
    if (open) {
      setTokenInput(token)
      setProxyInput(localStorage.getItem('cors_proxy') || '')
      setStatusMessage('')

      // Initialize quick switch selection
      setSelectedBotToken(token || '')

      // Initialize bot profile editor with current info
      setBotName(botInfo.name || '')
      setBotUsernameInput(botInfo.username || '')
      setBotDescription(botInfo.description || '')
      setBotShortDescription(botInfo.shortDescription || '')
    }
  }, [open, token, botInfo])

  const showStatus = (message: string, _type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(''), 4000)
  }

  // Apply current token + proxy to BotService
  const applyServiceConfig = () => {
    const tok = tokenInput.trim()
    const proxyPrefix = proxyInput.trim() || undefined
    if (!tok) return false
    try {
      botService.setConfig({ token: tok, proxyPrefix })
      return true
    } catch {
      return false
    }
  }

  const handleSaveConnection = async () => {
    if (!tokenInput.trim()) {
      showStatus(t('messages.enterToken'), 'error')
      return
    }

    setIsLoading(true)
    try {
      setToken(tokenInput.trim())
      localStorage.setItem('bot_token', tokenInput.trim())
      
      if (proxyInput.trim()) {
        localStorage.setItem('cors_proxy', proxyInput.trim())
      } else {
        localStorage.removeItem('cors_proxy')
      }

      showStatus(t('messages.connectionSaved'), 'success')
    } catch (error) {
      showStatus(t('common.error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!tokenInput.trim()) {
      showStatus(t('messages.enterTokenToTest'), 'error')
      return
    }

    setIsLoading(true)
    try {
      if (!applyServiceConfig()) {
        showStatus(t('messages.enterTokenToTest'), 'error')
        return
      }
      showStatus(t('messages.connectionTesting'), 'info')
      const res = await botService.getMe()
      if (res.ok) {
        showStatus(t('messages.connectionSuccess'), 'success')
      } else {
        showStatus(res.description || t('messages.connectionFailed'), 'error')
      }
    } catch (error) {
      showStatus(t('messages.connectionFailed'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteWebhook = async () => {
    if (!tokenInput.trim()) {
      showStatus(t('messages.enterToken'), 'error')
      return
    }

    setIsLoading(true)
    try {
      if (!applyServiceConfig()) {
        showStatus(t('messages.enterToken'), 'error')
        return
      }
      showStatus(t('messages.webhookDeleting'), 'info')
      const res = await botService.deleteWebhook(true)
      if (res.ok) {
        showStatus(t('messages.webhookDeleted'), 'success')
      } else {
        showStatus(res.description || t('messages.webhookDeleteFailed'), 'error')
      }
    } catch (error) {
      showStatus(t('messages.webhookDeleteFailed'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Quick switch between saved bots (local only)
  const handleSwitchBot = () => {
    if (!selectedBotToken) return
    setToken(selectedBotToken)
    setTokenInput(selectedBotToken)
    localStorage.setItem('bot_token', selectedBotToken)
    showStatus(t('messages.switchedBot'), 'success')
  }

  // Update current bot info (Telegram API + local)
  const handleUpdateBotInfo = async () => {
    setIsLoading(true)
    try {
      // Try update via Telegram API if possible
      if (tokenInput.trim() && applyServiceConfig()) {
        try {
          await botService.setMyName(botName || undefined)
        } catch {}
        try {
          await botService.setMyDescription(botDescription || undefined)
        } catch {}
        try {
          await botService.setMyShortDescription(botShortDescription || undefined)
        } catch {}
      }

      // Always sync local store
      setBotInfo({
        name: botName || null,
        username: botUsernameInput || null,
        description: botDescription || null,
        shortDescription: botShortDescription || null
      })
      showStatus(t('messages.botInfoUpdated'), 'success')
    } catch {
      showStatus(t('messages.botInfoUpdateFailed'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAllData = () => {
    if (window.confirm(t('messages.confirmClearData'))) {
      clearAllData()
      setTokenInput('')
      setProxyInput('')
      localStorage.removeItem('bot_token')
      localStorage.removeItem('cors_proxy')
      showStatus(t('messages.allDataCleared'), 'success')
    }
  }

  const themeOptions = [
    { value: 'light' as const, label: t('settings.themeLight'), icon: Sun, desc: t('settings.themeLightDesc') },
    { value: 'dark' as const, label: t('settings.themeDark'), icon: Moon, desc: t('settings.themeDarkDesc') },
    { value: 'system' as const, label: t('settings.themeSystem'), icon: Monitor, desc: t('settings.themeSystemDesc') },
  ]

  const languageOptions = [
    { value: 'vi' as const, label: 'Tiếng Việt', flag: '🇻🇳' },
    { value: 'en' as const, label: 'English', flag: '🇬🇧' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t('common.settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription>
            {t('settings.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.connection')}</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.appearance')}</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.preferences')}</span>
            </TabsTrigger>
            <TabsTrigger value="bothistory" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.botHistory')}</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.about')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-6 overflow-y-auto max-h-[60vh]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  {t('settings.botConfig')}
                </CardTitle>
                <CardDescription>
                  {t('settings.botConfigDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token">{t('bot.token')} *</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder={t('bot.tokenPlaceholder')}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('bot.tokenFromBotFather')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="proxy">{t('settings.proxy')}</Label>
                  <Input
                    id="proxy"
                    placeholder={t('settings.proxyPlaceholder')}
                    value={proxyInput}
                    onChange={(e) => setProxyInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.proxyDesc')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={handleTestConnection} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                    {t('connection.testConnection')}
                  </Button>
                  <Button 
                    onClick={handleDeleteWebhook} 
                    disabled={isLoading}
                    variant="destructive"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t('bot.deleteWebhook')}
                  </Button>
                  <Button 
                    onClick={handleSaveConnection} 
                    disabled={isLoading}
                  >
                    {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                    {t('connection.saveConnection')}
                  </Button>
                </div>

                {statusMessage && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{statusMessage}</span>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md space-y-1">
                  <p><strong>{t('settings.connectionNotes')}</strong></p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t('settings.connectionNote1')}</li>
                    <li>{t('settings.connectionNote2')}</li>
                    <li>{t('settings.connectionNote3')}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Quick Switch Bots */}
            {botDataMap.size > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    {t('settings.quickSwitchBots')}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.selectSavedBot')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="saved-bots">{t('settings.selectSavedBot')}</Label>
                      <select
                        id="saved-bots"
                        value={selectedBotToken}
                        onChange={(e) => setSelectedBotToken(e.target.value)}
                        className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                      >
                        {Array.from(botDataMap.entries()).map((entry) => {
                          const [botToken, data] = entry as [string, BotData]
                          const label =
                            data.botInfo?.name ||
                            data.botInfo?.username ||
                            `Bot ${botToken.slice(0, 4)}…${botToken.slice(-4)}`
                          return (
                            <option key={botToken} value={botToken}>
                              {label}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full" onClick={handleSwitchBot}>
                        {t('settings.switchBot')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bot Profile Editor (local-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('settings.botProfile')}
                </CardTitle>
                <CardDescription>
                  {t('settings.botProfileDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bot-name">{t('bot.botName')}</Label>
                    <Input
                      id="bot-name"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="My Telegram Bot"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bot-username">{t('bot.botUsername')}</Label>
                    <Input
                      id="bot-username"
                      value={botUsernameInput}
                      onChange={(e) => setBotUsernameInput(e.target.value)}
                      placeholder="@mybot"
                      readOnly
                    />
                    <p className="text-xs text-muted-foreground">
                      Username chỉ thay đổi được qua BotFather. Trường này chỉ để hiển thị/lưu cục bộ.
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bot-short-desc">{t('bot.botShortDescription')}</Label>
                    <Input
                      id="bot-short-desc"
                      value={botShortDescription}
                      onChange={(e) => setBotShortDescription(e.target.value)}
                      placeholder=""
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bot-desc">{t('bot.botDescription')}</Label>
                    <textarea
                      id="bot-desc"
                      value={botDescription}
                      onChange={(e) => setBotDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleUpdateBotInfo}>
                    {t('common.save')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bot Status */}
            {botInfo.name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('bot.currentBot')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{botInfo.name}</h3>
                      {botInfo.username && (
                        <p className="text-sm text-muted-foreground">@{botInfo.username}</p>
                      )}
                    </div>
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {isConnected ? (
                        <>
                          <Wifi className="h-3 w-3 mr-1" />
                          {t('connection.connected')}
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3 mr-1" />
                          {t('connection.disconnected')}
                        </>
                      )}
                    </Badge>
                  </div>

                  {botInfo.description && (
                    <div>
                      <Label className="text-sm font-medium">{t('bot.botDescription')}</Label>
                      <p className="text-sm text-muted-foreground mt-1">{botInfo.description}</p>
                    </div>
                  )}

                  {botInfo.commands && botInfo.commands.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">{t('bot.botCommands')} ({botInfo.commands.length})</Label>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                        {botInfo.commands.map((cmd: BotCommand) => (
                          <div key={cmd.command} className="flex gap-3 text-sm p-2 bg-muted/50 rounded">
                            <code className="font-mono bg-background px-2 py-1 rounded text-xs">
                              /{cmd.command}
                            </code>
                            <span className="text-muted-foreground flex-1">{cmd.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t('settings.theme')}
                </CardTitle>
                <CardDescription>
                  {t('settings.themeDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>{t('settings.theme')}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {themeOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <Button
                          key={option.value}
                          variant={theme === option.value ? "default" : "outline"}
                          className="flex flex-col gap-2 h-auto py-4 relative"
                          onClick={() => setTheme(option.value)}
                        >
                          <Icon className="h-5 w-5" />
                          <div className="text-center">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs opacity-70">{option.desc}</div>
                          </div>
                          {theme === option.value && (
                            <Check className="h-4 w-4 absolute top-2 right-2" />
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>{t('settings.language')}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {languageOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={language === option.value ? "default" : "outline"}
                        className="flex items-center gap-3 justify-start h-auto py-3"
                        onClick={() => changeLanguage(option.value)}
                      >
                        <span className="text-xl">{option.flag}</span>
                        <span className="font-medium">{option.label}</span>
                        {language === option.value && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  {t('settings.appPreferences')}
                </CardTitle>
                <CardDescription>
                  {t('settings.appPreferencesDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-1">
                      <Label htmlFor="autoScroll" className="text-sm font-medium">{t('settings.autoScroll')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.autoScrollDesc')}
                      </p>
                    </div>
                    <Switch
                      id="autoScroll"
                      checked={preferences.autoScroll}
                      onCheckedChange={(checked) => updatePreferences({ autoScroll: checked })}
                    />
                  </div>

                  <Separator />
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-1">
                      <Label htmlFor="sound" className="text-sm font-medium">{t('settings.sound')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.soundDesc')}
                      </p>
                    </div>
                    <Switch
                      id="sound"
                      checked={preferences.sound}
                      onCheckedChange={(checked) => updatePreferences({ sound: checked })}
                    />
                  </div>

                  <Separator />
                  
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-1">
                      <Label htmlFor="push" className="text-sm font-medium">{t('settings.push')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('settings.pushDesc')}
                      </p>
                    </div>
                    <Switch
                      id="push"
                      checked={preferences.push}
                      onCheckedChange={(checked) => updatePreferences({ push: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  {t('settings.dangerZone')}
                </CardTitle>
                <CardDescription>
                  {t('settings.dangerZoneDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={handleClearAllData}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('bot.clearAllData')}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.clearAllDataDesc')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bot History Tab */}
          <TabsContent value="bothistory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  {t('settings.manageBotData')}
                </CardTitle>
                <CardDescription>
                  {t('settings.botHistoryDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">{t('settings.botTokens')}</Label>
                  
                  {botDataMap.size === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('settings.noBotsFound')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {Array.from(botDataMap.entries()).map((entry) => {
                        const [botToken, botData] = entry as [string, BotData]
                        const isCurrentBot = token === botToken
                        const chatCount = botData.chats.size
                        const totalMessages = Array.from(botData.chats.values()).reduce(
                          (sum: number, chat: Chat) => sum + chat.messages.length, 0
                        )
                        
                        return (
                          <div
                            key={botToken}
                            className={`p-4 border rounded-lg space-y-3 ${
                              isCurrentBot ? 'border-primary bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                  <Bot className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium truncate">
                                    {botData.botInfo.name || `Bot ${botToken.slice(-8)}`}
                                  </h3>
                                  {botData.botInfo.username && (
                                    <p className="text-sm text-muted-foreground">
                                      @{botData.botInfo.username}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                    <span>{chatCount} chats</span>
                                    <span>{totalMessages} messages</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isCurrentBot && (
                                  <Badge variant="default" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm(t('settings.confirmClearBotData'))) {
                                      clearBotData(botToken)
                                      showStatus(t('messages.allDataCleared'), 'success')
                                    }
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              <p className="font-mono bg-muted/50 p-2 rounded truncate">
                                {botToken}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <p><strong>Lưu ý:</strong></p>
                  <p>• Mỗi bot sẽ có lịch sử chat riêng biệt</p>
                  <p>• Khi chuyển đổi token, dữ liệu bot cũ được giữ lại</p>
                  <p>• Có thể xóa dữ liệu từng bot riêng lẻ</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t('settings.aboutApp')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto">
                    <Bot className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold">
                    {botInfo.name || (language === 'vi' ? 'Bot Telegram' : 'Telegram Bot')}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'vi'
                      ? 'Ứng dụng web quản lý bot Telegram hiện đại'
                      : 'Modern Telegram bot management web application'
                    }
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('settings.version')}</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('settings.framework')}</span>
                    <span>React + shadcn/ui</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('settings.botApi')}</span>
                    <span>Grammy.js</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('settings.pollingStatus')}</span>
                    <Badge variant={isPolling ? "default" : "secondary"}>
                      {isPolling ? t('settings.polling') : t('settings.stopped')}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>© 2024 {botInfo.name || (language === 'vi' ? 'Bot Telegram' : 'Telegram Bot')}</p>
                  <p>{t('settings.builtWith')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}