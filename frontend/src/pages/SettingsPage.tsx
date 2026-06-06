import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Save, Key, Bell, Bot } from 'lucide-react'
import { settingsApi } from '@/services/api'
import { cn } from '@/lib/utils'

export function SettingsPage() {
  const [groqKey, setGroqKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [speed, setSpeed] = useState(1)
  
  // Jira
  const [atlassianEndpoint, setAtlassianEndpoint] = useState('')
  const [atlassianSecret, setAtlassianSecret] = useState('')
  const [jiraProjectId, setJiraProjectId] = useState('KAN')
  
  // Slack
  const [slackBotKey, setSlackBotKey] = useState('')
  const [slackChannel, setSlackChannel] = useState('#compliance-alerts')
  
  // SMTP
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpRecipient, setSmtpRecipient] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<'ai' | 'notifications'>('ai')

  useEffect(() => {
    settingsApi.get().then(s => {
      setGroqKey(s.groq_api_key_set ? '****************' : '')
      setAnthropicKey(s.anthropic_api_key_set ? '****************' : '')
      setSpeed(s.replay_speed || 1)
      
      setAtlassianEndpoint(s.atlassian_endpoint || '')
      setAtlassianSecret(s.atlassian_secret_set ? '****************' : '')
      setJiraProjectId(s.jira_project_id || 'KAN')
      
      setSlackBotKey(s.slack_bot_key_set ? '****************' : '')
      setSlackChannel(s.slack_channel || '#compliance-alerts')
      
      setSmtpHost(s.smtp_host || 'smtp.gmail.com')
      setSmtpPort(s.smtp_port || '587')
      setSmtpUser(s.smtp_user || '')
      setSmtpPass(s.smtp_pass_set ? '****************' : '')
      setSmtpRecipient(s.smtp_recipient || '')
      
      setLoaded(true)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const updates: any = { 
      replay_speed: speed,
      atlassian_endpoint: atlassianEndpoint,
      jira_project_id: jiraProjectId,
      slack_channel: slackChannel,
      smtp_host: smtpHost,
      smtp_port: smtpPort,
      smtp_user: smtpUser,
      smtp_recipient: smtpRecipient,
    }
    
    if (groqKey && groqKey !== '****************') updates.groq_api_key = groqKey
    if (anthropicKey && anthropicKey !== '****************') updates.anthropic_api_key = anthropicKey
    if (atlassianSecret && atlassianSecret !== '****************') updates.atlassian_secret = atlassianSecret
    if (slackBotKey && slackBotKey !== '****************') updates.slack_bot_key = slackBotKey
    if (smtpPass && smtpPass !== '****************') updates.smtp_pass = smtpPass

    await settingsApi.update(updates)
    setSaving(false)
    alert('Settings saved successfully.')
  }

  if (!loaded) return <div className="flex justify-center py-20"><div className="spinner scale-150" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary-600" /> Platform Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure MarketTrace AI and global notification preferences.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <div className="spinner w-4 h-4" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1">
          <button onClick={() => setTab('ai')}
            className={cn("w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2",
            tab === 'ai' ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50")}>
            <Key className="w-4 h-4" /> AI Integrations
          </button>
          <button onClick={() => setTab('notifications')}
            className={cn("w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2",
            tab === 'notifications' ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50")}>
            <Bell className="w-4 h-4" /> Notifications
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {tab === 'ai' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Groq (Llama 3.3)
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                    <input type="password" className="input font-mono" value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="gsk_..." />
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4" /> Anthropic (Claude 3.5)
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                    <input type="password" className="input font-mono" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." />
                    <p className="text-xs text-slate-400 mt-2">Used for deep dive Case Analysis and Token Dashboards.</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-slate-800">Replay Engine Speed</h3></div>
                <div className="card-body">
                  <label className="label">Playback Multiplier</label>
                  <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="select max-w-[200px]">
                    <option value={1}>1x (Real-time)</option>
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-slate-800">Jira Integration</h3></div>
                <div className="card-body space-y-4">
                  <div>
                    <label className="label">Atlassian Endpoint</label>
                    <input type="text" className="input" value={atlassianEndpoint} onChange={e => setAtlassianEndpoint(e.target.value)} placeholder="https://your-domain.atlassian.net" />
                  </div>
                  <div>
                    <label className="label">Atlassian Secret / API Token</label>
                    <input type="password" className="input" value={atlassianSecret} onChange={e => setAtlassianSecret(e.target.value)} placeholder="ATATT3x..." />
                  </div>
                  <div>
                    <label className="label">Jira Project ID</label>
                    <input type="text" className="input max-w-[200px]" value={jiraProjectId} onChange={e => setJiraProjectId(e.target.value)} placeholder="KAN" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-slate-800">Slack Integration</h3></div>
                <div className="card-body space-y-4">
                  <div>
                    <label className="label">Bot User OAuth Token</label>
                    <input type="password" className="input" value={slackBotKey} onChange={e => setSlackBotKey(e.target.value)} placeholder="xoxb-..." />
                  </div>
                  <div>
                    <label className="label">Slack Channel</label>
                    <input type="text" className="input max-w-[200px]" value={slackChannel} onChange={e => setSlackChannel(e.target.value)} placeholder="#compliance-alerts" />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="font-semibold text-slate-800">Email Alerts (SMTP)</h3></div>
                <div className="card-body space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Host</label>
                      <input type="text" className="input" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <label className="label">Port</label>
                      <input type="text" className="input" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Username / Email</label>
                      <input type="text" className="input" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="user@domain.com" />
                    </div>
                    <div>
                      <label className="label">App Password</label>
                      <input type="password" className="input" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="abcd efgh ..." />
                    </div>
                  </div>
                  <div>
                    <label className="label">Target Recipient Email</label>
                    <input type="text" className="input" value={smtpRecipient} onChange={e => setSmtpRecipient(e.target.value)} placeholder="compliance.team@domain.com" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
