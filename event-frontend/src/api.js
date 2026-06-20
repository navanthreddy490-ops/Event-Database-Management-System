const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const j = async (p, o={}) => {
  const r = await fetch(API+p, { headers:{'Content-Type':'application/json'}, ...o });
  if(!r.ok) throw new Error(await r.text());
  const ct = r.headers.get('content-type')||'';
  return ct.includes('application/json') ? r.json() : r.text();
};
export const api = {
  events: (params='') => j('/api/events'+params),
  event: id => j('/api/events/'+id),
  createEvent: body => j('/api/events',{method:'POST',body:JSON.stringify(body)}),
  updateEvent: (id,body)=> j('/api/events/'+id,{method:'PUT',body:JSON.stringify(body)}),
  deleteEvent: id => j('/api/events/'+id,{method:'DELETE'}),
  regs: (params='') => j('/api/registrations'+params),
  createReg: body => j('/api/registrations',{method:'POST',body:JSON.stringify(body)}),
  updateReg: (id,body)=> j('/api/registrations/'+id,{method:'PUT',body:JSON.stringify(body)}),
  deleteReg: id => j('/api/registrations/'+id,{method:'DELETE'}),
  stats: ()=> j('/api/stats'),
  csv: ()=> window.open(API+'/api/registrations.csv','_blank'),
  pdf: ()=> window.open(API+'/api/report.pdf','_blank'),
  er: ()=> window.open(API+'/static/er.svg','_blank')
};
