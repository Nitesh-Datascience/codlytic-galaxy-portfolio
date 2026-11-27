const SUPABASE_URL=process.env.SUPABASE_URL,KEY=process.env.SUPABASE_PUBLISHABLE_KEY;
function send(res,s,d){res.statusCode=s;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(d))}
export default async function handler(req,res){
 if(req.method==="GET"){
  try{
   const token=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("codlytic_access="));
   const access=token?decodeURIComponent(token.slice("codlytic_access=".length)):"";
   if(!access)return send(res,401,{error:"Sign in required."});
   const auth=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:KEY,Authorization:"Bearer "+access}});
   if(!auth.ok)return send(res,401,{error:"Sign in again."});
   const a=await fetch(SUPABASE_URL+"/rest/v1/rpc/is_admin",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+access,"Content-Type":"application/json"},body:"{}"});
   if(!a.ok||await a.json()!==true)return send(res,403,{error:"Admin access required."});
   const r=await fetch(SUPABASE_URL+"/rest/v1/codlytic_note_feedback?select=id,note_id,feedback_type,message,created_at,codlytic_notes(title)&order=created_at.desc",{headers:{apikey:KEY,Authorization:"Bearer "+access}});
   const rows=await r.json();if(!r.ok)return send(res,r.status,{error:"Could not load feedback."});
   return send(res,200,{feedback:rows});
  }catch(e){return send(res,500,{error:e.message})}
 }
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed."});
 if(req.headers.origin&&req.headers.host&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:"Invalid origin."});
 try{
  const b=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  const note_id=String(b.note_id||""),feedback_type=String(b.feedback_type||""),message=String(b.message||"").trim();
  if(!/^[0-9a-f-]{36}$/i.test(note_id)||!["issue","idea","review"].includes(feedback_type)||message.length<3||message.length>1200)return send(res,400,{error:"Please choose a feedback type and write 3–1200 characters."});
  const r=await fetch(SUPABASE_URL+"/rest/v1/codlytic_note_feedback",{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({note_id,feedback_type,message})});
  if(!r.ok){const e=await r.json().catch(()=>({}));return send(res,r.status,{error:e.message||"Feedback could not be submitted."})}
  return send(res,201,{message:"Thanks! Your feedback has been sent."});
 }catch(e){return send(res,500,{error:e.message||"Feedback failed."})}
}
