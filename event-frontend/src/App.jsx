import React, { useEffect, useState } from 'react';
import { api } from './api';

const Box = ({children}) => <div style={{background:'#141b2d',color:'#e5e7eb',padding:16,borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,.3)',margin:'10px 0'}}>{children}</div>;
const Btn = ({kind='primary',...p}) => <button {...p} style={{margin:4,padding:'8px 12px',border:'none',borderRadius:8,cursor:'pointer',background:kind==='danger'?'#ef4444':kind==='secondary'?'#374151':'#3b82f6',color:'#fff'}}/>;

export default function App(){
  const [tab,setTab]=useState('home');
  const [query,setQuery]=useState('');
  const [events,setEvents]=useState([]);
  const [regs,setRegs]=useState([]);

  const loadEvents = async ()=> setEvents((await api.events()).data || (await api.events()));
  const loadRegs = async ()=> setRegs(await api.regs());

  useEffect(()=>{ loadEvents(); },[]);
  useEffect(()=>{ if(tab==='admin') loadRegs(); },[tab]);

  const [form,setForm]=useState({name:'',date:'',time:'',category:'',venue:'',organizer:'',description:''});
  const onCreate=async e=>{ e.preventDefault(); await api.createEvent(form); setForm({name:'',date:'',time:'',category:'',venue:'',organizer:'',description:''}); loadEvents(); };

  const [editEv,setEditEv]=useState(null);
  const [editReg,setEditReg]=useState(null);
  const isPast = (d,t) => new Date(`${d}T${t||'00:00'}`) < new Date(new Date().toDateString());

  return <div style={{maxWidth:1100,margin:'20px auto',padding:'0 16px'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'10px 0'}}>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        <strong style={{color:'#3b82f6'}}>EventDB</strong>
        <Btn kind="secondary" onClick={()=>document.documentElement.style.filter=document.documentElement.style.filter?'':'invert(1) hue-rotate(180deg)'}>Theme</Btn>
        <Btn kind="secondary" onClick={()=>api.er()}>ER</Btn>
      </div>
      <div>
        <input placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #24314c',background:'#0b1220',color:'#e5e7eb'}}/>
        <Btn kind="secondary" onClick={()=>setTab('home')}>Home</Btn>
        <Btn kind="secondary" onClick={()=>setTab('admin')}>Admin</Btn>
      </div>
    </header>

    {tab==='home' && <Box>
      <h2>Events</h2>
      {events.filter(e=> [e.name,e.venue,e.category,e.organizer].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()))
        .map(e=>
        <div key={e.id} style={{display:'flex',justifyContent:'space-between',border:'1px solid #24314c',borderRadius:10,padding:10,margin:'8px 0'}}>
          <div><b>{e.name}</b><div style={{color:'#9ca3af',fontSize:13}}>{e.date} • {e.time} • {e.category||''}</div><div>{e.description||''}</div></div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {!isPast(e.date,e.time)
              ? <Btn onClick={()=>setEditReg({ event_id:e.id, name:'', email:'', contact:'', role:'Participant', date:e.date })}>Register</Btn>
              : <span style={{padding:'2px 8px',background:'#0b2a6b',borderRadius:999}}>Past</span>}
          </div>
        </div>
      )}
    </Box>}

    {tab==='admin' && <Box>
      <h2>Admin</h2>
      <form onSubmit={onCreate} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <input placeholder="Name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <input type="time" required value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/>
        <input placeholder="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
        <input placeholder="Venue" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/>
        <input placeholder="Organizer" value={form.organizer} onChange={e=>setForm({...form,organizer:e.target.value})}/>
        <textarea placeholder="Description" style={{gridColumn:'1/-1'}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        <div style={{gridColumn:'1/-1'}}>
          <Btn>Create</Btn>
          <Btn kind="secondary" onClick={e=>{e.preventDefault(); api.csv();}}>Export CSV</Btn>
          <Btn kind="secondary" onClick={e=>{e.preventDefault(); api.pdf();}}>Report PDF</Btn>
        </div>
      </form>

      <h3>Manage Events</h3>
      {events.map(e=>
        <div key={e.id} style={{display:'flex',justifyContent:'space-between',border:'1px solid #24314c',borderRadius:10,padding:10,margin:'8px 0'}}>
          <div><b>{e.name}</b><div className="small">{e.date} {e.time} • {e.category||''}</div></div>
          <div>
            <Btn kind="secondary" onClick={()=>setEditEv(e)}>Edit</Btn>
            <Btn kind="danger" onClick={async()=>{ if(confirm('Delete event?')){ await api.deleteEvent(e.id); loadEvents(); }}}>Delete</Btn>
          </div>
        </div>)}

      <h3 style={{marginTop:16}}>Registrations</h3>
      {regs.map(r=>
        <div key={r.id} style={{display:'flex',justifyContent:'space-between',border:'1px solid #24314c',borderRadius:10,padding:10,margin:'8px 0'}}>
          <div><b>{r.name}</b> &lt;{r.email}&gt; — {r.event_name} ({r.role||''})</div>
          <div>
            <Btn kind="secondary" onClick={()=>setEditReg(r)}>Edit</Btn>
            <Btn kind="danger" onClick={async()=>{ if(confirm('Delete registration?')){ await api.deleteReg(r.id); loadRegs(); }}}>Delete</Btn>
          </div>
        </div>)}
    </Box>}

    {editEv && <Box>
      <h3>Edit Event</h3>
      <EventForm initial={editEv} onCancel={()=>setEditEv(null)} onSave={async(v)=>{ await api.updateEvent(editEv.id,v); setEditEv(null); loadEvents(); }} />
    </Box>}

    {editReg && <Box>
      <h3>{editReg.id ? 'Edit Registration' : 'Register'}</h3>
      <RegForm initial={editReg} onCancel={()=>setEditReg(null)} onSave={async(v)=>{
        try {
          if(editReg.id) await api.updateReg(editReg.id,v);
          else await api.createReg(v);
          setEditReg(null); (tab==='admin'? loadRegs(): loadEvents());
        } catch(e){ alert(e.message); }
      }}/>
    </Box>}
  </div>;
}

function EventForm({initial,onSave,onCancel}){
  const [v,setV]=useState({...initial});
  return <form onSubmit={e=>{e.preventDefault(); onSave(v);}}>
    <input value={v.name} onChange={e=>setV({...v,name:e.target.value})} required/>
    <input type="date" value={v.date} onChange={e=>setV({...v,date:e.target.value})} required/>
    <input type="time" value={v.time} onChange={e=>setV({...v,time:e.target.value})} required/>
    <input value={v.category||''} onChange={e=>setV({...v,category:e.target.value})}/>
    <input value={v.venue||''} onChange={e=>setV({...v,venue:e.target.value})}/>
    <input value={v.organizer||''} onChange={e=>setV({...v,organizer:e.target.value})}/>
    <textarea value={v.description||''} onChange={e=>setV({...v,description:e.target.value})}/>
    <button style={{margin:4,padding:'8px 12px',border:'none',borderRadius:8,background:'#3b82f6',color:'#fff'}}>Save</button>
    <button onClick={(e)=>{e.preventDefault(); onCancel();}} style={{margin:4,padding:'8px 12px',border:'none',borderRadius:8,background:'#374151',color:'#fff'}}>Cancel</button>
  </form>;
}

function RegForm({initial,onSave,onCancel}){
  const [v,setV]=useState({...initial});
  return <form onSubmit={e=>{e.preventDefault(); onSave(v);}}>
    <input placeholder="Name" value={v.name||''} onChange={e=>setV({...v,name:e.target.value})} required/>
    <input placeholder="Email" type="email" value={v.email||''} onChange={e=>setV({...v,email:e.target.value})} required/>
    <input placeholder="Contact" value={v.contact||''} onChange={e=>setV({...v,contact:e.target.value})}/>
    <select value={v.role||'Participant'} onChange={e=>setV({...v,role:e.target.value})}>
      <option>Participant</option><option>Speaker</option>
    </select>
    {v.event_id ? null : <input placeholder="Event ID" type="number" value={v.event_id||''} onChange={e=>setV({...v,event_id:+e.target.value})} required/>}
    <button style={{margin:4,padding:'8px 12px',border:'none',borderRadius:8,background:'#3b82f6',color:'#fff'}}>Save</button>
    <button onClick={(e)=>{e.preventDefault(); onCancel();}} style={{margin:4,padding:'8px 12px',border:'none',borderRadius:8,background:'#374151',color:'#fff'}}>Cancel</button>
  </form>;
}
