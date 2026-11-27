import { randomUUID } from "node:crypto";
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
function cookie(req,name){const v=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));return v?decodeURIComponent(v.slice(name.length+1)):""}
function send(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.setHeader("Cache-Control","no-store");res.end(JSON.stringify(data))}
export default async function handler(req,res){
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed."});
 if(req.headers.origin&&req.headers.host&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:"Invalid origin."});
 try{
  const token=cookie(req,"codlytic_access");if(!token)return send(res,401,{error:"Please sign in first."});
  const auth=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:KEY,Authorization:"Bearer "+token}});if(!auth.ok)return send(res,401,{error:"Please sign in again."});
  const admin=await fetch(SUPABASE_URL+"/rest/v1/rpc/is_admin",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:"{}"});
  if(!admin.ok||await admin.json()!==true)return send(res,403,{error:"Notes editor access is not enabled for this account."});
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  const name=String(body.name||"note.pdf").replace(/[\/\\]/g,"_").slice(0,160);
  const encoded=String(body.data||"").replace(/^data:application\/pdf;base64,/i,"");
  if(!/\.pdf$/i.test(name)||!encoded)return send(res,400,{error:"Choose a PDF file."});
  const bytes=Buffer.from(encoded,"base64");
  if(bytes.length<5||bytes.length>3145728||bytes.subarray(0,5).toString()!=="%PDF-")return send(res,400,{error:"PDF must be valid and no larger than 3 MB."});
  const path=randomUUID()+".pdf";
  const uploaded=await fetch(SUPABASE_URL+"/storage/v1/object/codlytic-note-pdfs/"+path,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/pdf","x-upsert":"false"},body:bytes});
  if(!uploaded.ok){const err=await uploaded.json().catch(()=>({}));return send(res,uploaded.status,{error:err.message||"PDF upload failed."})}
  return send(res,201,{path,name,size:bytes.length});
 }catch(e){return send(res,500,{error:e.message||"Upload failed."})}
}
