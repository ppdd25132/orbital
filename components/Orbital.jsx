"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Mail, CheckCircle2, Send, RefreshCw, Edit3, Plus,
  Sparkles, Zap, Inbox, Hash, Eye, PenLine, Loader2, Building2,
  Link2, X, Check, Clock, Search,
  ArrowRight, Shield, Star, Archive, Settings, Keyboard,
  CornerDownRight
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
const STORE_KEY = "orbital-app-state";
async function loadState() {
  try { 
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORE_KEY); 
    return raw ? JSON.parse(raw) : null; 
  } catch { return null; }
}
async function saveState(state) {
  try { 
    if (typeof window !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(state)); 
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */
const STATUS = {
  needs_response:{label:"Needs reply",color:"text-blue-400",bg:"bg-blue-500/10",bdr:"border-blue-500/20",Icon:PenLine},
  waiting:{label:"Waiting",color:"text-amber-400",bg:"bg-amber-500/10",bdr:"border-amber-500/20",Icon:Clock},
  fyi:{label:"FYI",color:"text-[#6b7280]",bg:"bg-[#1a1d23]",bdr:"border-[#2a2d35]",Icon:Eye},
  resolved:{label:"Done",color:"text-emerald-400",bg:"bg-emerald-500/10",bdr:"border-emerald-500/20",Icon:CheckCircle2},
  archived:{label:"Archived",color:"text-[#4b5563]",bg:"bg-[#12141a]",bdr:"border-[#1a1d23]",Icon:Archive},
};
const COLORS=["#3B82F6","#10B981","#F59E0B","#8B5CF6","#EF4444","#EC4899","#14B8A6","#F97316","#6366F1","#84CC16"];

/* ═══════════════════════════════════════════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const DEMO_ACCOUNTS=[
  {id:"a1",type:"gmail",address:"michael.torres@gmail.com",label:"Personal",color:"#6366F1"},
  {id:"a2",type:"gmail",address:"mtorres@acmeventures.com",label:"Acme Ventures",color:"#3B82F6"},
  {id:"a3",type:"gmail",address:"mike@heliospharma.com",label:"Helios Pharma",color:"#10B981"},
  {id:"a4",type:"slack",address:"Acme Ventures",label:"Acme Slack",color:"#3B82F6"},
  {id:"a5",type:"slack",address:"Helios Pharma",label:"Helios Slack",color:"#10B981"},
  {id:"a6",type:"gmail",address:"m.torres@nimbuslogistics.com",label:"Nimbus Logistics",color:"#F59E0B"},
  {id:"a7",type:"slack",address:"Nimbus Logistics",label:"Nimbus Slack",color:"#F59E0B"},
  {id:"a8",type:"gmail",address:"torres@ridgelinedata.io",label:"Ridgeline Data",color:"#8B5CF6"},
];
const DEMO_CLIENTS=[
  {id:"cl1",name:"Acme Ventures",accounts:["a2","a4"],color:"#3B82F6",initials:"AV"},
  {id:"cl2",name:"Helios Pharma",accounts:["a3","a5"],color:"#10B981",initials:"HP"},
  {id:"cl3",name:"Nimbus Logistics",accounts:["a6","a7"],color:"#F59E0B",initials:"NL"},
  {id:"cl4",name:"Ridgeline Data",accounts:["a8"],color:"#8B5CF6",initials:"RD"},
];
const DEMO_THREADS=[
  {id:"t1",clientId:"cl1",accountId:"a2",subject:"Board deck — need Q1 actuals ASAP",
   status:"needs_response",starred:true,lastActivity:"2 hours ago",lastActivityTs:Date.now()-7200000,
   preview:"Mike — Board meeting is Thursday morning. I still don't have the updated deck...",
   participants:[{name:"Rachel Kim",email:"rachel@acmeventures.com",role:"CEO"}],
   messages:[
     {id:"m1",from:{name:"Rachel Kim",email:"rachel@acmeventures.com"},channel:"email",time:"Mar 30, 9:15 AM",body:"Mike — Quick heads up, the board meeting is confirmed for Thursday April 3rd. I'll need the updated deck with Q1 actuals by Wednesday EOD. Key things I want to cover:\n\n1. Cash position and updated runway\n2. Bridge from Q4 forecast to Q1 actuals\n3. Headcount plan vs. actual\n\nLet me know if you need anything from our side to pull this together."},
     {id:"m2",from:{name:"You",email:"mtorres@acmeventures.com"},channel:"email",time:"Mar 30, 11:42 AM",body:"Rachel — Got it, will have the deck ready by Wednesday. I'll pull the Q1 actuals from QBO today and start on the bridge analysis. One question: do you want me to include the Series B scenario modeling or keep it focused on operating metrics?\n\nBest,\nMike"},
     {id:"m3",from:{name:"Rachel Kim",email:"rachel@acmeventures.com"},channel:"email",time:"Mar 30, 12:10 PM",body:"Let's keep the board deck focused on operating metrics. We can do the Series B modeling as a separate exercise after the board meeting — I want to have a dedicated session on that.\n\nAlso, Lisa mentioned the 409A draft came in. Can you review that too before I meet with the comp committee next week?"},
     {id:"m4",from:{name:"You",email:"mtorres@acmeventures.com"},channel:"email",time:"Mar 30, 1:05 PM",body:"Makes sense — focused on operating metrics. Will review the 409A draft as well. I'll aim to have comments back by early next week.\n\nBest,\nMike"},
     {id:"m5",from:{name:"Rachel Kim",email:"rachel@acmeventures.com"},channel:"slack",time:"Today, 8:45 AM",body:"Hey Mike — just checking in on the board deck. Meeting is Thursday AM. Are we still on track for delivery by end of day tomorrow?"},
     {id:"m6",from:{name:"Rachel Kim",email:"rachel@acmeventures.com"},channel:"email",time:"Today, 9:12 AM",body:"Mike — Following up on this. I know I sent a Slack message too but want to make sure this doesn't slip. The investors specifically asked about the variance between Q4 forecast and Q1 actuals, so the bridge slide is critical.\n\nAlso, our cash balance looks different in QBO than what I expected. Can you double-check we're not including the restricted cash from the equipment financing?"},
   ]},
  {id:"t2",clientId:"cl1",accountId:"a2",subject:"409A valuation — draft ready for review",
   status:"needs_response",starred:false,lastActivity:"Yesterday",lastActivityTs:Date.now()-86400000,
   preview:"The 409A firm sent over the draft valuation report. A few things jumped out...",
   participants:[{name:"Lisa Novak",email:"lisa@acmeventures.com",role:"Controller"}],
   messages:[
     {id:"m7",from:{name:"Lisa Novak",email:"lisa@acmeventures.com"},channel:"email",time:"Yesterday, 4:30 PM",body:"Hi Mike,\n\nThe 409A firm sent over the draft valuation report. A few things that jumped out to me:\n\n1. They're using a 35% DLOM — up from 30% last year. Seems aggressive.\n2. Revenue multiple of 4.2x feels conservative given we grew 40% YoY\n3. Common stock fair value came in at $1.82/share vs. $2.15 last round\n\nI'm not sure if I should push back on the DLOM or the revenue multiple first. What's your read?\n\nThey want our comments back by April 8.\n\nThanks,\nLisa"},
   ]},
  {id:"t3",clientId:"cl2",accountId:"a3",subject:"Revenue recognition on NIH grant milestone",
   status:"needs_response",starred:false,lastActivity:"5 hours ago",lastActivityTs:Date.now()-18000000,
   preview:"We hit the Phase 1 milestone on the NIH grant and received the $450K...",
   participants:[{name:"James Whitfield",email:"james@heliospharma.com",role:"Controller"}],
   messages:[
     {id:"m8",from:{name:"James Whitfield",email:"james@heliospharma.com"},channel:"email",time:"Mar 28, 2:15 PM",body:"Mike,\n\nQuick question on the NIH grant. We're about to hit the Phase 1 milestone and I want to make sure I handle the accounting correctly. The grant agreement specifies $450K for 'completion of Phase 1 clinical endpoints.' Should I set up a receivable now or wait until the milestone is formally certified?\n\nAlso, do you have a preference on whether we use ASC 606 or ASC 958 for grants? I've seen it done both ways.\n\nThanks,\nJames"},
     {id:"m9",from:{name:"You",email:"mike@heliospharma.com"},channel:"email",time:"Mar 28, 4:45 PM",body:"James — Good question. Let's wait for formal certification before recognizing the receivable. On the accounting framework, for government grants like NIH, I generally prefer ASC 958 (contributions) rather than 606. The key distinction is that there's no exchange transaction — NIH isn't receiving goods/services from you in the traditional sense.\n\nThat said, let's discuss once you actually hit the milestone and I can review the specific language in the grant agreement.\n\nBest,\nMike"},
     {id:"m10",from:{name:"James Whitfield",email:"james@heliospharma.com"},channel:"email",time:"Today, 10:22 AM",body:"Mike,\n\nWe hit the Phase 1 milestone last week and received the $450K payment yesterday. Following up on our earlier conversation — I'm ready to book this but had a complication.\n\nThe primary endpoint was met, but we're still running some secondary analyses that are technically part of the Phase 1 scope. My question: do we recognize the full $450K now since the primary endpoint is complete, or should we defer a portion until the secondary analyses wrap up (probably 4-6 weeks)?\n\nI pulled up the grant agreement and the language says 'satisfactory completion of Phase 1 clinical endpoints' — plural. Not sure if that means ALL endpoints including secondary.\n\nAlso, our auditors are going to ask about this for the Q1 review. Want to get it right.\n\nThanks,\nJames"},
   ]},
  {id:"t4",clientId:"cl2",accountId:"a5",subject:"#finance — R&D capitalization schedule",
   status:"fyi",starred:false,lastActivity:"Yesterday",lastActivityTs:Date.now()-100000000,
   preview:"Uploaded the updated R&D capitalization schedule to the shared drive...",
   participants:[{name:"James Whitfield",email:"james@heliospharma.com",role:"Controller"},{name:"Priya Sharma",email:"priya@heliospharma.com",role:"VP Clinical"}],
   messages:[
     {id:"m11",from:{name:"James Whitfield",email:"james@heliospharma.com"},channel:"slack",time:"Yesterday, 3:15 PM",body:"Uploaded the updated R&D capitalization schedule to the shared drive. @priya can you confirm the clinical trial costs in tab 3 match what you're seeing on your end?"},
     {id:"m12",from:{name:"Priya Sharma",email:"priya@heliospharma.com"},channel:"slack",time:"Yesterday, 3:42 PM",body:"Checked tab 3 — the CRO costs look right but I think we're missing the site activation fees from the two new clinical sites we added in March. Should be about $85K total. I'll send you the invoices."},
     {id:"m13",from:{name:"James Whitfield",email:"james@heliospharma.com"},channel:"slack",time:"Yesterday, 4:01 PM",body:"Got it, will update once I get those. @mike FYI you'll want to look at this before the Q1 review — I'll flag you when it's finalized."},
   ]},
  {id:"t5",clientId:"cl3",accountId:"a6",subject:"Credit facility — revised term sheet from SVB",
   status:"needs_response",starred:false,lastActivity:"2 days ago",lastActivityTs:Date.now()-172800000,
   preview:"Got the revised term sheet back from SVB. They moved on the interest rate...",
   participants:[{name:"Carlos Mendez",email:"carlos@nimbuslogistics.com",role:"CEO"},{name:"Sarah Chen",email:"sarah@nimbuslogistics.com",role:"VP Finance"}],
   messages:[
     {id:"m14",from:{name:"Carlos Mendez",email:"carlos@nimbuslogistics.com"},channel:"email",time:"Apr 1, 10:30 AM",body:"Mike, Sarah —\n\nGot the revised term sheet back from SVB. They moved on the interest rate (SOFR + 275bps, down from 325) and the revenue covenant (dropped from 1.5x to 1.25x). But they're still asking for a personal guarantee from me on the first $500K, which I'm not thrilled about.\n\nThe facility size is $3M with a 3-year term and quarterly financial reporting requirements.\n\nMike — can you review the financial covenants and let me know if there are any red flags? Also curious if the personal guarantee is standard for a company our size or if we should push back.\n\nI'd like to give them a response by end of next week.\n\nCarlos"},
     {id:"m15",from:{name:"Sarah Chen",email:"sarah@nimbuslogistics.com"},channel:"email",time:"Apr 1, 11:15 AM",body:"I pulled our latest numbers against the proposed covenants. At our current revenue run rate, we have about 30% headroom on the 1.25x revenue covenant. The fixed charge coverage ratio of 1.1x is tighter — we're at about 1.3x right now, so not a ton of cushion if we have a bad quarter.\n\nMike, do you think we should try to negotiate the FCCR down to 1.0x?\n\nSarah"},
   ]},
  {id:"t6",clientId:"cl4",accountId:"a8",subject:"QuickBooks setup — chart of accounts review",
   status:"waiting",starred:false,lastActivity:"4 days ago",lastActivityTs:Date.now()-345600000,
   preview:"Here's the draft chart of accounts I put together based on our onboarding call...",
   participants:[{name:"Tom Bradley",email:"tom@ridgelinedata.io",role:"CEO / Founder"}],
   messages:[
     {id:"m16",from:{name:"You",email:"torres@ridgelinedata.io"},channel:"email",time:"Mar 31, 2:00 PM",body:"Tom,\n\nHere's the draft chart of accounts I put together based on our onboarding call. I've organized it to support both your current operations and future reporting needs once you start fundraising.\n\nA few notes:\n- I separated R&D expenses into internal vs. contracted to make it easier to track for potential R&D tax credits\n- Added sub-accounts for each major revenue stream (platform subscriptions, professional services, data licensing)\n- Set up a deferred revenue account for annual contracts\n\nTake a look and let me know if anything seems off or if I'm missing any expense categories. Once you approve, I'll configure it in QBO and we can start booking transactions.\n\nBest,\nMike"},
   ]},
];

/* ═══════════════════════════════════════════════════════════════════════════
   AI DRAFT
   ═══════════════════════════════════════════════════════════════════════════ */
async function generateDraft(thread,client){
  const hist=thread.messages.map(m=>`[${m.channel.toUpperCase()}] ${m.from.name} (${m.time}):\n${m.body}`).join("\n\n---\n\n");
  const parts=thread.participants.map(p=>`${p.name} — ${p.role} at ${client.name}`).join(", ");
  const ch=thread.messages[thread.messages.length-1].channel;
  const sys=`You are an AI drafting assistant for Michael Torres (Mike), a fractional CFO.
Client: ${client.name}. Participants: ${parts}. Reply channel: ${ch}.
Style: direct, warm, references prior context, addresses every question. Email: greeting + "Best, Mike". Slack: concise, no sign-off.
Use the full conversation history. Respond ONLY with the draft — no preamble.`;
  try{
    const r=await fetch("/api/draft",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({system:sys,
        messages:[{role:"user",content:`Thread:\n\n${hist}\n\nDraft Mike's response.`}]})});
    const d=await r.json();
    if(d.error)return d.error;
    return d.content?.map(b=>b.text||"").join("")||"Unable to generate draft.";
  }catch{return "Draft generation unavailable. Compose manually.";}
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED UI
   ═══════════════════════════════════════════════════════════════════════════ */
const Btn=({children,primary,sm,ghost,danger,className="",...p})=>(
  <button className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all whitespace-nowrap
    ${primary?"bg-blue-600 hover:bg-blue-500 text-white":danger?"bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20":ghost?"text-[#6b7280] hover:text-[#e5e7eb] hover:bg-[#1a1d23]":"bg-[#1a1d23] hover:bg-[#22252d] text-[#d1d5db] border border-[#2a2d35] hover:border-[#3a3d45]"}
    ${sm?"text-[11px] px-2.5 py-1.5":"text-[13px] px-4 py-2.5"} ${className}`} {...p}>{children}</button>
);

function StatusBadge({status,onClick}){
  const s=STATUS[status];if(!s)return null;const I=s.Icon;
  const Tag=onClick?"button":"span";
  return <Tag onClick={onClick} className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.color} border ${s.bdr} ${onClick?"cursor-pointer hover:brightness-125 transition-all":""}`}><I size={10}/>{s.label}</Tag>;
}
const ChIcon=({ch,sz=12})=>ch==="email"?<Mail size={sz} className="text-[#6b7280] flex-shrink-0"/>:<Hash size={sz} className="text-[#6b7280] flex-shrink-0"/>;

/* ═══════════════════════════════════════════════════════════════════════════
   ONBOARDING
   ═══════════════════════════════════════════════════════════════════════════ */
function Onboarding({onComplete}){
  const [step,setStep]=useState(0);
  const [accounts,setAccounts]=useState([]);
  const [clients,setClients]=useState([]);
  const [connecting,setConnecting]=useState(null);
  const [newName,setNewName]=useState("");

  const addAcc=(type)=>{setConnecting(type);
    setTimeout(()=>{const id=`ua${Date.now()}`;
      setAccounts(p=>{const n=p.filter(a=>a.type===type).length+1;
        const addr=type==="gmail"?`user${n}@company${n}.com`:`Workspace ${n}`;
        return[...p,{id,type,address:addr,label:addr,color:COLORS[p.length%COLORS.length]}];});
      setConnecting(null);},1200);};

  const addClient=()=>{if(!newName.trim())return;const id=`ucl${Date.now()}`;
    const ini=newName.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    setClients(p=>[...p,{id,name:newName.trim(),accounts:[],color:COLORS[p.length%COLORS.length],initials:ini}]);setNewName("");};

  const toggleMap=(cid,aid)=>setClients(p=>p.map(c=>c.id!==cid?c:{...c,accounts:c.accounts.includes(aid)?c.accounts.filter(x=>x!==aid):[...c.accounts,aid]}));

  const Feature=({icon:I,text})=>(<div className="flex items-center gap-3 text-[14px] text-[#9ca3af]">
    <div className="w-8 h-8 rounded-lg bg-[#1a1d23] border border-[#2a2d35] flex items-center justify-center flex-shrink-0"><I size={15} className="text-blue-400"/></div>{text}</div>);

  return(
    <div className="h-screen bg-[#07080b] flex items-center justify-center p-6">
      <div className="w-full max-w-lg anim-fade">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center"><Zap size={20} className="text-white"/></div>
          <span className="text-xl font-bold text-[#e5e7eb] tracking-tight">Orbital</span>
        </div>

        {step===0&&<div className="anim-slide">
          <h1 className="text-2xl font-bold text-[#f3f4f6] mb-2">All your accounts. One inbox.</h1>
          <p className="text-[15px] text-[#6b7280] mb-8 leading-relaxed">Connect every email and Slack account, group by client, and let AI draft responses using your full conversation history.</p>
          <div className="space-y-3 mb-8">
            <Feature icon={Link2} text="Connect multiple Gmail and Slack accounts"/>
            <Feature icon={Building2} text="Group accounts by client for organized views"/>
            <Feature icon={Sparkles} text="AI reads conversation history to draft replies"/>
            <Feature icon={Shield} text="Always sends from the correct identity"/>
          </div>
          <div className="flex gap-3">
            <Btn primary onClick={()=>setStep(1)}>Get started <ArrowRight size={15}/></Btn>
            <Btn onClick={()=>onComplete({accounts:DEMO_ACCOUNTS,clients:DEMO_CLIENTS,threads:DEMO_THREADS})}>Load demo</Btn>
          </div>
        </div>}

        {step===1&&<div className="anim-slide">
          <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider">Step 1 of 3</span>
          <h2 className="text-xl font-bold text-[#f3f4f6] mb-1 mt-1">Connect your accounts</h2>
          <p className="text-[14px] text-[#6b7280] mb-5">Add every email and Slack workspace you use across all clients.</p>
          <div className="flex gap-3 mb-5">
            <Btn onClick={()=>addAcc("gmail")} disabled={!!connecting}>{connecting==="gmail"?<Loader2 size={14} className="animate-spin"/>:<Mail size={14}/>}{connecting==="gmail"?"Connecting...":"Add Gmail"}</Btn>
            <Btn onClick={()=>addAcc("slack")} disabled={!!connecting}>{connecting==="slack"?<Loader2 size={14} className="animate-spin"/>:<Hash size={14}/>}{connecting==="slack"?"Connecting...":"Add Slack"}</Btn>
          </div>
          {accounts.length>0&&<div className="space-y-2 mb-5">{accounts.map(a=>(<div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#2a2d35] bg-[#1a1d23] anim-fade">
            {a.type==="gmail"?<Mail size={14} className="text-[#6b7280]"/>:<Hash size={14} className="text-[#6b7280]"/>}
            <span className="text-[13px] text-[#e5e7eb] flex-1">{a.address}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Connected</span>
            <button onClick={()=>setAccounts(p=>p.filter(x=>x.id!==a.id))} className="text-[#4b5563] hover:text-red-400 transition-colors"><X size={14}/></button>
          </div>))}</div>}
          <div className="flex gap-3"><Btn primary onClick={()=>setStep(2)} disabled={!accounts.length}>Continue <ArrowRight size={15}/></Btn><Btn onClick={()=>setStep(0)}>Back</Btn></div>
        </div>}

        {step===2&&<div className="anim-slide">
          <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider">Step 2 of 3</span>
          <h2 className="text-xl font-bold text-[#f3f4f6] mb-1 mt-1">Set up your clients</h2>
          <p className="text-[14px] text-[#6b7280] mb-5">Name each client and map which accounts belong to them.</p>
          <div className="flex gap-2 mb-4">
            <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClient()}
              placeholder="Client name (e.g. Acme Corp)" className="flex-1 bg-[#1a1d23] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-[13px] text-[#e5e7eb] placeholder-[#4b5563] outline-none focus:border-blue-500/50 transition-colors"/>
            <Btn onClick={addClient} disabled={!newName.trim()}><Plus size={14}/> Add</Btn>
          </div>
          {clients.length>0&&<div className="space-y-3 mb-5 max-h-[320px] overflow-y-auto">{clients.map(cl=>(<div key={cl.id} className="p-4 rounded-lg border border-[#2a2d35] bg-[#1a1d23] anim-fade">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{backgroundColor:cl.color}}>{cl.initials}</div>
              <span className="text-[14px] font-medium text-[#e5e7eb] flex-1">{cl.name}</span>
              <button onClick={()=>setClients(p=>p.filter(c=>c.id!==cl.id))} className="text-[#4b5563] hover:text-red-400"><X size={14}/></button>
            </div>
            <p className="text-[11px] text-[#6b7280] mb-2">Map accounts:</p>
            <div className="flex flex-wrap gap-2">{accounts.map(a=>{const on=cl.accounts.includes(a.id);
              return <button key={a.id} onClick={()=>toggleMap(cl.id,a.id)} className={`text-[11px] px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-all border ${on?"bg-blue-600/15 border-blue-500/30 text-blue-400":"bg-[#0f1117] border-[#2a2d35] text-[#6b7280] hover:border-[#3a3d45]"}`}>
                {on&&<Check size={10}/>}{a.type==="gmail"?<Mail size={10}/>:<Hash size={10}/>}{a.address}</button>;})}</div>
          </div>))}</div>}
          <div className="flex gap-3"><Btn primary onClick={()=>setStep(3)} disabled={!clients.length}>Continue <ArrowRight size={15}/></Btn><Btn onClick={()=>setStep(1)}>Back</Btn></div>
        </div>}

        {step===3&&<div className="anim-slide text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5"><CheckCircle2 size={32} className="text-emerald-400"/></div>
          <h2 className="text-xl font-bold text-[#f3f4f6] mb-2">You're all set</h2>
          <p className="text-[14px] text-[#6b7280] mb-1">{accounts.length} account{accounts.length!==1?"s":""} connected, {clients.length} client{clients.length!==1?"s":""} configured.</p>
          <p className="text-[13px] text-[#4b5563] mb-8">Orbital is syncing your messages now.</p>
          <Btn primary onClick={()=>onComplete({accounts,clients,threads:[]})}>Open Orbital <ArrowRight size={15}/></Btn>
        </div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSE MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function ComposeModal({accounts,clients,onClose,onSend}){
  const [accountId,setAccountId]=useState(accounts[0]?.id||"");
  const [to,setTo]=useState("");
  const [subject,setSubject]=useState("");
  const [body,setBody]=useState("");
  const acc=accounts.find(a=>a.id===accountId);
  const cl=clients.find(c=>c.accounts.includes(accountId));

  const handleSend=()=>{
    if(!to.trim()||!body.trim())return;
    onSend({accountId,to,subject,body,clientId:cl?.id||null,channel:acc?.type==="slack"?"slack":"email"});
    onClose();
  };

  return(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose} onKeyDown={e=>{if(e.key==="Escape")onClose();}}>
      <div className="w-full max-w-xl bg-[#13151b] border border-[#2a2d35] rounded-xl shadow-2xl anim-slide" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1d23]">
          <h3 className="text-[14px] font-semibold text-[#e5e7eb]">New message</h3>
          <button onClick={onClose} className="text-[#4b5563] hover:text-[#e5e7eb] transition-colors"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#6b7280] w-14">From</span>
            <select value={accountId} onChange={e=>setAccountId(e.target.value)}
              className="flex-1 bg-[#1a1d23] border border-[#2a2d35] rounded-lg px-3 py-2 text-[13px] text-[#e5e7eb] outline-none focus:border-blue-500/50">
              {accounts.map(a=><option key={a.id} value={a.id}>{a.address} ({a.label})</option>)}
            </select>
          </div>
          {cl&&<div className="flex items-center gap-2 pl-16"><div className="w-2 h-2 rounded-full" style={{backgroundColor:cl.color}}/><span className="text-[11px] text-[#6b7280]">{cl.name}</span></div>}
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#6b7280] w-14">To</span>
            <input value={to} onChange={e=>setTo(e.target.value)} placeholder="recipient@example.com"
              className="flex-1 bg-[#1a1d23] border border-[#2a2d35] rounded-lg px-3 py-2 text-[13px] text-[#e5e7eb] placeholder-[#4b5563] outline-none focus:border-blue-500/50"/>
          </div>
          {acc?.type==="gmail"&&<div className="flex items-center gap-2">
            <span className="text-[12px] text-[#6b7280] w-14">Subject</span>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject"
              className="flex-1 bg-[#1a1d23] border border-[#2a2d35] rounded-lg px-3 py-2 text-[13px] text-[#e5e7eb] placeholder-[#4b5563] outline-none focus:border-blue-500/50"/>
          </div>}
          <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Write your message..."
            className="w-full bg-[#1a1d23] border border-[#2a2d35] rounded-lg px-3 py-2.5 text-[13px] text-[#e5e7eb] placeholder-[#4b5563] outline-none focus:border-blue-500/50 resize-none min-h-[160px]"/>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1a1d23]">
          <Btn sm ghost onClick={onClose}>Cancel</Btn>
          <Btn sm primary onClick={handleSend} disabled={!to.trim()||!body.trim()}><Send size={13}/> Send</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function ShortcutsModal({onClose}){
  const shortcuts=[
    ["j / k","Navigate threads"],["Enter","Select first thread"],
    ["e","Archive thread"],["s","Star / unstar"],["c","Compose new message"],
    ["1–4","Set status (reply/waiting/fyi/done)"],["Esc","Close / deselect"],["?","Show shortcuts"],
  ];
  return(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose} onKeyDown={e=>{if(e.key==="Escape")onClose();}}>
      <div className="w-full max-w-sm bg-[#13151b] border border-[#2a2d35] rounded-xl shadow-2xl anim-slide" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1d23]">
          <h3 className="text-[14px] font-semibold text-[#e5e7eb] flex items-center gap-2"><Keyboard size={15}/> Keyboard shortcuts</h3>
          <button onClick={onClose} className="text-[#4b5563] hover:text-[#e5e7eb]"><X size={16}/></button>
        </div>
        <div className="p-4 space-y-2">{shortcuts.map(([k,d])=>(
          <div key={k} className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-[#9ca3af]">{d}</span>
            <kbd className="text-[11px] text-[#e5e7eb] bg-[#1a1d23] border border-[#2a2d35] rounded px-2 py-0.5 font-mono">{k}</kbd>
          </div>
        ))}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SETTINGS VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function SettingsView({accounts,clients,prefs,setPrefs}){
  const gmail=accounts.filter(a=>a.type==="gmail"), slack=accounts.filter(a=>a.type==="slack");
  const Section=({icon:I,title,children})=>(<div className="mb-8"><div className="flex items-center gap-2 mb-3"><I size={14} className="text-[#6b7280]"/><h3 className="text-[13px] font-semibold text-[#9ca3af] uppercase tracking-wider">{title}</h3></div>{children}</div>);
  const Toggle=({label,value,onChange})=>(<div className="flex items-center justify-between py-2.5"><span className="text-[13px] text-[#d1d5db]">{label}</span>
    <button onClick={()=>onChange(!value)} className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${value?"bg-blue-600":"bg-[#2a2d35]"}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${value?"translate-x-4":"translate-x-0"}`}/></button></div>);

  return(
    <div className="flex-1 bg-[#0a0c10] overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-lg font-bold text-[#e5e7eb] mb-6">Settings</h2>

        <Section icon={Mail} title="Email Accounts">
          <div className="space-y-2">{gmail.map(a=>(<div key={a.id} className="flex items-center gap-3 p-3.5 rounded-lg border border-[#2a2d35] bg-[#1a1d23]">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor:a.color}}/><div className="flex-1"><div className="text-[13px] text-[#e5e7eb] font-medium">{a.address}</div><div className="text-[11px] text-[#4b5563]">{a.label}</div></div>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-sync"/>Syncing</span></div>))}</div>
        </Section>

        <Section icon={Hash} title="Slack Workspaces">
          <div className="space-y-2">{slack.map(a=>(<div key={a.id} className="flex items-center gap-3 p-3.5 rounded-lg border border-[#2a2d35] bg-[#1a1d23]">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor:a.color}}/><div className="flex-1"><div className="text-[13px] text-[#e5e7eb] font-medium">{a.address}</div><div className="text-[11px] text-[#4b5563]">{a.label}</div></div>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-sync"/>Syncing</span></div>))}</div>
        </Section>

        <Section icon={Building2} title="Client Routing">
          <div className="space-y-2">{clients.map(cl=>{const mapped=accounts.filter(a=>cl.accounts.includes(a.id));return(
            <div key={cl.id} className="p-3.5 rounded-lg border border-[#2a2d35] bg-[#1a1d23]">
              <div className="flex items-center gap-2 mb-2"><div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white" style={{backgroundColor:cl.color}}>{cl.initials}</div><span className="text-[13px] font-medium text-[#e5e7eb]">{cl.name}</span></div>
              <div className="flex flex-wrap gap-2 pl-8">{mapped.map(a=>(<span key={a.id} className="text-[11px] text-[#6b7280] bg-[#0f1117] px-2 py-1 rounded-md border border-[#2a2d35] flex items-center gap-1">{a.type==="gmail"?<Mail size={10}/>:<Hash size={10}/>}{a.address}</span>))}
                {!mapped.length&&<span className="text-[11px] text-[#4b5563] italic">No accounts mapped</span>}</div>
            </div>);})}</div>
        </Section>

        <Section icon={Sparkles} title="AI Drafts">
          <div className="bg-[#1a1d23] rounded-lg border border-[#2a2d35] px-4 py-1 divide-y divide-[#2a2d35]">
            <Toggle label="Auto-generate drafts for new threads" value={prefs.autoDraft} onChange={v=>setPrefs(p=>({...p,autoDraft:v}))}/>
            <Toggle label="Include conversation history in drafts" value={prefs.useHistory} onChange={v=>setPrefs(p=>({...p,useHistory:v}))}/>
          </div>
        </Section>

        <Section icon={Keyboard} title="Interface">
          <div className="bg-[#1a1d23] rounded-lg border border-[#2a2d35] px-4 py-1 divide-y divide-[#2a2d35]">
            <Toggle label="Enable keyboard shortcuts" value={prefs.shortcuts} onChange={v=>setPrefs(p=>({...p,shortcuts:v}))}/>
            <Toggle label="Show archived threads" value={prefs.showArchived} onChange={v=>setPrefs(p=>({...p,showArchived:v}))}/>
          </div>
        </Section>

        <button
          onClick={() => { window.location.href = "/api/auth/signin/google?callbackUrl=/"; }}
          className="flex items-center gap-2 text-[13px] text-blue-400 hover:text-blue-300 px-4 py-3 rounded-lg border border-dashed border-[#2a2d35] hover:border-blue-500/30 w-full justify-center transition-colors">
          <Plus size={15}/> Connect another account
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   THREAD DETAIL
   ═══════════════════════════════════════════════════════════════════════════ */
function ThreadDetail({thread,client,accounts,onUpdate,prefs}){
  const [draft,setDraft]=useState("");
  const [gen,setGen]=useState("idle");
  const [editing,setEditing]=useState(false);
  const [statusMenu,setStatusMenu]=useState(false);
  const statusRef=useRef(null);
  const [manualReply,setManualReply]=useState("");
  const [showManual,setShowManual]=useState(false);
  const taRef=useRef(null);
  const manualRef=useRef(null);
  const scrollRef=useRef(null);
  const last=thread.messages[thread.messages.length-1];
  const sendAcc=accounts.find(a=>a.id===thread.accountId);

  const generate=useCallback(async()=>{setGen("generating");setDraft("");setShowManual(false);
    const r=await generateDraft(thread,client);setDraft(r);setGen("ready");setEditing(true);},[thread,client]);

  useEffect(()=>{setDraft("");setGen("idle");setEditing(false);setShowManual(false);setManualReply("");setSending(false);
    if(thread.status==="needs_response"&&prefs.autoDraft)generate();},[thread.id]);

  useEffect(()=>{if(editing&&taRef.current){taRef.current.focus();taRef.current.style.height="auto";taRef.current.style.height=taRef.current.scrollHeight+"px";}},[editing,draft]);
  useEffect(()=>{if(showManual&&manualRef.current)manualRef.current.focus();},[showManual]);
  useEffect(()=>{if(scrollRef.current)scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[thread.messages.length,thread.id]);

  // Close status menu on outside click
  useEffect(()=>{if(!statusMenu)return;const h=(e)=>{if(statusRef.current&&!statusRef.current.contains(e.target))setStatusMenu(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[statusMenu]);

  const [sending,setSending]=useState(false);
  const sendMsg=(text)=>{
    if(sending||!text.trim())return;setSending(true);
    const nm={id:`ms${Date.now()}`,from:{name:"You",email:sendAcc?.address},channel:last.channel,time:"Just now",body:text};
    onUpdate(thread.id,{...thread,status:"resolved",messages:[...thread.messages,nm],lastActivity:"Just now",lastActivityTs:Date.now(),preview:text.slice(0,120)+"..."});
    setGen("sent");setEditing(false);setShowManual(false);setManualReply("");
  };

  return(
    <div className="flex-1 flex flex-col bg-[#0a0c10] min-w-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1a1d23] flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[15px] font-semibold text-[#e5e7eb]">{thread.subject}</h2>
              <button onClick={()=>onUpdate(thread.id,{...thread,starred:!thread.starred})} className={`transition-colors ${thread.starred?"text-amber-400":"text-[#2a2d35] hover:text-[#6b7280]"}`}><Star size={14} fill={thread.starred?"currentColor":"none"}/></button>
            </div>
            <div className="flex items-center gap-2 text-[12px] flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:client.color}}/><span className="text-[#6b7280]">{client.name}</span></span>
              <span className="text-[#2a2d35]">·</span>
              <span className="text-[#6b7280]">{thread.participants.map(p=>`${p.name} (${p.role})`).join(", ")}</span>
              <span className="text-[#2a2d35]">·</span>
              <span className="text-[#4b5563]">{thread.messages.length} messages</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Btn sm ghost onClick={()=>onUpdate(thread.id,{...thread,status:"archived"})}><Archive size={12}/></Btn>
            <div className="relative" ref={statusRef}>
              <StatusBadge status={gen==="sent"?"resolved":thread.status} onClick={()=>setStatusMenu(!statusMenu)}/>
              {statusMenu&&<div className="absolute right-0 top-8 z-10 bg-[#1a1d23] border border-[#2a2d35] rounded-lg shadow-xl py-1 w-36 anim-fade">
                {Object.entries(STATUS).map(([k,v])=>(<button key={k} onClick={()=>{onUpdate(thread.id,{...thread,status:k});setStatusMenu(false);}}
                  className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-[#22252d] transition-colors ${thread.status===k?v.color:"text-[#9ca3af]"}`}><v.Icon size={12}/>{v.label}</button>))}
              </div>}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {thread.messages.map(msg=>{const me=msg.from.name==="You";return(
          <div key={msg.id} className={`flex gap-3 ${me?"flex-row-reverse":""} anim-fade`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${me?"bg-blue-600 text-white":"bg-[#2a2d35] text-[#9ca3af]"}`}>
              {me?"MT":msg.from.name.split(" ").map(w=>w[0]).join("")}</div>
            <div className="max-w-[80%]">
              <div className={`flex items-center gap-2 mb-1 ${me?"flex-row-reverse":""}`}>
                <span className="text-[13px] font-medium text-[#e5e7eb]">{me?"You":msg.from.name}</span>
                <span className="flex items-center gap-1"><ChIcon ch={msg.channel} sz={11}/><span className="text-[10px] text-[#4b5563]">{msg.channel}</span></span>
                <span className="text-[11px] text-[#4b5563]">{msg.time}</span>
              </div>
              <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap ${me?"bg-blue-600/10 border border-blue-500/20":"bg-[#1a1d23] border border-[#2a2d35]"} text-[#d1d5db]`}>{msg.body}</div>
            </div>
          </div>
        );})}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-[#1a1d23]">
        {gen==="generating"&&<>
          <div className="px-4 py-2.5 flex items-center justify-between bg-[#0c0f16] border-b border-[#1a1d23]">
            <span className="flex items-center gap-2"><Sparkles size={13} className="text-blue-400"/><span className="text-[12px] font-medium text-blue-300">AI Draft</span>
              <span className="flex items-center gap-1.5 text-[11px] text-blue-400/60"><Loader2 size={11} className="animate-spin"/>Analyzing {thread.messages.length} messages...</span></span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#4b5563] bg-[#1a1d23] px-2.5 py-1 rounded-md"><ChIcon ch={last.channel} sz={11}/>as {sendAcc?.address}</span>
          </div>
          <div className="px-6 py-10 flex flex-col items-center gap-2 bg-[#0c0f16]">
            <div className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
          </div>
        </>}

        {gen==="sent"&&<div className="px-6 py-8 text-center bg-[#0c0f16] anim-fade">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400"/><p className="text-[13px] font-medium text-emerald-300">Sent</p>
          <p className="text-[11px] text-[#4b5563] mt-0.5">via {last.channel} as {sendAcc?.address}</p>
        </div>}

        {gen==="ready"&&draft&&<>
          <div className="px-4 py-2.5 flex items-center justify-between bg-[#0c0f16] border-b border-[#1a1d23]">
            <span className="flex items-center gap-2"><Sparkles size={13} className="text-blue-400"/><span className="text-[12px] font-medium text-blue-300">AI Draft</span></span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#4b5563] bg-[#1a1d23] px-2.5 py-1 rounded-md"><ChIcon ch={last.channel} sz={11}/>as {sendAcc?.address}</span>
          </div>
          <div className="bg-[#0c0f16]">
            <div className="px-5 py-4 max-h-[220px] overflow-y-auto">
              {editing?<textarea ref={taRef} value={draft} onChange={e=>{setDraft(e.target.value);e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
                className="w-full bg-transparent text-[13px] text-[#d1d5db] leading-relaxed resize-none outline-none" style={{minHeight:"80px"}}/>
              :<p className="text-[13px] text-[#d1d5db] whitespace-pre-wrap leading-relaxed">{draft}</p>}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a1d23]">
              <div className="flex items-center gap-1">
                <Btn sm ghost onClick={generate}><RefreshCw size={11}/> Regenerate</Btn>
                <Btn sm ghost onClick={()=>setEditing(!editing)}><Edit3 size={11}/> {editing?"Preview":"Edit"}</Btn>
              </div>
              <Btn sm primary onClick={()=>sendMsg(draft)} disabled={sending}><Send size={13}/> Send</Btn>
            </div>
          </div>
        </>}

        {gen==="idle"&&!showManual&&<div className="px-4 py-3 bg-[#0c0f16] flex items-center gap-2">
          <button onClick={()=>setShowManual(true)} className="flex-1 text-left bg-[#1a1d23] rounded-lg px-3.5 py-2.5 border border-[#2a2d35] text-[13px] text-[#4b5563] hover:border-[#3a3d45] transition-colors">Write a reply...</button>
          <Btn sm onClick={generate}><Sparkles size={13} className="text-blue-400"/> AI Draft</Btn>
        </div>}

        {gen==="idle"&&showManual&&<div className="bg-[#0c0f16]">
          <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#1a1d23]">
            <span className="flex items-center gap-2 text-[12px] text-[#6b7280]"><CornerDownRight size={13}/>Reply</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#4b5563] bg-[#1a1d23] px-2.5 py-1 rounded-md"><ChIcon ch={last.channel} sz={11}/>as {sendAcc?.address}</span>
          </div>
          <div className="px-5 py-4">
            <textarea ref={manualRef} value={manualReply} onChange={e=>setManualReply(e.target.value)} placeholder="Write your reply..."
              className="w-full bg-transparent text-[13px] text-[#d1d5db] leading-relaxed resize-none outline-none placeholder-[#4b5563] min-h-[100px]"/>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a1d23]">
            <div className="flex items-center gap-1">
              <Btn sm ghost onClick={()=>{setShowManual(false);setManualReply("");}}>Cancel</Btn>
              <Btn sm ghost onClick={generate}><Sparkles size={13}/> Switch to AI</Btn>
            </div>
            <Btn sm primary onClick={()=>sendMsg(manualReply)} disabled={!manualReply.trim()||sending}><Send size={13}/> Send</Btn>
          </div>
        </div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Orbital(){
  const [loaded,setLoaded]=useState(false);
  const [boarded,setBoarded]=useState(false);
  const [accounts,setAccounts]=useState([]);
  const [clients,setClients]=useState([]);
  const [threads,setThreads]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [filter,setFilter]=useState("needs_response");
  const [search,setSearch]=useState("");
  const [view,setView]=useState("inbox");
  const [compose,setCompose]=useState(false);
  const [shortcuts,setShortcuts]=useState(false);
  const [prefs,setPrefs]=useState({autoDraft:true,useHistory:true,shortcuts:true,showArchived:false});

  // Load persisted state
  useEffect(()=>{(async()=>{const s=await loadState();
    if(s&&s.boarded){setAccounts(s.accounts||[]);setClients(s.clients||[]);setThreads(s.threads||[]);setPrefs(s.prefs||prefs);setBoarded(true);}
    setLoaded(true);})();},[]);

  // Save state on changes
  useEffect(()=>{if(boarded)saveState({boarded,accounts,clients,threads,prefs});},[boarded,accounts,clients,threads,prefs]);

  const activeThread=threads.find(t=>t.id===activeId);
  const activeClient=activeThread?clients.find(c=>c.id===activeThread.clientId)||{id:"_none",name:"Uncategorized",color:"#4b5563",initials:"—",accounts:[]}:null;
  const nrCount=threads.filter(t=>t.status==="needs_response").length;

  const updateThread=(id,upd)=>setThreads(p=>p.map(t=>t.id===id?upd:t));

  const visibleThreads=useMemo(()=>threads
    .filter(t=>prefs.showArchived||t.status!=="archived")
    .filter(t=>{
      if(filter==="needs_response")return t.status==="needs_response";
      if(filter==="waiting")return t.status==="waiting";
      if(filter==="starred")return t.starred;
      if(filter.startsWith("cl:"))return t.clientId===filter.slice(3);
      return t.status!=="archived";
    })
    .filter(t=>{if(!search)return true;const q=search.toLowerCase();
      return t.subject.toLowerCase().includes(q)||t.preview.toLowerCase().includes(q)||t.participants.some(p=>p.name.toLowerCase().includes(q));
    })
    .sort((a,b)=>b.lastActivityTs-a.lastActivityTs)
  ,[threads,filter,search,prefs.showArchived]);

  // Keyboard shortcuts
  useEffect(()=>{
    if(!prefs.shortcuts||!boarded)return;
    const handle=(e)=>{
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT")return;
      const idx=visibleThreads.findIndex(t=>t.id===activeId);
      if(e.key==="j"&&idx<visibleThreads.length-1){setActiveId(visibleThreads[idx+1]?.id);e.preventDefault();}
      if(e.key==="k"&&idx>0){setActiveId(visibleThreads[idx-1]?.id);e.preventDefault();}
      if(e.key==="j"&&idx===-1&&visibleThreads.length){setActiveId(visibleThreads[0].id);e.preventDefault();}
      if(e.key==="c"&&!compose){setCompose(true);e.preventDefault();}
      if(e.key==="?"){setShortcuts(true);e.preventDefault();}
      if(e.key==="Escape"){setActiveId(null);setShortcuts(false);setCompose(false);}
      if(e.key==="Enter"&&activeId===null&&idx===-1&&visibleThreads.length){setActiveId(visibleThreads[0].id);e.preventDefault();}
      if(activeThread){
        if(e.key==="s"){updateThread(activeId,{...activeThread,starred:!activeThread.starred});e.preventDefault();}
        if(e.key==="e"){updateThread(activeId,{...activeThread,status:"archived"});setActiveId(null);e.preventDefault();}
        if(e.key==="1"){updateThread(activeId,{...activeThread,status:"needs_response"});e.preventDefault();}
        if(e.key==="2"){updateThread(activeId,{...activeThread,status:"waiting"});e.preventDefault();}
        if(e.key==="3"){updateThread(activeId,{...activeThread,status:"fyi"});e.preventDefault();}
        if(e.key==="4"){updateThread(activeId,{...activeThread,status:"resolved"});e.preventDefault();}
      }
    };
    window.addEventListener("keydown",handle);return()=>window.removeEventListener("keydown",handle);
  },[prefs.shortcuts,boarded,activeId,activeThread,visibleThreads]);

  const handleOnboard=(data)=>{setAccounts(data.accounts);setClients(data.clients);setThreads(data.threads);setBoarded(true);};

  const handleComposeSend=({accountId,to,subject,body,clientId,channel})=>{
    const id=`ct${Date.now()}`;
    setThreads(p=>[{id,clientId:clientId||"unknown",accountId,subject:subject||`Message to ${to}`,status:"resolved",starred:false,
      lastActivity:"Just now",lastActivityTs:Date.now(),preview:body.slice(0,120)+"...",
      participants:[{name:to,email:to,role:""}],
      messages:[{id:`cm${Date.now()}`,from:{name:"You",email:accounts.find(a=>a.id===accountId)?.address},channel,time:"Just now",body}]
    },...p]);
  };

  const handleReset=async()=>{try{localStorage.removeItem(STORE_KEY);}catch{}
    setBoarded(false);setThreads([]);setAccounts([]);setClients([]);
    setActiveId(null);setFilter("needs_response");setSearch("");setView("inbox");setCompose(false);setShortcuts(false);
    setPrefs({autoDraft:true,useHistory:true,shortcuts:true,showArchived:false});};

  if(!loaded)return <div className="h-screen bg-[#07080b] flex items-center justify-center"><Loader2 size={24} className="text-blue-500 animate-spin"/></div>;
  if(!boarded)return <Onboarding onComplete={handleOnboard}/>;

  return(
    <div className="flex h-screen bg-[#0f1117] text-[#e5e7eb]">

      {compose&&<ComposeModal accounts={accounts} clients={clients} onClose={()=>setCompose(false)} onSend={handleComposeSend}/>}
      {shortcuts&&<ShortcutsModal onClose={()=>setShortcuts(false)}/>}

      {/* Rail */}
      <div className="w-[60px] bg-[#07080b] border-r border-[#1a1d23] flex flex-col items-center py-4 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6"><Zap size={18} className="text-white"/></div>
        <nav className="flex flex-col items-center gap-1 flex-1">
          <button onClick={()=>setView("inbox")} title="Inbox (i)" className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${view==="inbox"?"bg-[#1a1d23] text-white":"text-[#4b5563] hover:text-[#9ca3af] hover:bg-[#1a1d23]/50"}`}>
            <Inbox size={20}/>{nrCount>0&&<span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">{nrCount}</span>}
          </button>
          <button onClick={()=>setCompose(true)} title="Compose (c)" className="w-10 h-10 rounded-xl flex items-center justify-center text-[#4b5563] hover:text-[#9ca3af] hover:bg-[#1a1d23]/50 transition-colors"><PenLine size={20}/></button>
          <button onClick={()=>setView("settings")} title="Settings" className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${view==="settings"?"bg-[#1a1d23] text-white":"text-[#4b5563] hover:text-[#9ca3af] hover:bg-[#1a1d23]/50"}`}><Settings size={20}/></button>
        </nav>
        <div className="flex flex-col items-center gap-2">
          <button onClick={()=>setShortcuts(true)} title="Shortcuts (?)" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#4b5563] hover:text-[#9ca3af] hover:bg-[#1a1d23]/50 transition-colors"><Keyboard size={16}/></button>
          <button onClick={handleReset} title="Reset" className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white hover:opacity-80 transition-opacity">MT</button>
        </div>
      </div>

      {/* Main */}
      {view==="inbox"?(<>
        {/* Inbox panel */}
        <div className="w-[380px] bg-[#0f1117] border-r border-[#1a1d23] flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-[#1a1d23]">
            <div className="flex items-center gap-2 mb-3 bg-[#1a1d23] border border-[#2a2d35] rounded-lg px-3 py-2">
              <Search size={14} className="text-[#4b5563]"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search threads..."
                className="flex-1 bg-transparent text-[13px] text-[#e5e7eb] placeholder-[#4b5563] outline-none"/>
              {search&&<button onClick={()=>setSearch("")} className="text-[#4b5563] hover:text-[#9ca3af]"><X size={13}/></button>}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[{k:"needs_response",l:"Needs reply",c:nrCount},{k:"all",l:"All"},{k:"waiting",l:"Waiting"},{k:"starred",l:"Starred"}].map(f=>(
                <button key={f.k} onClick={()=>setFilter(f.k)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${filter===f.k?"bg-blue-600/20 text-blue-400 border border-blue-500/30":"text-[#6b7280] border border-[#2a2d35] hover:border-[#3a3d45]"}`}>
                  {f.l}{f.c?` (${f.c})`:""}
                </button>))}
            </div>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {clients.map(c=>(
                <button key={c.id} onClick={()=>setFilter(filter===`cl:${c.id}`?"all":`cl:${c.id}`)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 ${filter===`cl:${c.id}`?"bg-blue-600/20 text-blue-400 border border-blue-500/30":"text-[#6b7280] border border-[#2a2d35] hover:border-[#3a3d45]"}`}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:c.color}}/>{c.name}
                </button>))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {visibleThreads.length===0?(
              <div className="text-center py-16 px-6"><CheckCircle2 size={28} className="mx-auto mb-3 text-emerald-500/40"/><p className="text-sm text-[#6b7280]">{search?"No threads match.":threads.length===0?"No messages yet.":"All caught up!"}</p></div>
            ):visibleThreads.map(thread=>{const cl=clients.find(c=>c.id===thread.clientId);const last=thread.messages[thread.messages.length-1];const unread=thread.status==="needs_response";
              return(<button key={thread.id} onClick={()=>setActiveId(thread.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-[#1a1d23] transition-all ${activeId===thread.id?"bg-[#1a1d23]":"hover:bg-[#12141a]"}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5" style={{backgroundColor:cl?.color||"#4b5563"}}>{cl?.initials||"?"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[13px] truncate ${unread?"font-semibold text-[#f3f4f6]":"text-[#d1d5db]"}`}>{thread.subject}</span>
                      {thread.starred&&<Star size={11} className="text-amber-400 flex-shrink-0" fill="currentColor"/>}
                    </div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <ChIcon ch={last.channel} sz={11}/>
                      <span className="text-[11px] text-[#6b7280] truncate">{last.from.name==="You"?"You":last.from.name}</span>
                      <span className="text-[11px] text-[#3a3d45]">·</span>
                      <span className="text-[11px] text-[#4b5563]">{thread.lastActivity}</span>
                    </div>
                    <p className="text-[12px] text-[#6b7280] truncate">{thread.preview}</p>
                  </div>
                  <StatusBadge status={thread.status}/>
                </div>
              </button>);})}
          </div>
        </div>

        {/* Detail or empty */}
        {activeThread&&activeClient?(
          <ThreadDetail key={activeThread.id} thread={activeThread} client={activeClient} accounts={accounts} onUpdate={updateThread} prefs={prefs}/>
        ):(
          <div className="flex-1 flex items-center justify-center bg-[#0a0c10]">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1a1d23] border border-[#2a2d35] flex items-center justify-center mx-auto mb-4"><Inbox size={24} className="text-[#4b5563]"/></div>
              <p className="text-[15px] font-medium text-[#6b7280] mb-1">{threads.length===0?"No messages yet":"Select a conversation"}</p>
              <p className="text-[12px] text-[#4b5563]">{threads.length===0?"Messages appear once accounts sync.":"Press j/k to navigate, Enter to open"}</p>
            </div>
          </div>
        )}
      </>):(
        <SettingsView accounts={accounts} clients={clients} prefs={prefs} setPrefs={setPrefs}/>
      )}
    </div>
  );
}
