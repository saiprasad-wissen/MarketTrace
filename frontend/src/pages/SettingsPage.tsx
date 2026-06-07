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
  const [tab, setTab] = useState<'ai' | 'notifications' | 'help'>('ai')

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
        {tab !== 'help' && (
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <div className="spinner w-4 h-4" /> : <Save className="w-4 h-4" />} Save Changes
          </button>
        )}
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
          <button onClick={() => setTab('help')}
            className={cn("w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2",
            tab === 'help' ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-50")}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Setup Help
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

          {tab === 'help' && <HelpSection />}
        </div>
      </div>
    </div>
  )
}

function HelpAccordion({ icon, title, badge, badgeColor, children }: {
  icon: React.ReactNode
  title: string
  badge?: string
  badgeColor?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-50 text-primary-600">
            {icon}
          </span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {badge && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor ?? 'bg-slate-100 text-slate-500'}`}>
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mt-4">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="text-sm text-slate-600 leading-relaxed">{children}</div>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <code className="inline-block mt-2 px-3 py-1.5 bg-slate-900 text-emerald-400 text-xs font-mono rounded-md w-full">
      {children}
    </code>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium underline underline-offset-2"
    >
      {children}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}

function HelpSection() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 p-5 text-white flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-base">Integration Setup Guide</h2>
          <p className="text-sm text-white/80 mt-1">
            Follow the steps below to connect MarketTrace to Jira, Slack, Email, and AI providers. Each section links to official documentation.
          </p>
        </div>
      </div>

      <HelpAccordion
        icon={
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M11.571 11.429L6.857 6.714a.571.571 0 00-.808 0L2.286 10.47a.571.571 0 000 .808l4.571 4.571a.571.571 0 00.808 0l3.906-3.907a.571.571 0 000-.513zm9.143 0l-4.714-4.715a.571.571 0 00-.808 0l-3.906 3.907a.571.571 0 000 .513l4.571 4.571a.571.571 0 00.808 0l4.049-4.049a.571.571 0 000-.227z"/>
          </svg>
        }
        title="Jira / Atlassian"
        badge="Required for case escalation"
        badgeColor="bg-blue-50 text-blue-600"
      >
        <p className="text-xs text-slate-400 mt-3 mb-1">
          MarketTrace can automatically create Jira issues when a compliance case is escalated.
        </p>
        <Step n={1}>
          Log in to your Atlassian account and go to{' '}
          <ExternalLink href="https://id.atlassian.com/manage-profile/security/api-tokens">
            Atlassian API Token page
          </ExternalLink>.
        </Step>
        <Step n={2}>
          Click <strong>Create API Token</strong>, give it a label like <em>MarketTrace</em>, and copy the generated token.
        </Step>
        <Step n={3}>
          Paste it in the <strong>Atlassian Secret / API Token</strong> field on the Notifications tab.
        </Step>
        <Step n={4}>
          Set your <strong>Atlassian Endpoint</strong> to your workspace URL:
          <Code>https://your-company.atlassian.net</Code>
        </Step>
        <Step n={5}>
          Set the <strong>Jira Project ID</strong> to the key of the project where issues should be created (visible in the project URL, e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">KAN</code>).
        </Step>
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          ⚠️ The API token is tied to your Atlassian account email. Ensure that account has <strong>Create Issue</strong> permission in the target project.
        </div>
      </HelpAccordion>

      <HelpAccordion
        icon={
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
          </svg>
        }
        title="Slack"
        badge="Required for real-time alerts"
        badgeColor="bg-purple-50 text-purple-600"
      >
        <p className="text-xs text-slate-400 mt-3 mb-1">
          MarketTrace sends compliance alert notifications directly to a Slack channel of your choice.
        </p>
        <Step n={1}>
          Go to <ExternalLink href="https://api.slack.com/apps">api.slack.com/apps</ExternalLink> and click <strong>Create New App → From Scratch</strong>.
        </Step>
        <Step n={2}>
          Under <strong>OAuth &amp; Permissions → Scopes → Bot Token Scopes</strong>, add:
          <Code>chat:write  channels:read  groups:read</Code>
        </Step>
        <Step n={3}>
          Click <strong>Install to Workspace</strong> and copy the <strong>Bot User OAuth Token</strong> (starts with <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">xoxb-</code>).
        </Step>
        <Step n={4}>
          Paste the token in the <strong>Bot User OAuth Token</strong> field on the Notifications tab.
        </Step>
        <Step n={5}>
          Invite the bot to your target channel in Slack:
          <Code>/invite @YourBotName</Code>
        </Step>
        <Step n={6}>
          Set the <strong>Slack Channel</strong> field to your channel name, e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">#compliance-alerts</code>.
        </Step>
      </HelpAccordion>

      <HelpAccordion
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        title="Email Alerts (SMTP)"
        badge="Gmail / Outlook supported"
        badgeColor="bg-rose-50 text-rose-600"
      >
        <p className="text-xs text-slate-400 mt-3 mb-1">
          Configure an SMTP server to send email alerts to your compliance team.
        </p>

        <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden text-xs">
          <div className="bg-slate-50 px-4 py-2 font-semibold text-slate-600 border-b border-slate-200">Common Provider Settings</div>
          <table className="w-full text-slate-600">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-2 text-left font-medium">Provider</th>
                <th className="px-4 py-2 text-left font-medium">SMTP Host</th>
                <th className="px-4 py-2 text-left font-medium">Port</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Gmail', 'smtp.gmail.com', '587'],
                ['Outlook / Microsoft 365', 'smtp.office365.com', '587'],
                ['Yahoo Mail', 'smtp.mail.yahoo.com', '587'],
                ['SendGrid', 'smtp.sendgrid.net', '587'],
              ].map(([provider, host, port]) => (
                <tr key={provider} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 font-medium">{provider}</td>
                  <td className="px-4 py-2 font-mono text-slate-500">{host}</td>
                  <td className="px-4 py-2 font-mono text-slate-500">{port}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Step n={1}>
          <strong>Gmail users:</strong> Go to{' '}
          <ExternalLink href="https://myaccount.google.com/apppasswords">
            Google App Passwords
          </ExternalLink>
          , select <em>Mail</em> as the app, and generate a 16-character App Password.
        </Step>
        <Step n={2}>
          Use your full Gmail address as the <strong>Username / Email</strong> and the App Password (not your account password) as <strong>App Password</strong>.
        </Step>
        <Step n={3}>
          <strong>Outlook users:</strong> Enable SMTP AUTH in Microsoft 365 Admin Center under <em>Users → Mail → Manage email apps</em>, then use your email and account password.
        </Step>
        <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          💡 Gmail requires <strong>2-Step Verification</strong> to be enabled before App Passwords are available.
        </div>
      </HelpAccordion>

      <HelpAccordion
        icon={<Bot className="w-4 h-4" />}
        title="AI API Keys (Groq & Anthropic)"
        badge="Required for AI features"
        badgeColor="bg-emerald-50 text-emerald-600"
      >
        <p className="text-xs text-slate-400 mt-3 mb-2">
          MarketTrace uses Groq (Llama 3.3) for fast pattern detection and Anthropic (Claude) for deep case analysis.
        </p>

        <div className="mt-3 space-y-4">
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">GROQ</span>
              <span className="text-sm font-semibold text-slate-700">Llama 3.3 — Fast Inference</span>
            </div>
            <Step n={1}>
              Create a free account at <ExternalLink href="https://console.groq.com">console.groq.com</ExternalLink>.
            </Step>
            <Step n={2}>
              Navigate to <strong>API Keys</strong> in the left sidebar and click <strong>Create API Key</strong>.
            </Step>
            <Step n={3}>
              Copy the key (starts with <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">gsk_</code>) and paste it in the <strong>AI Integrations → Groq</strong> field.
            </Step>
          </div>

          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">ANTHROPIC</span>
              <span className="text-sm font-semibold text-slate-700">Claude 3.5 — Deep Analysis</span>
            </div>
            <Step n={1}>
              Sign up or log in at <ExternalLink href="https://console.anthropic.com">console.anthropic.com</ExternalLink>.
            </Step>
            <Step n={2}>
              Go to <strong>Settings → API Keys</strong> and click <strong>Create Key</strong>.
            </Step>
            <Step n={3}>
              Copy the key (starts with <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">sk-ant-</code>) and paste it in the <strong>AI Integrations → Anthropic</strong> field.
            </Step>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-900 text-xs font-mono text-emerald-400">
          <span className="text-slate-500"># Required environment variables (optional override)</span>{'\n'}
          <span>GROQ_API_KEY=gsk_...</span>{'\n'}
          <span>ANTHROPIC_API_KEY=sk-ant-...</span>
        </div>
      </HelpAccordion>
    </div>
  )
}
